import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdTokenRest, getFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import {
  RAMESH_DENTAL_WHATSAPP_TEMPLATES,
  submitAllRdcTemplatesToMeta,
  submitTemplateToMeta,
} from "@/lib/whatsappTemplatesConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
  const sessionCookie = req.cookies.get("rdc_session")?.value || req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }

  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const decoded = await verifyFirebaseIdTokenRest(bearerToken);
      if (decoded?.uid) {
        const userDoc = await getFirestoreDocRest("users", decoded.uid);
        if (userDoc && ["admin", "receptionist", "doctor", "staff"].includes(userDoc.role)) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

/**
 * GET /api/admin/whatsapp-templates
 * Returns local template catalog and, if configured, fetches live statuses from Meta Cloud API
 */
export async function GET(req: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required." },
        { status: 401 }
      );
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim().replace(/^["']|["']$/g, "");
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

    const isConfigured = Boolean(token && wabaId);

    let liveTemplates: any[] = [];
    let liveError: string | null = null;

    if (isConfigured && wabaId && token) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/message_templates?limit=100`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            next: { revalidate: 0 },
          }
        );
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) {
          liveTemplates = data.data;
        } else {
          liveError = data?.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        liveError = err?.message || "Failed to reach Meta Graph API";
      }
    }

    // Map local catalog against live templates if available
    const catalog = RAMESH_DENTAL_WHATSAPP_TEMPLATES.map((tmpl) => {
      const live = liveTemplates.find((lt) => lt.name === tmpl.name);
      return {
        ...tmpl,
        liveStatus: live ? live.status : isConfigured ? "NOT_SUBMITTED" : "CREDENTIALS_PENDING",
        liveId: live ? live.id : null,
      };
    });

    return NextResponse.json({
      success: true,
      isConfigured,
      wabaId: wabaId ? `${wabaId.slice(0, 4)}...${wabaId.slice(-4)}` : null,
      phoneId: phoneId ? `${phoneId.slice(0, 4)}...${phoneId.slice(-4)}` : null,
      totalTemplates: catalog.length,
      templates: catalog,
      metaApiStatus: liveError ? { error: liveError } : { liveCount: liveTemplates.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/whatsapp-templates
 * Submits templates to Meta Cloud API for approval
 * Body (optional): { templateName?: string } -> if omitted, submits all 13 templates
 */
export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required." },
        { status: 401 }
      );
    }

    const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim().replace(/^["']|["']$/g, "");
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim();

    if (!token || !wabaId) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta WhatsApp credentials are missing. Please add WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID in .env or Vercel environment variables.",
        },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    // Option 1: Single template submission
    if (body.templateName) {
      const target = RAMESH_DENTAL_WHATSAPP_TEMPLATES.find((t) => t.name === body.templateName);
      if (!target) {
        return NextResponse.json(
          { success: false, error: `Template '${body.templateName}' not found in clinic catalog.` },
          { status: 404 }
        );
      }

      const result = await submitTemplateToMeta(target, { accessToken: token, wabaId });
      return NextResponse.json({ success: result.success, result });
    }

    // Option 2: Batch submission of all templates
    const results = await submitAllRdcTemplatesToMeta({ accessToken: token, wabaId });
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      total: results.length,
      submittedOrExisting: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
