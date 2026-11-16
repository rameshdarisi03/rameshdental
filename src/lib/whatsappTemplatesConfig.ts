/**
 * Meta WhatsApp Business Cloud API — Message Templates Specification
 * Ramesh Dental Clinic (RDC)
 * 
 * Standardized for Meta Graph API v21.0:
 * POST https://graph.facebook.com/v21.0/{WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates
 */

export interface MetaTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "DOCUMENT" | "IMAGE" | "VIDEO";
  text?: string;
  example?: {
    header_text?: string[];
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "OTP";
    text: string;
    url?: string;
    phone_number?: string;
    otp_type?: "COPY_CODE" | "ONE_TAP";
    example?: string[];
  }>;
}

export interface MetaWhatsAppTemplateDefinition {
  name: string;
  category: "UTILITY" | "AUTHENTICATION" | "MARKETING";
  language: string;
  components: MetaTemplateComponent[];
  description: string;
  legacyEquivalent?: string;
}

export const RAMESH_DENTAL_WHATSAPP_TEMPLATES: MetaWhatsAppTemplateDefinition[] = [
  // 1. Patient Welcome & Onboarding
  {
    name: "patient_welcome_rdc",
    category: "UTILITY",
    language: "en",
    description: "Dispatched when a patient registers or is created in the clinic EMR with activation link",
    legacyEquivalent: "patient_welcome_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Welcome to Ramesh Dental Clinic",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nWelcome to Ramesh Dental Clinic! Your clinical patient record has been registered with ID {{2}}.\n\nPlease log in to your Patient Hub to view your dental appointments, prescriptions, and digital case sheets.",
        example: {
          body_text: [["Rahul Sharma", "RDC-2026-001 • Portal: https://rameshdental.vercel.app/patienthub/login"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Dental Care Desk",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Open Patient Hub",
            url: "https://rameshdental.vercel.app/patienthub/login",
          },
        ],
      },
    ],
  },

  // 2. Patient Auth OTP / Verification Code
  {
    name: "patient_authcode_rdc",
    category: "AUTHENTICATION",
    language: "en",
    description: "Transactional 6-digit OTP dispatched to verify patient login into Patient Hub with native 1-tap Copy Code button",
    legacyEquivalent: "patient_authcode_gpc",
    components: [
      {
        type: "BODY",
        text: "Your Ramesh Dental Clinic verification code is {{1}}. This code expires in 5 minutes. For your security, do not share this code.",
        example: {
          body_text: [["491823"]],
        },
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "OTP",
            otp_type: "COPY_CODE",
            text: "Copy Code",
          },
        ],
      },
    ],
  },

  // 3. Online Appointment Booking Request Received
  {
    name: "booking_request_received_rdc",
    category: "UTILITY",
    language: "en",
    description: "Instant acknowledgement sent to patient when an appointment is booked online via clinic website",
    legacyEquivalent: "booking_request_received_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Appointment Request Received",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nWe have received your appointment request at Ramesh Dental Clinic.\n\n📅 Date: {{2}}\n⏰ Slot: {{3}}\n🩺 Department / Service: {{4}}\n\nOur team is reviewing the schedule and will confirm your slot shortly.",
        example: {
          body_text: [["Rahul Sharma", "18-Nov-2026", "10:30 AM", "Root Canal Treatment & Consultation"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Contact: +91 98765 43210",
      },
    ],
  },

  // 4. Appointment Reschedule Request Received
  {
    name: "reschedule_request_received_rdc",
    category: "UTILITY",
    language: "en",
    description: "Sent to patient when a reschedule request is submitted pending clinic calendar confirmation",
    legacyEquivalent: "reschedule_request_received_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Reschedule Request Received",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nWe have received your request to reschedule your dental appointment.\n\n📅 New Requested Date: {{2}}\n⏰ New Requested Slot: {{3}}\n🩺 Service: {{4}}\n\nOur team is reviewing slot availability and will confirm shortly.",
        example: {
          body_text: [["Rahul Sharma", "19-Nov-2026", "04:30 PM", "Clear Aligners Checkup"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Contact: +91 98765 43210",
      },
    ],
  },

  // 5. Official Appointment Confirmation (With Calendar & Directions)
  {
    name: "appointment_confirmation_rdc",
    category: "UTILITY",
    language: "en",
    description: "Official confirmed appointment notification with 1-tap Google/Apple Calendar link and Google Maps Directions",
    legacyEquivalent: "appointment_confirmation_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Dental Appointment Confirmed",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nYour dental appointment at Ramesh Dental Clinic has been successfully confirmed!\n\n📅 Date: {{2}}\n⏰ Time Slot: {{3}}\n🩺 Service: {{4}}\n👨‍⚕️ Attending Dentist: Dr. Ramesh Darisi\n📍 Location: 12-3-456, Medical Center Road, KPHB Colony, Hyderabad\n\nPlease arrive 5-10 minutes prior to your scheduled slot.",
        example: {
          body_text: [["Rahul Sharma", "18-Nov-2026", "10:30 AM", "Dental Implant Consultation"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Hyderabad",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Add to Calendar",
            url: "https://rameshdental.vercel.app/api/patient/calendar/{{1}}",
            example: ["apt_102837482"],
          },
          {
            type: "URL",
            text: "Get Directions",
            url: "https://maps.google.com/?q=Ramesh+Dental+Clinic+Hyderabad",
          },
        ],
      },
    ],
  },

  // 6. Walk-in Appointment Confirmation
  {
    name: "walkin_confirmation_rdc",
    category: "UTILITY",
    language: "en",
    description: "Sent immediately when reception desk creates an instant walk-in dental appointment",
    legacyEquivalent: "walkin_confirmation_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Walk-in Appointment Confirmed",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nYour walk-in appointment at Ramesh Dental Clinic has been confirmed.\n\n📅 Date: {{2}}\n⏰ Slot: {{3}}\n🩺 Service: {{4}}\n📍 Clinic: Ramesh Dental Clinic, Hyderabad\n\nThank you for choosing us for your dental care!",
        example: {
          body_text: [["Ananya Deshmukh", "18-Nov-2026", "11:00 AM", "Emergency Toothache Relief"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Hyderabad",
      },
    ],
  },

  // 7. Appointment Rescheduled Notice
  {
    name: "appointment_rescheduled_rdc",
    category: "UTILITY",
    language: "en",
    description: "Dispatched when an appointment is updated with a new date or time slot",
    legacyEquivalent: "appointment_rescheduled_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Appointment Rescheduled",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nYour dental appointment has been rescheduled as requested.\n\n📅 New Date: {{2}}\n⏰ New Time Slot: {{3}}\n🩺 Service: {{4}}\n👨‍⚕️ Attending Dentist: Dr. Ramesh Darisi\n📍 Location: Ramesh Dental Clinic, Hyderabad",
        example: {
          body_text: [["Rahul Sharma", "20-Nov-2026", "02:00 PM", "Zirconia Crown Placement"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Hyderabad",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Add to Calendar",
            url: "https://rameshdental.vercel.app/api/patient/calendar/{{1}}",
            example: ["apt_102837482"],
          },
        ],
      },
    ],
  },

  // 8. Appointment Cancellation Notice
  {
    name: "appointment_cancellation_rdc",
    category: "UTILITY",
    language: "en",
    description: "Dispatched when an appointment is cancelled with reason and 1-tap rebook button",
    legacyEquivalent: "appointment_cancellation_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Appointment Cancelled",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nYour dental appointment scheduled for {{2}} at {{3}} has been cancelled.\n\n📋 Cancellation Reason: {{4}}\n\nIf you would like to book a fresh appointment, you may do so anytime online or contact our clinic desk.",
        example: {
          body_text: [["Rahul Sharma", "18-Nov-2026", "10:30 AM", "Patient Requested Reschedule"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Care Desk",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "Book Again",
            url: "https://rameshdental.vercel.app/book",
          },
        ],
      },
    ],
  },

  // 9. Day-of / Morning Appointment Reminder
  {
    name: "session_reminder_rdc",
    category: "UTILITY",
    language: "en",
    description: "Automated morning reminder dispatched 2-3 hours before the scheduled appointment",
    legacyEquivalent: "session_reminder_gpc",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Dental Appointment Reminder",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nThis is a gentle reminder for your dental appointment scheduled today at {{2}} with Dr. {{3}}.\n\n📍 Ramesh Dental Clinic, Hyderabad\n\nPlease arrive 10 minutes prior to your slot. If you need any assistance, please reply to this chat.",
        example: {
          body_text: [["Rahul Sharma", "10:30 AM", "Ramesh Darisi"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Contact: +91 98765 43210",
      },
    ],
  },

  // 10. Official Invoice Receipt PDF (Document Header)
  {
    name: "invoice_receipt_pdf",
    category: "UTILITY",
    language: "en",
    description: "Official payment receipt and tax invoice dispatched as a PDF document attachment with financial parameters",
    legacyEquivalent: "invoice_receipt_pdf",
    components: [
      {
        type: "HEADER",
        format: "DOCUMENT",
        example: {
          header_handle: ["https://rameshdental.vercel.app/sample-invoice.pdf"],
        },
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nThank you for choosing Ramesh Dental Clinic. Your payment receipt and clinic invoice has been issued.\n\n🧾 Invoice No: {{2}}\n📅 Date: {{3}}\n💰 Amount: ₹{{4}}\n\nYour official invoice PDF is attached above for your records.",
        example: {
          body_text: [["Rahul Sharma", "RDC-INV-2026-089", "18-Nov-2026", "2500"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Billing Desk",
      },
    ],
  },

  // 11. Clinical Consultation & Prescription Report PDF (Document Header)
  {
    name: "consultation_report_pdf",
    category: "UTILITY",
    language: "en",
    description: "Clinical consultation summary, treatment diagnosis, and medical prescription dispatched as an official PDF document attachment",
    legacyEquivalent: "consultation_report_pdf",
    components: [
      {
        type: "HEADER",
        format: "DOCUMENT",
        example: {
          header_handle: ["https://rameshdental.vercel.app/sample-report.pdf"],
        },
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nYour clinical dental consultation assessment and treatment prescription for {{2}} with Dr. {{3}} is ready.\n\nYour official Consultation & Prescription PDF is attached above for your records.",
        example: {
          body_text: [["Rahul Sharma", "18-Nov-2026", "Ramesh Darisi"]],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Clinical Care",
      },
    ],
  },

  // 12. Doctor Daily Morning Patient Schedule Slots
  {
    name: "doctor_schedule_slots_v1",
    category: "UTILITY",
    language: "en",
    description: "Automated morning 08:00 AM clinical dispatch sent to Dr. Ramesh Darisi with the day's patient appointments breakdown",
    legacyEquivalent: "doctor_schedule_slots_v1",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "Daily Dental Schedule",
      },
      {
        type: "BODY",
        text: "Good morning Dr. {{1}}!\n\nHere is your patient schedule for {{2}} (Total: {{3}} appointments):\n\n1️⃣ {{4}}\n2️⃣ {{5}}\n3️⃣ {{6}}\n4️⃣ {{7}}\n5️⃣ {{8}}\n\nHave a great and productive clinical day!",
        example: {
          body_text: [
            [
              "Ramesh Darisi",
              "18-Nov-2026",
              "5",
              "09:30 AM — Rahul Sharma (Root Canal)",
              "10:30 AM — Ananya Deshmukh (Aligners)",
              "11:30 AM — Suresh Reddy (Implants)",
              "02:00 PM — Priya Verma (Whitening)",
              "03:30 PM — Kiran Patel (Extraction)",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Clinical Engine",
      },
    ],
  },

  // 13. WhatsApp Fortnightly Usage & Spend Digest
  {
    name: "whatsapp_fortnight_digest",
    category: "UTILITY",
    language: "en",
    description: "Bi-weekly operational digest summarizing total WhatsApp notifications, delivery performance, and estimated cloud cost",
    legacyEquivalent: "whatsapp_fortnight_digest",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "WhatsApp Usage & Spend Digest",
      },
      {
        type: "BODY",
        text: "Hello {{1}},\n\nHere is your clinic WhatsApp notification summary for {{2}}:\n\n• Delivered Messages: {{3}}\n• Total Dispatches: {{4}}\n• Estimated Cost: ₹{{5}}\n• Account Quality: {{6}}\n\nKeep track of your communications anytime in your Admin Dashboard.",
        example: {
          body_text: [
            [
              "Dr. Ramesh Darisi",
              "01-Nov to 15-Nov-2026",
              "412",
              "418",
              "154.20",
              "GREEN (Active)",
            ],
          ],
        },
      },
      {
        type: "FOOTER",
        text: "Ramesh Dental Clinic • Analytics",
      },
    ],
  },
];

/**
 * Submits a single template definition to Meta Cloud API for approval
 */
export async function submitTemplateToMeta(
  template: MetaWhatsAppTemplateDefinition,
  credentials?: {
    accessToken?: string;
    wabaId?: string;
  }
): Promise<{
  success: boolean;
  name: string;
  templateId?: string;
  status?: string;
  category?: string;
  error?: string;
}> {
  const token = credentials?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = credentials?.wabaId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (!token || !wabaId) {
    return {
      success: false,
      name: template.name,
      error: "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ACCOUNT_ID environment variables.",
    };
  }

  const payload: any = {
    name: template.name,
    category: template.category,
    language: template.language,
    components: template.components,
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${wabaId}/message_templates`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      // Check if template already exists (Meta returns error subcode 2388043 or message containing "name already exists")
      const errorMessage = data?.error?.message || `HTTP ${res.status}`;
      const isDuplicate =
        errorMessage.toLowerCase().includes("already exists") ||
        data?.error?.error_subcode === 2388043;

      return {
        success: isDuplicate, // treat duplicate as already created
        name: template.name,
        status: isDuplicate ? "ALREADY_EXISTS" : "FAILED",
        error: errorMessage,
      };
    }

    return {
      success: true,
      name: template.name,
      templateId: data.id,
      status: data.status || "PENDING",
      category: data.category || template.category,
    };
  } catch (err: any) {
    return {
      success: false,
      name: template.name,
      error: err?.message || "Network exception while contacting Meta Graph API",
    };
  }
}

/**
 * Submits all registered Ramesh Dental Clinic templates to Meta for batch approval
 */
export async function submitAllRdcTemplatesToMeta(credentials?: {
  accessToken?: string;
  wabaId?: string;
}) {
  const results = [];
  for (const tmpl of RAMESH_DENTAL_WHATSAPP_TEMPLATES) {
    const result = await submitTemplateToMeta(tmpl, credentials);
    results.push(result);
  }
  return results;
}
