import { NextRequest, NextResponse } from "next/server";
import { setFirestoreDocRest, patchFirestoreDocRest, getFirestoreDocRest } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();

    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: "Missing required patient ID." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { date, summary, therapistName, notes } = body;

    const consultSummary = summary || notes || "";
    if (!consultSummary) {
      return NextResponse.json(
        { success: false, error: "Consultation notes/summary cannot be empty." },
        { status: 400 }
      );
    }

    const consultDate = date || new Date().toISOString().split("T")[0];
    const docId = `consult_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const consultationPayload = {
      date: consultDate,
      summary: consultSummary,
      therapistName: therapistName || "Dr. Ramesh Darisi",
      createdAt: nowIso,
    };

    // 1. Write consultation document to subcollection via Server REST Admin
    await setFirestoreDocRest(
      `patients/${cleanId}/consultations`,
      docId,
      consultationPayload
    );

    // 2. Update patient's lastVisit field in parent document
    try {
      await patchFirestoreDocRest("patients", cleanId, {
        lastVisit: consultDate,
      });
    } catch (patchErr) {
      console.warn("[API Consultations] Could not update patient lastVisit:", patchErr);
    }

    return NextResponse.json({
      success: true,
      consultation: {
        id: docId,
        ...consultationPayload,
      },
    });
  } catch (err: any) {
    console.error("[API Add Consultation] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save consultation note." },
      { status: 500 }
    );
  }
}
