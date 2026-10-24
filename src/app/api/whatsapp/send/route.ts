import { verifyFirebaseIdTokenRest, getFirestoreDocRest, patchFirestoreDocRest } from "@/lib/firebaseRestAdmin";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
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
      const decoded = await verifyFirebaseIdTokenRest(bearerToken);
      if (decoded?.uid) {
        const userDoc = await getFirestoreDocRest("users", decoded.uid);
        if (userDoc && ["admin", "receptionist", "doctor", "staff"].includes(userDoc.role)) {
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

      case "CUSTOM_TEXT": {
        const authorized = await isAuthorizedStaff(req);
        if (!authorized) {
          return NextResponse.json(
            { success: false, error: "Access denied. Valid staff credentials required to send custom WhatsApp messages." },
            { status: 401 }
          );
        }
        result = await sendWhatsAppTextMessage(phone, payload.text || payload.message);
        break;
      }

      case "CUSTOM_DOCUMENT": {
        const authorized = await isAuthorizedStaff(req);
        if (!authorized) {
          return NextResponse.json(
            { success: false, error: "Access denied. Valid staff credentials required to dispatch custom documents." },
            { status: 401 }
          );
        }
        result = await sendWhatsAppDocumentMessage({
          rawPhone: phone,
          filename: payload.filename || "Document.pdf",
          caption: payload.caption,
          pdfUrl: payload.pdfUrl,
          pdfBase64: payload.pdfBase64,
        });
        break;
      }

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
