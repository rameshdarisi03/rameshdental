import { NextRequest, NextResponse } from "next/server";
import { setFirestoreDocRest, queryFirestoreCollectionRest, deleteFirestoreDocRest } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Patient Medical Record Files Subcollection Serverless Route
 * Path: /api/patients/[id]/files
 * Provides direct, authenticated Admin REST operations for uploading X-ray images,
 * reports, PDFs, and doctor reference scans, bypassing client-side Firestore security rules.
 */

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

    const files = await queryFirestoreCollectionRest(`patients/${cleanId}/files`);
    
    // Sort in memory by createdAt or dateUploaded descending
    files.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, files });
  } catch (err: any) {
    console.error("[API Patient Files GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch medical record files." },
      { status: 500 }
    );
  }
}

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
    const {
      fileName,
      fileType,
      fileSize,
      dateUploaded,
      googleDriveFileId,
      webViewLink,
      downloadLink,
      isDoctorOnly,
      category,
    } = body;

    if (!fileName || !googleDriveFileId) {
      return NextResponse.json(
        { success: false, error: "Missing fileName or googleDriveFileId." },
        { status: 400 }
      );
    }

    const docId = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const filePayload = {
      fileName: String(fileName),
      fileType: String(fileType || "application/octet-stream"),
      fileSize: Number(fileSize) || 0,
      dateUploaded: String(dateUploaded || ""),
      googleDriveFileId: String(googleDriveFileId),
      webViewLink: webViewLink ? String(webViewLink) : `https://drive.google.com/file/d/${googleDriveFileId}/view`,
      downloadLink: downloadLink ? String(downloadLink) : "",
      isDoctorOnly: Boolean(isDoctorOnly),
      category: category ? String(category) : "DOCTOR_REFERENCE",
      createdAt: nowIso,
    };

    // Save to Firestore subcollection using Server REST Admin (bypasses client permissions)
    await setFirestoreDocRest(
      `patients/${cleanId}/files`,
      docId,
      filePayload
    );

    return NextResponse.json({
      success: true,
      file: {
        id: docId,
        ...filePayload,
      },
    });
  } catch (err: any) {
    console.error("[API Patient Files POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save medical record file reference." },
      { status: 500 }
    );
  }
}
