import { NextResponse } from "next/server";
import { createDateSubfolder, uploadFileToFolder } from "@/lib/drive";

// Defensive helper to normalize any date input to DD-MM-YYYY
function normalizeDateStr(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  const trimmed = dateStr.trim();
  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yyyy, mm, dd] = trimmed.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  // Handle already valid DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // Attempt to parse other valid date strings
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const dd = String(parsed.getDate()).padStart(2, "0");
      const mm = String(parsed.getMonth() + 1).padStart(2, "0");
      const yyyy = parsed.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
  } catch {}

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const parentFolderId = formData.get("parentFolderId") as string;
    const rawDateStr = formData.get("date") as string;
    const rawCategory = (formData.get("category") as string)?.trim() || "";

    if (!file || !parentFolderId || !rawDateStr) {
      return NextResponse.json({ success: false, error: "Missing file, parentFolderId, or date." }, { status: 400 });
    }

    const dateStr = normalizeDateStr(rawDateStr);
    console.log(`[API Drive Upload] Received file ${file.name} for folder ${parentFolderId} (date: ${dateStr}, category: ${rawCategory || "none"})...`);

    // 1. Create / Get date subfolder (e.g., DD-MM-YYYY)
    console.log(`[API Drive Upload] Creating/Getting date folder for ${dateStr}...`);
    const dateFolderId = await createDateSubfolder(parentFolderId, dateStr);

    // 2. Create / Get category subfolder inside date folder (e.g., Invoices, Prescriptions, Reports)
    let targetFolderId = dateFolderId;
    if (rawCategory) {
      console.log(`[API Drive Upload] Creating/Getting category folder '${rawCategory}' inside ${dateFolderId}...`);
      targetFolderId = await createDateSubfolder(dateFolderId, rawCategory);
    }

    // 3. Upload file to target folder
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    console.log(`[API Drive Upload] Uploading to subfolder ${targetFolderId}...`);
    const uploadResult = await uploadFileToFolder(
      targetFolderId,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream"
    );

    return NextResponse.json({
      success: true,
      fileId: uploadResult.id,
      webViewLink: uploadResult.webViewLink,
      downloadLink: uploadResult.webContentLink,
      dateFolderId: dateFolderId,
      categoryFolderId: targetFolderId !== dateFolderId ? targetFolderId : undefined,
      category: rawCategory || undefined,
    });
  } catch (error: any) {
    console.error("POST /api/drive/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
