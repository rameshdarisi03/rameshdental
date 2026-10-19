import { NextRequest, NextResponse } from "next/server";
import {
  getFirestoreDocRest,
  patchFirestoreDocRest,
  queryFirestoreCollectionRest,
  getAllPatientsRest,
} from "@/lib/firebaseRestAdmin";
import { generateGoogleCalendarUrl } from "@/lib/calendarUtils";
import { sendWhatsAppAppointmentRescheduled } from "@/lib/whatsapp";
import { sendAppointmentRescheduledEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedRescheduleCaller(req: NextRequest, appData: any, body: any): Promise<boolean> {
  // 1. Staff session cookie from dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }

  // 2. Bearer Firebase ID token
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const { getFirebaseAdmin } = await import("@/lib/firebaseAdmin");
      const { auth, db } = getFirebaseAdmin();
      const decoded = await auth.verifyIdToken(bearerToken);

      // Check if caller is staff
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (["admin", "receptionist", "doctor", "staff"].includes(role)) {
          return true;
        }
      }

      // Check if caller is the patient who booked this appointment
      const callerEmail = (decoded.email || "").toLowerCase().trim();
      const appEmail = (appData.patientEmail || appData.email || "").toLowerCase().trim();
      if (callerEmail && appEmail && callerEmail === appEmail) {
        return true;
      }

      if (decoded.uid && (decoded.uid === appData.authUid || decoded.uid === appData.userId || decoded.uid === appData.patientId)) {
        return true;
      }
    } catch {
      // Invalid token
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const {
      appointmentId,
      newDate,
      newSlot,
      actionedBy = "Patient",
      actionedByRole = "patient",
      actionedByUid = "",
      reason = "Patient requested reschedule",
    } = body;

    if (!appointmentId || !newDate || !newSlot) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: appointmentId, newDate, newSlot" },
        { status: 400 }
      );
    }

    // 1. Fetch current appointment using pure REST
    const appData = await getFirestoreDocRest("appointments", appointmentId);
    if (!appData) {
      return NextResponse.json(
        { success: false, error: "Appointment not found." },
        { status: 404 }
      );
    }

    // Verify caller is either clinic staff or the patient who owns this appointment
    const isAuthorized = await isAuthorizedRescheduleCaller(req, appData, body);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. You do not have permission to reschedule this appointment." },
        { status: 403 }
      );
    }

    const previousDate = appData.date;
    const previousSlot = appData.slot;
    let patientName = appData.patientName || appData.name || "Patient";
    let patientPhone = appData.patientPhone || appData.phone || "";
    let patientEmail = appData.patientEmail || appData.email || "";
    const serviceId = appData.serviceId || "Physiotherapy Session";
    const assignedTherapist = appData.assignedTherapist || "Dr. Kinnera";

    // If phone or email missing from appointment doc, try looking up linked patient profile
    if ((!patientPhone || !patientEmail) && appData.patientId) {
      try {
        const patientDoc = await getFirestoreDocRest("patients", appData.patientId);
        if (patientDoc) {
          if (!patientPhone && patientDoc.phone) patientPhone = patientDoc.phone;
          if (!patientEmail && patientDoc.email) patientEmail = patientDoc.email;
          if (patientName === "Patient" && patientDoc.name) patientName = patientDoc.name;
        }
      } catch (err) {
        console.warn("[Reschedule] Patient doc lookup fallback failed:", err);
      }
    }

    // 2. Check Capacity on target date and slot
    const config = (await getFirestoreDocRest("clinic_settings", "config")) || {};
    const maxCapacity = config.defaultSlotCapacity || 2;

    const altNewDate = newDate.includes("-") ? newDate.split("-").reverse().join("-") : newDate;
    const validDates = new Set([newDate, altNewDate]);

    // Query appointments for new slot
    const existingApps = await queryFirestoreCollectionRest("appointments", {
      fieldFilter: {
        field: { fieldPath: "slot" },
        op: "EQUAL",
        value: { stringValue: newSlot },
      },
    });

    const conflicting = existingApps.filter(
      (doc) =>
        doc.id !== appointmentId &&
        validDates.has(doc.date) &&
        doc.status === "approved"
    );

    if (conflicting.length >= maxCapacity) {
      return NextResponse.json(
        { success: false, error: "The selected time slot is fully booked. Please choose an alternative slot." },
        { status: 409 }
      );
    }

    // 3. Check blocks on new date & slot
    const blocks = await queryFirestoreCollectionRest("blocks");
    let isBlocked = false;
    for (const block of blocks) {
      if (validDates.has(block.date)) {
        if (block.type === "full_day" || block.type === "holiday") {
          isBlocked = true;
          break;
        } else if (block.type === "slot" && block.slot === newSlot) {
          isBlocked = true;
          break;
        }
      }
    }

    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: "The selected slot is unavailable due to clinic closures. Please choose another slot." },
        { status: 409 }
      );
    }

    // 4. Update appointment in Firestore via REST (using automatic updateMask to preserve all other fields)
    const nowIso = new Date().toISOString();
    await patchFirestoreDocRest("appointments", appointmentId, {
      date: newDate,
      slot: newSlot,
      status: "approved",
      previousDate: previousDate || "",
      previousSlot: previousSlot || "",
      rescheduledAt: nowIso,
      rescheduledBy: actionedBy,
      rescheduledByRole: actionedByRole,
      rescheduleReason: reason,
      actionedAt: nowIso,
      actionedByName: actionedBy,
      actionedByRole: actionedByRole,
    });

    // 5. Update patient's upcoming date in 'patients' collection
    if (patientPhone) {
      try {
        const phoneDigits = patientPhone.replace(/\D/g, "").slice(-10);
        const allPatients = await getAllPatientsRest();
        const matched = allPatients.find((p) => {
          const pDigits = (p.phone || "").replace(/\D/g, "").slice(-10);
          return pDigits && pDigits === phoneDigits;
        });

        if (matched?.id) {
          await patchFirestoreDocRest("patients", matched.id, {
            upcoming: `${newDate} (${newSlot})`,
            lastRescheduledAt: nowIso,
          });
        }
      } catch (e) {
        console.warn("[Reschedule] Non-critical error updating patient doc upcoming:", e);
      }
    }

    const calendarUrl = generateGoogleCalendarUrl({
      date: newDate,
      slot: newSlot,
      serviceId,
      patientName,
    });

    // 6. Dispatch Automated WhatsApp & Email notifications (Directly awaited)
    if (patientPhone) {
      try {
        console.log(`[Reschedule] Dispatching WhatsApp confirmation to ${patientPhone}...`);
        const waRes = await sendWhatsAppAppointmentRescheduled({
          patientName,
          patientPhone,
          newDate,
          newSlot,
          therapistName: assignedTherapist,
        });
        if (!waRes.success) {
          console.warn("[Reschedule WhatsApp Failed]:", waRes.error);
        } else {
          console.log("[Reschedule WhatsApp Sent Successfully]");
        }
      } catch (waErr) {
        console.warn("[Reschedule WhatsApp Exception]:", waErr);
      }
    }

    if (patientEmail) {
      try {
        console.log(`[Reschedule] Dispatching Email confirmation to ${patientEmail}...`);
        const emailRes = await sendAppointmentRescheduledEmail({
          patientName,
          patientEmail,
          serviceId,
          previousSlot: `${previousDate} at ${previousSlot}`,
          newDate,
          newSlot,
          assignedTherapist,
          googleCalendarUrl: calendarUrl,
        });
        if (!emailRes.success) {
          console.warn("[Reschedule Email Failed]:", emailRes.error);
        } else {
          console.log("[Reschedule Email Sent Successfully]");
        }
      } catch (emErr) {
        console.warn("[Reschedule Email Exception]:", emErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Appointment successfully rescheduled to ${newDate} at ${newSlot}. Old slot ${previousDate} ${previousSlot} has been released.`,
      appointment: {
        id: appointmentId,
        date: newDate,
        slot: newSlot,
        previousDate,
        previousSlot,
        status: "approved",
      },
    });
  } catch (error: unknown) {
    console.error("[Appointments Reschedule API Error]:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
