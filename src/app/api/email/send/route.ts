import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  sendPatientOnboardingEmail,
  sendBookingRequestReceivedEmail,
  sendAdminNewBookingAlertEmail,
  sendAppointmentApprovalEmail,
  sendWalkinBookingConfirmationEmail,
  sendAppointmentRejectionEmail,
  sendAppointmentRescheduledEmail,
  sendPreSessionReminderEmail,
  sendInvoiceDeliveryEmail,
  sendInvoiceVoidNoticeEmail,
  sendConsultationReportEmail,
  sendEmail,
} from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const { auth, db } = getFirebaseAdmin();
      const decoded = await auth.verifyIdToken(bearerToken);
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (["admin", "receptionist", "doctor", "staff"].includes(role)) {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: "Missing 'type' or 'payload' in request." },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "PATIENT_ONBOARDING":
        result = await sendPatientOnboardingEmail(payload);
        break;

      case "BOOKING_RECEIVED":
        // Sends to patient
        result = await sendBookingRequestReceivedEmail(payload);
        // Also fire admin alert in the background
        if (payload.notifyAdmin !== false) {
          sendAdminNewBookingAlertEmail(payload).catch((err) =>
            console.warn("Failed to send admin booking alert:", err)
          );
        }
        break;

      case "APPOINTMENT_APPROVED":
        result = await sendAppointmentApprovalEmail(payload);
        break;

      case "WALKIN_CONFIRMED":
        result = await sendWalkinBookingConfirmationEmail(payload);
        break;

      case "APPOINTMENT_REJECTED":
        result = await sendAppointmentRejectionEmail(payload);
        break;

      case "APPOINTMENT_RESCHEDULED":
        result = await sendAppointmentRescheduledEmail(payload);
        break;

      case "APPOINTMENT_REMINDER":
        result = await sendPreSessionReminderEmail(payload);
        break;

      case "INVOICE_DELIVERY":
        result = await sendInvoiceDeliveryEmail(payload);
        break;

      case "INVOICE_VOID_NOTICE":
        result = await sendInvoiceVoidNoticeEmail(payload);
        break;

      case "CONSULTATION_REPORT":
        result = await sendConsultationReportEmail(payload);
        break;

      case "CUSTOM": {
        const authorized = await isAuthorizedStaff(req);
        if (!authorized) {
          return NextResponse.json(
            { success: false, error: "Access denied. Valid staff credentials required to send custom emails." },
            { status: 401 }
          );
        }
        result = await sendEmail(payload);
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported email type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API Email Route Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process email dispatch." },
      { status: 500 }
    );
  }
}
