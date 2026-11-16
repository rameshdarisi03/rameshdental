/**
 * Ramesh Dental Clinic - Responsive Transactional Email Templates
 * Designed for 100% deliverability across Gmail, Apple Mail, Outlook, iOS & Android.
 */

import { CLINIC_BRAND } from "./clinicBranding";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rameshdental.vercel.app";
const CLINIC_PHONE = CLINIC_BRAND.phone;
const CLINIC_ADDRESS = CLINIC_BRAND.addressLine;
const MAPS_URL = "https://maps.google.com/?q=Ramesh+Dental+Clinic+Whitefield+Bengaluru";

// Shared Email Header & Wrapper
function wrapEmail(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .content-card { padding: 20px !important; border-radius: 20px !important; }
      .mobile-button { width: 100% !important; display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f8fafc;">
  <center>
    <table class="email-container" role="presentation" width="600" style="margin: 0 auto; width: 600px; max-width: 600px;">
      <!-- Brand Header -->
      <tr>
        <td style="padding: 20px 20px 24px; text-align: center;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto; text-align: center;">
            <tr>
              <td style="vertical-align: middle; padding-right: 14px; text-align: center;">
                <img src="${BASE_URL}/images/dental-emblem.jpg" width="48" height="48" alt="Ramesh Dental Clinic" style="width: 48px; height: 48px; border-radius: 12px; display: inline-block; vertical-align: middle; border: 0;" />
              </td>
              <td style="vertical-align: middle; text-align: left;">
                <span style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #062e36; display: inline-block; line-height: 1.1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  Ramesh Dental Clinic
                </span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 8px; text-align: center;">
                <span style="display: block; font-size: 11.5px; font-weight: 800; color: #0e5366; letter-spacing: 0.8px; text-transform: uppercase;">
                  Root Canal &nbsp;|&nbsp; Dental Implants &nbsp;|&nbsp; Clear Aligners
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main Body Card -->
      <tr>
        <td>
          <table class="content-card" role="presentation" width="100%" style="background-color: #ffffff; border-radius: 24px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(6, 46, 54, 0.06); border: 1px solid #e2e8f0;">
            <tr>
              <td>
                ${contentHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Brand Footer -->
      <tr>
        <td style="padding: 28px 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0 0 6px; font-weight: 800; color: #062e36; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            Ramesh Dental Clinic • Root Canal &nbsp;|&nbsp; Dental Implants &nbsp;|&nbsp; Clear Aligners
          </p>
          <p style="margin: 0 0 8px;">
            ${CLINIC_ADDRESS} • Call/WhatsApp: <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; text-decoration: none; font-weight: 700;">${CLINIC_PHONE}</a>
          </p>
          <p style="margin: 0;">
            <a href="${BASE_URL}" style="color: #059669; text-decoration: none; font-weight: 700;">Visit Website</a> • 
            <a href="${BASE_URL}/patienthub/login" style="color: #059669; text-decoration: none; font-weight: 700;">Patient Hub Login</a> • 
            <a href="${MAPS_URL}" style="color: #059669; text-decoration: none; font-weight: 700;">Google Maps</a>
          </p>
          <p style="margin: 12px 0 0; font-size: 10px; color: #94a3b8;">
            © ${new Date().getFullYear()} Ramesh Dental Clinic. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

// 1. Patient Onboarding & Portal Activation Email
export function renderPatientOnboardingEmail(params: {
  patientName: string;
  patientEmail: string;
  activationCode: string;
}): { subject: string; html: string } {
  const loginUrl = `${BASE_URL}/patienthub/login?code=${encodeURIComponent(params.activationCode)}&email=${encodeURIComponent(params.patientEmail)}`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; rounded: 50px; border-radius: 50px; margin-bottom: 12px;">
        Patient Portal Invitation
      </span>
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Welcome to Ramesh Dental Clinic, ${params.patientName}!
      </h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6;">
        Your clinical profile has been established with our dental care team at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong>. We have prepared your personal <strong>Patient Hub</strong> where you can access your customized oral care routines, treatment plans, consultation history, and manage appointments.
      </p>

      <!-- Registered Email Notice -->
      <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 14px 18px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 600;">
          🔑 <strong>Login Instruction:</strong> Please sign in using your registered email:
        </p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #059669; font-weight: 800;">
          ${params.patientEmail}
        </p>
      </div>

      <!-- Activation Code Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px dashed #059669; border-radius: 16px; padding: 24px 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">
          Your Portal Activation Code
        </span>
        <span style="font-size: 28px; font-weight: 900; letter-spacing: 5px; color: #062e36; font-family: monospace; display: block;">
          ${params.activationCode}
        </span>
        <span style="font-size: 11px; color: #64748b; margin-top: 8px; display: block;">
          Enter this code during signup or click the button below to auto-fill.
        </span>
      </div>

      <!-- 1-Click CTA Button -->
      <div style="text-align: center; margin: 28px 0 24px;">
        <a href="${loginUrl}" class="mobile-button" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 14px; font-weight: 800; padding: 16px 36px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
          Activate My Patient Hub Account →
        </a>
      </div>

      <!-- Feature Checklist -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
        <p style="margin: 0 0 10px; font-size: 12px; font-weight: 800; color: #062e36; text-transform: uppercase; letter-spacing: 1px;">
          What you can access inside Patient Hub:
        </p>
        <table role="presentation" width="100%" style="font-size: 13px; color: #475569; line-height: 1.7;">
          <tr><td style="padding: 2px 0;">✓ <strong>Personalized Oral Care & Protocols:</strong> View prescribed post-op care routines, recovery steps, and oral hygiene instructions.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Consultation Notes:</strong> Review dental treatment roadmaps, tooth chart findings, and examination summaries.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Live Scheduling:</strong> Book appointments with realtime slot availability.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Receipts & Invoices:</strong> Download official clinic bills and payment receipts anytime.</td></tr>
        </table>
      </div>

      <p style="margin: 24px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Need help activating your account? Simply reply to this email or WhatsApp our reception at <a href="https://wa.me/${CLINIC_PHONE.replace(/[^0-9]/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `Welcome to Ramesh Dental Clinic - Your Portal Activation Code (${params.activationCode})`,
    html: wrapEmail("Welcome to Ramesh Dental Clinic", body),
  };
}

// 2. Online Booking Request Received (Patient Acknowledgement)
export function renderBookingRequestReceivedEmail(params: {
  patientName: string;
  serviceId: string;
  date: string;
  slot: string;
}): { subject: string; html: string } {
  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Request Pending Review
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Appointment Request Received
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, we have received your appointment request at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong>. Our clinic desk is reviewing doctor availability and will send your official confirmation shortly.
      </p>

      <!-- Details Summary Card -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Service</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.serviceId}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Preferred Date</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Time Slot</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.slot}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; color: #64748b; font-weight: 600;">Status</td>
          <td style="padding: 14px 18px; color: #b45309; font-weight: 800;">⏳ Pending Front-Desk Approval</td>
        </tr>
      </table>

      <p style="margin: 20px 0 0; font-size: 13px; color: #475569; line-height: 1.6;">
        No action is required right now. Once approved by our dental team, you will receive a confirmation email with a 1-click Google Calendar sync link.
      </p>
    </div>
  `;

  return {
    subject: `Appointment Request Received: ${params.serviceId} on ${params.date} at ${params.slot}`,
    html: wrapEmail("Appointment Request Received", body),
  };
}

// 3. New Booking Alert (To Clinic Reception / Doctor)
export function renderAdminNewBookingAlertEmail(params: {
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceId: string;
  date: string;
  slot: string;
  notes?: string;
}): { subject: string; html: string } {
  const dashboardUrl = `${BASE_URL}/dashboard/appointments`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Action Required • New Booking
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        New Online Appointment Request
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        A new appointment request has been submitted online for <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> and is waiting in the Appointments Queue.
      </p>

      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 35%;">Patient Name</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.patientName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Phone</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.patientPhone}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Email</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.patientEmail || "N/A"}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Program</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.serviceId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Requested Slot</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date} at ${params.slot}</td>
        </tr>
        ${params.notes ? `
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Notes</td>
          <td style="padding: 12px 16px; color: #334155; font-style: italic;">"${params.notes}"</td>
        </tr>` : ''}
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${dashboardUrl}" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none;">
          Open Appointments Queue →
        </a>
      </div>
    </div>
  `;

  return {
    subject: `🔔 New Booking Request: ${params.patientName} (${params.date} at ${params.slot})`,
    html: wrapEmail("New Appointment Request", body),
  };
}

