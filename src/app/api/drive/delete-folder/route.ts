import { NextResponse } from "next/server";
import { deletePatientFolder } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { folderId } = body;

    if (!folderId || typeof folderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid folderId." },
        { status: 400 }
      );
    }

    console.log(`[API Drive Delete] Permanently purging Google Drive folder ID: ${folderId}...`);
    await deletePatientFolder(folderId);

    return NextResponse.json({
      success: true,
      message: "Google Drive folder permanently purged successfully.",
      folderId,
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
