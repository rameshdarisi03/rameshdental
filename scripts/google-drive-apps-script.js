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

      // If replaceExisting is true, trash any existing files with this name first
      if (data.replaceExisting) {
        try {
          const existingFiles = targetFolder.getFilesByName(data.fileName);
          while (existingFiles.hasNext()) {
            existingFiles.next().setTrashed(true);
          }
        } catch (trashErr) {
          console.warn("Could not trash previous existing file: " + trashErr);
        }
      }

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

    // 6. Selectively Delete Category Subfolders Across Entire Date Folders
    if (action === "deleteCategorySubfolders") {
      if (!data.parentFolderId && !data.patientId) {
        return jsonResponse({ success: false, error: "Missing parentFolderId or patientId for deleteCategorySubfolders." });
      }

      var patientFolder = null;
      if (data.parentFolderId) {
        try {
          patientFolder = DriveApp.getFolderById(data.parentFolderId);
        } catch (e) {}
      }

      if (!patientFolder && data.patientId && data.rootFolderId) {
        var root = DriveApp.getFolderById(data.rootFolderId);
        var folders = root.getFolders();
        while (folders.hasNext()) {
          var sub = folders.next();
          if (sub.getName().startsWith(data.patientId)) {
            patientFolder = sub;
            break;
          }
        }
      }

      if (!patientFolder) {
        return jsonResponse({ success: true, message: "Patient folder not found; nothing to delete.", deletedFolders: 0, deletedFiles: 0 });
      }

      var rawCategories = data.categories || [];
      var targetCategories = [];
      for (var i = 0; i < rawCategories.length; i++) {
        targetCategories.push(String(rawCategories[i]).toLowerCase().trim());
      }

      if (targetCategories.length === 0) {
        return jsonResponse({ success: true, message: "No categories specified.", deletedFolders: 0, deletedFiles: 0 });
      }

      var deletedFolders = 0;
      var deletedFiles = 0;

      // Iterate through all subfolders of patientFolder (date folders, e.g. "DD-MM-YYYY")
      var dateFoldersIterator = patientFolder.getFolders();
      while (dateFoldersIterator.hasNext()) {
        var dateFolder = dateFoldersIterator.next();

        // 1. Check if dateFolder has subfolders matching any target category
        var catFoldersIterator = dateFolder.getFolders();
        while (catFoldersIterator.hasNext()) {
          var subFolder = catFoldersIterator.next();
          var subNameLower = subFolder.getName().toLowerCase();

          var matchesCategory = false;
          for (var j = 0; j < targetCategories.length; j++) {
            var cat = targetCategories[j];
            if (subNameLower === cat || subNameLower.indexOf(cat) !== -1) {
              matchesCategory = true;
              break;
            }
          }

          if (matchesCategory) {
            subFolder.setTrashed(true);
            deletedFolders++;
          }
        }

        // 2. Also check direct files inside the dateFolder matching category keywords
        var filesIterator = dateFolder.getFiles();
        while (filesIterator.hasNext()) {
          var file = filesIterator.next();
          var fileNameLower = file.getName().toLowerCase();

          var fileMatches = false;
          for (var k = 0; k < targetCategories.length; k++) {
            var c = targetCategories[k];
            if (c === "prescriptions" && (fileNameLower.indexOf("prescription") !== -1 || fileNameLower.indexOf("consultation") !== -1)) fileMatches = true;
            if (c === "reports" && (fileNameLower.indexOf("report") !== -1 || fileNameLower.indexOf("scan") !== -1 || fileNameLower.indexOf("medical") !== -1)) fileMatches = true;
            if (c === "invoices" && (fileNameLower.indexOf("invoice") !== -1 || fileNameLower.indexOf("bill") !== -1)) fileMatches = true;
            if (fileMatches) break;
          }

          if (fileMatches) {
            file.setTrashed(true);
            deletedFiles++;
          }
        }
      }

      return jsonResponse({
        success: true,
        deletedFolders: deletedFolders,
        deletedFiles: deletedFiles
      });
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
