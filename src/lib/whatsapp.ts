/**
 * Gait Physio Clinic - Meta WhatsApp Business Cloud API Integration
 * 
 * Supports:
 * - Transactional patient notifications (Onboarding, Appointments, Reminders)
 * - Clinical Consultation Reports & Prescriptions with native PDF document attachments
 * - Invoices & Payment Receipts with native PDF document attachments
 * - Automated phone number sanitization (India + international)
 * - In-memory media upload for on-the-fly generated jsPDF documents
 */

import { getCleanWhatsAppNumber } from "./phoneUtils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com";
const CLINIC_PHONE = "+91 89044 56243";
const CLINIC_ADDRESS = "Whitefield, Bengaluru (Near Hopefarm)";
const MAPS_URL = "https://maps.google.com/?q=Gait+Physio+Clinic+Whitefield+Bengaluru";

interface WhatsAppSendResponse {
  messaging_product: "whatsapp";
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function getCredentials() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";

  if (!token || !phoneId) {
    return null;
  }
  return { token, phoneId, version };
}

/**
 * Low-level dispatch to Meta Graph API
 */
async function sendRawWhatsAppPayload(payload: any): Promise<SendWhatsAppResult> {
  const creds = getCredentials();
  if (!creds) {
    console.warn("[WhatsApp Cloud API] Credentials missing in environment. Simulating dispatch.");
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
    };
  }

  try {
    const url = `https://graph.facebook.com/${creds.version}/${creds.phoneId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data: WhatsAppSendResponse = await response.json();

    if (!response.ok || data.error) {
      console.error("[WhatsApp Cloud API Error]", data.error);
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
      };
    }

    const messageId = data.messages?.[0]?.id;
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    console.error("[WhatsApp Cloud API Network Exception]", err);
    return {
      success: false,
      error: err.message || "Network error during WhatsApp dispatch",
    };
  }
}

/**
 * Upload binary file buffer directly to Meta WhatsApp Media Endpoint.
 * Returns Meta media ID for attaching to document messages.
 */
export async function uploadWhatsAppMedia(
  buffer: Buffer,
  filename: string,
  mimeType: string = "application/pdf"
): Promise<string | null> {
  const creds = getCredentials();
  if (!creds) return null;

  try {
    const url = `https://graph.facebook.com/${creds.version}/${creds.phoneId}/media`;
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("type", mimeType);
    formData.append("messaging_product", "whatsapp");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      console.error("[WhatsApp Media Upload Failed]", data);
      return null;
    }

    return data.id as string;
  } catch (err) {
    console.error("[WhatsApp Media Upload Exception]", err);
    return null;
  }
}

/**
 * Direct Text Message Dispatch
 */
export async function sendWhatsAppTextMessage(
  rawPhone: string,
  text: string
): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(rawPhone);
  return sendRawWhatsAppPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: true,
      body: text,
    },
  });
}

/**
 * Native Document / PDF Dispatch
 */
export async function sendWhatsAppDocumentMessage(params: {
  rawPhone: string;
  filename: string;
  caption?: string;
  pdfUrl?: string;
  pdfBase64?: string;
}): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(params.rawPhone);

  let mediaId: string | null = null;
  if (params.pdfBase64) {
    try {
      const buffer = Buffer.from(params.pdfBase64, "base64");
      mediaId = await uploadWhatsAppMedia(buffer, params.filename, "application/pdf");
    } catch (e) {
      console.warn("[WhatsApp PDF] Base64 conversion failed, falling back if pdfUrl exists", e);
    }
  }

  const documentPayload: any = {
    filename: params.filename,
    caption: params.caption,
  };

  if (mediaId) {
    documentPayload.id = mediaId;
  } else if (params.pdfUrl) {
    documentPayload.link = params.pdfUrl;
  } else {
    // Fallback: If document cannot be uploaded/linked, send text caption
    if (params.caption) {
      return sendWhatsAppTextMessage(params.rawPhone, params.caption);
    }
    return { success: false, error: "Neither PDF binary nor URL could be attached." };
  }

  return sendRawWhatsAppPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "document",
    document: documentPayload,
  });
}

