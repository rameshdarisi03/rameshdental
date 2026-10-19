import { NextRequest, NextResponse } from "next/server";
import { queryFirestoreCollectionRest } from "@/lib/firebaseRestAdmin";
import { sendWhatsAppDoctorDailySchedule } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Standard Doctor Contact
const DR_KINNERA_PHONE = "8904456243";
const DR_KINNERA_NAME = "Kinnera";
const CLINIC_ALERT_EMAILS = ["kinnera@gaitphysio.com", "ramesh@gaitphysio.com", "rameshdarisi01@gmail.com"];

function getTodayIST(): string {
  // Returns YYYY-MM-DD in Asia/Kolkata time
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function parseSlotToMinutes(slotStr: string): number {
  if (!slotStr) return 0;
  const match = slotStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hour < 12) hour += 12;
  if (meridian === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}

export async function GET(req: NextRequest) {
  return handleDailySchedule(req);
}

export async function POST(req: NextRequest) {
  return handleDailySchedule(req);
}

function isAuthorizedCronOrStaff(req: NextRequest): boolean {
  // 1. Vercel automated Cron header
  if (req.headers.get("x-vercel-cron") === "1") return true;

  // 2. Bearer CRON_SECRET header
  const authHeader = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // 3. Staff session cookie from dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }

  return false;
}

async function handleDailySchedule(req: NextRequest) {
  try {
    if (!isAuthorizedCronOrStaff(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid cron token or staff session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const today = dateParam || getTodayIST();
    const altToday = today.includes("-") ? today.split("-").reverse().join("-") : today;
    const validDates = new Set([today, altToday]);

    const targetPhone = searchParams.get("phone") || DR_KINNERA_PHONE;

    console.log(`[Daily Schedule Cron] Fetching appointments for ${today} in IST...`);

    // Fetch all appointments
    const allApps = await queryFirestoreCollectionRest("appointments");

    // Filter approved appointments for today
    const todayAppointments = allApps
      .filter(
        (app) =>
          validDates.has(app.date) &&
          (app.status === "approved" || app.status === "confirmed")
      )
      .sort((a, b) => parseSlotToMinutes(a.slot) - parseSlotToMinutes(b.slot));

    const formattedList = todayAppointments.map((app) => ({
      slot: app.slot || "TBD",
      patientName: app.patientName || app.name || "Patient",
      serviceName: app.serviceId || app.service || "Physiotherapy Session",
      phone: app.patientPhone || app.phone || "",
    }));

    // 1. Dispatch WhatsApp Notification to Dr. Kinnera
    console.log(`[Daily Schedule Cron] Dispatching WhatsApp to Dr. Kinnera at ${targetPhone}...`);
    const waResult = await sendWhatsAppDoctorDailySchedule({
      rawPhone: targetPhone,
      doctorName: DR_KINNERA_NAME,
      date: today,
      appointments: formattedList,
    });

    // 2. Dispatch Email Backup to Clinic Team
    let emailResult = null;
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px;">
            🏥 Gait Physio Clinic — Daily Schedule for Dr. Kinnera
          </h2>
          <p><strong>Date:</strong> ${today} &nbsp;|&nbsp; <strong>Total Patients:</strong> ${formattedList.length}</p>
          
          ${
            formattedList.length === 0
              ? "<p><em>No appointments scheduled for today.</em></p>"
              : `
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr style="background-color: #f1f5f9; text-align: left;">
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">Time Slot</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">Patient</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">Service</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1;">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  ${formattedList
                    .map(
                      (a) => `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f766e;">${a.slot}</td>
                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${a.patientName}</td>
                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${a.serviceName}</td>
                      <td style="padding: 10px; border: 1px solid #cbd5e1;">${a.phone}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
          }
          
          <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; color: #64748b;">
            Automated morning clinical backup dispatched at 08:00 AM IST.<br/>
            Portal: <a href="https://www.gaitphysioclinic.com/dashboard/appointments" style="color: #0d9488;">https://www.gaitphysioclinic.com/dashboard/appointments</a>
          </div>
        </div>
      `;

      emailResult = await sendEmail({
        to: CLINIC_ALERT_EMAILS.map((email) => ({ email })),
        subject: `📅 Daily Clinic Schedule (${today}) — Dr. Kinnera (${formattedList.length} Patients)`,
        htmlContent: emailHtml,
        tags: ["daily-schedule-backup"],
      });
    } catch (e) {
      console.warn("[Daily Schedule Cron] Email dispatch error:", e);
    }

    return NextResponse.json({
      success: true,
      date: today,
      count: formattedList.length,
      message: `Daily schedule for ${today} dispatched successfully (${formattedList.length} appointments).`,
      whatsappSent: Boolean(waResult?.success),
      emailSent: Boolean(emailResult?.success),
    });
  } catch (error: any) {
    console.error("[Daily Schedule Cron Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch daily schedule." },
      { status: 500 }
    );
  }
}
