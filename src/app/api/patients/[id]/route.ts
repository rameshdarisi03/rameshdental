import { NextRequest, NextResponse } from "next/server";
import { getFirestoreDocRest, getAllPatientsRest } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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

    // 1. Direct Firestore document lookup
    let patientDoc = await getFirestoreDocRest("patients", cleanId);

    // 2. Case-insensitive variations
    if (!patientDoc && cleanId.toUpperCase() !== cleanId) {
      patientDoc = await getFirestoreDocRest("patients", cleanId.toUpperCase());
    }
    if (!patientDoc && cleanId.toLowerCase() !== cleanId) {
      patientDoc = await getFirestoreDocRest("patients", cleanId.toLowerCase());
    }

    // 3. Fallback scan across all patients
    if (!patientDoc) {
      const all = await getAllPatientsRest();
      patientDoc = all.find(
        (p: any) =>
          p.id?.toLowerCase() === cleanId.toLowerCase() ||
          p.customId?.toLowerCase() === cleanId.toLowerCase() ||
          p.activationCode?.toLowerCase() === cleanId.toLowerCase()
      ) || null;
    }

    if (!patientDoc) {
      return NextResponse.json(
        { success: false, error: `Patient "${cleanId}" not found in database.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      patient: { id: patientDoc.id || cleanId, ...patientDoc },
    });
  } catch (err: any) {
    console.error("[API Patient GetById] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch patient record." },
      { status: 500 }
    );
  }
}
