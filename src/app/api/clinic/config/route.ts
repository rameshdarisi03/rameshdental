import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
