import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { generateGoogleCalendarUrl } from "@/lib/calendarUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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

    const { db } = getFirebaseAdmin();
    const appRef = db.collection("appointments").doc(appointmentId);
    const appSnap = await appRef.get();

    if (!appSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Appointment not found." },
        { status: 404 }
      );
    }

    const appData = appSnap.data() || {};
    const previousDate = appData.date;
    const previousSlot = appData.slot;
    const patientName = appData.patientName || "Patient";
    const patientPhone = appData.patientPhone || "";
    const patientEmail = appData.patientEmail || "";
    const serviceId = appData.serviceId || "Physiotherapy Session";
    const assignedTherapist = appData.assignedTherapist || "Dr. Kinnera";

    // 1. Check Capacity on target date and slot
    // Fetch clinic config
    const configSnap = await db.collection("clinic_settings").doc("config").get();
    const config = configSnap.data() || {};
    const maxCapacity = config.defaultSlotCapacity || 2;

    // Check existing approved appointments for new date & slot
    const altNewDate = newDate.includes("-") ? newDate.split("-").reverse().join("-") : newDate;
    const dateList = Array.from(new Set([newDate, altNewDate]));

    const existingApps = await db
      .collection("appointments")
      .where("date", "in", dateList)
      .where("slot", "==", newSlot)
      .where("status", "==", "approved")
      .get();

    // Filter out this appointment itself if re-booking same date
    const conflicting = existingApps.docs.filter((d) => d.id !== appointmentId);
    if (conflicting.length >= maxCapacity) {
      return NextResponse.json(
        { success: false, error: "The selected time slot is fully booked. Please choose an alternative slot." },
        { status: 409 }
      );
    }

    // 2. Check blocks on new date & slot
    const blocksSnap = await db
      .collection("blocks")
      .where("date", "in", dateList)
      .get();

    let isBlocked = false;
    blocksSnap.forEach((docSnap) => {
      const block = docSnap.data();
      if (block.type === "full_day" || block.type === "holiday") {
        isBlocked = true;
      } else if (block.type === "slot" && block.slot === newSlot) {
        isBlocked = true;
      }
    });

    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: "The selected slot is unavailable due to clinic closures. Please choose another slot." },
        { status: 409 }
      );
    }

    // 3. Update appointment in Firestore
    // By updating 'date' and 'slot', the old date & slot are instantly released and freed up for others!
    const now = Timestamp.now();
    await appRef.update({
      date: newDate,
      slot: newSlot,
      status: "approved", // Confirmed on reschedule
      previousDate: previousDate || "",
      previousSlot: previousSlot || "",
      rescheduledAt: now,
      rescheduledBy: actionedBy,
      rescheduledByRole: actionedByRole,
      rescheduleReason: reason,
      actionedAt: now,
      actionedByName: actionedBy,
      actionedByRole: actionedByRole,
      rejectionReason: FieldValue.delete(),
    });

    // 4. Update corresponding patient's upcoming date in 'patients' collection
    try {
      let patientQuery = null;
      if (patientPhone) {
        // Digits clean
        const phoneDigits = patientPhone.replace(/\D/g, "").slice(-10);
        const patientsSnap = await db.collection("patients").get();
        const matched = patientsSnap.docs.find((pDoc) => {
          const p = pDoc.data();
          const pDigits = (p.phone || "").replace(/\D/g, "").slice(-10);
          return pDigits && pDigits === phoneDigits;
        });
        if (matched) {
          patientQuery = matched.ref;
        }
      }

      if (patientQuery) {
        await patientQuery.update({
          upcoming: `${newDate} (${newSlot})`,
          lastRescheduledAt: now,
        });
      }
    } catch (e) {
      console.warn("[Reschedule] Non-critical error updating patient doc upcoming:", e);
    }

    const calendarUrl = generateGoogleCalendarUrl({
      date: newDate,
      slot: newSlot,
      serviceId,
      patientName,
    });

    // 5. Trigger Automated WhatsApp & Email notifications asynchronously
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com";

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
