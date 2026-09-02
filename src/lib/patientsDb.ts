import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  doc,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

export interface Patient {
  id?: string;               // Document ID in firestore, format: "GPC-XXXXX"
  name: string;
  email: string;
  phone: string;
  dob?: string;              // YYYY-MM-DD (legacy)
  age?: string | number;     // Patient age in years
  gender?: string;
  treatmentPlan: string;     // e.g. "Post-op ACL Recovery"
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string; // Google Drive folder ID reference
  therapistId?: string;      // ID of the primary therapist
  therapistName?: string;    // Name of the primary therapist
  lastVisit?: string;        // DD-MM-YYYY or Date
  upcoming?: string;         // DD-MM-YYYY or string representation
  reminders?: string[];      // clinical provider reminders
  attendanceRate?: number;   // attendance reliability percentage
  activationCode?: string;   // portal activation code, format: "GPC-XXXXX"
  activated?: boolean;       // whether patient portal account is registered
  authUid?: string;          // Firebase auth UID link
  createdAt: Timestamp;
}

export interface Consultation {
  id?: string;
  date: string;              // DD-MM-YYYY
  summary: string;           // Brief summary
  notesFileId?: string;      // Google Drive File ID containing detailed session notes text
  notesWebViewLink?: string; // View link in Drive
  therapistName: string;
  createdAt: Timestamp;
}

export interface MedicalRecordFile {
  id?: string;
  fileName: string;
  fileType: string;          // e.g. "application/pdf", "image/png"
  fileSize: number;
  dateUploaded: string;      // DD-MM-YYYY
  googleDriveFileId: string;
  webViewLink?: string;
  downloadLink?: string;
  isDoctorOnly?: boolean;    // true if internal doctor reference (hidden from patient hub)
  category?: string;         // e.g. "DOCTOR_REFERENCE", "PRESCRIPTION", "INVOICE", "CASE_SHEET"
  createdAt: Timestamp;
}

// Helper to generate a cryptographically secure 8-character alphanumeric activation code (excluding confusing chars)
export function generateActivationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
  } else {
    try {
      const crypto = require("crypto");
      const bytes = crypto.randomBytes(8);
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(bytes[i] % chars.length);
      }
    } catch {
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
  }
  return code;
}

// Generate a random, unique patient ID (e.g. GPC-12005)
async function generateUniquePatientId(): Promise<string> {
  const patientsRef = collection(db, "patients");
  let isUnique = false;
  let patientId = "";

  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    patientId = `GPC-${randomNum}`;

    const docRef = doc(patientsRef, patientId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      isUnique = true;
    }
  }

  return patientId;
}

import { sanitizePatientPayload, sanitizePhone, sanitizeName } from "./sanitizer";

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: "phone" | "name";
  existingPatient?: Patient;
}

export async function checkDuplicatePatient(phone?: string, name?: string): Promise<DuplicateCheckResult> {
  try {
    const cleanPhone = sanitizePhone(phone);
    const cleanName = sanitizeName(name).toLowerCase();
    
    if (!cleanPhone && !cleanName) {
      return { isDuplicate: false };
    }

    const all = await getDocs(collection(db, "patients"));
    
    // First Priority: Phone match (Exact 10 digits)
    if (cleanPhone && cleanPhone.length === 10) {
      for (const d of all.docs) {
        const data = d.data() as Patient;
        const pPhone = sanitizePhone(data.phone);
        if (pPhone === cleanPhone) {
          return {
            isDuplicate: true,
            matchType: "phone",
            existingPatient: { id: d.id, ...data },
          };
        }
      }
    }

    // Second Priority: Name match (Exact match)
    if (cleanName && cleanName.length > 2) {
      for (const d of all.docs) {
        const data = d.data() as Patient;
        if ((data.name || "").trim().toLowerCase() === cleanName) {
          return {
            isDuplicate: true,
            matchType: "name",
            existingPatient: { id: d.id, ...data },
          };
        }
      }
    }

    return { isDuplicate: false };
  } catch (err) {
    console.warn("Duplicate check failed safely:", err);
    return { isDuplicate: false };
  }
}

