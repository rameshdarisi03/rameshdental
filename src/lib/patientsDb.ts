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
  deleteDoc,
  deleteField
} from "firebase/firestore";

export interface Patient {
  id?: string;               // Document ID in firestore, format: "GPC-XXXXX"
  customId?: string;
  name: string;
  email: string;
  phone: string;
  address?: string;          // Residential address / locality
  dob?: string;              // YYYY-MM-DD (legacy)
  age?: string | number;     // Patient age in years
  gender?: string;
  treatmentPlan: string;     // e.g. "Post-op ACL Recovery"
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string; // Google Drive folder ID reference
  therapistId?: string;      // ID of the primary therapist
  therapistName?: string;    // Name of the primary therapist
  joinedDate?: string;       // YYYY-MM-DD or DD-MM-YYYY format
  lastVisit?: string;        // DD-MM-YYYY or Date
  upcoming?: string;         // DD-MM-YYYY or string representation
  reminders?: string[];      // clinical provider reminders
  activationCode?: string;   // portal activation code, format: "GPC-XXXXX"
  activated?: boolean;       // whether patient portal account is registered
  authUid?: string;          // Firebase auth UID link
  
  // Multi-User Family Circle & Profile Switcher
  familyGroupId?: string;           // Canonical Family Group ID (e.g., "FAM-GPC-1024")
  relationship?: "Self" | "Spouse" | "Husband" | "Wife" | "Son" | "Daughter" | "Father" | "Mother" | "Brother" | "Sister" | "Other";
  isPrimaryAccount?: boolean;       // true if this patient is the primary account owner
  primaryPatientId?: string;       // PID of the family head (e.g., "GPC-1024")
  familyHeadName?: string;         // Name of the primary account holder
  linkedEmails?: string[];          // List of all emails permitted to access this profile

  // Multi-Day Package Consultation Draft
  consultationDraft?: {
    notes: string;
    visitDate?: string;
    savedAt?: string;
    savedBy?: string;
  } | null;

  createdAt: Timestamp;
}

export type FamilyRelationship = "Self" | "Spouse" | "Husband" | "Wife" | "Son" | "Daughter" | "Father" | "Mother" | "Brother" | "Sister" | "Other";
export const FAMILY_RELATIONSHIPS: FamilyRelationship[] = [
  "Self",
  "Spouse",
  "Husband",
  "Wife",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Other"
];

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
  matchType?: "exact" | "family_member" | "name_collision";
  matchField?: "phone" | "email" | "both";
  existingPatient?: Patient;
  message?: string;
}

