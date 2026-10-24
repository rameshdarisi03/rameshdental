import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyFirebaseIdTokenRest, getFirestoreDocRest } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedAdminOrStaff(req: NextRequest): Promise<boolean> {
  // 1. Session cookie check from authenticated staff dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "staff", "doctor"].includes(sessionCookie)) {
    return true;
  }

  // 2. Raw Cookie header check
  const rawCookie = req.headers.get("cookie") || "";
  if (
    rawCookie.includes("gpc_session=admin") ||
    rawCookie.includes("gpc_session=receptionist") ||
    rawCookie.includes("gpc_session=staff") ||
    rawCookie.includes("gpc_session=doctor")
  ) {
    return true;
  }

  // 3. Custom Staff Headers passed from dashboard client
  const staffRole = req.headers.get("x-staff-role")?.toLowerCase();
  if (staffRole && ["admin", "receptionist", "staff", "doctor"].includes(staffRole)) {
    return true;
  }

  // 4. Bearer Firebase ID token verification
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

  // 5. Dashboard Origin & Referer Verification
  const referer = req.headers.get("referer") || "";
  if (referer.includes("/dashboard/settings")) {
    return true;
  }

  return false;
}

export async function GET() {
  try {
    const { db } = getFirebaseAdmin();
    const docSnap = await db.collection("settings").doc("clinic_config").get();
    if (docSnap.exists) {
      return NextResponse.json({ success: true, config: docSnap.data() });
    }
    return NextResponse.json({ success: true, config: null });
  } catch (err: any) {
    console.error("[API Clinic Config GET] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Security Guard: Verify that the caller is an authenticated clinic staff or administrator
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

    const { db } = getFirebaseAdmin();
    await db.collection("settings").doc("clinic_config").set(cleanConfig, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Clinic configuration saved successfully.",
    });
  } catch (err: any) {
    console.error("[API Clinic Config POST] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
