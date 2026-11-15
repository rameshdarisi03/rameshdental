import { db } from "./firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import * as templates from "./emailTemplates";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  name: string;
  content?: string; // base64 encoded content
  url?: string;     // public URL
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
  tags?: string[];
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Core Brevo Transactional Email Dispatcher
 * Sends emails via Brevo HTTPS REST API with zero-crash error handling and Firestore audit logs.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "rameshdarisi01@gmail.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Ramesh Dental Clinic";
  const defaultReplyTo = process.env.BREVO_REPLY_TO || "rameshdarisi01@gmail.com";

  if (!apiKey) {
    console.warn("[Email Engine] BREVO_API_KEY is not defined. Email dispatch simulated.");
    return { success: false, error: "BREVO_API_KEY is missing" };
  }

  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const validRecipients = toList.filter((r) => r.email && r.email.includes("@"));

  if (validRecipients.length === 0) {
    return { success: false, error: "No valid recipient email provided." };
  }

  const payload: any = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: validRecipients.map((r) => ({
      email: r.email.trim().toLowerCase(),
      name: r.name || r.email.split("@")[0],
    })),
    replyTo: options.replyTo || {
      email: defaultReplyTo,
      name: senderName,
    },
    subject: options.subject,
    htmlContent: options.htmlContent,
    tags: options.tags || ["transactional"],
  };

  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "RameshDental-Engine/1.0",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.message || `HTTP ${res.status}: Failed to send email`;
      console.error("[Email Engine Error]", res.status, errorMsg);

      // Log failure in Firestore safely
      logEmailToFirestore({
        recipients: validRecipients.map((r) => r.email).join(", "),
        subject: options.subject,
        status: "failed",
        errorMessage: errorMsg,
        tag: options.tags?.[0] || "general",
      });

      return { success: false, error: errorMsg };
    }

    const messageId = data?.messageId || "unknown";

    // Log success in Firestore safely
    logEmailToFirestore({
      recipients: validRecipients.map((r) => r.email).join(", "),
      subject: options.subject,
      status: "sent",
      messageId,
      tag: options.tags?.[0] || "general",
    });

    return { success: true, messageId };
  } catch (err: any) {
    console.error("[Email Engine Exception]", err);
    return { success: false, error: err.message || "Network exception during email dispatch" };
  }
}

// Helper to log outgoing emails in Firestore email_logs collection
async function logEmailToFirestore(log: {
  recipients: string;
  subject: string;
  status: "sent" | "failed";
  messageId?: string;
  errorMessage?: string;
  tag: string;
}) {
  try {
    await addDoc(collection(db, "email_logs"), {
      ...log,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    console.warn("[Email Engine] Failed to record email log to Firestore:", err);
  }
}

/* ========================================================================= */
/* HIGHER-LEVEL WORKFLOW HELPERS                                             */
/* ========================================================================= */

// 1. Send Patient Onboarding & Activation Email
export async function sendPatientOnboardingEmail(params: {
  patientName: string;
  patientEmail: string;
  activationCode: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderPatientOnboardingEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["patient-onboarding"],
  });
}

// 2. Send Online Booking Request Received (Patient Acknowledgement)
export async function sendBookingRequestReceivedEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  date: string;
  slot: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderBookingRequestReceivedEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["booking-received"],
  });
}

// 3. Send Admin Alert for New Online Booking
export async function sendAdminNewBookingAlertEmail(params: {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceId: string;
  date: string;
  slot: string;
  notes?: string;
}): Promise<SendEmailResult> {
  const adminEmail = process.env.CLINIC_DESK_EMAIL || "rameshdarisi01@gmail.com";
  const { subject, html } = templates.renderAdminNewBookingAlertEmail(params);
  return sendEmail({
    to: { email: adminEmail, name: "Ramesh Dental Front Desk" },
    subject,
    htmlContent: html,
    tags: ["admin-booking-alert"],
  });
}

// 4. Send Appointment Approval / Confirmation
export async function sendAppointmentApprovalEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderAppointmentApprovalEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["appointment-approved"],
  });
}

// 5. Send Walk-in / Manual Booking Confirmation
export async function sendWalkinBookingConfirmationEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderWalkinBookingConfirmationEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["walkin-confirmed"],
  });
}

// 6. Send Appointment Rejection / Reschedule Prompt
export async function sendAppointmentRejectionEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  date: string;
  slot: string;
  reason?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderAppointmentRejectionEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["appointment-rejected"],
  });
}

// 7. Send Appointment Rescheduled Email
export async function sendAppointmentRescheduledEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  previousSlot: string;
  newDate: string;
  newSlot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderAppointmentRescheduledEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["appointment-rescheduled"],
  });
}