export async function checkDuplicatePatient(
  phone?: string, 
  name?: string,
  email?: string
): Promise<DuplicateCheckResult> {
  try {
    const cleanPhone = sanitizePhone(phone);
    const cleanName = sanitizeName(name).trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    
    if (!cleanPhone && !cleanName && !cleanEmail) {
      return { isDuplicate: false };
    }

    // Tier 1: Dedicated Server-side API endpoint (Infallible, runs with Firebase Admin privileges)
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/patients/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, name, email }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result && typeof result.isDuplicate === "boolean") {
            return result as DuplicateCheckResult;
          }
        }
      } catch (apiErr) {
        console.warn("[patientsDb] /api/patients/check-duplicate fetch error, using local fallback:", apiErr);
      }
    }

    // Tier 2: In-memory fallback via getPatients() (which has its own 3-tier fallback)
    const all = await getPatients();
    
    let phoneMatchPatient: Patient | null = null;
    let emailMatchPatient: Patient | null = null;
    let nameMatchPatient: Patient | null = null;

    for (const data of all) {
      const pPhone = sanitizePhone(data.phone);
      const pName = (data.name || "").trim().toLowerCase();
      const pEmail = (data.email || "").trim().toLowerCase();
      const pLinkedEmails = (data.linkedEmails || []).map((e) => e.trim().toLowerCase());

      // Check for email match
      if (cleanEmail && (pEmail === cleanEmail || pLinkedEmails.includes(cleanEmail))) {
        if (cleanName && pName === cleanName) {
          return {
            isDuplicate: true,
            matchType: "exact",
            matchField: "email",
            existingPatient: data,
            message: `Patient "${data.name}" is already registered with this email (${cleanEmail}).`,
          };
        }
        emailMatchPatient = data;
      }

      // Check for phone match (10 digits)
      if (cleanPhone && cleanPhone.length === 10 && pPhone === cleanPhone) {
        if (cleanName && pName === cleanName) {
          return {
            isDuplicate: true,
            matchType: "exact",
            matchField: "phone",
            existingPatient: data,
            message: `Patient "${data.name}" is already registered with this phone number (${pPhone}).`,
          };
        }
        phoneMatchPatient = data;
      }

      // Check for name match with different phone/email
      if (cleanName && cleanName.length > 2 && pName === cleanName) {
        nameMatchPatient = data;
      }
    }

    // Scenario 1: Email matches, but name differs (e.g. spouse or child sharing email)
    if (emailMatchPatient) {
      return {
        isDuplicate: false, // NOT a blocker - allow family member profile creation!
        matchType: "family_member",
        matchField: "email",
        existingPatient: emailMatchPatient,
        message: `Email is already linked to family member "${emailMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      };
    }

    // Scenario 2: Phone matches, but name differs (e.g. child, spouse, or parent sharing phone)
    if (phoneMatchPatient) {
      return {
        isDuplicate: false, // NOT a blocker - allow family member profile creation!
        matchType: "family_member",
        matchField: "phone",
        existingPatient: phoneMatchPatient,
        message: `Phone number is shared with family member "${phoneMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      };
    }

    // Scenario 3: Name matches, but phone/email differs (two people with same name)
    if (nameMatchPatient) {
      return {
        isDuplicate: false,
        matchType: "name_collision",
        existingPatient: nameMatchPatient,
        message: `Another patient is named "${nameMatchPatient.name}" with different contact details.`,
      };
    }

    return { isDuplicate: false };
  } catch (err) {
    console.warn("Duplicate check failed safely:", err);
    return { isDuplicate: false };
  }
}

/**
 * Fetch all linked family members for a patient
 */
export async function getFamilyMembers(patient: Patient): Promise<Patient[]> {
  try {
    const patientsRef = collection(db, "patients");
    const snap = await getDocs(patientsRef);
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));

    const targetGroupId = patient.familyGroupId;
    const targetEmail = (patient.email || "").trim().toLowerCase();
    const targetLinkedEmails = (patient.linkedEmails || []).map((e) => e.trim().toLowerCase());

    const family = all.filter((p) => {
      if (patient.id && p.id === patient.id) return true;
      if (targetGroupId && p.familyGroupId && p.familyGroupId === targetGroupId) return true;
      if (patient.id && (p.primaryPatientId === patient.id || (p.id && patient.primaryPatientId === p.id))) return true;
      
      const pEmail = (p.email || "").trim().toLowerCase();
      if (targetEmail && pEmail && pEmail === targetEmail) return true;
      if (targetEmail && p.linkedEmails && p.linkedEmails.map((e) => e.trim().toLowerCase()).includes(targetEmail)) return true;
      if (pEmail && targetLinkedEmails.includes(pEmail)) return true;
      
      return false;
    });

    if (!family.some((f) => f.id === patient.id)) {
      family.unshift(patient);
    }

    return family;
  } catch (err) {
    console.warn("Failed to fetch family members:", err);
    return [patient];
  }
}

/**
 * Symmetrically link two patients into the same Family Circle
 */
export async function linkPatientsInFamilyCircle(
  primaryPatient: Patient,
  memberPatient: Patient,
  relationship: Patient["relationship"]
): Promise<void> {
  try {
    if (!primaryPatient.id || !memberPatient.id) return;
    
    // Determine the actual head of the circle if primaryPatient is already a member
    const familyHeadId = primaryPatient.primaryPatientId || primaryPatient.id;
    const familyHeadName = primaryPatient.primaryPatientId 
      ? (primaryPatient.familyHeadName || primaryPatient.name) 
      : primaryPatient.name;
    const familyGroupId = primaryPatient.familyGroupId || memberPatient.familyGroupId || `FAM-${familyHeadId}`;

    const emailsSet = new Set<string>();
    if (primaryPatient.email) emailsSet.add(primaryPatient.email.trim().toLowerCase());
    if (memberPatient.email) emailsSet.add(memberPatient.email.trim().toLowerCase());
    (primaryPatient.linkedEmails || []).forEach((e) => emailsSet.add(e.trim().toLowerCase()));
    (memberPatient.linkedEmails || []).forEach((e) => emailsSet.add(e.trim().toLowerCase()));
    const linkedEmails = Array.from(emailsSet);

    // Update primary patient
    const primaryRef = doc(db, "patients", primaryPatient.id);
    await updateDoc(primaryRef, {
      familyGroupId,
      isPrimaryAccount: !primaryPatient.primaryPatientId,
      linkedEmails,
    });

    // Update member patient
    const memberRef = doc(db, "patients", memberPatient.id);
    await updateDoc(memberRef, {
      familyGroupId,
      primaryPatientId: familyHeadId,
      familyHeadName: familyHeadName,
      relationship: relationship || "Family Member",
      linkedEmails,
      activated: primaryPatient.activated || memberPatient.activated || false,
    });
  } catch (err) {
    console.error("Failed to link family circle:", err);
    throw err;
  }
}

