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
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "appointments@gaitphysioclinic.com";
  const senderName = process.env.BREVO_SENDER_NAME || "Gait Physio Clinic";
  const defaultReplyTo = process.env.BREVO_REPLY_TO || "gaitphysiorehab@gmail.com";

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
        "User-Agent": "GaitPhysioClinic-Engine/1.0",
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
  const adminEmail = process.env.CLINIC_DESK_EMAIL || "gaitphysiorehab@gmail.com";
  const { subject, html } = templates.renderAdminNewBookingAlertEmail(params);
  return sendEmail({
    to: { email: adminEmail, name: "Gait Physio Front Desk" },
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
    tags: ["invoice-delivery"],
    attachments: attachments.length > 0 ? attachments : undefined,
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
