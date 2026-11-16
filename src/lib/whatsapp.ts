/**
 * Ramesh Dental Clinic - Meta WhatsApp Business Cloud API Integration
 * 
 * Supports:
 * - Transactional patient notifications (Onboarding, Appointments, Reminders)
 * - Clinical Consultation Reports & Prescriptions with native PDF document attachments
 * - Invoices & Payment Receipts with native PDF document attachments
 * - Automated phone number sanitization (India + international)
 * - In-memory media upload for on-the-fly generated jsPDF documents
 */

import { getCleanWhatsAppNumber } from "./phoneUtils";
import { encodeCalendarToken } from "./calendarUtils";
import { CLINIC_BRAND } from "./clinicBranding";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rameshdental.vercel.app";
const CLINIC_PHONE = CLINIC_BRAND.phone;
const CLINIC_ADDRESS = CLINIC_BRAND.addressLine;
const MAPS_URL = "https://maps.google.com/?q=Ramesh+Dental+Clinic+Whitefield+Bengaluru";

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
  // Header: Welcome to Ramesh Dental Clinic
  // Body: Hello {{1}}, Welcome to Ramesh Dental Clinic. Your clinical patient record has been registered with ID {{2}}.
  //
  // Meta Cloud API strictly forbids new-line/tab characters inside template parameters.
  // We format parameter {{2}} cleanly on a single line with the canonical URL at the end without trailing punctuation:
  const idAndPortalInfo = params.activationCode
    ? `${patientId} • Activation Code: ${params.activationCode} • Portal: https://rameshdental.vercel.app/patienthub/login`
    : `${patientId}`;

  // Primary: Use Meta-Approved Template (patient_welcome_rdc, fallback patient_welcome_gpc)
  let templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: cleanPhone,
    templateName: "patient_welcome_rdc",
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

  if (!templateRes.success) {
    templateRes = await sendWhatsAppTemplateMessage({
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
  }

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Onboarding Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Welcome to Your Care Portal*

Hello ${params.patientName},

Welcome to Ramesh Dental Clinic! Your clinical patient record has been created.

🆔 *Patient ID:* ${patientId}
${params.patientEmail ? `📧 *Registered Email:* ${params.patientEmail}\n` : ""}🔑 *Portal Activation Code:* *${params.activationCode}*

📲 *Activate your account in 30 seconds to access your dental records, treatment plans, prescriptions, and appointments:*
👉 ${portalUrl}

_Please keep this code secure. If you did not request this, please contact our clinic at ${CLINIC_PHONE}._`;

  return sendWhatsAppTextMessage(cleanPhone, text);
}

/**
 * Dispatch Patient Hub Login / Verification OTP
 * Uses approved Meta template to guarantee immediate delivery outside 24h window
 */
export async function sendWhatsAppOtpCode(params: {
  patientPhone: string;
  patientName: string;
  patientId?: string;
  otp: string;
}): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(params.patientPhone);
  const patientId = params.patientId || "RDC-PATIENT";

  // Tier 1: Dedicated official authentication template (patient_authcode_rdc, fallback patient_authcode_gpc)
  // Approved in "en" with native Copy Code button
  for (const authTmpl of ["patient_authcode_rdc", "patient_authcode_gpc"]) {
    try {
      const authRes = await sendWhatsAppTemplateMessage({
        rawPhone: cleanPhone,
        templateName: authTmpl,
        languageCode: "en",
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: params.otp }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "text", text: params.otp }],
          },
        ],
      });
      if (authRes.success) {
        console.log(`[WhatsApp OTP] Successfully dispatched ${authTmpl} to ${cleanPhone} (Msg ID: ${authRes.messageId})`);
        return authRes;
      }
    } catch (err: any) {
      console.warn(`[WhatsApp OTP] ${authTmpl} exception:`, err?.message);
    }
  }

  // Tier 2: Use guaranteed utility template fallback (patient_welcome_rdc or patient_welcome_gpc)
  // This delivers 100% reliably to any patient outside the 24h window
  for (const welcomeTmpl of ["patient_welcome_rdc", "patient_welcome_gpc"]) {
    try {
      const detail = `${patientId} • Login OTP: ${params.otp}`;
      const welcomeRes = await sendWhatsAppTemplateMessage({
        rawPhone: cleanPhone,
        templateName: welcomeTmpl,
        languageCode: "en",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: params.patientName },
              { type: "text", text: detail },
            ],
          },
        ],
      });

      if (welcomeRes.success) return welcomeRes;
    } catch (tmplErr) {
      console.warn(`[WhatsApp OTP] ${welcomeTmpl} fallback attempt failed:`, tmplErr);
    }
  }

  // Tier 3: Direct text fallback
  const message = `🦷 *RAMESH DENTAL CLINIC*\n*Patient Hub Verification Code*\n\nHello ${params.patientName},\n\nYour 6-digit login verification code is: *${params.otp}*\n\n⏱️ _Valid for 5 minutes. Do not share this code with anyone._`;
  return sendWhatsAppTextMessage(cleanPhone, message);
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
  // Primary: Use Meta-Approved Template (booking_request_received_rdc, fallback booking_request_received_gpc)
  let templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "booking_request_received_rdc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: params.serviceName || "Dental Consultation" },
        ],
      },
    ],
  });

  if (!templateRes.success) {
    templateRes = await sendWhatsAppTemplateMessage({
      rawPhone: params.patientPhone,
      templateName: "booking_request_received_gpc",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.patientName },
            { type: "text", text: params.date },
            { type: "text", text: params.slot },
            { type: "text", text: params.serviceName || "Dental Consultation" },
          ],
        },
      ],
    });
  }

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Booking Received Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Appointment Request Received*

Hello ${params.patientName},

We have received your appointment request. Our reception team is reviewing our schedule and will confirm your slot shortly.

📋 *Booking Details:*
• 📅 *Requested Date:* ${params.date}
• ⏰ *Requested Slot:* ${params.slot}
• 🩺 *Service / Department:* ${params.serviceName || "Dental Consultation"}
• 📍 *Location:* ${CLINIC_ADDRESS}

⏳ *Status:* Pending Clinic Approval

You will receive an official confirmation message once your slot is confirmed.`;

  return sendWhatsAppTextMessage(params.patientPhone, text);
}

/**
 * 2b. Appointment Reschedule Request Received (Pending Clinic Approval)
 */
export async function sendWhatsAppRescheduleRequestReceived(params: {
  patientName: string;
  patientPhone: string;
  requestedDate: string;
  requestedSlot: string;
  serviceName?: string;
}): Promise<SendWhatsAppResult> {
  // 1. Primary: Attempt dedicated Meta-Approved Template (reschedule_request_received_rdc)
  let templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "reschedule_request_received_rdc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.requestedDate },
          { type: "text", text: params.requestedSlot },
          { type: "text", text: params.serviceName || "Dental Consultation" },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Reschedule Request Template not active/approved yet, attempting booking_request_received_rdc fallback]:", templateRes.error);

  // 2. Safe interim fallback: Use already approved booking_request_received_rdc template
  templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "booking_request_received_rdc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.requestedDate },
          { type: "text", text: params.requestedSlot },
          { type: "text", text: `${params.serviceName || "Dental Care"} (Reschedule Request)` },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;

  // 3. Fallback to direct text message
  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Reschedule Request Received*

Hello ${params.patientName},

We have received your request to reschedule your dental appointment.

📋 *Requested New Timing:*
• 📅 *New Date:* ${params.requestedDate}
• ⏰ *New Time Slot:* ${params.requestedSlot}
• 🩺 *Service:* ${params.serviceName || "Dental Consultation"}
• 📍 *Clinic Location:* ${CLINIC_ADDRESS}

⏳ *Status:* Pending Clinic Approval

Our team is reviewing dentist availability and will confirm your updated slot shortly.
Need immediate assistance? Call us directly at ${CLINIC_PHONE}.`;

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
  appointmentId?: string;
}): Promise<SendWhatsAppResult> {
  const cleanTherapist = (params.therapistName || "Ramesh Darisi").replace(/^Dr\.?\s*/i, "");

  // Generate URL-safe slug for dynamic "Add to Calendar" button (Button 0)
  // Button 1 ("Get Location") is a static URL pre-configured in Meta WhatsApp Manager.
  const calendarSlug = encodeCalendarToken({
    id: params.appointmentId,
    patientName: params.patientName,
    date: params.date,
    slot: params.slot,
    therapistName: cleanTherapist,
    serviceName: params.serviceName,
  });

  // Attempt 1: Dispatch with "Add to Calendar" dynamic button component
  let templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_confirmation_rdc",
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
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: calendarSlug },
        ],
      },
    ],
  });

  // Fallback 1b: If template with buttons is pending review in Meta, fallback to body-only parameters
  if (!templateRes.success) {
    console.warn("[WhatsApp Confirmed with buttons note, attempting body-only]", templateRes.error);
    templateRes = await sendWhatsAppTemplateMessage({
      rawPhone: params.patientPhone,
      templateName: "appointment_confirmation_rdc",
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
  }

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Appointment Confirmed Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Appointment Confirmed*

Hello ${params.patientName},

Great news! Your dental appointment has been officially confirmed.

📋 *Appointment Details:*
• 📅 *Date:* ${params.date}
• ⏰ *Time Slot:* ${params.slot}
• 👨‍⚕️ *Dentist:* Dr. ${cleanTherapist}
• 🩺 *Treatment:* ${params.serviceName || "Dental Consultation"}
• 📍 *Clinic Address:* ${CLINIC_ADDRESS}

🧭 *Google Maps Location:*
👉 ${MAPS_URL}

💡 *Tips for your visit:*
Please arrive 5–10 minutes early. Brush your teeth before visiting for optimal examination.

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
    templateName: "walkin_confirmation_rdc",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: params.patientName },
          { type: "text", text: params.date },
          { type: "text", text: params.slot },
          { type: "text", text: params.serviceName || "Dental Consultation" },
        ],
      },
    ],
  });

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Walkin Template Failed, attempting text fallback]", templateRes.error);

  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Walk-in Registration Confirmed*

Hello ${params.patientName},

Your walk-in appointment registration at Ramesh Dental Clinic has been successfully confirmed.

📋 *Session Details:*
• 📅 *Date:* ${params.date}
• ⏰ *Assigned Slot:* ${params.slot}
• 🩺 *Service:* ${params.serviceName || "Dental Consultation"}
• 📍 *Consulting Room:* Dental Operatory

Our care team will call your token shortly. Thank you for visiting Ramesh Dental Clinic!`;

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
  serviceName?: string;
  appointmentId?: string;
}): Promise<SendWhatsAppResult> {
  const cleanTherapist = (params.therapistName || "Ramesh Darisi").replace(/^Dr\.?\s*/i, "");

  // Generate URL-safe slug for dynamic "Add to Calendar" button (Button 0)
  // Button 1 ("Get Location") is a static URL pre-configured in Meta WhatsApp Manager.
  const calendarSlug = encodeCalendarToken({
    id: params.appointmentId,
    patientName: params.patientName,
    date: params.newDate,
    slot: params.newSlot,
    therapistName: cleanTherapist,
    serviceName: params.serviceName,
  });

  // Attempt 1: Use Meta-Approved Dedicated Rescheduled Template with buttons
  let templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_rescheduled_rdc",
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
      {
        type: "button",
        sub_type: "url",
        index: "0",
        parameters: [
          { type: "text", text: calendarSlug },
        ],
      },
    ],
  });

  // Fallback 1b: If template with buttons is pending review in Meta, fallback to body-only parameters
  if (!templateRes.success) {
    console.warn("[WhatsApp Reschedule with buttons note, attempting body-only]", templateRes.error);
    templateRes = await sendWhatsAppTemplateMessage({
      rawPhone: params.patientPhone,
      templateName: "appointment_rescheduled_rdc",
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
  }

  if (templateRes.success) return templateRes;
  console.warn("[WhatsApp Reschedule Template Failed, attempting confirmation template fallback]", templateRes.error);

  // Secondary fallback: appointment_confirmation_rdc
  const fallbackTmpl = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_confirmation_rdc",
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
  if (fallbackTmpl.success) return fallbackTmpl;

  const text = 
`🦷 *RAMESH DENTAL CLINIC*
*Appointment Schedule Update*

Hello ${params.patientName},

Your appointment with Ramesh Dental Clinic has been rescheduled as requested.

📋 *Updated Schedule:*
• 📅 *New Date:* ${params.newDate}
• ⏰ *New Time Slot:* ${params.newSlot}
• 👨‍⚕️ *Dentist:* Dr. ${cleanTherapist}
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
  // Primary: Use Meta-Approved Template (appointment_cancellation_rdc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "appointment_cancellation_rdc",
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
`🦷 *RAMESH DENTAL CLINIC*
*Appointment Cancellation Notice*

Hello ${params.patientName},

We regret to inform you that your appointment request at Ramesh Dental Clinic for *${params.date} at ${params.slot}* has been cancelled.

📋 *Reason:* ${params.reason || "Schedule conflict or clinic slot capacity limits."}

We sincerely apologize for any inconvenience. If you would like to reschedule for an alternative date or time slot, our desk is happy to help:

📞 *Call or WhatsApp:* ${CLINIC_PHONE}
🌐 *Book Online:* ${BASE_URL}/book

_Thank you for choosing Ramesh Dental Clinic!_`;

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
  const cleanTherapist = (params.therapistName || "Ramesh Darisi").replace(/^Dr\.?\s*/i, "");

  // Primary: Use Meta-Approved Template (session_reminder_rdc)
  const templateRes = await sendWhatsAppTemplateMessage({
    rawPhone: params.patientPhone,
    templateName: "session_reminder_rdc",
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
`🦷 *RAMESH DENTAL CLINIC*
*Upcoming Session Reminder*

Hi ${params.patientName},

This is a gentle reminder that your dental appointment is scheduled for *today at ${params.slot}*.

📋 *Appointment Summary:*
• ⏰ *Time:* ${params.slot}
• 👨‍⚕️ *Dentist:* Dr. ${cleanTherapist}
• 📍 *Clinic:* Ramesh Dental Clinic, Whitefield

Please bring any previous dental X-rays or reports if available.

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
    ? `🦷 *RAMESH DENTAL CLINIC*
*Updated Payment Receipt & Invoice*

Hello ${params.patientName},

⚠️ *Important Billing Notice:*
This updated invoice replaces your previous bill *${params.replacesInvoiceNumber}*, which was cancelled due to a clerical correction. You have NOT been charged twice.

🧾 *New Invoice Number:* ${params.invoiceNumber}
🔄 *Replaces Cancelled Bill:* ${params.replacesInvoiceNumber}
📅 *Date of Issue:* ${params.date}
💰 *Total Amount:* ₹${params.amount}
🩺 *Service Rendered:* ${params.serviceName || "Dental Treatment / Procedure"}
💳 *Payment Status:* PAID (Complete)

📎 *Your fresh, corrected Invoice PDF is attached above.*

_Thank you for choosing Ramesh Dental Clinic!_`
    : `🦷 *RAMESH DENTAL CLINIC*
*Payment Receipt & Invoice*

Hello ${params.patientName},

Thank you for your payment. Here is the summary of your clinic bill:

🧾 *Invoice Number:* ${params.invoiceNumber}
📅 *Date of Issue:* ${params.date}
💰 *Amount Paid:* ₹${params.amount}
🩺 *Service Rendered:* ${params.serviceName || "Dental Consultation / Procedure"}
💳 *Payment Status:* PAID (Complete)

📎 *Your official Invoice PDF is attached above for your records.*

_Thank you for choosing Ramesh Dental Clinic for your healthy smile!_`;

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
`🦷 *RAMESH DENTAL CLINIC*
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
  dentistName?: string;
  therapistName?: string;
  diagnosis?: string;
  summary?: string;
  exercisesCount?: number;
  pdfBase64?: string;
  pdfUrl?: string;
}): Promise<SendWhatsAppResult> {
  const cleanDate = params.date ? params.date.replace(/[^a-zA-Z0-9]/g, "_") : "Report";
  const filename = `Prescription_${cleanDate}.pdf`;
  const rawDoctor = params.dentistName || params.therapistName || "Dr. Ramesh Darisi";
  const cleanDoctor = rawDoctor.replace(/^Dr\.?\s*/i, "");

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
            { type: "text", text: cleanDoctor },
          ],
        },
      ],
    });

    if (templateRes.success) return templateRes;
    console.warn("[WhatsApp Consultation Template Failed, falling back to direct document]", templateRes.error);
  }

  // Fallback: direct document message or plain text
  const caption = 
`🦷 *RAMESH DENTAL CLINIC*
*Clinical Consultation & Treatment Prescription*

Hello ${params.patientName},

Your clinical dental consultation assessment and treatment plan for *${params.date}* has been finalized.

👨‍⚕️ *Attending Dentist:* Dr. ${cleanDoctor}
📋 *Diagnosis / Procedure:* ${params.diagnosis || "Dental Examination & Treatment"}
🦷 *Care Protocol:* Comprehensive Oral Healthcare

📎 *Your official Consultation & Prescription PDF is attached above for your records.*

📲 *You can view your full treatment records and appointments in your Patient Hub:*
👉 ${BASE_URL}/patienthub

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

/**
 * 11. Daily Morning Clinical Schedule Alert to Doctor / Dentist
 */
export async function sendWhatsAppDoctorDailySchedule(params: {
  rawPhone: string;
  doctorName?: string;
  date: string;
  appointments: Array<{
    slot: string;
    patientName: string;
    serviceName?: string;
    phone?: string;
  }>;
}): Promise<SendWhatsAppResult> {
  const doctorName = params.doctorName || "Ramesh Darisi";
  const cleanPhone = getCleanWhatsAppNumber(params.rawPhone);
  const count = params.appointments.length;

  let scheduleListText = "";
  if (count === 0) {
    scheduleListText = "No appointments scheduled for today yet. Have a relaxed day!";
  } else {
    scheduleListText = params.appointments
      .map(
        (a, i) =>
          `*${i + 1}.* ⏰ *${a.slot}* — ${a.patientName}\n   🩺 ${a.serviceName || "Dental Consultation"}\n   📞 ${a.phone || "N/A"}`
      )
      .join("\n\n");
  }

  const message = 
`🦷 *RAMESH DENTAL CLINIC*
📅 *Daily Schedule — Dr. ${doctorName}*
🗓️ *Date:* ${params.date}
👥 *Total Booked Patients:* ${count}

${scheduleListText}

━━━━━━━━━━━━━━━━━━━━━
_Sent automatically from Ramesh Dental Clinical Engine at 08:00 AM IST._
🔗 Dashboard: https://rameshdental.vercel.app/dashboard/appointments`;

  // Clean list formatting for legacy single-variable template (avoids \u2028 which produces black diamond glyphs)
  const cleanListFormattedAppointments = count === 0
    ? "No appointments scheduled today"
    : params.appointments
        .map((a) => `[${a.slot} — ${a.patientName}]`)
        .join(" • ");

  try {
    // Primary: Attempt dedicated multi-line template (doctor_schedule_slots_v1)
    const slot1 = params.appointments[0] ? `${params.appointments[0].slot} — ${params.appointments[0].patientName}` : "—";
    const slot2 = params.appointments[1] ? `${params.appointments[1].slot} — ${params.appointments[1].patientName}` : "—";
    const slot3 = params.appointments[2] ? `${params.appointments[2].slot} — ${params.appointments[2].patientName}` : "—";
    const slot4 = params.appointments[3] ? `${params.appointments[3].slot} — ${params.appointments[3].patientName}` : "—";
    const slot5 = params.appointments[4] ? `${params.appointments[4].slot} — ${params.appointments[4].patientName}` : "—";

    let tmplRes = await sendWhatsAppTemplateMessage({
      rawPhone: cleanPhone,
      templateName: "doctor_schedule_slots_v1",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: doctorName },
            { type: "text", text: params.date },
            { type: "text", text: count.toString() },
            { type: "text", text: slot1 },
            { type: "text", text: slot2 },
            { type: "text", text: slot3 },
            { type: "text", text: slot4 },
            { type: "text", text: slot5 },
          ],
        },
      ],
    });

    // Fallback: If doctor_schedule_slots_v1 is still pending review, use approved therapist_schedule_alert
    if (!tmplRes.success) {
      tmplRes = await sendWhatsAppTemplateMessage({
        rawPhone: cleanPhone,
        templateName: "therapist_schedule_alert",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: doctorName },
              { type: "text", text: params.date },
              { type: "text", text: count.toString() },
              { type: "text", text: cleanListFormattedAppointments.slice(0, 1000) },
            ],
          },
        ],
      });
    }

    if (tmplRes.success) {
      // Also send the detailed breakdown message if user opened 24h window
      await sendWhatsAppTextMessage(cleanPhone, message).catch(() => {});
      return tmplRes;
    }
  } catch (err: any) {
    console.warn("[Doctor Daily Schedule Template Exception]", err?.message);
  }

  // Tier 2: Direct rich text dispatch
  return sendWhatsAppTextMessage(cleanPhone, message);
}