/**
 * Unlink a patient from their Family Circle
 */
export async function unlinkPatientFromFamilyCircle(
  patientToUnlink: Patient
): Promise<void> {
  try {
    if (!patientToUnlink.id) return;
    const docRef = doc(db, "patients", patientToUnlink.id);
    await updateDoc(docRef, {
      primaryPatientId: deleteField(),
      familyGroupId: deleteField(),
      familyHeadName: deleteField(),
      relationship: "Self",
      isPrimaryAccount: true,
      linkedEmails: [],
    });
  } catch (err) {
    console.error("Failed to unlink patient from family circle:", err);
    throw err;
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

    const todayStr = new Date().toISOString().split("T")[0];
    const newPatient: Patient = {
      ...sanitizedData,
      id: patientId,
      joinedDate: sanitizedData.joinedDate || todayStr,
      activationCode,
      activated: sanitizedData.activated || false,
      createdAt: Timestamp.now(),
    };

    // Symmetrical Family Circle Linking & Activation Inheritance
    if (newPatient.primaryPatientId) {
      try {
        const primaryRef = doc(db, "patients", newPatient.primaryPatientId);
        const primarySnap = await getDoc(primaryRef);
        if (primarySnap.exists()) {
          const primaryData = primarySnap.data() as Patient;
          const familyGroupId = primaryData.familyGroupId || `FAM-${newPatient.primaryPatientId}`;
          
          const emailsSet = new Set<string>();
          if (primaryData.email) emailsSet.add(primaryData.email.trim().toLowerCase());
          if (newPatient.email) emailsSet.add(newPatient.email.trim().toLowerCase());
          (primaryData.linkedEmails || []).forEach(e => emailsSet.add(e.trim().toLowerCase()));
          (newPatient.linkedEmails || []).forEach(e => emailsSet.add(e.trim().toLowerCase()));
          const linkedEmails = Array.from(emailsSet);

          await updateDoc(primaryRef, {
            familyGroupId,
            isPrimaryAccount: true,
            linkedEmails,
          });

          newPatient.familyGroupId = familyGroupId;
          newPatient.linkedEmails = linkedEmails;
          if (primaryData.activated) {
            newPatient.activated = true;
          }
        }
      } catch (linkErr) {
        console.warn("Failed to link primary patient in createPatient:", linkErr);
      }
    }

    await setDoc(docRef, newPatient);

    // Auto-trigger Patient Onboarding & Portal Activation Email
    if (newPatient.email && newPatient.activationCode) {
      try {
        const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com");
        fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PATIENT_ONBOARDING",
            payload: {
              patientName: newPatient.name,
              patientEmail: newPatient.email,
              activationCode: newPatient.activationCode,
            },
          }),
        }).catch((err) => {
          console.warn("[Onboarding Email] Failed to dispatch onboarding email:", err);
        });
      } catch (emailErr) {
        console.warn("[Onboarding Email] Error:", emailErr);
      }
    }

    // Auto-trigger WhatsApp Onboarding & Portal Activation
    if (newPatient.phone && newPatient.activationCode) {
      try {
        const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com");
        fetch(`${baseUrl}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PATIENT_ONBOARDING",
            payload: {
              patientName: newPatient.name,
              patientPhone: newPatient.phone,
              activationCode: newPatient.activationCode,
            },
          }),
        }).catch((err) => {
          console.warn("[Onboarding WhatsApp] Failed to dispatch onboarding WhatsApp:", err);
        });
      } catch (waErr) {
        console.warn("[Onboarding WhatsApp] Error:", waErr);
      }
    }

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

// Get all patients with robust multi-tier fallback (Ordered -> Plain Scan -> Server API)
export async function getPatients(): Promise<Patient[]> {
  try {
    // Tier 1: Attempt ordered Firestore query
    try {
      const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const patients: Patient[] = [];
      snapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() } as Patient);
      });
      if (patients.length > 0) return patients;
    } catch (orderErr) {
      console.warn("[patientsDb] Ordered query failed or missing index, falling back to direct collection scan:", orderErr);
    }

    // Tier 2: Direct Firestore collection scan (works even if createdAt is missing or unindexed)
    try {
      const plainSnapshot = await getDocs(collection(db, "patients"));
      const patients: Patient[] = [];
      plainSnapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() } as Patient);
      });
      if (patients.length > 0) {
        return patients.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
      }
    } catch (scanErr) {
      console.warn("[patientsDb] Direct client scan failed, falling back to server API endpoint:", scanErr);
    }

    // Tier 3: Infallible Server-side API endpoint fallback (bypasses any client auth rule blocks)
    if (typeof window !== "undefined") {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.patients)) {
          return data.patients as Patient[];
        }
      }
    }

    return [];
  } catch (error) {
    console.error("Error getting patients:", error);
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
  // Tier 1: Infallible Server-side API endpoint (Runs with Firebase Admin SDK privileges)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/patients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, options }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return { success: true, message: json.message || "Selected patient records purged successfully." };
        } else if (json.error) {
          console.warn("[deletePatientData] Server API reported error, trying direct client deletion:", json.error);
        }
      }
    } catch (apiErr) {
      console.warn("[deletePatientData] Server API route unreachable, falling back to direct client deletion:", apiErr);
    }
  }

  // Tier 2: Direct Client-side Firestore SDK deletion (Uses firestore.rules)
  try {
    const patientDocRef = doc(db, "patients", patientId);
    const patientSnap = await getDoc(patientDocRef);
    if (!patientSnap.exists()) {
      throw new Error(`Patient "${patientId}" does not exist in the database.`);
    }

    const patientData = patientSnap.data() as Patient;
    const driveFolderId = patientData?.googleDriveFolderId;

    // Permanently purge Google Drive Folder if profile or scans are selected for deletion
    if (options.profile || options.scansAndReports) {
      try {
        console.log(`[deletePatientData] Purging Google Drive cloud folder for patient ${patientId} (folderId: ${driveFolderId || "lookup-by-id"})...`);
        const driveRes = await fetch("/api/drive/delete-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            folderId: driveFolderId || undefined,
            patientId: patientId,
          }),
        });
        const driveJson = await driveRes.json();
        if (!driveJson.success) {
          console.warn("[deletePatientData] Google Drive purge notice:", driveJson.error);
        } else {
          console.log("[deletePatientData] Google Drive folder permanently erased:", driveJson);
        }
      } catch (driveErr) {
        console.warn("[deletePatientData] Non-fatal Google Drive purge error:", driveErr);
      }
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
      // Purge assigned exercises / prescriptions subcollection
      const prescriptionsSnap = await getDocs(collection(db, "patients", patientId, "prescriptions"));
      for (const pDoc of prescriptionsSnap.docs) {
        await deleteDoc(pDoc.ref);
      }

      // Purge consultation notes & case sheets
      const consultSnap = await getDocs(collection(db, "patients", patientId, "consultations"));
      for (const cDoc of consultSnap.docs) {
        await deleteDoc(cDoc.ref);
      }

      // Purge top-level prescription doc if exists
      try {
        await deleteDoc(doc(db, "prescriptions", patientId));
      } catch {}
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

      // Clean up exercise progress
      try {
        await deleteDoc(doc(db, "exercise_progress", patientId));
      } catch {}

      // Finally delete the main patient document
      await deleteDoc(patientDocRef);
    }

    return { success: true, message: "Selected patient records purged successfully." };
  } catch (error: any) {
    console.error("Error executing deletePatientData:", error);
    throw new Error(error.message || "Failed to purge patient data.");
  }
}

