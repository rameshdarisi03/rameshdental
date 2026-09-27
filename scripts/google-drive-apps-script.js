/**
 * GAIT PHYSIOTHERAPY CLINIC - GOOGLE APPS SCRIPT WEB APP
 * 
 * Instructions to Update/Deploy:
 * 1. Open Google Apps Script (https://script.google.com) and open the Gait Physio Clinic Drive Script.
 * 2. Replace all code in Code.gs with this file content.
 * 3. Verify the SECRET_TOKEN matches your .env.local (default: "gpc_clinical_serenity_secret_2026").
 * 4. Click "Deploy" -> "Manage deployments" -> Click the pencil/edit icon on your active deployment.
 * 5. Under "Version", select "New version" (e.g. "Prevent duplicate date folders and normalize lookup").
 * 6. Click "Deploy". Done!
 */

const SECRET_TOKEN = "gpc_clinical_serenity_secret_2026";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request payload." });
    }

    const data = JSON.parse(e.postData.contents);

    // Security check
    if (!data.token || data.token !== SECRET_TOKEN) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid secret token." });
    }

    const action = data.action;

    // 1. Create or Find Existing Folder (DEDUPLICATION ENABLED)
    if (action === "createFolder") {
      if (!data.parentFolderId || !data.folderName) {
        return jsonResponse({ success: false, error: "Missing parentFolderId or folderName." });
      }

      const parentFolder = DriveApp.getFolderById(data.parentFolderId);
      const folderName = String(data.folderName).trim();

      // Check if a subfolder with this exact name already exists (prevents duplicate date folders)
      const existingFolders = parentFolder.getFoldersByName(folderName);
      if (existingFolders.hasNext()) {
        const existing = existingFolders.next();
        return jsonResponse({
          success: true,
          id: existing.getId(),
          name: existing.getName(),
          alreadyExisted: true
        });
      }

      // Otherwise create brand new folder
      const newFolder = parentFolder.createFolder(folderName);
      try {
        newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}

      return jsonResponse({
        success: true,
        id: newFolder.getId(),
        name: newFolder.getName(),
        alreadyExisted: false
      });
    }

    // 2. Upload Base64 File to Specific Folder
    if (action === "uploadFile") {
      if (!data.folderId || !data.fileName || !data.base64Data) {
        return jsonResponse({ success: false, error: "Missing folderId, fileName, or base64Data." });
      }

      const targetFolder = DriveApp.getFolderById(data.folderId);
      const decodedBytes = Utilities.base64Decode(data.base64Data);
      const mimeType = data.mimeType || "application/octet-stream";
      const blob = Utilities.newBlob(decodedBytes, mimeType, data.fileName);
      const file = targetFolder.createFile(blob);

      // Enable link viewing permission so therapists, staff, and patients can view without permission prompts
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        // Fallback if organization policy restricts public link sharing
      }

      return jsonResponse({
        success: true,
        id: file.getId(),
        name: file.getName(),
        webViewLink: file.getUrl(),
        webContentLink: file.getDownloadUrl()
      });
    }

    // 3. List Files in a Folder
    if (action === "listFiles") {
      if (!data.folderId) {
        return jsonResponse({ success: false, error: "Missing folderId." });
      }

      const folder = DriveApp.getFolderById(data.folderId);
      const filesIterator = folder.getFiles();
      const files = [];

      while (filesIterator.hasNext()) {
        const f = filesIterator.next();
        files.push({
          id: f.getId(),
          name: f.getName(),
          size: f.getSize(),
          mimeType: f.getMimeType(),
          webViewLink: f.getUrl(),
          createdTime: f.getDateCreated().toISOString()
        });
      }

      return jsonResponse({
        success: true,
        files: files
      });
    }

    // 4. List Subfolders in a Folder
    if (action === "listFolders") {
      if (!data.folderId) {
        return jsonResponse({ success: false, error: "Missing folderId." });
      }

      const folder = DriveApp.getFolderById(data.folderId);
      const foldersIterator = folder.getFolders();
      const folders = [];

      while (foldersIterator.hasNext()) {
        const sub = foldersIterator.next();
        folders.push({
          id: sub.getId(),
          name: sub.getName()
        });
      }

      return jsonResponse({
        success: true,
        folders: folders
      });
    }

    // 5. Permanently Delete / Trash Folder
    if (action === "deleteFolder") {
      if (data.folderId) {
        const folder = DriveApp.getFolderById(data.folderId);
        folder.setTrashed(true);
        return jsonResponse({
          success: true,
          message: "Folder moved to trash."
        });
      }

      if (data.patientId && data.parentFolderId) {
        const parent = DriveApp.getFolderById(data.parentFolderId);
        const folders = parent.getFolders();
        let found = false;

        while (folders.hasNext()) {
          const sub = folders.next();
          if (sub.getName().startsWith(data.patientId)) {
            sub.setTrashed(true);
            found = true;
          }
        }

        return jsonResponse({
          success: true,
          deleted: found
        });
      }

      return jsonResponse({ success: false, error: "Missing folderId or patientId for deleteFolder." });
    }

    return jsonResponse({ success: false, error: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
