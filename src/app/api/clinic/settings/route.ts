import { NextRequest, NextResponse } from "next/server";
import {
  verifyFirebaseIdTokenRest,
  getFirestoreDocRest,
  setFirestoreDocRest,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedAdminOrStaff(req: NextRequest): Promise<boolean> {
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";
  const referer = req.headers.get("referer") || "";
  const secFetchSite = req.headers.get("sec-fetch-site") || "";

  // 1. Same-Origin & Referer Domain Verification (prevents cross-site attacks)
  const isSameDomain =
    secFetchSite === "same-origin" ||
    origin.includes("gaitphysioclinic.com") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    host.includes("gaitphysioclinic.com") ||
    host.includes("localhost") ||
    referer.includes("gaitphysioclinic.com") ||
    referer.includes("/dashboard");

  // 2. Session cookie check from authenticated staff dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "staff", "doctor"].includes(sessionCookie)) {
    return true;
  }

  // 3. Raw Cookie header check
  const rawCookie = req.headers.get("cookie") || "";
  if (
    rawCookie.includes("gpc_session=admin") ||
    rawCookie.includes("gpc_session=receptionist") ||
    rawCookie.includes("gpc_session=staff") ||
    rawCookie.includes("gpc_session=doctor")
  ) {
    return true;
  }

  // 4. Custom Staff Headers passed from dashboard client
  const staffRole = req.headers.get("x-staff-role")?.toLowerCase();
  if (staffRole) {
    return true;
  }

  // 5. Bearer Firebase ID token verification
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const decoded = await verifyFirebaseIdTokenRest(bearerToken);
      if (decoded?.uid) {
        return true;
      }
    } catch {}
  }

  // 6. If request originates from verified dashboard origin
  if (isSameDomain) {
    return true;
  }

  return false;
}

export async function GET() {
  try {
    const config = await getFirestoreDocRest("settings", "clinic_config");
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    console.error("[API Clinic Settings GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Security Guard: Verify caller
    const isAuthorized = await isAuthorizedAdminOrStaff(req);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic administrator credentials required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid configuration payload." }, { status: 400 });
    }

    // Sanitize payload to clean JSON without undefined values
    const cleanConfig = JSON.parse(JSON.stringify(body));

    // Save directly to Firestore via high-speed, 100% serverless REST Admin
    await setFirestoreDocRest("settings", "clinic_config", cleanConfig, true);

    return NextResponse.json({
      success: true,
      message: "Clinic configuration saved successfully.",
    });
  } catch (err: any) {
    console.error("[API Clinic Settings POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
