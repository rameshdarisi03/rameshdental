import { NextResponse } from "next/server";
import { createPatientFolder, createDateSubfolder, uploadFileToFolder, listFilesInFolder } from "@/lib/drive";

export async function GET() {
  try {
    console.log("Testing Google Drive Integration...");
    
    // 1. Test Patient Folder Creation
    const testId = "GPC-TEST-" + Math.floor(10000 + Math.random() * 90000);
    const testName = "JaneDoeTest";
    console.log(`Step 1: Creating patient folder for ${testId}_${testName}...`);
    const patientFolderId = await createPatientFolder(testId, testName);
    console.log(`Created Patient Folder ID: ${patientFolderId}`);

    // 2. Test Date Subfolder Creation
    const testDate = "11-07-2026";
    console.log(`Step 2: Creating subfolder for date ${testDate}...`);
    const dateFolderId = await createDateSubfolder(patientFolderId, testDate);
    console.log(`Created Date Folder ID: ${dateFolderId}`);

    // 3. Test File Upload to subfolder
    const dummyContent = "Gait Physio Clinic - Google Drive Integration Test\n\nPatient ID: " + testId + "\nName: Jane Doe\nNotes: Patient shows excellent recovery progression. Gait metrics are stable.";
    const buffer = Buffer.from(dummyContent, "utf-8");
    const fileName = "test_consultation_notes.txt";
    const mimeType = "text/plain";
    
    console.log(`Step 3: Uploading dummy file ${fileName}...`);
    const uploadResult = await uploadFileToFolder(dateFolderId, buffer, fileName, mimeType);
    console.log("Upload Result:", uploadResult);

    // 4. Test listing files in the date subfolder to verify upload
    console.log(`Step 4: Listing files in date folder ${dateFolderId}...`);
    const filesList = await listFilesInFolder(dateFolderId);
    console.log("Files List in Subfolder:", filesList);

    return NextResponse.json({
      success: true,
      message: "Google Drive API Integration test completed successfully!",
      data: {
        testPatientId: testId,
        patientFolderId: patientFolderId,
        dateFolderId: dateFolderId,
        uploadedFileId: uploadResult.id,
        webViewLink: uploadResult.webViewLink,
        webContentLink: uploadResult.webContentLink,
        filesInSubfolder: filesList,
      }
    });
  } catch (error: any) {
    console.error("Google Drive API Test Failed:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "An unexpected error occurred during Drive test.",
    }, { status: 500 });
  }
}
