import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppFortnightUsageReport } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORTNIGHT_RECIPIENTS = [
  { name: "Dr. Ramesh Darisi", phone: "8971462949", email: "rameshdarisi01@gmail.com" },
];

export async function GET(req: NextRequest) {
  return handleFortnightUsage(req);
}

export async function POST(req: NextRequest) {
  return handleFortnightUsage(req);
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

async function handleFortnightUsage(req: NextRequest) {
  try {
    if (!isAuthorizedCronOrStaff(req)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Valid cron token or staff session required." },
        { status: 401 }
      );
    }
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim().replace(/^["']|["']$/g, "");
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !wabaId || !phoneId) {
      return NextResponse.json(
        { success: false, error: "WhatsApp Cloud API is not configured." },
        { status: 500 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const fourteenDaysAgo = now - 14 * 24 * 3600;

    // 1. Fetch 14-day analytics from WABA
    const analyticsUrl = `https://graph.facebook.com/v22.0/${wabaId}?fields=analytics.start(${fourteenDaysAgo}).end(${now}).granularity(DAY)`;
    const aRes = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const aData = await aRes.json().catch(() => ({}));
    const dataPoints = aData.analytics?.data_points || [];

    let total14Sent = 0;
    let total14Delivered = 0;

    for (const dp of dataPoints) {
      total14Sent += dp.sent || 0;
      total14Delivered += dp.delivered || 0;
    }

    // 2. Fetch Phone details
    const pRes = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}?fields=verified_name,quality_rating,status,display_phone_number`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const pData = await pRes.json().catch(() => ({}));

    const verifiedName = pData.verified_name || "Ramesh Dental Clinic";
    const displayPhone = pData.display_phone_number || "+91 89714 62949";
    const qualityRating = pData.quality_rating || "GREEN";
    const estimatedCost14 = (total14Delivered * 0.115).toFixed(2);

    const startDateStr = new Date(fourteenDaysAgo * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const endDateStr = new Date(now * 1000).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const whatsappMessage = 
`🏥 *RAMESH DENTAL CLINIC*
📊 *WhatsApp Fortnightly Consumption Digest*
🗓️ *Period:* ${startDateStr} – ${endDateStr}

📈 *Activity Summary (Past 14 Days):*
• *Messages Delivered:* ${total14Delivered}
• *Notifications Sent:* ${total14Sent}
• *Estimated Spend:* ₹${estimatedCost14} INR

🔋 *Account Health:* 🟢 ${qualityRating} (High Quality)
📱 *Sender Phone:* ${displayPhone} (${verifiedName})
🔗 *Live Dashboard:* https://rameshdental.vercel.app/dashboard/settings

━━━━━━━━━━━━━━━━━━━━━
_Automated fortnightly digest from Ramesh Dental Engine._`;

    // 3. Dispatch WhatsApp messages to recipients using official Meta template
    const whatsappResults = [];
    const periodStr = `${startDateStr} - ${endDateStr}`;

    for (const recipient of FORTNIGHT_RECIPIENTS) {
      try {
        console.log(`[Fortnight Usage] Dispatching WhatsApp Template to ${recipient.name} (${recipient.phone})...`);
        const res = await sendWhatsAppFortnightUsageReport({
          rawPhone: recipient.phone,
          recipientName: recipient.name,
          period: periodStr,
          deliveredCount: total14Delivered,
          totalDispatches: total14Sent,
          estimatedCostINR: estimatedCost14,
          qualityRating,
        });
        whatsappResults.push({ recipient: recipient.name, phone: recipient.phone, success: res.success, id: res.messageId, error: res.error });
      } catch (err: any) {
        whatsappResults.push({ recipient: recipient.name, phone: recipient.phone, success: false, error: err.message });
      }
    }

    // 4. Dispatch Email backup
    let emailResult = null;
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 8px;">
            🦷 Ramesh Dental Clinic — WhatsApp Fortnightly Digest
          </h2>
          <p><strong>Reporting Period:</strong> ${startDateStr} – ${endDateStr}</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 6px 0;"><strong>Delivered Messages:</strong> ${total14Delivered}</p>
            <p style="margin: 6px 0;"><strong>Total Dispatched:</strong> ${total14Sent}</p>
            <p style="margin: 6px 0; font-size: 16px; color: #0d9488;"><strong>Estimated Consumption:</strong> ₹${estimatedCost14} INR</p>
            <p style="margin: 6px 0;"><strong>Quality Rating:</strong> 🟢 ${qualityRating}</p>
            <p style="margin: 6px 0;"><strong>Sender:</strong> ${displayPhone} (${verifiedName})</p>
          </div>

          <div style="margin-top: 24px; padding: 12px; background: #f1f5f9; border-radius: 6px; font-size: 13px; color: #64748b;">
            Live Settings & Management: <a href="https://rameshdental.vercel.app/dashboard/settings" style="color: #0d9488;">https://rameshdental.vercel.app/dashboard/settings</a>
          </div>
        </div>
      `;

      emailResult = await sendEmail({
        to: FORTNIGHT_RECIPIENTS.map((r) => ({ email: r.email, name: r.name })),
        subject: `📊 WhatsApp Fortnightly Usage Report (${startDateStr} – ${endDateStr}) — ₹${estimatedCost14} INR`,
        htmlContent: emailHtml,
        tags: ["fortnight-usage-report"],
      });
    } catch (e) {
      console.warn("[Fortnight Usage] Email dispatch error:", e);
    }

    return NextResponse.json({
      success: true,
      period: `${startDateStr} – ${endDateStr}`,
      totalDelivered: total14Delivered,
      totalSent: total14Sent,
      estimatedCostINR: estimatedCost14,
      qualityRating,
      whatsapp: whatsappResults,
      email: emailResult,
    });
  } catch (error: any) {
    console.error("[Fortnight Usage Cron Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process fortnightly usage." },
      { status: 500 }
    );
  }
}