// Register a new patient in Firestore
export async function createPatient(patientData: Omit<Patient, "createdAt" | "id">): Promise<Patient> {
  try {
    const patientId = await generateUniquePatientId();
    const docRef = doc(db, "patients", patientId);

    const sanitizedData = sanitizePatientPayload(patientData);
    const hasEmail = Boolean(sanitizedData.email && sanitizedData.email.trim());
    const activationCode = hasEmail
      ? sanitizedData.activationCode || generateActivationCode()
      : "";

    const newPatient: Patient = {
      ...sanitizedData,
      id: patientId,
      activationCode,
      activated: sanitizedData.activated || false,
      createdAt: Timestamp.now(),
    };

    await setDoc(docRef, newPatient);
    return newPatient;
  } catch (error) {
    console.error("Error creating patient in Firestore:", error);
    throw error;
  }
}

// Update patient fields (e.g., setting Google Drive folder ID, last visit dates)
export async function updatePatient(patientId: string, updates: Partial<Patient>): Promise<void> {
  try {
    const docRef = doc(db, "patients", patientId);
    const sanitizedUpdates = sanitizePatientPayload(updates);
    await updateDoc(docRef, sanitizedUpdates);
  } catch (error) {
    console.error("Error updating patient in Firestore:", error);
    throw error;
  }
}

// Get all patients with optional filtering
export async function getPatients(): Promise<Patient[]> {
  try {
    const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const patients: Patient[] = [];
    snapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() } as Patient);
    });
    return patients;
  } catch (error) {
    console.error("Error getting patients from Firestore:", error);
    return [];
  }
}

// Get single patient details
export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const cleanId = (id || "").trim();
    let docSnap = await getDoc(doc(db, "patients", cleanId));
    if (!docSnap.exists() && cleanId.toUpperCase() !== cleanId) {
      docSnap = await getDoc(doc(db, "patients", cleanId.toUpperCase()));
    }
    if (!docSnap.exists() && cleanId.toLowerCase() !== cleanId) {
      docSnap = await getDoc(doc(db, "patients", cleanId.toLowerCase()));
    }
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Patient;
    }
    
    // Scan fallback in case id was stored inside payload or case mismatch
    const all = await getDocs(collection(db, "patients"));
    for (const d of all.docs) {
      const data = d.data();
      if (
        d.id.toLowerCase() === cleanId.toLowerCase() || 
        data.id?.toLowerCase() === cleanId.toLowerCase() || 
        data.activationCode?.toLowerCase() === cleanId.toLowerCase()
      ) {
        return { id: d.id, ...data } as Patient;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting patient by ID:", error);
    return null;
  }
}

