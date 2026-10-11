import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { deletePatientFolder, deletePatientCategoryFolders } from "@/lib/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface PatientDeleteOptions {
  profile: boolean;
  hub: boolean;
  consultationsAndPrescriptions: boolean;
  scansAndReports: boolean;
  invoices: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, options } = body as {
      patientId: string;
      options: PatientDeleteOptions;
    };

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "Missing required patient ID." },
        { status: 400 }
      );
    }

    const deleteOptions: PatientDeleteOptions = {
      profile: Boolean(options?.profile),
      hub: Boolean(options?.hub),
      consultationsAndPrescriptions: Boolean(options?.consultationsAndPrescriptions),
      scansAndReports: Boolean(options?.scansAndReports),
      invoices: Boolean(options?.invoices),
    };

    console.log(`[API Patient Delete] Purging patient ${patientId} with options:`, deleteOptions);

    const { db, auth } = getFirebaseAdmin();
    const patientDocRef = db.collection("patients").doc(patientId);
    const patientSnap = await patientDocRef.get();

    if (!patientSnap.exists) {
      return NextResponse.json(
        { success: false, error: `Patient "${patientId}" does not exist in the database.` },
        { status: 404 }
      );
    }

    const patientData = patientSnap.data() || {};
    const driveFolderId = patientData?.googleDriveFolderId;
    const authUid = patientData?.authUid;

    // 1. Google Drive Cloud Folder Purge (Granular Selective Deletion based on ticks)
    if (deleteOptions.profile) {
      // Complete profile deletion: wipe the entire patient folder and all date subfolders
      try {
        console.log(`[API Patient Delete] Purging entire Google Drive folder for ${patientId}...`);
        await deletePatientFolder(driveFolderId, patientId);
        console.log(`[API Patient Delete] ✓ Entire Google Drive patient folder purged for ${patientId}`);
      } catch (driveErr: any) {
        console.warn(`[API Patient Delete] Non-fatal Google Drive purge error:`, driveErr?.message || driveErr);
      }
    } else {
      // Selective deletion: patient profile remains, purge only the selected category subfolders across all date folders
      const categoriesToPurge: string[] = [];
      if (deleteOptions.consultationsAndPrescriptions) {
        categoriesToPurge.push("Prescriptions");
      }
      if (deleteOptions.scansAndReports) {
        categoriesToPurge.push("Reports");
      }
      if (deleteOptions.invoices) {
        categoriesToPurge.push("Invoices");
      }

      if (categoriesToPurge.length > 0) {
        try {
          console.log(`[API Patient Delete] Selectively purging Google Drive category subfolders [${categoriesToPurge.join(", ")}] across all date folders for patient ${patientId}...`);
          const catResult = await deletePatientCategoryFolders(driveFolderId, patientId, categoriesToPurge);
          console.log(`[API Patient Delete] ✓ Selectively purged ${catResult.deletedCount || 0} subfolders/files from Google Drive for ${patientId}`);
        } catch (driveErr: any) {
          console.warn(`[API Patient Delete] Non-fatal Google Drive selective purge error:`, driveErr?.message || driveErr);
        }
      }
    }

    // 2. Revoke Patient Hub Access
    if (deleteOptions.hub && !deleteOptions.profile) {
      await patientDocRef.update({
        activated: false,
        authUid: null,
        activationCode: "",
      });
      console.log(`[API Patient Delete] ✓ Revoked Patient Hub access for ${patientId}`);
    }

    // 3. Consultations & Prescriptions
    if (deleteOptions.consultationsAndPrescriptions || deleteOptions.profile) {
      // Subcollection: consultations
      const consultSnap = await patientDocRef.collection("consultations").get();
      const consultBatch = db.batch();
      consultSnap.docs.forEach((doc) => consultBatch.delete(doc.ref));
      if (!consultSnap.empty) await consultBatch.commit();

      // Subcollection: prescriptions
      const prescriptSnap = await patientDocRef.collection("prescriptions").get();
      const prescriptBatch = db.batch();
      prescriptSnap.docs.forEach((doc) => prescriptBatch.delete(doc.ref));
      if (!prescriptSnap.empty) await prescriptBatch.commit();

      // Top-level prescription doc in /prescriptions/{patientId}
      try {
        await db.collection("prescriptions").doc(patientId).delete();
      } catch {}

      console.log(`[API Patient Delete] ✓ Deleted consultations and prescriptions for ${patientId}`);
    }

    // 4. Medical Scans & Diagnostic Reports
    if (deleteOptions.scansAndReports || deleteOptions.profile) {
      const filesSnap = await patientDocRef.collection("files").get();
      const filesBatch = db.batch();
      filesSnap.docs.forEach((doc) => filesBatch.delete(doc.ref));
      if (!filesSnap.empty) await filesBatch.commit();
      console.log(`[API Patient Delete] ✓ Deleted medical files for ${patientId}`);
    }

    // 5. Invoices & Billing
    if (deleteOptions.invoices) {
      const invoicesSnap = await db.collection("invoices").where("patientId", "==", patientId).get();
      const invoicesBatch = db.batch();
      invoicesSnap.docs.forEach((doc) => invoicesBatch.delete(doc.ref));
      if (!invoicesSnap.empty) await invoicesBatch.commit();
      console.log(`[API Patient Delete] ✓ Deleted ${invoicesSnap.size} invoices for ${patientId}`);
    }

    // 6. Delete Core Patient Profile
    if (deleteOptions.profile) {
      // Purge workout progress from /exercise_progress/{patientId}
      try {
        await db.collection("exercise_progress").doc(patientId).delete();
      } catch {}

      // Delete the main patient document
      await patientDocRef.delete();
      console.log(`[API Patient Delete] ✓ Wiped core patient profile document: ${patientId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Patient ${patientId} records purged successfully.`,
      patientId,
      options: deleteOptions,
    });
  } catch (error: any) {
    console.error("[API Patient Delete] Fatal error during patient deletion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to purge patient data." },
      { status: 500 }
    );
  }
}