/**
 * Helper to dispatch an approved Meta WhatsApp Template
 */
export async function sendWhatsAppTemplateMessage(params: {
  rawPhone: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(params.rawPhone);
  return sendRawWhatsAppPayload({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "template",
    template: {
      name: params.templateName,
      language: { code: params.languageCode || "en_US" },
      ...(params.components && params.components.length > 0 ? { components: params.components } : {}),
    },
  });
}

// ============================================================================
// CLINICAL TRANSACTIONAL NOTIFICATION DISPATCHERS
// ============================================================================

/**
 * 1. Patient Welcome & Activation Code
 */
export async function sendWhatsAppPatientOnboarding(params: {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  activationCode: string;
  patientEmail?: string;
}): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(params.patientPhone);
  const portalUrl = `${BASE_URL}/patienthub/login?code=${params.activationCode}`;
  const patientId = params.patientId || "GPC-PATIENT";

  // In the Meta-Approved Template (patient_welcome_gpc):
  // Header: Welcome to Gait Physio Clinic
  // Body: Hello {{1}}, Welcome to Gait Physio Clinic. Your clinical patient record has been registered with ID {{2}}.
  //
  // Meta Cloud API strictly forbids new-line/tab characters inside template parameters.
  // We format parameter {{2}} cleanly on a single line with the canonical URL at the end without trailing punctuation:
  const idAndPortalInfo = params.activationCode
    ? `${patientId} • Activation Code: ${params.activationCode} • Portal: https://www.gaitphysioclinic.com/patienthub/login`
    : `${patientId}`;

  // Primary: Use Meta-Approved Template (patient_welcome_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: cleanPhone,
    templateName: "patient_welcome_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: idAndPortalInfo },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Onboarding Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Welcome to Your Care Portal*

Hello ${params.patientName},

Welcome to Gait Physio Clinic! Your clinical patient record has been created.

🆔 *Patient ID:* ${patientId}
${params.patientEmail ? `📧 *Registered Email:* ${params.patientEmail}\n` : ""}🔑 *Portal Activation Code:* *${params.activationCode}*

📲 *Activate your account in 30 seconds to access your prescribed home exercises, consultation history, and appointments:*
👉 ${portalUrl}

_Please keep this code secure. If you did not request this, please contact our clinic at ${CLINIC_PHONE}._`;

  return sendWhatsAppTextMessage(cleanPhone, text);
}

/**
 * 2. Appointment Booking Request Received (Online Booking)
 */
export async function sendWhatsAppBookingReceived(params: {
  patientName: string;
  patientPhone: string;
  date: string;
  slot: string;
  serviceName?: string;
}): Promise<SendWhatsAppResult> {
  // Primary: Use Meta-Approved Template (booking_request_received_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "booking_request_received_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: params.serviceName || "General Consultation" },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Booking Received Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Appointment Request Received*

Hello ${params.patientName},

We have received your appointment request. Our reception team is reviewing our schedule and will confirm your slot shortly.

📋 *Booking Details:*
• 📅 *Requested Date:* ${params.date}
• ⏰ *Requested Slot:* ${params.slot}
• 🩺 *Service / Department:* ${params.serviceName || "Physiotherapy Consultation"}
• 📍 *Location:* ${CLINIC_ADDRESS}

⏳ *Status:* Pending Clinic Approval

You will receive an official confirmation message once your slot is confirmed.`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 3. Appointment Approved & Confirmed
 */
export async function sendWhatsAppAppointmentConfirmed(params: {
  patientName: string;
  patientPhone: string;
  date: string;
  slot: string;
  therapistName?: string;
  serviceName?: string;
}): Promise<SendWhatsAppResult> {
  const cleanTherapist = (params.therapistName || "Lead Physiotherapist").replace(/^Dr\.?\s*/i, "");

  // Primary: Use Meta-Approved Template (appointment_confirmation_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_confirmation_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: cleanTherapist },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Appointment Confirmed Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Appointment Confirmed*

Hello ${params.patientName},

Great news! Your physiotherapy appointment has been officially confirmed.

📋 *Appointment Details:*
• 📅 *Date:* ${params.date}
• ⏰ *Time Slot:* ${params.slot}
• 👨‍⚕️ *Therapist:* Dr. ${cleanTherapist}
• 🩺 *Session:* ${params.serviceName || "Clinical Physiotherapy"}
• 📍 *Clinic Address:* ${CLINIC_ADDRESS}

🧭 *Google Maps Location:*
👉 ${MAPS_URL}

💡 *Tips for your session:*
Please arrive 5–10 minutes early in comfortable clothing suitable for physical movement.

Need to reschedule? Call or WhatsApp our desk at ${CLINIC_PHONE}.`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 4. Front-Desk Walk-in Booking Confirmed
 */
export async function sendWhatsAppWalkinConfirmed(params: {
  patientName: string;
  patientPhone: string;
  date: string;
  slot: string;
  serviceName?: string;
}): Promise<SendWhatsAppResult> {
  // Primary: Use Meta-Approved Template (walkin_confirmation_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "walkin_confirmation_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: params.serviceName || "Physiotherapy Session" },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Walkin Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Walk-in Registration Confirmed*

Hello ${params.patientName},

Your walk-in appointment registration at Gait Physio Clinic has been successfully confirmed.

📋 *Session Details:*
• 📅 *Date:* ${params.date}
• ⏰ *Assigned Slot:* ${params.slot}
• 🩺 *Service:* ${params.serviceName || "Clinical Consultation"}
• 📍 *Consulting Room:* Main Therapy Hall

Our care team will call your token shortly. Thank you for visiting Gait Physio Clinic!`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 5. Appointment Rescheduled Notice
 */
export async function sendWhatsAppAppointmentRescheduled(params: {
  patientName: string;
  patientPhone: string;
  newDate: string;
  newSlot: string;
  therapistName?: string;
}): Promise<SendWhatsAppResult> {
  const cleanTherapist = (params.therapistName || "Lead Physiotherapist").replace(/^Dr\.?\s*/i, "");

  // Primary: Use Meta-Approved Template (appointment_confirmation_gpc) with new details
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_confirmation_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.newDate },
          { type: "text", text: params.newSlot },
          { type: "text", text: cleanTherapist },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Reschedule Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Appointment Schedule Update*

Hello ${params.patientName},

Your appointment with Gait Physio Clinic has been rescheduled as requested.

📋 *Updated Schedule:*
• 📅 *New Date:* ${params.newDate}
• ⏰ *New Time Slot:* ${params.newSlot}
• 👨‍⚕️ *Therapist:* Dr. ${cleanTherapist}
• 📍 *Location:* ${CLINIC_ADDRESS}

We look forward to seeing you at your updated slot. If you need any further adjustments, please contact us at ${CLINIC_PHONE}.`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 5b. Appointment Rejected / Cancelled Notice
 */
export async function sendWhatsAppAppointmentRejected(params: {
  patientName: string;
  patientPhone: string;
  date: string;
  slot: string;
  serviceName?: string;
  reason?: string;
}): Promise<SendWhatsAppResult> {
  // Primary: Use Meta-Approved Template (appointment_cancellation_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_cancellation_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: params.reason || "schedule adjustment" },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Cancellation Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Appointment Cancellation Notice*

Hello ${params.patientName},

We regret to inform you that your appointment request at Gait Physio Clinic for *${params.date} at ${params.slot}* has been cancelled.

📋 *Reason:* ${params.reason || "Schedule conflict or clinic slot capacity limits."}

We sincerely apologize for any inconvenience. If you would like to reschedule for an alternative date or time slot, our desk is happy to help:

📞 *Call or WhatsApp:* ${CLINIC_PHONE}
🌐 *Book Online:* ${BASE_URL}/book

_Thank you for choosing Gait Physio Clinic!_`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 6. Pre-Session Appointment Reminder
 */
export async function sendWhatsAppAppointmentReminder(params: {
  patientName: string;
  patientPhone: string;
  slot: string;
  therapistName?: string;
}): Promise<SendWhatsAppResult> {
  const cleanTherapist = (params.therapistName || "Lead Physiotherapist").replace(/^Dr\.?\s*/i, "");

  // Primary: Use Meta-Approved Template (session_reminder_gpc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "session_reminder_gpc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.slot },
          { type: "text", text: cleanTherapist },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Reminder Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Upcoming Session Reminder*

Hi ${params.patientName},

This is a gentle reminder that your physiotherapy session is scheduled for *today at ${params.slot}*.

📋 *Session Summary:*
• ⏰ *Time:* ${params.slot}
• 👨‍⚕️ *Therapist:* Dr. ${cleanTherapist}
• 📍 *Clinic:* Gait Physio Clinic, Whitefield

Please bring any recent MRI/X-ray reports or comfortable exercise clothing if needed.

Need directions? Tap here: ${MAPS_URL}`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 7. Invoice & Payment Receipt (With PDF Attachment via Meta Template)
 */
export async function sendWhatsAppInvoiceDelivery(params: {
  patientName: string;
  patientPhone: string;
  invoiceNumber: string;
  date: string;
  amount: number | string;
  serviceName?: string;
  replacesInvoiceNumber?: string;
  pdfBase64?: string;
  pdfUrl?: string;
}): Promise<SendWhatsAppResult> {
  const cleanDate = params.date ? params.date.replace(/[^a-zA-Z0-9]/g, "_") : "Bill";
  const filename = `Invoice_${params.invoiceNumber || cleanDate}.pdf`;

  let mediaId: string | null = null;
  if (params.pdfBase64) {
    try {
      const buffer = Buffer.from(params.pdfBase64, "base64");
      mediaId = await uploadWhatsAppMedia(buffer, filename, "application/pdf");
    } catch (e) {
      console.warn("[WhatsApp PDF] Base64 upload failed:", e);
    }
  }

  // Primary: Use Meta-Approved Template (invoice_receipt_pdf) with document header
  if (mediaId || params.pdfUrl) {
    const docParam = mediaId
      ? { id: mediaId, filename }
      : { link: params.pdfUrl, filename };

    const templateRes = await sendWhatsAppTemplateMessage({
      rawPhone: params.patientPhone,
      templateName: "invoice_receipt_pdf",
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: docParam,
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: params.patientName },
            { type: "text", text: params.invoiceNumber },
            { type: "text", text: params.date },
            { type: "text", text: String(params.amount) },
          ],
        },
      ],
    });

    if (templateRes.success) return templateRes;
    console.warn("[WhatsApp Invoice Template Failed, falling back to direct document]", templateRes.error);
  }

  // Fallback: direct document message or plain text
  const isReplacement = Boolean(params.replacesInvoiceNumber);
  const caption = isReplacement
    ? `🏥 *GAIT PHYSIO CLINIC*
*Updated Payment Receipt & Invoice*

Hello ${params.patientName},

⚠️ *Important Billing Notice:*
This updated invoice replaces your previous bill *${params.replacesInvoiceNumber}*, which was cancelled due to a clerical correction. You have NOT been charged twice.

🧾 *New Invoice Number:* ${params.invoiceNumber}
🔄 *Replaces Cancelled Bill:* ${params.replacesInvoiceNumber}
📅 *Date of Issue:* ${params.date}
💰 *Total Amount:* ₹${params.amount}
🩺 *Service Rendered:* ${params.serviceName || "Physiotherapy Treatment"}
💳 *Payment Status:* PAID (Complete)

📎 *Your fresh, corrected Invoice PDF is attached above.*

_Thank you for choosing Gait Physio Clinic!_`
    : `🏥 *GAIT PHYSIO CLINIC*
*Payment Receipt & Invoice*

Hello ${params.patientName},

Thank you for your payment. Here is the summary of your clinic bill:

🧾 *Invoice Number:* ${params.invoiceNumber}
📅 *Date of Issue:* ${params.date}
💰 *Amount Paid:* ₹${params.amount}
🩺 *Service Rendered:* ${params.serviceName || "Physiotherapy Consultation"}
💳 *Payment Status:* PAID (Complete)

📎 *Your official Invoice PDF is attached above for your records.*

_Thank you for choosing Gait Physio Clinic for your recovery journey!_`;

  if (params.pdfBase64 || params.pdfUrl) {
    return sendWhatsAppDocumentMessage({
      rawPhone: params.patientPhone,
      filename,
      caption,
      pdfBase64: params.pdfBase64,
      pdfUrl: params.pdfUrl,
    });
  }

  return sendWhatsAppTextMessage(params.patientPhone, caption);
}

/**
 * 7b. Invoice Cancellation / Void Notice
 */
export async function sendWhatsAppInvoiceVoidNotice(params: {
  patientName: string;
  patientPhone: string;
  invoiceNumber: string;
  amount: number | string;
  serviceDate: string;
  voidReason?: string;
}): Promise<SendWhatsAppResult> {
  const text = 
`🏥 *GAIT PHYSIO CLINIC*
*Billing Notice — Invoice Cancelled*

Hello ${params.patientName},

This is an official notification to inform you that invoice *${params.invoiceNumber}* for ₹${params.amount} has been marked as *CANCELLED / VOIDED* in our clinic records.

📋 *Reason:* ${params.voidReason || "Clerical correction / bill updated"}

If a replacement bill is required, our billing desk will issue a fresh receipt to you shortly.

For any queries, please reply to this chat or call ${CLINIC_PHONE}.`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 8. Clinical Consultation & Prescription (With PDF Attachment via Meta Template)
 */
export async function sendWhatsAppConsultationReport(params: {
  patientName: string;
  patientPhone: string;
  date: string;
  therapistName?: string;
  diagnosis?: string;
  summary?: string;
  exercisesCount?: number;
  pdfBase64?: string;
  pdfUrl?: string;
}): Promise<SendWhatsAppResult> {
  const cleanDate = params.date ? params.date.replace(/[^a-zA-Z0-9]/g, "_") : "Report";
  const filename = `Prescription_${cleanDate}.pdf`;
  const cleanTherapist = (params.therapistName || "Lead Physiotherapist").replace(/^Dr\.?\s*/i, "");

  let mediaId: string | null = null;
  if (params.pdfBase64) {
    try {
      const buffer = Buffer.from(params.pdfBase64, "base64");
      mediaId = await uploadWhatsAppMedia(buffer, filename, "application/pdf");
    } catch (e) {
      console.warn("[WhatsApp PDF] Base64 upload failed:", e);
    }
  }

  // Primary: Use Meta-Approved Template (consultation_report_pdf) with document header
  if (mediaId || params.pdfUrl) {
    const docParam = mediaId
      ? { id: mediaId, filename }
      : { link: params.pdfUrl, filename };

    const templateRes = await sendWhatsAppTemplateMessage({
      rawPhone: params.patientPhone,
      templateName: "consultation_report_pdf",
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: docParam,
            },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: params.patientName },
            { type: "text", text: params.date },
            { type: "text", text: cleanTherapist },
          ],
        },
      ],
    });

    if (templateRes.success) return templateRes;
    console.warn("[WhatsApp Consultation Template Failed, falling back to direct document]", templateRes.error);
  }

  // Fallback: direct document message or plain text
  const caption = 
`🏥 *GAIT PHYSIO CLINIC*
*Clinical Consultation & Exercise Routine*

Hello ${params.patientName},

Your clinical consultation assessment and personalized rehabilitation plan for *${params.date}* has been finalized.

👨‍⚕️ *Attending Therapist:* Dr. ${cleanTherapist}
📋 *Diagnosis / Focus:* ${params.diagnosis || "Physiotherapy Rehabilitation"}
🏋️ *Prescribed Exercises:* ${params.exercisesCount || 0} Exercises

📎 *Your official Consultation & Prescription PDF is attached above for your records.*

📲 *You can view step-by-step video demonstrations of your prescribed exercises in your Patient Hub:*
👉 ${BASE_URL}/patienthub/exercises

Need to ask a follow-up question? Simply reply to this chat or call our clinic desk at ${CLINIC_PHONE}.`;

  if (params.pdfBase64 || params.pdfUrl) {
    return sendWhatsAppDocumentMessage({
      rawPhone: params.patientPhone,
      filename,
      caption,
      pdfBase64: params.pdfBase64,
      pdfUrl: params.pdfUrl,
    });
  }

  return sendWhatsAppTextMessage(params.patientPhone, caption);
}
