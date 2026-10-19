import { NextRequest, NextResponse } from "next/server";
import { deletePatientFolder, deletePatientCategoryFolders } from "@/lib/drive";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

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
      const { auth, db } = getFirebaseAdmin();
      const decoded = await auth.verifyIdToken(bearerToken);
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (["admin", "receptionist", "doctor", "staff"].includes(role)) {
          return true;
        }
      }
    } catch {
      // Invalid token
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required to delete Google Drive files." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { folderId, patientId, categories } = body;

    if (!folderId && !patientId) {
      return NextResponse.json(
        { success: false, error: "Missing both folderId and patientId." },
        { status: 400 }
      );
    }

    if (categories && Array.isArray(categories) && categories.length > 0) {
      console.log(`[API Drive Delete] Selectively purging Google Drive category subfolders [${categories.join(", ")}] (folderId: ${folderId || "none"}, patientId: ${patientId || "none"})...`);
      const result = await deletePatientCategoryFolders(folderId, patientId, categories);
      return NextResponse.json({
        success: true,
        message: `Google Drive category subfolders [${categories.join(", ")}] purged successfully.`,
        deletedCount: result.deletedCount || 0,
        folderId,
        patientId,
      });
    }

    console.log(`[API Drive Delete] Purging entire Google Drive folder (folderId: ${folderId || "none"}, patientId: ${patientId || "none"})...`);
    await deletePatientFolder(folderId, patientId);

    return NextResponse.json({
      success: true,
      message: "Google Drive folder permanently purged successfully.",
      folderId,
      patientId,
    });
  } catch (error: any) {
    console.error("POST /api/drive/delete-folder error:", error);
    // Return 200 with warning if folder was already removed, or 500 on real failure
    const msg = error?.message || "Failed to delete Google Drive folder.";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