/**
 * 12. WhatsApp Fortnightly Usage & Spend Digest (Meta Approved Template)
 */
export async function sendWhatsAppFortnightUsageReport(params: {
  rawPhone: string;
  recipientName: string;
  period: string;
  deliveredCount: number;
  totalDispatches: number;
  estimatedCostINR: string;
  qualityRating?: string;
}): Promise<SendWhatsAppResult> {
  const cleanPhone = getCleanWhatsAppNumber(params.rawPhone);
  const quality = (params.qualityRating || "GREEN").toUpperCase();

  // Tier 1: Dispatch using official Meta-Approved Template (guarantees delivery outside 24h window)
  try {
    const tmplRes = await sendWhatsAppTemplateMessage({
      rawPhone: cleanPhone,
      templateName: "whatsapp_fortnight_digest",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.recipientName },
            { type: "text", text: params.period },
            { type: "text", text: params.deliveredCount.toString() },
            { type: "text", text: params.totalDispatches.toString() },
            { type: "text", text: params.estimatedCostINR },
            { type: "text", text: `${quality} (Active)` },
          ],
        },
      ],
    });

    if (tmplRes.success) {
      return tmplRes;
    }
    console.warn("[WhatsApp Fortnight Template Failed, falling back to text]", tmplRes.error);
  } catch (err: any) {
    console.warn("[WhatsApp Fortnight Template Exception]", err?.message);
  }

  // Tier 2: Fallback rich text
  const text =
`🦷 *RAMESH DENTAL CLINIC*
📊 *WhatsApp Fortnightly Consumption Digest*
🗓️ *Period:* ${params.period}

• *Delivered Messages:* ${params.deliveredCount}
• *Total Dispatches:* ${params.totalDispatches}
• *Estimated Cost:* ₹${params.estimatedCostINR} INR
• *Account Quality:* ${quality}

🔗 Dashboard: https://rameshdental.vercel.app/dashboard/settings`;

  return sendWhatsAppTextMessage(cleanPhone, text);
}

