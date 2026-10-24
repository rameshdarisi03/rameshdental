import { NextRequest, NextResponse } from "next/server";
import { syncPractoAppointments } from "@/lib/practoSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { overrideUrl, doctorName } = body;

    const result = await syncPractoAppointments({
      overrideUrl,
      therapistName: doctorName,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: any) {
    console.error("[API Practo Sync] Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to sync Practo appointments." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const result = await syncPractoAppointments();
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err: any) {
    console.error("[API Practo Sync GET] Error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to sync Practo appointments." },
      { status: 500 }
    );
  }
}
