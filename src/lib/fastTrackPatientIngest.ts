/**
 * Gait Physio Clinic FastTrack Batch Ingest Engine
 * Safely batches and persists migrated patient records into Firestore & auto-provisions Google Drive EMR folders.
 */

import { createPatient, updatePatient } from "@/lib/patientsDb";
import { FastTrackPatientRow } from "@/lib/fastTrackPatientParser";

export interface BatchPatientIngestProgress {
  current: number;
  total: number;
  percent: number;
  currentPatientName: string;
  stage: "VALIDATING" | "CREATING_PATIENTS" | "PROVISIONING_DRIVE" | "COMPLETED" | "ERROR";
  error?: string;
}

export interface BatchPatientIngestResult {
  success: boolean;
  totalProcessed: number;
  createdCount: number;
  failedCount: number;
  createdPatients: { id: string; name: string; phone: string }[];
  errors: { name: string; error: string }[];
}

/**
 * Ingests an array of FastTrack patient rows into the database sequentially with live progress updates
 */
export async function executeFastTrackPatientBatchIngest(
  rows: FastTrackPatientRow[],
  onProgress?: (p: BatchPatientIngestProgress) => void
): Promise<BatchPatientIngestResult> {
  const validRows = rows.filter((r) => r.isValid && r.name.trim());
  const total = validRows.length;

  if (total === 0) {
    return {
      success: false,
      totalProcessed: 0,
      createdCount: 0,
      failedCount: 0,
      createdPatients: [],
      errors: [{ name: "Batch", error: "No valid rows to ingest." }]
    };
  }

  const createdPatients: { id: string; name: string; phone: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  for (let i = 0; i < total; i++) {
    const row = validRows[i];
    const percent = Math.round(((i + 1) / total) * 100);

    onProgress?.({
      current: i + 1,
      total,
      percent,
      currentPatientName: row.name,
      stage: "CREATING_PATIENTS"
    });

    try {
      // 1. Create Patient in Firestore
      const newPatient = await createPatient({
        name: row.name.trim(),
        email: (row.email || "").trim().toLowerCase(),
        phone: row.phone.trim(),
        age: row.age ? String(row.age).trim() : "35",
        gender: row.gender || "Male",
        treatmentPlan: row.treatmentPlan || "General Physiotherapy Consultation",
        status: row.status || "active",
        therapistName: row.therapistName || "Dr. Kinnera",
        upcoming: row.upcoming || "Pending Schedule",
        lastVisit: "N/A"
      });

      if (newPatient && newPatient.id) {
        createdPatients.push({
          id: newPatient.id,
          name: row.name,
          phone: row.phone
        });

        // 2. Asynchronously request Google Drive Folder creation (Non-blocking)
        try {
          fetch("/api/drive/create-folder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: newPatient.id,
              patientName: row.name
            }),
          })
            .then((res) => res.json())
            .then((driveRes) => {
              if (driveRes.success && driveRes.folderId) {
                updatePatient(newPatient.id!, { googleDriveFolderId: driveRes.folderId }).catch(() => {});
              }
            })
            .catch(() => {});
        } catch {}
      } else {
        errors.push({ name: row.name, error: "Document ID was not returned by database." });
      }
    } catch (err: any) {
      console.error(`Failed to ingest patient ${row.name}:`, err);
      errors.push({ name: row.name, error: err?.message || "Database write error" });
    }

    // Small yielding delay to ensure smooth UI progress bar rendering
    await new Promise((resolve) => setTimeout(resolve, 35));
  }

  onProgress?.({
    current: total,
    total,
    percent: 100,
    currentPatientName: "All patients processed",
    stage: "COMPLETED"
  });

  return {
    success: createdPatients.length > 0,
    totalProcessed: total,
    createdCount: createdPatients.length,
    failedCount: errors.length,
    createdPatients,
    errors
  };
}
