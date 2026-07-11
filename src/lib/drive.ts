// Google Drive Apps Script Helper
// Helper to get authenticated Google Drive client
// Helper to call the Google Apps Script Web App
async function callAppsScript(payload: any) {
  const webAppUrl = process.env.GOOGLE_DRIVE_WEB_APP_URL;
  const secretToken = process.env.GOOGLE_DRIVE_SECRET_TOKEN;

  if (!webAppUrl) {
    throw new Error("Missing GOOGLE_DRIVE_WEB_APP_URL in Environment Variables.");
  }
  if (!secretToken) {
    throw new Error("Missing GOOGLE_DRIVE_SECRET_TOKEN in Environment Variables.");
  }

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      token: secretToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apps Script HTTP Error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || "Google Apps Script returned an unknown error.");
  }

  return result;
}

/**
 * Creates a parent directory for a patient inside the root database folder.
 * Name format: "ID_PatientName" (e.g. "GPC-00001_MarcusThorne")
 * @returns The Google Drive ID of the created folder.
 */
export async function createPatientFolder(patientId: string, patientName: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (!rootFolderId) {
    throw new Error("Missing GOOGLE_DRIVE_ROOT_FOLDER_ID in Environment Variables.");
  }

  // Sanitize patient name for folder naming (remove special characters)
  const sanitizedName = patientName.replace(/[^a-zA-Z0-9\s-_]/g, "").replace(/\s+/g, "");
  const folderName = `${patientId}_${sanitizedName}`;

  try {
    const result = await callAppsScript({
      action: "createFolder",
      parentFolderId: rootFolderId,
      folderName: folderName,
    });
    return result.id;
  } catch (error: any) {
    console.error("Error creating Google Drive patient folder:", error);
    throw new Error(`Google Drive Folder Creation Failed: ${error.message}`);
  }
}

/**
 * Creates a subfolder for a specific date/session inside the patient's folder.
 * @returns The Google Drive ID of the created subfolder.
 */
export async function createDateSubfolder(parentFolderId: string, dateStr: string): Promise<string> {
  try {
    const result = await callAppsScript({
      action: "createFolder",
      parentFolderId: parentFolderId,
      folderName: dateStr, // format: DD-MM-YYYY
    });
    return result.id;
  } catch (error: any) {
    console.error("Error creating Google Drive date subfolder:", error);
    throw new Error(`Google Drive Subfolder Creation Failed: ${error.message}`);
  }
}

/**
 * Uploads a file buffer to a specific Google Drive folder.
 * @returns File object containing Google Drive ID, webViewLink, and webContentLink (download).
 */
export async function uploadFileToFolder(
  folderId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  try {
    // Convert Buffer to base64 string for transmission
    const base64Data = fileBuffer.toString("base64");

    const result = await callAppsScript({
      action: "uploadFile",
      folderId: folderId,
      fileName: fileName,
      mimeType: mimeType,
      base64Data: base64Data,
    });

    return {
      id: result.id,
      webViewLink: result.webViewLink || "",
      webContentLink: result.webContentLink || "",
    };
  } catch (error: any) {
    console.error("Error uploading file to Google Drive:", error);
    throw new Error(`Google Drive File Upload Failed: ${error.message}`);
  }
}

/**
 * Lists all files inside a specific Google Drive folder.
 */
export async function listFilesInFolder(folderId: string): Promise<any[]> {
  try {
    const result = await callAppsScript({
      action: "listFiles",
      folderId: folderId,
    });
    return result.files || [];
  } catch (error: any) {
    console.error("Error listing files in Google Drive folder:", error);
    throw new Error(`Google Drive List Files Failed: ${error.message}`);
  }
}