// 4. Appointment Approval / Confirmation Email
export function renderAppointmentApprovalEmail(params: {
  patientName: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): { subject: string; html: string } {
  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Appointment Confirmed
      </span>
      <h1 style="margin: 0 0 12px; font-size: 24px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Your Session is Confirmed!
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, your dental appointment at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> has been officially approved. Our team is ready to welcome you.
      </p>

      <!-- Details Summary Card -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Dental Service</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.serviceId}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Confirmed Date</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Confirmed Time</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.slot}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Attending Dentist</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Dr. Ramesh Darisi"}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; color: #64748b; font-weight: 600;">Location</td>
          <td style="padding: 14px 18px; color: #062e36; font-weight: 700;">${CLINIC_ADDRESS}</td>
        </tr>
      </table>

      ${params.googleCalendarUrl ? `
      <!-- Add to Google Calendar CTA -->
      <div style="text-align: center; margin: 26px 0 22px;">
        <a href="${params.googleCalendarUrl}" target="_blank" class="mobile-button" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
          📅 Add to Google Calendar
        </a>
      </div>
      ` : ''}

      <!-- Preparation Instructions -->
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px 20px; margin: 22px 0; font-size: 12px; color: #475569; line-height: 1.6;">
        <p style="margin: 0 0 6px; font-weight: 800; color: #062e36; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Preparation Tips:</p>
        <p style="margin: 0 0 4px;">• Please arrive <strong>10 minutes before</strong> your slot time for check-in.</p>
        <p style="margin: 0 0 4px;">• Brush your teeth prior to your visit. Avoid consuming heavily staining foods or beverages right before treatment.</p>
        <p style="margin: 0;">• Bring any previous dental radiographs (IOPAR, OPG, CBCT) or doctor notes if applicable.</p>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Need to adjust or reschedule? Please call or WhatsApp our reception at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `✓ Appointment Confirmed: ${params.serviceId} on ${params.date} at ${params.slot}`,
    html: wrapEmail("Appointment Confirmed", body),
  };
}