// Add a consultation to a patient profile
export async function addConsultation(
  patientId: string,
  consultationData: Omit<Consultation, "createdAt" | "id">
): Promise<Consultation> {
  try {
    const consultationsRef = collection(db, "patients", patientId, "consultations");
    const newConsultation = {
      ...consultationData,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(consultationsRef, newConsultation);
    
    // Update patient's lastVisit field
    await updatePatient(patientId, { lastVisit: consultationData.date });

    return { id: docRef.id, ...newConsultation } as Consultation;
  } catch (error) {
    console.error("Error adding consultation:", error);
    throw error;
  }
}

// Get consultation history for a patient
export async function getConsultations(patientId: string): Promise<Consultation[]> {
  try {
    const q = query(
      collection(db, "patients", patientId, "consultations"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const consultations: Consultation[] = [];
    snapshot.forEach((doc) => {
      consultations.push({ id: doc.id, ...doc.data() } as Consultation);
    });
    return consultations;
  } catch (error) {
    console.error("Error getting consultations:", error);
    return [];
  }
}

// Add a medical record file reference to a patient profile
export async function addMedicalRecordFile(
  patientId: string,
  fileData: Omit<MedicalRecordFile, "createdAt" | "id">
): Promise<MedicalRecordFile> {
  try {
    const filesRef = collection(db, "patients", patientId, "files");
    const newFile = {
      ...fileData,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(filesRef, newFile);
    return { id: docRef.id, ...newFile } as MedicalRecordFile;
  } catch (error) {
    console.error("Error adding medical record file reference:", error);
    throw error;
  }
}

// Get medical record files index for a patient
export async function getMedicalRecordFiles(patientId: string): Promise<MedicalRecordFile[]> {
  try {
    const q = query(
      collection(db, "patients", patientId, "files"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const files: MedicalRecordFile[] = [];
    snapshot.forEach((doc) => {
      files.push({ id: doc.id, ...doc.data() } as MedicalRecordFile);
    });
    return files;
  } catch (error) {
    console.error("Error getting medical record files:", error);
    return [];
  }
}

export interface PatientDeleteOptions {
  profile: boolean;
  hub: boolean;
  consultationsAndPrescriptions: boolean;
  scansAndReports: boolean;
  invoices: boolean;
}

/**
 * Granular Deletion & Data Purge function for a patient.
 * Handles selective deletion aligned with dashboard clinical sections:
 * - Patient Profile (core demographic document in directory)
 * - Patient Hub Access (portal credentials & access code)
 * - Consultations & Prescriptions (clinical session notes + prescribed home exercises)
 * - Medical Scans & Reports (uploaded MRI/X-ray files & diagnostic PDFs)
 * - Invoices & Billing (clinic invoices & payment records)
 */
export async function deletePatientData(
  patientId: string,
  options: PatientDeleteOptions
): Promise<{ success: boolean; message: string }> {
  try {
    const patientDocRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientDocRef);
    if (!patientSnap.exists()) {
      throw new Error(`Patient "${patientId}" does not exist in the database.`);
    }

    // 1. Revoke Patient Hub Access
    if (options.hub && !options.profile) {
      await updateDoc(patientDocRef, {
        activated: false,
        authUid: null,
        activationCode: "",
      });
    }

    // 2. Delete Consultations & Prescriptions (Session Notes + Prescribed Home Exercises)
    if (options.consultationsAndPrescriptions) {
      // Purge assigned exercises / prescriptions
      const prescriptionsSnap = await getDocs(collection(db, "patients", patientId, "prescriptions"));
      for (const pDoc of prescriptionsSnap.docs) {
        await deleteDoc(pDoc.ref);
      }

      // Purge consultation notes & case sheets
      const consultSnap = await getDocs(collection(db, "patients", patientId, "consultations"));
      for (const cDoc of consultSnap.docs) {
        await deleteDoc(cDoc.ref);
      }
    }

    // 3. Delete Medical Scans & Diagnostic Reports
    if (options.scansAndReports) {
      const filesSnap = await getDocs(collection(db, "patients", patientId, "files"));
      for (const fDoc of filesSnap.docs) {
        await deleteDoc(fDoc.ref);
      }
    }

    // 4. Delete Invoices & Billing Records
    if (options.invoices) {
      const invoicesQuery = query(collection(db, "invoices"), where("patientId", "==", patientId));
      const invoicesSnap = await getDocs(invoicesQuery);
      for (const invDoc of invoicesSnap.docs) {
        await deleteDoc(invDoc.ref);
      }
    }

    // 5. Delete Core Patient Profile
    if (options.profile) {
      // Clean up any remaining subcollections to prevent orphaned records
      const allFiles = await getDocs(collection(db, "patients", patientId, "files"));
      for (const d of allFiles.docs) await deleteDoc(d.ref);

      const allConsults = await getDocs(collection(db, "patients", patientId, "consultations"));
      for (const d of allConsults.docs) await deleteDoc(d.ref);

      const allPrescripts = await getDocs(collection(db, "patients", patientId, "prescriptions"));
      for (const d of allPrescripts.docs) await deleteDoc(d.ref);

      // Finally delete the main patient document
      await deleteDoc(patientDocRef);
    }

    return { success: true, message: "Selected patient records purged successfully." };
  } catch (error: any) {
    console.error("Error executing deletePatientData:", error);
    throw new Error(error.message || "Failed to purge patient data.");
  }
}

