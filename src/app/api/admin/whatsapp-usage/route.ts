import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim().replace(/^["']|["']$/g, "");
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1139209992097469";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1347657255099510";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "WhatsApp access token is not configured." },
        { status: 500 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const fourteenDaysAgo = now - 14 * 24 * 3600;
    const thirtyDaysAgo = now - 30 * 24 * 3600;

    // 1. Fetch 30-day analytics from WABA
    const analyticsUrl = `https://graph.facebook.com/v22.0/${wabaId}?fields=analytics.start(${thirtyDaysAgo}).end(${now}).granularity(DAY)`;
    const aRes = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const aData = await aRes.json().catch(() => ({}));
    const dataPoints = aData.analytics?.data_points || [];

    let total30Sent = 0;
    let total30Delivered = 0;
    let total14Sent = 0;
    let total14Delivered = 0;

    const dailyBreakdown = dataPoints.map((dp: any) => {
      const dateStr = new Date(dp.start * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
      const sent = dp.sent || 0;
      const delivered = dp.delivered || 0;

      total30Sent += sent;
      total30Delivered += delivered;

      if (dp.start >= fourteenDaysAgo) {
        total14Sent += sent;
        total14Delivered += delivered;
      }

      return {
        date: dateStr,
        timestamp: dp.start,
        sent,
        delivered,
      };
    });

    // 2. Fetch Phone status & quality
    const pRes = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}?fields=verified_name,quality_rating,status,display_phone_number,name_status,new_display_name,new_name_status`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const pData = await pRes.json().catch(() => ({}));

    // In India (IN), Meta utility conversations are approx ₹0.115 each
    const estimatedCost30 = (total30Delivered * 0.115).toFixed(2);
    const estimatedCost14 = (total14Delivered * 0.115).toFixed(2);

    return NextResponse.json({
      success: true,
      verifiedName: pData.new_display_name || pData.verified_name || "Gait Physio Clinic",
      displayPhone: pData.display_phone_number || "+91 82178 52653",
      qualityRating: pData.quality_rating || "GREEN",
      status: pData.status || "CONNECTED",
      past14Days: {
        sent: total14Sent,
        delivered: total14Delivered,
        estimatedCostINR: estimatedCost14,
      },
      past30Days: {
        sent: total30Sent,
        delivered: total30Delivered,
        estimatedCostINR: estimatedCost30,
      },
      dailyBreakdown,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[WhatsApp Usage API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch usage metrics." },
      { status: 500 }
    );
  }
}
