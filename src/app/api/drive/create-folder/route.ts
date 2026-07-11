import { NextResponse } from "next/server";
import { createPatientFolder, createDateSubfolder } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, patientName, dateStr } = body;

    if (!patientId || !patientName) {
      return NextResponse.json({ success: false, error: "Missing patientId or patientName." }, { status: 400 });
    }

    console.log(`[API Drive] Creating folder for ${patientId}_${patientName}...`);
    const folderId = await createPatientFolder(patientId, patientName);

    // If an initial date is specified, create the date subfolder too
    let dateFolderId = "";
    if (dateStr) {
      console.log(`[API Drive] Creating initial date subfolder '${dateStr}'...`);
      dateFolderId = await createDateSubfolder(folderId, dateStr);
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
