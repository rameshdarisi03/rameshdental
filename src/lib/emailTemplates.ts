/**
 * Gait Physio Clinic - Responsive Transactional Email Templates
 * Designed for 100% deliverability across Gmail, Apple Mail, Outlook, iOS & Android.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com";
const CLINIC_PHONE = "+91 89044 56243";
const CLINIC_ADDRESS = "Whitefield, Bengaluru, Karnataka 560066";
const MAPS_URL = "https://maps.google.com/?q=Gait+Physio+Clinic+Whitefield+Bengaluru";

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
        <td style="padding: 16px 20px 24px; text-align: center;">
          <table role="presentation" width="100%">
            <tr>
              <td style="text-align: center;">
                <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #062e36; display: inline-block;">
                  GAIT PHYSIO CLINIC
                </span>
                <span style="display: block; font-size: 11px; font-weight: 700; color: #059669; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px;">
                  Advanced Physiotherapy & Rehabilitation
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
          <p style="margin: 0 0 6px; font-weight: 700; color: #334155;">
            Gait Physio Clinic • Clinical Excellence in Movement
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
            © ${new Date().getFullYear()} Gait Physio Clinic. All rights reserved.
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
        Welcome to Gait Physio Clinic, ${params.patientName}!
      </h1>
      <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.6;">
        Your clinical profile has been established with our physiotherapy care team. We have prepared your personal <strong>Patient Hub</strong> where you can access your customized rehab routines, consultation history, and manage appointments.
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
          <tr><td style="padding: 2px 0;">✓ <strong>Personalized Home Exercises:</strong> View prescribed routines with video tutorials, sets, and rep targets.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Consultation Notes:</strong> Review recovery roadmaps and assessment summaries.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Live Scheduling:</strong> Book appointments with realtime slot availability.</td></tr>
          <tr><td style="padding: 2px 0;">✓ <strong>Receipts & Invoices:</strong> Download official clinic bills and payment receipts anytime.</td></tr>
        </table>
      </div>

      <p style="margin: 24px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Need help activating your account? Simply reply to this email or WhatsApp our reception at <a href="https://wa.me/918904456243" style="color: #059669; font-weight: 700; text-decoration: none;">+91 89044 56243</a>.
      </p>
    </div>
  `;

  return {
    subject: `Welcome to Gait Physio Clinic - Your Portal Activation Code (${params.activationCode})`,
    html: wrapEmail("Welcome to Gait Physio Clinic", body),
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
        Dear ${params.patientName}, we have received your appointment request. Our clinic desk is reviewing doctor availability and will send your official confirmation shortly.
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
        No action is required right now. Once approved by our physiotherapist team, you will receive a confirmation email with a 1-click Google Calendar sync link.
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
        A new appointment request has been submitted online and is waiting in the Appointments Queue.
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
        Dear ${params.patientName}, your physiotherapy appointment at Gait Physio Clinic has been officially approved. Our team is ready to welcome you.
      </p>

      <!-- Details Summary Card -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Therapy Program</td>
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
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Assigned Therapist</td>
          <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Clinical Physiotherapist"}</td>
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
        <p style="margin: 0 0 6px; font-weight: 800; color: #062e36; text-transform: uppercase; letter-spacing: 0.5px;">Session Preparation Tips:</p>
        <p style="margin: 0 0 4px;">• Please arrive <strong>10 minutes before</strong> your slot time for check-in.</p>
        <p style="margin: 0 0 4px;">• Wear loose, comfortable athletic clothing allowing free joint mobility.</p>
        <p style="margin: 0;">• Bring any previous diagnostic scans (MRI, X-Rays) or medical reports if applicable.</p>
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
          Dear ${params.patientName}, your session at Gait Physio Clinic has been scheduled by our front desk.
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
            <td style="padding: 14px 18px; color: #64748b; font-weight: 600;">Therapist</td>
            <td style="padding: 14px 18px; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Clinical Team"}</td>
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
        Dear ${params.patientName}, we regret to inform you that we could not confirm your requested slot for <strong>${params.serviceId}</strong> on <strong>${params.date} at ${params.slot}</strong>.
      </p>

      ${params.reason ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #991b1b;">
        <strong>Reason:</strong> ${params.reason}
      </div>
      ` : ''}

      <p style="margin: 18px 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
        We apologize for any inconvenience. Your recovery is important to us — please select an alternative time that suits your schedule:
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
        Dear ${params.patientName}, your session for <strong>${params.serviceId}</strong> has been updated to a new time.
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
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Therapist</td>
          <td style="padding: 12px 16px; color: #062e36; font-weight: 800;">${params.assignedTherapist || "Clinical Team"}</td>
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
        Dear ${params.patientName}, this is a friendly reminder of your upcoming physiotherapy session at Gait Physio Clinic tomorrow.
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
    subject: `Reminder: Your Appointment Tomorrow at ${params.slot} - Gait Physio Clinic`,
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
}): { subject: string; html: string } {
  const isPaid = (params.status || "").toLowerCase() === "paid";
  const portalUrl = `${BASE_URL}/patienthub/records`;

  const body = `
    <div style="text-align: left;">
      <span style="display: inline-block; background-color: ${isPaid ? '#ecfdf5' : '#fffbeb'}; color: ${isPaid ? '#059669' : '#d97706'}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 50px; margin-bottom: 12px;">
        ${isPaid ? 'Invoice / Payment Receipt' : 'Invoice / Payment Due'}
      </span>
      <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 900; color: #062e36; line-height: 1.2;">
        Invoice #${params.invoiceNumber}
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, your official treatment invoice and payment receipt is attached to this email as a PDF document.
      </p>

      <!-- Invoice Summary Box -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Invoice Number</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.invoiceNumber}</td>
        </tr>
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
    subject: `Invoice / Payment Receipt #${params.invoiceNumber} - Gait Physio Clinic`,
    html: wrapEmail("Invoice / Payment Receipt", body),
  };
}

// 10. Consultation Summary & Prescription Email (with attached PDF)
export function renderConsultationReportEmail(params: {
  patientName: string;
  date: string;
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
        Your Rehabilitation & Consultation Report
      </h1>
      <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
        Dear ${params.patientName}, thank you for attending your physiotherapy session at Gait Physio Clinic. Your official clinical case sheet and rehabilitation prescription is attached to this email.
      </p>

      <!-- Consultation Meta Box -->
      <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600; width: 40%;">Consultation Date</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 800;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Attending Therapist</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #059669; font-weight: 800;">${params.therapistName || 'Dr. Kinnera'}</td>
        </tr>
        ${params.diagnosis ? `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 600;">Diagnosis / Target</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #062e36; font-weight: 700;">${params.diagnosis}</td>
        </tr>
        ` : ''}
        ${params.exercisesCount !== undefined && params.exercisesCount > 0 ? `
        <tr>
          <td style="padding: 12px 16px; color: #64748b; font-weight: 600;">Prescribed Exercises</td>
          <td style="padding: 12px 16px; color: #059669; font-weight: 800;">${params.exercisesCount} Home Exercises Prescribed</td>
        </tr>
        ` : ''}
      </table>

      ${params.summary ? `
      <!-- Therapist Notes Snippet -->
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 14px 18px; margin: 18px 0;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
          Therapist Session Notes
        </p>
        <p style="margin: 0; font-size: 13px; color: #1e293b; line-height: 1.6; white-space: pre-line;">
          ${params.summary}
        </p>
      </div>
      ` : ''}

      <!-- Attachment Notice Callout -->
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #166534; font-weight: 700;">
          📎 Attached: <span style="font-weight: 800;">Consultation_Prescription_Report.pdf</span>
        </p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">
          Contains your complete clinical evaluation, precautions, therapeutic targets, and personalized home exercise prescription.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${portalUrl}" class="mobile-button" style="display: inline-block; background-color: #062e36; color: #ffffff; font-size: 13px; font-weight: 800; padding: 14px 32px; border-radius: 50px; text-decoration: none; box-shadow: 0 4px 12px rgba(6, 46, 54, 0.25);">
          🏃 Access Your Video Exercises in Patient Hub
        </a>
      </div>

      <p style="margin: 20px 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
        Have questions about your exercises or experiencing discomfort? Contact your therapist at <a href="tel:${CLINIC_PHONE.replace(/\s+/g, '')}" style="color: #059669; font-weight: 700; text-decoration: none;">${CLINIC_PHONE}</a>.
      </p>
    </div>
  `;

  return {
    subject: `Clinical Consultation Summary & Rehabilitation Report - Gait Physio Clinic`,
    html: wrapEmail("Consultation & Prescription Report", body),
  };
}
