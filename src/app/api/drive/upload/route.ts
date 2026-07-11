import { NextResponse } from "next/server";
import { createDateSubfolder, uploadFileToFolder } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parentFolderId = formData.get("parentFolderId") as string;
    const dateStr = formData.get("date") as string; // DD-MM-YYYY

    if (!file || !parentFolderId || !dateStr) {
      return NextResponse.json({ success: false, error: "Missing file, parentFolderId, or date." }, { status: 400 });
    }

    console.log(`[API Drive Upload] Received file ${file.name} for folder ${parentFolderId}...`);

    // 1. Create date subfolder
    console.log(`[API Drive Upload] Creating/Getting date folder for ${dateStr}...`);
    const dateFolderId = await createDateSubfolder(parentFolderId, dateStr);

    // 2. Upload file
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    console.log(`[API Drive Upload] Uploading to subfolder ${dateFolderId}...`);
    const uploadResult = await uploadFileToFolder(
      dateFolderId,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      fileId: uploadResult.id,
      webViewLink: uploadResult.webViewLink,
      downloadLink: uploadResult.webContentLink,
      dateFolderId: dateFolderId
    });
  } catch (error: any) {
    console.error("POST /api/drive/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
