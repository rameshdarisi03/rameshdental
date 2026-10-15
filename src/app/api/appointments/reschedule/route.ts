import { NextRequest, NextResponse } from "next/server";
import {
  getFirestoreDocRest,
  patchFirestoreDocRest,
  queryFirestoreCollectionRest,
  getAllPatientsRest,
} from "@/lib/firebaseRestAdmin";
import { generateGoogleCalendarUrl } from "@/lib/calendarUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const previousDate = appData.date;
    const previousSlot = appData.slot;
    const patientName = appData.patientName || "Patient";
    const patientPhone = appData.patientPhone || "";
    const patientEmail = appData.patientEmail || "";
    const serviceId = appData.serviceId || "Physiotherapy Session";
    const assignedTherapist = appData.assignedTherapist || "Dr. Kinnera";

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

    // 4. Update appointment in Firestore via REST
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

    // 6. Trigger Automated WhatsApp & Email notifications asynchronously
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com";

    // WhatsApp Dispatch
    if (patientPhone) {
      fetch(`${baseUrl}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "APPOINTMENT_RESCHEDULED",
          payload: {
            patientName,
            patientPhone,
            newDate,
            newSlot,
            therapistName: assignedTherapist,
          },
        }),
      }).catch((err) => console.warn("[Reschedule WhatsApp] Failed:", err));
    }

    // Email Dispatch
    if (patientEmail) {
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "APPOINTMENT_RESCHEDULED",
          payload: {
            patientName,
            patientEmail,
            serviceId,
            previousSlot: `${previousDate} at ${previousSlot}`,
            newDate,
            newSlot,
            assignedTherapist,
            googleCalendarUrl: calendarUrl,
          },
        }),
      }).catch((err) => console.warn("[Reschedule Email] Failed:", err));
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
