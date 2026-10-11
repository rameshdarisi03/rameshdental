import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppPatientOnboarding,
  sendWhatsAppBookingReceived,
  sendWhatsAppAppointmentConfirmed,
  sendWhatsAppAppointmentRejected,
  sendWhatsAppWalkinConfirmed,
  sendWhatsAppAppointmentRescheduled,
  sendWhatsAppAppointmentReminder,
  sendWhatsAppInvoiceDelivery,
  sendWhatsAppInvoiceVoidNotice,
  sendWhatsAppConsultationReport,
  sendWhatsAppTextMessage,
  sendWhatsAppDocumentMessage,
} from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, payload } = body;

    if (!type || !payload) {
      return NextResponse.json(
        { success: false, error: "Missing 'type' or 'payload' in WhatsApp request." },
        { status: 400 }
      );
    }

    if (!payload.patientPhone && !payload.to && !payload.rawPhone) {
      return NextResponse.json(
        { success: false, error: "Missing recipient phone number in WhatsApp payload." },
        { status: 400 }
      );
    }

    // Standardize phone field
    const phone = payload.patientPhone || payload.to || payload.rawPhone;
    payload.patientPhone = phone;

    let result;

    switch (type) {
      case "PATIENT_ONBOARDING":
        result = await sendWhatsAppPatientOnboarding({
          ...payload,
          patientId: payload.patientId || payload.id,
        });
        break;

      case "BOOKING_RECEIVED":
        result = await sendWhatsAppBookingReceived(payload);
        break;

      case "APPOINTMENT_APPROVED":
      case "APPOINTMENT_CONFIRMED":
        result = await sendWhatsAppAppointmentConfirmed(payload);
        break;

      case "APPOINTMENT_REJECTED":
      case "APPOINTMENT_CANCELLED":
        result = await sendWhatsAppAppointmentRejected(payload);
        break;

      case "WALKIN_CONFIRMED":
        result = await sendWhatsAppWalkinConfirmed(payload);
        break;

      case "APPOINTMENT_RESCHEDULED":
        result = await sendWhatsAppAppointmentRescheduled(payload);
        break;

      case "APPOINTMENT_REMINDER":
        result = await sendWhatsAppAppointmentReminder(payload);
        break;

      case "INVOICE_DELIVERY":
        result = await sendWhatsAppInvoiceDelivery(payload);
        break;

      case "INVOICE_VOID_NOTICE":
        result = await sendWhatsAppInvoiceVoidNotice(payload);
        break;

      case "CONSULTATION_REPORT":
        result = await sendWhatsAppConsultationReport(payload);
        break;

      case "CUSTOM_TEXT":
        result = await sendWhatsAppTextMessage(phone, payload.text || payload.message);
        break;

      case "CUSTOM_DOCUMENT":
        result = await sendWhatsAppDocumentMessage({
          rawPhone: phone,
          filename: payload.filename || "Document.pdf",
          caption: payload.caption,
          pdfUrl: payload.pdfUrl,
          pdfBase64: payload.pdfBase64,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported WhatsApp notification type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API WhatsApp Route Error]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch WhatsApp message." },
      { status: 500 }
    );
  }
}