// 7b. Send Reschedule Request Received Email (Pending Clinic Confirmation)
export async function sendAppointmentRescheduleRequestEmail(params: {
  patientName: string;
  patientEmail: string;
  currentDate?: string;
  currentSlot?: string;
  requestedDate: string;
  requestedSlot: string;
  serviceName?: string;
}): Promise<SendEmailResult> {
  const subject = `Reschedule Request Received: ${params.patientName} - Gait Physio Clinic`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #062e36; margin: 0;">Gait Physio Clinic</h2>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Specialized Physiotherapy & Rehabilitation</p>
      </div>
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #062e36; margin-top: 0;">Appointment Reschedule Request Received</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.5;">
          Hello <strong>${params.patientName}</strong>,<br/>
          We have received your request to reschedule your therapy session. Our clinical desk is reviewing therapist availability and will confirm your slot shortly.
        </p>
        <table style="width: 100%; font-size: 14px; color: #334155; margin-top: 16px; border-collapse: collapse;">
          ${params.currentDate ? `<tr><td style="padding: 6px 0; color: #64748b;">Current Appointment:</td><td style="padding: 6px 0; font-weight: bold;">${params.currentDate} (${params.currentSlot || ""})</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #64748b;">Requested New Date:</td><td style="padding: 6px 0; font-weight: bold; color: #0284c7;">${params.requestedDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Requested Time Slot:</td><td style="padding: 6px 0; font-weight: bold; color: #0284c7;">${params.requestedSlot}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Service:</td><td style="padding: 6px 0; font-weight: bold;">${params.serviceName || "Physiotherapy Consultation"}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Status:</td><td style="padding: 6px 0; font-weight: bold; color: #d97706;">Pending Clinic Approval</td></tr>
        </table>
      </div>
      <p style="color: #64748b; font-size: 12px; text-align: center;">
        Need immediate help? Call reception at <a href="tel:+918971462949" style="color: #0d9488;">+91 89714 62949</a>
      </p>
    </div>
  `;

  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["appointment-reschedule-request"],
  });
}

// 8. Send Pre-Session Reminder Email
export async function sendPreSessionReminderEmail(params: {
  patientName: string;
  patientEmail: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderPreSessionReminderEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["appointment-reminder"],
  });
}

// 9. Send Tax Invoice & Receipt Email with PDF Attachment
export async function sendInvoiceDeliveryEmail(params: {
  patientName: string;
  patientEmail: string;
  invoiceNumber: string;
  amount: number;
  serviceDate: string;
  dueDate?: string;
  paymentMethod?: string;
  status: string;
  replacesInvoiceNumber?: string;
  pdfBase64?: string;
  pdfUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderInvoiceDeliveryEmail(params);
  const attachments: EmailAttachment[] = [];
  if (params.pdfBase64) {
    attachments.push({
      name: `${params.invoiceNumber}_Invoice.pdf`,
      content: params.pdfBase64,
    });
  } else if (params.pdfUrl) {
    attachments.push({
      name: `${params.invoiceNumber}_Invoice.pdf`,
      url: params.pdfUrl,
    });
  }

  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["invoice-delivery", params.replacesInvoiceNumber ? "invoice-replacement" : "invoice-original"],
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}

// 10. Send Invoice Cancellation / Void Notice Email
export async function sendInvoiceVoidNoticeEmail(params: {
  patientName: string;
  patientEmail: string;
  invoiceNumber: string;
  amount: number;
  serviceDate: string;
  voidReason?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderInvoiceVoidNoticeEmail(params);
  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["invoice-void-notice"],
  });
}

// 10. Send Clinical Consultation & Prescription Email with PDF Attachment
export async function sendConsultationReportEmail(params: {
  patientName: string;
  patientEmail: string;
  date: string;
  therapistName?: string;
  diagnosis?: string;
  summary?: string;
  exercisesCount?: number;
  pdfBase64?: string;
  pdfUrl?: string;
}): Promise<SendEmailResult> {
  const { subject, html } = templates.renderConsultationReportEmail(params);
  const attachments: EmailAttachment[] = [];
  const cleanDate = params.date ? params.date.replace(/[^a-zA-Z0-9]/g, "_") : "Report";
  if (params.pdfBase64) {
    attachments.push({
      name: `Consultation_Report_${cleanDate}.pdf`,
      content: params.pdfBase64,
    });
  } else if (params.pdfUrl) {
    attachments.push({
      name: `Consultation_Report_${cleanDate}.pdf`,
      url: params.pdfUrl,
    });
  }

  return sendEmail({
    to: { email: params.patientEmail, name: params.patientName },
    subject,
    htmlContent: html,
    tags: ["consultation-report"],
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}