// 5. Walk-in / Manual Booking Confirmation
export function renderWalkinBookingConfirmationEmail(params: {
  patientName: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): { subject: string; html: string } {
  return {
    subject: `Session Booked: ${params.serviceId} on ${params.date} at ${params.slot}`,
    html: wrapEmail("Clinic Session Booked", `
      <div style="text-align: left;">
        <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
          Front Desk Booking
        </span>
        <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
          Your Clinic Session is Scheduled
        </h1>
        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          Dear ${params.patientName}, your session at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> has been scheduled by our front desk.
        </p>

        <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Service</td>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.serviceId}</td>
          </tr>
          <tr>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Date & Time</td>
            <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date} at ${params.slot}</td>
          </tr>
          <tr>
            <td style="padding: 14px 18px; color: #64748b; font-weight: 600;">Attending Dentist</td>
            <td style="padding: 14px 18px; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Dr. Ramesh Darisi"}</td>
          </tr>
        </table>

        ${params.googleCalendarUrl ? `
        <div style="text-align: center; margin: 24px 0;">
          <a href="${params.googleCalendarUrl}" target="_blank" class="mobile-button" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none;">
            📅 Add to Google Calendar
          </a>
        </div>
        ` : ''}

        <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Questions? Call or WhatsApp our clinic desk at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
        </p>
      </div>
    `),
  };
}

// 6. Appointment Rejection / Reschedule Prompt Email
export function renderAppointmentRejectionEmail(params: {
  patientName: string;
  serviceId: string;
  date: string;
  slot: string;
  reason?: string;
}): { subject: string; html: string } {
  const rebookUrl = `${BASE_URL}/book?service=${encodeURIComponent(params.serviceId)}`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Schedule Update
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Unable to Accommodate Requested Slot
      </h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, we regret to inform you that we could not confirm your requested slot for <strong>${params.serviceId}</strong> at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> on <strong>${params.date} at ${params.slot}</strong>.
      </p>

      ${params.reason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #991b1b;">
        <strong>Reason:</strong> ${params.reason}
      </div>
      ` : ''}

      <p style="margin: 18px 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
        We apologize for any inconvenience. Your oral health and comfort are important to us — please select an alternative time that suits your schedule:
      </p>

      <div style="text-align: center; margin: 26px 0;">
        <a href="${rebookUrl}" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 14px; font-weight: 800; padding: 16px 36px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 14px rgba(6, 46, 54, 0.25);">
          Choose Another Available Slot →
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        You can also call us directly at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a> to help you find an immediate opening.
      </p>
    </div>
  `;

  return {
    subject: `Update on your Appointment Request: ${params.serviceId}`,
    html: wrapEmail("Schedule Update", body),
  };
}

// 7. Appointment Rescheduling Email
export function renderAppointmentRescheduledEmail(params: {
  patientName: string;
  serviceId: string;
  previousSlot: string;
  newDate: string;
  newSlot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): { subject: string; html: string } {
  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Schedule Rescheduled
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Your Appointment Has Been Rescheduled
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, your session for <strong>${params.serviceId}</strong> at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> has been updated to a new time.
      </p>

      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Previous Time</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #94a3b8; text-decoration: line-through;">${params.previousSlot}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 700;">NEW Confirmed Date</td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 900; font-size: 14px;">${params.newDate}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 700;">NEW Confirmed Time</td>
          <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 900; font-size: 14px;">${params.newSlot}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Attending Dentist</td>
          <td style="padding: 12px 16px; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Dr. Ramesh Darisi"}</td>
        </tr>
      </table>

      ${params.googleCalendarUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.googleCalendarUrl}" target="_blank" class="mobile-button" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none;">
          📅 Update Google Calendar
        </a>
      </div>
      ` : ''}

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        If this new time does not work for you, please reply or call us at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `Rescheduled: Your Appointment on ${params.newDate} at ${params.newSlot}`,
    html: wrapEmail("Appointment Rescheduled", body),
  };
}

// 8. 24-Hour Pre-Session Reminder Email
export function renderPreSessionReminderEmail(params: {
  patientName: string;
  serviceId: string;
  date: string;
  slot: string;
  assignedTherapist?: string;
  googleCalendarUrl?: string;
}): { subject: string; html: string } {
  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #f0fdf4; color: #15803d; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Appointment Reminder
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        See You Tomorrow at ${params.slot}!
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, this is a friendly reminder of your upcoming dental consultation at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> tomorrow.
      </p>

      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Service</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.serviceId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Time</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date} at ${params.slot}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Location</td>
          <td style="padding: 12px 16px; color: #062e36; font-weight: 700;">${CLINIC_ADDRESS}</td>
        </tr>
      </table>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${MAPS_URL}" target="_blank" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none;">
          📍 Get Directions on Google Maps
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Running late or need to reschedule? Please let us know as soon as possible at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `Reminder: Your Appointment Tomorrow at ${params.slot} - Ramesh Dental Clinic`,
    html: wrapEmail("Session Reminder", body),
  };
}

// 9. Invoice Delivery Email (with attached PDF)
export function renderInvoiceDeliveryEmail(params: {
  patientName: string;
  invoiceNumber: string;
  amount: number;
  serviceDate: string;
  dueDate?: string;
  paymentMethod?: string;
  status: string;
  replacesInvoiceNumber?: string;
}): { subject: string; html: string } {
  const isPaid = (params.status || "").toLowerCase() === "paid";
  const isReplacement = Boolean(params.replacesInvoiceNumber);
  const portalUrl = `${BASE_URL}/patienthub/records`;
  const cleanInv = (params.invoiceNumber || "").replace(/^#+/, "");
  const cleanReplaces = (params.replacesInvoiceNumber || "").replace(/^#+/, "");

  const badgeText = isReplacement
    ? "Updated Invoice"
    : isPaid
    ? "Invoice"
    : "Invoice Due";

  const badgeBg = isReplacement ? "#fffbeb" : isPaid ? "#ecfdf5" : "#fffbeb";
  const badgeColor = isReplacement ? "#b45309" : isPaid ? "#059669" : "#d97706";

  const subject = isReplacement
    ? `Updated Invoice ${cleanInv} (Replaces ${cleanReplaces}) - Ramesh Dental Clinic`
    : `Invoice ${cleanInv} - Ramesh Dental Clinic`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        ${badgeText}
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        ${isReplacement ? `Updated Invoice ${cleanInv}` : `Invoice ${cleanInv}`}
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, your official treatment invoice from <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong> is attached to this email as a PDF document.
      </p>

      ${isReplacement ? `
      <!-- Automated Replacement Clarification Banner (Patient Friendly, Zero Confusion) -->
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0 0 5px; font-size: 13px; font-weight: 800; color: #92400e;">
          ⚠️ Important Billing Update:
        </p>
        <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.6;">
          This updated receipt replaces your previous bill <strong>${cleanReplaces}</strong>, which was cancelled. A clerical correction was made to your treatment items. <strong>You have NOT been charged twice.</strong>
        </p>
      </div>
      ` : ''}

      <!-- Invoice Summary Box -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Invoice Number</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${cleanInv}</td>
        </tr>
        ${isReplacement ? `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Replaces Bill</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #b45309; font-weight: 800;">${cleanReplaces} (Cancelled)</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Total Amount</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 900; font-size: 16px;">₹${(params.amount || 0).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Status</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            <span style="display: inline-block; background-color: ${isPaid ? '#ecfdf5' : '#fff7ed'}; color: ${isPaid ? '#059669' : '#c2410c'}; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;">
              ${params.status.toUpperCase()}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Service Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 700;">${params.serviceDate}</td>
        </tr>
        ${params.paymentMethod ? `
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Payment Mode</td>
          <td style="padding: 12px 16px; color: #062e36; font-weight: 700;">${params.paymentMethod}</td>
        </tr>
        ` : ''}
      </table>

      <!-- Attachment Notice Callout -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 700;">
          📎 Attached: <span style="font-weight: 800;">${params.invoiceNumber}_Invoice.pdf</span>
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">
          You can download, print, or save the attached PDF for your insurance claim and medical tax records.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" class="mobile-button" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);">
          📄 View All Billing Records in Patient Hub
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Need assistance with your invoice or insurance documentation? Reply directly to this email or call our desk at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject,
    html: wrapEmail(isReplacement ? "Updated Invoice / Payment Receipt" : "Invoice / Payment Receipt", body),
  };
}

// 10. Invoice Cancellation / Void Notice Email
export function renderInvoiceVoidNoticeEmail(params: {
  patientName: string;
  invoiceNumber: string;
  amount: number;
  serviceDate: string;
  voidReason?: string;
}): { subject: string; html: string } {
  const portalUrl = `${BASE_URL}/patienthub/records`;
  const reasonText = params.voidReason || "Clerical correction / bill updated";
  const cleanInv = (params.invoiceNumber || "").replace(/^#+/, "");

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #fef2f2; color: #b91c1c; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Billing Update • Invoice Cancelled
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Invoice ${cleanInv} Has Been Cancelled
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, this is an official notification to inform you that invoice <strong>${cleanInv}</strong> issued on ${params.serviceDate} for ₹${(params.amount || 0).toLocaleString("en-IN")} has been marked as <strong>cancelled / voided</strong> in our billing records at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong>.
      </p>

      <!-- Cancellation Details Box -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Invoice Number</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${cleanInv}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Status</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
            <span style="display: inline-block; background-color: #fef2f2; color: #b91c1c; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; border-radius: 4px;">
              CANCELLED / VOIDED
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Original Amount</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 700; text-decoration: line-through;">₹${(params.amount || 0).toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Service Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 700;">${params.serviceDate}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Reason</td>
          <td style="padding: 12px 16px; color: #991b1b; font-weight: 700;">${reasonText}</td>
        </tr>
      </table>

      <!-- Next Steps & Reassurance Callout -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #166534;">
          ℹ️ What This Means For You:
        </p>
        <p style="margin: 0; font-size: 12.5px; color: #15803d; line-height: 1.6;">
          If this invoice was cancelled to correct treatment details or billing amounts, an <strong>updated replacement invoice</strong> will be issued and emailed to you shortly. You do not need to take any action, and you will not be billed twice.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(6, 46, 54, 0.25);">
          📄 Check Valid Invoices in Patient Hub
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Have questions regarding this cancellation? Contact our clinic desk directly at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a> or reply to this email.
      </p>
    </div>
  `;

  return {
    subject: `Notice: Cancellation of Invoice ${cleanInv} - Ramesh Dental Clinic`,
    html: wrapEmail("Invoice Cancellation Notice", body),
  };
}

// 10. Consultation Summary & Prescription Email (with attached PDF)
export function renderConsultationReportEmail(params: {
  patientName: string;
  date: string;
  dentistName?: string;
  therapistName?: string;
  diagnosis?: string;
  summary?: string;
  exercisesCount?: number;
}): { subject: string; html: string } {
  const portalUrl = `${BASE_URL}/patienthub`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        Clinical Session Summary
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Your Dental Consultation & Treatment Report
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, thank you for attending your dental consultation at <strong>Ramesh Dental Clinic (Root Canal | Dental Implants | Clear Aligners)</strong>. Your official clinical case sheet and dental treatment plan is attached to this email.
      </p>

      <!-- Consultation Meta Box -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Consultation Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Attending Dentist</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.dentistName || params.therapistName || 'Dr. Ramesh Darisi'}</td>
        </tr>
        ${params.diagnosis ? `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Diagnosis / Target</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 700;">${params.diagnosis}</td>
        </tr>
        ` : ''}
        ${params.exercisesCount !== undefined && params.exercisesCount > 0 ? `
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Prescribed Oral Care / Protocols</td>
          <td style="padding: 12px 16px; color: #059669; font-weight: 800;">${params.exercisesCount} Oral Care Protocols Prescribed</td>
        </tr>
        ` : ''}
      </table>

      ${params.summary ? `
      <!-- Dentist Notes Snippet -->
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
          Dentist Clinical Notes
        </p>
        <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.6; white-space: pre-line;">
          ${params.summary}
        </p>
      </div>
      ` : ''}

      <!-- Attachment Notice Callout -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 700;">
          📎 Attached: <span style="font-weight: 800;">Dental_Consultation_Report.pdf</span>
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">
          Contains your complete dental evaluation, tooth chart observations, clinical precautions, and personalized oral care guidance.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(6, 46, 54, 0.25);">
          🦷 Access Your Care Protocols in Patient Hub
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Have questions about your treatment or experiencing discomfort? Contact our dental team at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `Clinical Consultation Summary & Treatment Report - Ramesh Dental Clinic`,
    html: wrapEmail("Consultation & Treatment Report", body),
  };
}

/**
 * 6-Digit Email OTP for Patient Portal Signup & Password Reset
 */
export function patientAuthOtpEmail(params: {
  patientName: string;
  otp: string;
  purpose: "signup" | "reset";
}): { subject: string; html: string } {
  const isSignup = params.purpose === "signup";
  const headline = isSignup ? "Verify Your Email & Activate Portal" : "Reset Your Portal Password";
  const subtext = isSignup
    ? "Welcome to Ramesh Dental Clinic! Use the verification code below to set up your password and access your oral care protocols, recovery plans, and dental invoices online."
    : "We received a request to reset your password for the Ramesh Dental Clinic Patient Hub. Use the security code below to create a new password.";

  const body = `
    <div>
      <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #062e36;">
        ${headline}
      </h2>
      <p style="margin: 0 0 20px; font-size: 13.5px; color: #475569; line-height: 1.5;">
        Hello <strong style="color: #0f172a;">${params.patientName || "Valued Patient"}</strong>,
      </p>
      <p style="margin: 0 0 24px; font-size: 13px; color: #475569; line-height: 1.6;">
        ${subtext}
      </p>

      <!-- 6-digit OTP Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px dashed #059669; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1.2px;">
          Your 6-Digit Verification Code
        </p>
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #062e36; padding: 6px 0; text-align: center;">
          ${params.otp}
        </div>
        <p style="margin: 8px 0 0; font-size: 11.5px; color: #059669; font-weight: 600;">
          ⏱ Valid for the next 5 minutes. Do not share this code with anyone.
        </p>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        If you did not request this verification code, please ignore this email or reach out to our clinic team at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: isSignup
      ? `Your Verification Code: ${params.otp} - Ramesh Dental Clinic`
      : `Password Reset Code: ${params.otp} - Ramesh Dental Clinic`,
    html: wrapEmail(headline, body),
  };
}
