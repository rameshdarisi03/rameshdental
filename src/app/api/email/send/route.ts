import { NextRequest, NextResponse } from "next/server";
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

      case "CUSTOM":
        result = await sendEmail(payload);
        break;

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
