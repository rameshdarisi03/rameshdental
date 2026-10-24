import { verifyFirebaseIdTokenRest, getFirestoreDocRest, patchFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import { NextRequest, NextResponse } from "next/server";
import { createPatientFolder, createDateSubfolder } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
  // 1. Staff session cookie from dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }

  // 2. Bearer Firebase ID token
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

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required to create patient folders." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientId, patientName, dateStr } = body;

    if (!patientId || !patientName) {
      return NextResponse.json({ success: false, error: "Missing patientId or patientName." }, { status: 400 });
    }

    console.log(`[API Drive] Creating folder for ${patientId}_${patientName}...`);
    const folderId = await createPatientFolder(patientId, patientName);

    // Auto-save folder ID to patient document in Firestore with Admin privileges if available
    try {
      await patchFirestoreDocRest("patients", patientId, { googleDriveFolderId: folderId });
      console.log(`[API Drive] Auto-linked googleDriveFolderId (${folderId}) to patient ${patientId} in Firestore.`);
    } catch (dbErr) {
      console.warn(`[API Drive] Warning updating Firestore patient doc with folderId:`, dbErr);
    }

    // If an initial date is specified, create the date subfolder too
    let dateFolderId = "";
    if (dateStr) {
      let normalizedDate = dateStr.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        const [yyyy, mm, dd] = normalizedDate.split("-");
        normalizedDate = `${dd}-${mm}-${yyyy}`;
      }
      console.log(`[API Drive] Creating initial date subfolder '${normalizedDate}'...`);
      dateFolderId = await createDateSubfolder(folderId, normalizedDate);
    }

    return NextResponse.json({ 
      success: true, 
      folderId,
      dateFolderId: dateFolderId || undefined
    });
  } catch (error: any) {
    console.error("POST /api/drive/create-folder error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
