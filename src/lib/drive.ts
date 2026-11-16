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
    redirect: "follow",
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
  mimeType: string,
  replaceExisting?: boolean
): Promise<{ id: string; webViewLink: string; webContentLink: string }> {
  try {
    // Convert Buffer to base64 string for transmission
    const base64Data = fileBuffer.toString("base64");

    const result = await callAppsScript({
      action: "uploadFile",
      folderId: folderId,
      parentFolderId: folderId,
      fileName: fileName,
      mimeType: mimeType,
      fileData: base64Data,
      base64Data: base64Data,
      replaceExisting: Boolean(replaceExisting),
    });

    return {
      id: result.id,
      webViewLink: result.webViewLink || "",
      webContentLink: result.downloadUrl || result.webContentLink || "",
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

/**
 * Permanently deletes a patient folder (and all subfolders/scans inside it) from Google Drive.
 * Supports deletion by direct folderId, or by searching the root directory by patientId (e.g. GPC-10586).
 */
export async function deletePatientFolder(folderId?: string | null, patientId?: string | null): Promise<boolean> {
  if (!folderId && !patientId) return false;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  try {
    let targetFolderId = folderId;

    // Infallible resolution: If folderId is missing, look up patient folder in root directory by prefix match
    if (!targetFolderId && patientId && rootFolderId) {
      try {
        const rootFolders = await listSubfolders(rootFolderId);
        const matched = rootFolders.find((f) => f.name.startsWith(patientId) || f.name.includes(patientId));
        if (matched) {
          console.log(`[deletePatientFolder] Found folder for ${patientId} by prefix match: ${matched.name} (${matched.id})`);
          targetFolderId = matched.id;
        }
      } catch (scanErr) {
        console.warn(`[deletePatientFolder] Scanning root directory failed:`, scanErr);
      }
    }

    const result = await callAppsScript({
      action: "deleteFolder",
      folderId: targetFolderId || undefined,
      patientId: patientId || undefined,
      parentFolderId: rootFolderId,
    });
    return result.success ?? true;
  } catch (error: any) {
    console.error("Error deleting Google Drive folder:", error);
    throw new Error(`Google Drive Folder Deletion Failed: ${error.message}`);
  }
}

/**
 * Lists subfolders inside a specific Google Drive folder.
 */
export async function listSubfolders(folderId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const result = await callAppsScript({
      action: "listFolders",
      folderId: folderId,
    });
    return result.folders || [];
  } catch (error: any) {
    console.error("Error listing subfolders in Google Drive folder:", error);
    return [];
  }
}

/**
 * Selectively deletes category subfolders (e.g. "Prescriptions", "Reports", "Invoices")
 * lying across all date folders of a patient's Google Drive directory.
 * Includes automatic dual-layer fallback if Apps Script hasn't been re-deployed yet.
 */
export async function deletePatientCategoryFolders(
  folderId?: string | null,
  patientId?: string | null,
  categories: string[] = []
): Promise<{ success: boolean; deletedCount?: number }> {
  if (!folderId && !patientId) return { success: false };
  if (!categories || categories.length === 0) return { success: true, deletedCount: 0 };

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  // 1. Try atomic Apps Script action first
  try {
    const result = await callAppsScript({
      action: "deleteCategorySubfolders",
      parentFolderId: folderId || undefined,
      patientId: patientId || undefined,
      rootFolderId: rootFolderId,
      categories: categories,
    });
    if (result && result.success) {
      console.log(`[deletePatientCategoryFolders] Apps Script purged ${result.deletedFolders || 0} subfolders and ${result.deletedFiles || 0} files.`);
      return { 
        success: true, 
        deletedCount: (result.deletedFolders || 0) + (result.deletedFiles || 0) 
      };
    }
  } catch (scriptErr: any) {
    console.warn("[deletePatientCategoryFolders] Direct Apps Script action warning (using multi-step fallback):", scriptErr?.message || scriptErr);
  }

  // 2. Infallible fallback using existing listFolders + deleteFolder actions
  try {
    let targetPatientFolderId = folderId;

    // If folderId is missing, look up patient folder in root directory
    if (!targetPatientFolderId && patientId && rootFolderId) {
      const rootFolders = await listSubfolders(rootFolderId);
      const matched = rootFolders.find((f) => f.name.startsWith(patientId));
      if (matched) {
        targetPatientFolderId = matched.id;
      }
    }

    if (!targetPatientFolderId) {
      console.warn("[deletePatientCategoryFolders] Patient folder could not be located in Google Drive.");
      return { success: false };
    }

    // List all date folders inside the patient's root directory (e.g. "DD-MM-YYYY")
    const dateFolders = await listSubfolders(targetPatientFolderId);
    let totalDeleted = 0;
    const lowerCategories = categories.map((c) => c.toLowerCase().trim());

    for (const dateFolder of dateFolders) {
      // List subfolders inside each date folder
      const subfolders = await listSubfolders(dateFolder.id);
      for (const sub of subfolders) {
        const subNameLower = sub.name.toLowerCase();
        const shouldDelete = lowerCategories.some((cat) => subNameLower === cat || subNameLower.includes(cat));

        if (shouldDelete) {
          try {
            await callAppsScript({
              action: "deleteFolder",
              folderId: sub.id,
            });
            totalDeleted++;
            console.log(`[deletePatientCategoryFolders] Trashed category subfolder '${sub.name}' in date folder '${dateFolder.name}'`);
          } catch (delErr) {
            console.warn(`[deletePatientCategoryFolders] Failed to trash subfolder ${sub.id}:`, delErr);
          }
        }
      }
    }

    return { success: true, deletedCount: totalDeleted };
  } catch (fallbackErr: any) {
    console.error("[deletePatientCategoryFolders] Fallback deletion error:", fallbackErr);
    return { success: false };
  }
}

