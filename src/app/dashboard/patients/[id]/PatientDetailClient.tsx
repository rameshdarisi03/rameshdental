"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  Folder, 
  Upload, 
  Plus, 
  Loader2, 
  CheckCircle,
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  ChevronRight,
  Camera,
  MessageSquare,
  Activity,
  PlusCircle,
  Trash2,
  BellRing,
  Phone,
  Mail,
  UserCheck,
  Dumbbell,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  Flame,
  Lock,
  Edit2,
  Ban,
  Receipt,
  Users,
  Unlink,
  UserPlus,
  Paperclip,
  Bookmark,
  MapPin,
  Check
} from "lucide-react";
import jsPDF from "jspdf";
import ExercisePrescriberModal from "@/components/dashboard/ExercisePrescriberModal";
import DocumentScannerModal, { ScanResult } from "@/components/dashboard/DocumentScannerModal";
import CreateEditInvoiceModal from "@/components/dashboard/invoices/CreateEditInvoiceModal";
import PatientDeleteModal from "@/components/dashboard/PatientDeleteModal";
import LinkFamilyMemberModal from "@/components/dashboard/LinkFamilyMemberModal";
import { PatientDeleteOptions } from "@/lib/patientsDb";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";
import { Timestamp } from "firebase/firestore";
import { 
  getPatientById, 
  getConsultations, 
  getMedicalRecordFiles, 
  addConsultation, 
  addMedicalRecordFile, 
  updatePatient,
  generateActivationCode,
  getFamilyMembers,
  unlinkPatientFromFamilyCircle
} from "@/lib/patientsDb";
import { 
  getPatientPrescription,
  getPatientPrescriptionsHistory,
  subscribePatientPrescription,
  subscribePatientWorkoutProgress, 
  getProgramDayDateString,
  getLocalDateString,
  markPatientDayComplete,
  PatientPrescription, 
  PatientWorkoutProgress 
} from "@/lib/exercisesDb";
import { subscribePatientInvoices, voidInvoice, Invoice } from "@/lib/invoicesDb";
import { 
  buildUnifiedPrescriptionPdf, 
  getPrescriptionFileName,
  buildUnifiedInvoicePdf,
  getInvoiceFileName
} from "@/lib/prescriptionPdf";
import { getClinicConfig, ClinicConfig } from "@/lib/db";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dob?: string;
  age?: string | number;
  gender?: string;
  treatmentPlan: string;
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string;
  therapistName?: string;
  joinedDate?: string;
  createdAt?: any;
  lastVisit?: string;
  upcoming?: string;
  reminders?: string[];
  attendanceRate?: number;
  activationCode?: string;
  activated?: boolean;
  familyGroupId?: string;
  relationship?: string;
  isPrimaryAccount?: boolean;
  primaryPatientId?: string;
  familyHeadName?: string;
  linkedEmails?: string[];
  patientId?: string;
}

interface Consultation {
  id: string;
  date: string;
  summary: string;
  therapistName: string;
}

interface MedicalFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dateUploaded: string;
  googleDriveFileId: string;
  webViewLink?: string;
  downloadLink?: string;
  isDoctorOnly?: boolean;
  category?: string;
}

const compressImageFile = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const newName = file.name.replace(/\.[^/.]+$/, ".jpg");
            const compressedFile = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function PatientDetailClient({ id }: { id: string }) {
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [prescriptionsHistory, setPrescriptionsHistory] = useState<PatientPrescription[]>([]);
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [isPatientInvoiceModalOpen, setIsPatientInvoiceModalOpen] = useState(false);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Invoice Dispatch States (Meta WhatsApp Cloud API & Brevo Email)
  const [emailingInvoiceId, setEmailingInvoiceId] = useState<string | null>(null);
  const [whatsAppingInvoiceId, setWhatsAppingInvoiceId] = useState<string | null>(null);
  const [invoiceDispatchModal, setInvoiceDispatchModal] = useState<{
    isOpen: boolean;
    channel: "whatsapp" | "email";
    status: "success" | "error";
    invoiceNumber: string;
    patientName: string;
    recipient: string;
    amount: number;
    message?: string;
    whatsappUrl?: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"timeline" | "files" | "invoices">("timeline");
  const [isPrescriberOpen, setIsPrescriberOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLinkFamilyModalOpen, setIsLinkFamilyModalOpen] = useState(false);
  const [activePrescription, setActivePrescription] = useState<PatientPrescription | null>(null);
  const [workoutProgress, setWorkoutProgress] = useState<PatientWorkoutProgress | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleUnlinkMember = async (member: any) => {
    if (
      !window.confirm(
        `Are you sure you want to unlink ${member.name} (${member.id}) from this Family Circle?\n\nTheir clinical notes, prescriptions, and files will remain 100% safe and intact.`
      )
    ) {
      return;
    }

    try {
      await unlinkPatientFromFamilyCircle(member);
      if (patient) {
        const famList = await getFamilyMembers(patient as any);
        setFamilyMembers(famList.filter((m) => m.id !== patient.id));
      }
      setFormSuccess(`Unlinked ${member.name} from Family Circle.`);
    } catch (err) {
      console.error("Failed to unlink family member:", err);
      alert("Failed to unlink member. Please try again.");
    }
  };

  const handleFamilyLinked = async () => {
    if (patient) {
      try {
        const famList = await getFamilyMembers(patient as any);
        setFamilyMembers(famList.filter((m) => m.id !== patient.id));
        setFormSuccess("Patient successfully linked to Family Circle!");
      } catch (err) {
        console.warn("Failed to reload family members:", err);
      }
    }
  };

  const handleDeleteSuccess = (deletedOptions: PatientDeleteOptions) => {
    if (deletedOptions.profile) {
      router.push("/dashboard/patients");
    } else {
      setFormSuccess("Selected patient records purged successfully.");
      
      // Immediately clear local states for the deleted components
      if (deletedOptions.scansAndReports) {
        setFiles([]);
      }
      if (deletedOptions.consultationsAndPrescriptions) {
        setConsultations([]);
        setActivePrescription(null);
        setPrescriptionsHistory([]);
      }
      if (deletedOptions.invoices) {
        setPatientInvoices([]);
      }

      // Re-fetch complete state from Firestore
      loadPatientDetails();
    }
  };

  // Gemini AI Document Scanner states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"CLINICAL_ASSESSMENT" | "DOCTOR_PRESCRIPTION">("CLINICAL_ASSESSMENT");

  // New consultation log / upload form states
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [maxDateStr, setMaxDateStr] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Multi-Day Package Consultation Draft & Attachment Dropdown states
  const [hasDraft, setHasDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedSuccess, setDraftSavedSuccess] = useState(false);
  const [draftMetadata, setDraftMetadata] = useState<{ savedAt?: string; savedBy?: string } | null>(null);
  const [showAttachDropdown, setShowAttachDropdown] = useState(false);
  const attachDropdownRef = useRef<HTMLDivElement>(null);

  const [enrolledTherapists, setEnrolledTherapists] = useState<string[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");

  // Editor ergonomics & Collapsible History states
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [creatingDriveFolder, setCreatingDriveFolder] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

  // Reminders states
  const [newReminder, setNewReminder] = useState("");
  const [updatingReminders, setUpdatingReminders] = useState(false);

  // Dedicated Doctor Reference Scan Upload state
  const [uploadingDoctorScan, setUploadingDoctorScan] = useState(false);
  const doctorScanFileInputRef = useRef<HTMLInputElement>(null);

  // Contact phone management states
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleSavePhone = async () => {
    if (!phoneInput.trim() || !patient || !id) return;
    const cleanDigits = phoneInput.replace(/\D/g, "");

    if (cleanDigits.length !== 10) {
      setPhoneError("Indian mobile number must be exactly 10 digits.");
      return;
    }

    if (!/^[6-9]/.test(cleanDigits)) {
      setPhoneError("Indian mobile numbers must begin with 6, 7, 8, or 9.");
      return;
    }

    const currentDigits = (patient.phone || "").replace(/\D/g, "").slice(-10);
    if (cleanDigits === currentDigits) {
      setIsEditingPhone(false);
      setPhoneError("");
      return;
    }

    setSavingPhone(true);
    setPhoneError("");

    try {
      const res = await fetch("/api/patient/update-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          newPhone: cleanDigits,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPhoneError(data.error || "Failed to update contact number.");
        setSavingPhone(false);
        return;
      }

      setPatient((prev) => prev ? {
        ...prev,
        phone: data.phone || `+91 ${cleanDigits}`,
      } : null);

      setIsEditingPhone(false);
      setPhoneInput("");
      setFormSuccess(data.message || `Contact number updated to ${data.phone}. Old number delinked from Patient Hub.`);
      setTimeout(() => setFormSuccess(""), 7000);
    } catch (err) {
      console.error("Error updating patient phone:", err);
      setPhoneError(err.message || "Failed to update contact number.");
    } finally {
      setSavingPhone(false);
    }
  };

  // Email management states
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleSaveEmail = async () => {
    if (!emailInput.trim() || !patient || !id) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    
    // Basic email format check
    if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setSavingEmail(true);
    setEmailError("");

    try {
      // If patient does not have an activation code yet, generate one
      let newActivationCode = patient.activationCode || "";
      if (!newActivationCode && !patient.activated) {
        newActivationCode = generateActivationCode();
      }

      await updatePatient(id, {
        email: cleanEmail,
        activationCode: newActivationCode,
      });

      setPatient((prev) => prev ? {
        ...prev,
        email: cleanEmail,
        activationCode: newActivationCode,
      } : null);

      setIsEditingEmail(false);
      setEmailInput("");
    } catch (err: any) {
      console.error("Error updating patient email:", err);
      setEmailError(err.message || "Failed to update email.");
    } finally {
      setSavingEmail(false);
    }
  };

  // Address management states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const handleSaveAddress = async () => {
    if (!patient || !id) return;
    const cleanAddress = addressInput.trim();

    setSavingAddress(true);
    setAddressError("");

    try {
      await updatePatient(id, {
        address: cleanAddress,
      });

      setPatient((prev) => prev ? {
        ...prev,
        address: cleanAddress,
      } : null);

      setIsEditingAddress(false);
      setAddressInput("");
    } catch (err: any) {
      console.error("Error updating patient address:", err);
      setAddressError(err.message || "Failed to update address.");
    } finally {
      setSavingAddress(false);
    }
  };

  // Joining date management states
  const [isEditingJoinedDate, setIsEditingJoinedDate] = useState(false);
  const [joinedDateInput, setJoinedDateInput] = useState("");
  const [savingJoinedDate, setSavingJoinedDate] = useState(false);

  const resolveJoinedDate = (p: Patient | null, consults: Consultation[]): string => {
    if (!p) return "";
    if (p.joinedDate && p.joinedDate.trim()) {
      return p.joinedDate.trim();
    }
    // Fallback 1: createdAt Timestamp or ISO string
    if (p.createdAt) {
      try {
        if (typeof p.createdAt.toDate === "function") {
          const d = p.createdAt.toDate();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } else if (p.createdAt.seconds) {
          const d = new Date(p.createdAt.seconds * 1000);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        } else if (typeof p.createdAt === "string") {
          const d = new Date(p.createdAt);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${yyyy}-${mm}-${dd}`;
          }
        }
      } catch {
        // Ignore fallback error
      }
    }
    // Fallback 2: Earliest consultation date
    if (consults && consults.length > 0) {
      const first = consults[consults.length - 1];
      if (first && first.date) {
        const parts = first.date.split("-");
        if (parts.length === 3) {
          if (parts[0].length === 4) return first.date; // YYYY-MM-DD
          return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY to YYYY-MM-DD
        }
      }
    }
    return "";
  };

  const formatDisplayDate = (rawDate: string): string => {
    if (!rawDate) return "N/A";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        const [y, m, d] = rawDate.split("-");
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        return dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("-");
        const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
        return dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
      return rawDate;
    } catch {
      return rawDate;
    }
  };

  const handleSaveJoinedDate = async () => {
    if (!joinedDateInput || !patient || !id) return;
    setSavingJoinedDate(true);
    try {
      await updatePatient(id, { joinedDate: joinedDateInput });
      setPatient((prev) => prev ? { ...prev, joinedDate: joinedDateInput } : null);
      setIsEditingJoinedDate(false);
    } catch (err) {
      console.error("Failed to update joining date:", err);
    } finally {
      setSavingJoinedDate(false);
    }
  };

  const handleSendPortalInvite = async () => {
    if (!patient || !patient.activationCode) return;
    const cleanPhone = getCleanWhatsAppNumber(patient.phone);
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/patienthub/login?code=${patient.activationCode}` : `https://www.gaitphysioclinic.com/patienthub/login?code=${patient.activationCode}`;

    setFormSuccess("Dispatching portal invitation to patient via WhatsApp & Email...");
    try {
      let waStatus = false;
      let emailStatus = false;

      // 1. Dispatch through automated WhatsApp Cloud API
      if (cleanPhone) {
        try {
          const res = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "PATIENT_ONBOARDING",
              payload: {
                patientId: patient.id,
                patientName: patient.name,
                patientPhone: cleanPhone,
                patientEmail: patient.email,
                activationCode: patient.activationCode,
              },
            }),
          });
          const d = await res.json();
          if (d.success) waStatus = true;
          else console.warn("[Portal Invite WA Error]", d.error);
        } catch (err) {
          console.warn("[Portal Invite WA] Dispatch error:", err);
        }
      }

      // 2. Dispatch through Brevo Email API if email exists
      if (patient.email) {
        try {
          const res = await fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "PATIENT_ONBOARDING",
              payload: {
                patientId: patient.id,
                patientName: patient.name,
                patientEmail: patient.email,
                activationCode: patient.activationCode,
              },
            }),
          });
          const d = await res.json();
          if (d.success) emailStatus = true;
        } catch (err) {
          console.warn("[Portal Invite Email] Dispatch error:", err);
        }
      }

      const channels = [
        waStatus ? "WhatsApp" : "",
        emailStatus ? "Email" : ""
      ].filter(Boolean).join(" & ");

      if (channels) {
        setFormSuccess(`✅ Portal invitation sent to ${patient.name} via ${channels}! (ID: ${patient.id} • Code: ${patient.activationCode})`);
      } else {
        setFormSuccess(`✅ Portal invitation triggered for ${patient.name} (ID: ${patient.id} • Code: ${patient.activationCode})`);
      }
      setTimeout(() => setFormSuccess(""), 7000);
    } catch (e) {
      console.warn("Failed to dispatch portal invite:", e);
    }
  };

  const setQuickDate = (type: "today" | "yesterday") => {
    const d = new Date();
    if (type === "yesterday") {
      d.setDate(d.getDate() - 1);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setVisitDate(`${year}-${month}-${day}`);
  };

  const insertSoapSkeleton = () => {
    const template = `SUBJECTIVE:
• Chief Complaint: 
• Pain Score (VAS 0-10): /10
• Onset / Aggravating factors: 
 
OBJECTIVE:
• Range of Motion (ROM): 
• Special Tests / Palpation: 
• Posture & Gait Analysis: 

ASSESSMENT:
• Clinical Impression / Diagnosis: 

PLAN:
• Treatment / Modalities Given: 
• Home Exercise Prescriptions: 
• Next Review Date: `;
    setNotes(template);
  };

  const insertPackageSkeleton = () => {
    const today = new Date();
    const dStr = (offsetDays: number) => {
      const target = new Date(today);
      target.setDate(today.getDate() + offsetDays);
      const dd = String(target.getDate()).padStart(2, "0");
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      return `${dd}/${mm}`;
    };

    const template = `7-DAY REHABILITATION PACKAGE PROGRESS LOG:
• Day 1 (${dStr(0)}): Initial Assessment | Modalities: Cryotherapy + IFT | VAS: 7/10 | Range of Motion: 
• Day 2 (${dStr(1)}): Modalities: Ultrasound + Laser | Isometric Quad Sets (3x10) | Tolerance: Good
• Day 3 (${dStr(2)}): Modalities: Joint Mobilization | Active Assisted ROM | VAS: 5/10
• Day 4 (${dStr(3)}): Modalities: Electrotherapy | Straight Leg Raises (3x10) | Swelling reduced
• Day 5 (${dStr(4)}): Modalities: Resistance Bands | Gait Training & Weight Bearing Ambulation
• Day 6 (${dStr(5)}): Modalities: Static Cycling (10m) | Core & Balance Drills | VAS: 3/10
• Day 7 (${dStr(6)}): Milestone Evaluation | ROM Restored to 95° | Discharged to Home Protocol`;

    if (notes.trim()) {
      setNotes((prev) => `${prev}\n\n${template}`);
    } else {
      setNotes(template);
    }
  };

  // Close attachment dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (attachDropdownRef.current && !attachDropdownRef.current.contains(event.target as Node)) {
        setShowAttachDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Restore consultation draft from localStorage or cloud
  useEffect(() => {
    if (!id) return;
    try {
      const localDraft = localStorage.getItem(`gpc_draft_${id}`);
      let draftObj = localDraft ? JSON.parse(localDraft) : null;
      if (!draftObj && patient?.consultationDraft) {
        draftObj = patient.consultationDraft;
      }
      if (draftObj && draftObj.notes && draftObj.notes.trim()) {
        setHasDraft(true);
        setDraftMetadata({ savedAt: draftObj.savedAt, savedBy: draftObj.savedBy });
        setNotes((curr) => (!curr.trim() ? draftObj.notes : curr));
        if (draftObj.visitDate) {
          setVisitDate((curr) => (!curr ? draftObj.visitDate : curr));
        }
      }
    } catch (e) {
      console.warn("Could not restore consultation draft:", e);
    }
  }, [id, patient]);

  // Save consultation draft
  const handleSaveDraft = async () => {
    if (!notes.trim() || !id) return;
    setSavingDraft(true);
    setFormError("");
    setFormSuccess("");

    try {
      let loggingTherapist = patient?.therapistName || defaultTherapist;
      const userJson = localStorage.getItem("gpc_user");
      if (userJson) {
        try {
          const userObj = JSON.parse(userJson);
          if (userObj.name) loggingTherapist = userObj.name;
        } catch {}
      }

      const draftPayload = {
        notes: notes.trim(),
        visitDate: visitDate || new Date().toISOString().split("T")[0],
        savedAt: new Date().toISOString(),
        savedBy: loggingTherapist,
      };

      localStorage.setItem(`gpc_draft_${id}`, JSON.stringify(draftPayload));
      try {
        await updatePatient(id, { consultationDraft: draftPayload });
      } catch (cloudErr) {
        console.warn("Failed to sync draft to cloud, saved locally:", cloudErr);
      }

      setHasDraft(true);
      setDraftMetadata({ savedAt: draftPayload.savedAt, savedBy: draftPayload.savedBy });
      setDraftSavedSuccess(true);
      setFormSuccess("📝 Package progress draft saved! You can keep adding chronological sessions before finalizing.");
      setTimeout(() => setDraftSavedSuccess(false), 3000);
    } catch (err: any) {
      setFormError("Failed to save draft: " + (err?.message || "Unknown error"));
    } finally {
      setSavingDraft(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = async () => {
    if (!window.confirm("Are you sure you want to discard this consultation draft?")) return;
    if (id) {
      localStorage.removeItem(`gpc_draft_${id}`);
      try {
        await updatePatient(id, { consultationDraft: null });
      } catch {}
    }
    setNotes("");
    setHasDraft(false);
    setDraftMetadata(null);
    setFormSuccess("Draft discarded.");
    setTimeout(() => setFormSuccess(""), 3000);
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  useEffect(() => {
    let rxUnsub = () => {};
    let progUnsub = () => {};
    let invUnsub = () => {};

    if (id) {
      loadPatientDetails();

      rxUnsub = subscribePatientPrescription(id, (rx) => {
        setActivePrescription(rx);
        progUnsub();
        progUnsub = subscribePatientWorkoutProgress(id, rx, (p) => {
          setWorkoutProgress(p);
        });
      });
    }

    async function loadTherapists() {
      try {
        const config = await getClinicConfig();
        if (config && config.therapists && config.therapists.length > 0) {
          setEnrolledTherapists(config.therapists);
        } else {
          setEnrolledTherapists(["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]);
        }
      } catch (err) {
        console.error("Error loading therapists list in patient details:", err);
        setEnrolledTherapists(["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]);
      }
    }
    loadTherapists();

    return () => {
      rxUnsub();
      progUnsub();
      invUnsub();
    };
  }, [id]);

  const defaultTherapist = enrolledTherapists[0] || "Dr.Kinnera";

  // Set default visit date to today
  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const formatted = `${year}-${month}-${day}`;
    setVisitDate(formatted);
    setMaxDateStr(formatted);
  }, []);

  const loadPatientDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const pData = await getPatientById(id);
      if (!pData) {
        setError("Patient profile not found in database.");
        return;
      }
      setPatient(pData as Patient);

      // Fetch timelines, files, prescription & history safely
      const pidToLoad = pData.id || id;
      const [cListRes, fListRes, rxRes, rxHistRes, cfgRes] = await Promise.allSettled([
        getConsultations(pidToLoad),
        getMedicalRecordFiles(pidToLoad),
        getPatientPrescription(pidToLoad),
        getPatientPrescriptionsHistory(pidToLoad),
        getClinicConfig()
      ]);

      const cList = cListRes.status === "fulfilled" ? cListRes.value : [];
      const fList = fListRes.status === "fulfilled" ? fListRes.value : [];
      const rx = rxRes.status === "fulfilled" ? rxRes.value : null;
      const rxHist = rxHistRes.status === "fulfilled" ? rxHistRes.value : [];
      if (cfgRes.status === "fulfilled") setClinicConfig(cfgRes.value);

      setConsultations(cList as Consultation[]);
      setFiles(fList as MedicalFile[]);
      setActivePrescription(rx);
      setPrescriptionsHistory(rxHist);

      if (pData.email || pData.id || pData.phone || pData.customId) {
        try {
          subscribePatientInvoices(
            { 
              patientId: pData.id, 
              email: pData.email, 
              phone: pData.phone, 
              customId: pData.customId 
            }, 
            (invs) => {
              setPatientInvoices(invs || []);
            }
          );
        } catch (subErr) {
          console.warn("Invoice subscription warning:", subErr);
        }
      }

      // Load Family Circle members
      try {
        const famList = await getFamilyMembers(pData as any);
        setFamilyMembers(famList.filter((m) => m.id !== pData.id));
      } catch (famErr) {
        console.warn("Failed to load family members:", famErr);
      }
    } catch (err: any) {
      console.error("Error loading patient details:", err);
      setError("An error occurred while fetching details.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormError("");
      setFormSuccess("");

      if (file.type.startsWith("image/")) {
        try {
          // Immediately set original file as loading state reference
          setSelectedFile(file);
          const compressed = await compressImageFile(file);
          setSelectedFile(compressed);
        } catch (err) {
          console.error("Client side image compression failed:", err);
          setSelectedFile(file); // fallback to original
        }
      } else {
        // PDF / Document size check (Vercel has a hard 4.5MB serverless payload limit)
        if (file.size > 4.5 * 1024 * 1024) {
          setFormError("The selected file is too large. Direct uploads of PDFs or documents are limited to 4.5 MB. Please compress your file or upload a smaller file.");
          setSelectedFile(null);
          e.target.value = "";
          return;
        }
        setSelectedFile(file);
      }
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 1-Click interactive Google Drive folder creation
  const handleCreateDriveFolder = async () => {
    if (!patient || !patient.id) return;
    setCreatingDriveFolder(true);
    setFormError("");
    setFormSuccess("");
    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => "") : "";
      const driveRes = await fetch("/api/drive/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          patientId: patient.id,
          patientName: patient.name,
        }),
      });
      const text = await driveRes.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${driveRes.status}. Please try again.`);
      }
      if (data.success && data.folderId) {
        await updatePatient(patient.id, { googleDriveFolderId: data.folderId });
        setPatient((prev) => (prev ? { ...prev, googleDriveFolderId: data.folderId } : null));
        setFormSuccess(`📁 Google Drive folder successfully created & linked for ${patient.name}!`);
      } else {
        throw new Error(data.error || "Failed to create Google Drive folder.");
      }
    } catch (err: unknown) {
      console.error("Error creating drive folder:", err);
      const msg = err instanceof Error ? err.message : "Failed to create Google Drive folder.";
      setFormError(msg);
    } finally {
      setCreatingDriveFolder(false);
    }
  };

  // Auto-heal on profile view: If patient is loaded and missing Drive folder, automatically create & link it
  const autoCreatedDriveRef = useRef(false);
  useEffect(() => {
    if (!patient || !patient.id || patient.googleDriveFolderId || autoCreatedDriveRef.current || creatingDriveFolder) {
      return;
    }
    autoCreatedDriveRef.current = true;
    console.log(`[Auto-heal] Patient ${patient.id} is missing Drive folder. Auto-provisioning now...`);
    handleCreateDriveFolder();
  }, [patient?.id, patient?.googleDriveFolderId]);

  // Dedicated direct file upload / photo capture for Doctor Reference (Hidden from Patient Hub)
  const handleUploadDoctorScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !patient) return;
    const file = e.target.files[0];

    setUploadingDoctorScan(true);
    setFormError("");
    setFormSuccess("");

    try {
      // Auto-heal: If patient lacks a Drive folder, initialize it on-the-fly
      let activeFolderId = patient.googleDriveFolderId;
      if (!activeFolderId) {
        console.log("Patient missing Drive folder during upload. Auto-initializing folder...");
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => "") : "";
        const initRes = await fetch("/api/drive/create-folder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            patientId: patient.id,
            patientName: patient.name,
          }),
        });
        const initText = await initRes.text();
        let initData: any = {};
        try {
          initData = JSON.parse(initText);
        } catch {
          throw new Error(`Server returned status ${initRes.status}. Please try again.`);
        }
        if (initData.success && initData.folderId) {
          activeFolderId = initData.folderId;
          await updatePatient(patient.id, { googleDriveFolderId: initData.folderId });
          setPatient((prev) => (prev ? { ...prev, googleDriveFolderId: initData.folderId } : null));
        } else {
          throw new Error(initData.error || "Unable to initialize Google Drive folder for upload.");
        }
      }

      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        try {
          fileToUpload = await compressImageFile(file);
        } catch (compErr) {
          console.warn("Client-side compression skipped:", compErr);
        }
      } else if (file.size > 4.5 * 1024 * 1024) {
        throw new Error("File size is too large (max 4.5 MB). Please select a compressed file or image.");
      }

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const formattedDate = `${dd}-${mm}-${yyyy}`;

      const uploadFormData = new FormData();
      uploadFormData.append("file", fileToUpload);
      uploadFormData.append("parentFolderId", activeFolderId!);
      uploadFormData.append("date", formattedDate);
      uploadFormData.append("category", "Reports");

      const uploadResponse = await fetch("/api/drive/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        let errTxt = "";
        try {
          const errRes = await uploadResponse.json();
          errTxt = errRes.error;
        } catch {
          errTxt = await uploadResponse.text();
        }
        throw new Error(errTxt || `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "File upload failed.");
      }

      // Save record in Firestore with isDoctorOnly: true
      const savedDoc = await addMedicalRecordFile(id, {
        fileName: file.name,
        fileType: file.type,
        fileSize: fileToUpload.size,
        dateUploaded: formattedDate,
        googleDriveFileId: uploadResult.fileId,
        webViewLink: uploadResult.webViewLink,
        downloadLink: uploadResult.downloadLink,
        isDoctorOnly: true,
        category: "DOCTOR_REFERENCE"
      });

      // Update local state cleanly using saved document
      setFiles((prev) => [savedDoc as MedicalFile, ...prev]);

      setFormSuccess(`📸 Medical file "${file.name}" uploaded successfully for Doctor's Reference.`);
    } catch (err: any) {
      console.error("Doctor scan upload error:", err);
      setFormError(err?.message || "Failed to upload medical document.");
    } finally {
      setUploadingDoctorScan(false);
      if (e.target) e.target.value = "";
    }
  };

  // Add clinical reminder dynamic action
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim() || !patient) return;
    setUpdatingReminders(true);
    try {
      const updatedReminders = [...(patient.reminders || []), newReminder.trim()];
      await updatePatient(patient.id, { reminders: updatedReminders });
      setPatient((prev) => (prev ? { ...prev, reminders: updatedReminders } : null));
      setNewReminder("");
    } catch (err) {
      console.error("Failed to add reminder:", err);
    } finally {
      setUpdatingReminders(false);
    }
  };

  // Delete clinical reminder dynamic action
  const handleDeleteReminder = async (indexToDelete: number) => {
    if (!patient) return;
    setUpdatingReminders(true);
    try {
      const updatedReminders = (patient.reminders || []).filter((_, idx) => idx !== indexToDelete);
      await updatePatient(patient.id, { reminders: updatedReminders });
      setPatient((prev) => (prev ? { ...prev, reminders: updatedReminders } : null));
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    } finally {
      setUpdatingReminders(false);
    }
  };

  // Handle scanned document result from Gemini AI
  const handleApplyScanResult = async (data: ScanResult, scannedFile?: File, previewUrl?: string) => {
    if (!patient) return;

    // 1. Auto-append pre-existing conditions / alerts to Provider Reminders in Firestore
    if (data.providerRemindersAndAlerts && data.providerRemindersAndAlerts.length > 0) {
      try {
        const existing = patient.reminders || [];
        const newAlerts = data.providerRemindersAndAlerts.filter((a) => !existing.includes(a));
        if (newAlerts.length > 0) {
          const combined = [...existing, ...newAlerts];
          await updatePatient(patient.id, { reminders: combined });
          setPatient((prev) => (prev ? { ...prev, reminders: combined } : null));
        }
      } catch (remErr) {
        console.error("Error auto-syncing provider alerts from scan:", remErr);
      }
    }

    // 2. Handle Case Sheet Mode (Consultation Timeline)
    if (data.documentType === "CLINICAL_ASSESSMENT") {
      if (data.formattedSoapNote) {
        setNotes(data.formattedSoapNote);
      } else if (data.subjectiveComplaints) {
        setNotes(data.subjectiveComplaints);
      }
      if (data.visitDate) {
        setVisitDate(data.visitDate);
      }
      if (scannedFile) {
        setSelectedFile(scannedFile);
      }
      setActiveTab("timeline");
      setFormSuccess("✨ Handwritten case sheet transcribed & applied! You can review the notes and save below.");
    }

    // 3. Handle Doctor Prescription / Referral Mode (Medical Scans & Files Tab - Generate & Save PDF)
    if (data.documentType === "DOCTOR_PRESCRIPTION") {
      setActiveTab("files");
      setFormSuccess("");
      setFormError("");

      try {
        const currentDateStr = new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const scanData = data as any;
        const combinedText = scanData.formattedSoapNote || scanData.summaryForRecord || scanData.prescribedTherapies;
        const doc = buildUnifiedPrescriptionPdf({
          patientName: patient.name,
          pid: patient.patientId || patient.id,
          dateStr: scanData.prescriptionDate || currentDateStr,
          therapistName: patient.therapistName || defaultTherapist,
          referringDoctor: scanData.doctorName,
          hospitalOrClinic: scanData.hospitalOrClinic,
          prescriptionDate: scanData.prescriptionDate,
          diagnosis: scanData.diagnosis,
          precautionsAndRestrictions: scanData.precautionsAndRestrictions,
          providerAlerts: scanData.providerRemindersAndAlerts,
          consultationSummary: combinedText,
          rawVerbatimTranscript: scanData.rawVerbatimTranscript,
          exercises: [],
        });

        // Generate PDF Blob
        const pdfBlob = doc.output("blob");
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        const dateStamp = `${dd}-${mm}-${yyyy}`;
        const cleanDoctorName = (data.doctorName || data.hospitalOrClinic || "Doctor").replace(/[^a-zA-Z0-9]/g, "_");
        const pdfFileName = `consultation_Referral_${cleanDoctorName}_${dateStamp}.pdf`;
        const pdfFile = new File([pdfBlob], pdfFileName, { type: "application/pdf" });

        // Upload PDF directly to Google Drive
        if (patient.googleDriveFolderId) {
          const uploadFormData = new FormData();
          uploadFormData.append("file", pdfFile);
          uploadFormData.append("parentFolderId", patient.googleDriveFolderId);
          uploadFormData.append("date", dateStamp);
          uploadFormData.append("category", "Prescriptions");

          const uploadResponse = await fetch("/api/drive/upload", {
            method: "POST",
            body: uploadFormData,
          });

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            const gFileId = uploadResult.fileId;
            const viewLink = uploadResult.webViewLink || (gFileId ? `https://drive.google.com/file/d/${gFileId}/view` : "");
            const dlLink = uploadResult.downloadLink || viewLink;

            const newFileRecord = await addMedicalRecordFile(patient.id, {
              fileName: pdfFileName,
              fileType: "application/pdf",
              fileSize: pdfFile.size,
              dateUploaded: dateStamp,
              googleDriveFileId: gFileId,
              webViewLink: viewLink,
              downloadLink: dlLink,
            } as any);

            // Instantly prepend the new PDF to local state for 0ms UI reactivity
            setFiles((prev) => [newFileRecord as MedicalFile, ...prev]);
            setFormSuccess(`✨ Clinical Referral PDF (${pdfFileName}) successfully generated & saved to Google Drive!`);
          } else {
            throw new Error("Failed to upload PDF to Google Drive.");
          }
        } else {
          throw new Error("Patient does not have an assigned Google Drive folder.");
        }
      } catch (pdfErr: any) {
        console.error("PDF upload error:", pdfErr);
        setFormError(pdfErr?.message || "Failed to save prescription PDF.");
      }
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes && !selectedFile) {
      setFormError("Please write consultation notes or select a file to upload.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      // Format HTML date input to DD-MM-YYYY
      const dateParts = visitDate.split("-");
      const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

      // 1. Process Google Drive upload if file is attached
      let driveFileRef = null;
      if (selectedFile && selectedFile.size > 0) {
        if (!patient?.googleDriveFolderId) {
          throw new Error("This patient does not have a Google Drive folder. Please edit the patient or contact admin.");
        }

        console.log("[Detail Page] Uploading file to Google Drive proxy...");
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);
        uploadFormData.append("parentFolderId", patient.googleDriveFolderId);
        uploadFormData.append("date", formattedDate);
        uploadFormData.append("category", "Reports");

        const uploadResponse = await fetch("/api/drive/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          if (uploadResponse.status === 413) {
            throw new Error("File size is too large. Vercel limits serverless API uploads to 4.5 MB. Please choose a smaller file.");
          }
          let errorText = "";
          try {
            const errResult = await uploadResponse.json();
            errorText = errResult.error;
          } catch {
            errorText = await uploadResponse.text();
          }
          throw new Error(errorText || `File upload failed with status ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "File upload failed.");
        }

        console.log("[Detail Page] Google Drive Upload finished successfully.");
        // Index file reference client-side
        driveFileRef = await addMedicalRecordFile(id, {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          dateUploaded: formattedDate,
          googleDriveFileId: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          downloadLink: uploadResult.downloadLink,
        });
      }

      // 2. Log Consultation session in Firestore client-side
      if (notes) {
        console.log("[Detail Page] Logging session details to Firestore...");
        
        let loggingTherapist = patient?.therapistName || defaultTherapist;
        const userJson = localStorage.getItem("gpc_user");
        if (userJson) {
          const userObj = JSON.parse(userJson);
          if (userObj.name) {
            loggingTherapist = userObj.name;
          }
        }

        await addConsultation(id, {
          date: formattedDate,
          summary: notes,
          therapistName: loggingTherapist,
        });

        // Auto-generate and upload unified consultation sheet if Drive folder is linked
        if (patient?.googleDriveFolderId) {
          try {
            const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
            const rxDoc = buildUnifiedPrescriptionPdf({
              patientName: patient.name,
              pid: patient.id,
              dateStr: formattedDate,
              therapistName: loggingTherapist,
              durationDays: activePrescription?.durationDays || 14,
              consultationSummary: notes,
              generalNotes: hasExercises ? activePrescription?.generalNotes : undefined,
              exercises: hasExercises ? activePrescription?.exercises : [],
              diagnosis: patient.treatmentPlan,
              providerAlerts: patient.reminders || [],
            });
            const pdfBlob = rxDoc.output("blob");
            const fileName = getPrescriptionFileName(patient.name, new Date(), hasExercises);
            const fileObj = new File([pdfBlob], fileName, { type: "application/pdf" });
            const formData = new FormData();
            formData.append("file", fileObj);
            formData.append("parentFolderId", patient.googleDriveFolderId);
            formData.append("date", formattedDate);
            formData.append("category", "Prescriptions");

            const uploadRes = await fetch("/api/drive/upload", {
              method: "POST",
              body: formData,
            });
            const uploadData = await uploadRes.json();
            if (uploadData.success) {
              const newFileRec = await addMedicalRecordFile(id, {
                fileName: fileName,
                fileType: "application/pdf",
                fileSize: pdfBlob.size,
                dateUploaded: formattedDate,
                googleDriveFileId: uploadData.fileId,
                webViewLink: uploadData.webViewLink,
                downloadLink: uploadData.downloadLink,
              });
              setFiles((prev) => [newFileRec as MedicalFile, ...prev]);
            }
          } catch (autoUploadErr) {
            console.warn("Auto-uploading consultation sheet to Drive failed:", autoUploadErr);
          }
        }

        // Dispatch Consultation & Prescription Report PDF to patient email (strictly for clinical notes)
        if (patient?.email && patient.email.includes("@")) {
          try {
            const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
            const rxDoc = buildUnifiedPrescriptionPdf({
              patientName: patient.name,
              pid: patient.id,
              dateStr: formattedDate,
              therapistName: loggingTherapist,
              durationDays: activePrescription?.durationDays || 14,
              consultationSummary: notes,
              generalNotes: hasExercises ? activePrescription?.generalNotes : undefined,
              exercises: hasExercises ? activePrescription?.exercises : [],
              diagnosis: patient.treatmentPlan,
              providerAlerts: patient.reminders || [],
            });
            const dataUri = rxDoc.output("datauristring");
            const pdfBase64 = dataUri.split(",")[1];

            fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "CONSULTATION_REPORT",
                payload: {
                  patientName: patient.name,
                  patientEmail: patient.email,
                  date: formattedDate,
                  therapistName: loggingTherapist,
                  diagnosis: patient.treatmentPlan,
                  summary: notes,
                  exercisesCount: hasExercises ? activePrescription?.exercises?.length : 0,
                  pdfBase64,
                },
              }),
            }).catch((emailErr) => {
              console.warn("[Consultation Email] Background dispatch error:", emailErr);
            });

            // Also Auto-Dispatch Consultation & Prescription PDF via WhatsApp
            if (patient.phone) {
              fetch("/api/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  type: "CONSULTATION_REPORT",
                  payload: {
                    patientName: patient.name,
                    patientPhone: patient.phone,
                    date: formattedDate,
                    therapistName: loggingTherapist,
                    diagnosis: patient.treatmentPlan,
                    summary: notes,
                    exercisesCount: hasExercises ? activePrescription?.exercises?.length : 0,
                    pdfBase64,
                  },
                }),
              }).catch((waErr) => {
                console.warn("[Consultation WhatsApp] Background dispatch error:", waErr);
              });
            }
          } catch (pdfEmailErr) {
            console.warn("[Consultation Email/WA] Failed to generate PDF for dispatch:", pdfEmailErr);
          }
        }
      }

      // Success Reset
      setFormSuccess("Session logged and files synced successfully!");
      setNotes("");
      setSelectedFile(null);
      // Reset file and camera input values
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      const cameraInput = document.getElementById("camera-input") as HTMLInputElement;
      if (cameraInput) cameraInput.value = "";

      // Clear saved draft since consultation is now finalized
      if (id) {
        localStorage.removeItem(`gpc_draft_${id}`);
        try {
          await updatePatient(id, { consultationDraft: null });
        } catch {}
      }
      setHasDraft(false);
      setDraftMetadata(null);

      // Reload
      loadPatientDetails();
    } catch (err: any) {
      console.error("Error logging session:", err);
      setFormError(err.message || "Failed to record consultation details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPrescription = (rxItem: any) => {
    try {
      const hasExercises = Boolean(rxItem.exercises && rxItem.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: rxItem.displayDate || rxItem.date || "23-08-2026",
        therapistName: rxItem.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: rxItem.durationDays || 14,
        generalNotes: rxItem.generalNotes,
        consultationSummary: rxItem.consultationSummary,
        modalitiesAdministered: rxItem.modalitiesAdministered,
        exercises: rxItem.exercises || [],
        diagnosis: rxItem.diagnosis || patient?.treatmentPlan,
        providerAlerts: rxItem.providerAlerts || patient?.reminders || [],
      });
      const fileName = getPrescriptionFileName(patient?.name || "Patient", rxItem.rawDate || new Date(), hasExercises);
      doc.save(fileName);
    } catch (err) {
      console.error("Prescription download failed:", err);
    }
  };

  const handleViewPrescription = (rxItem: any) => {
    try {
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: rxItem.displayDate || rxItem.date || "23-08-2026",
        therapistName: rxItem.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: rxItem.durationDays || 14,
        generalNotes: rxItem.generalNotes,
        consultationSummary: rxItem.consultationSummary,
        modalitiesAdministered: rxItem.modalitiesAdministered,
        exercises: rxItem.exercises || [],
        diagnosis: rxItem.diagnosis || patient?.treatmentPlan,
        providerAlerts: rxItem.providerAlerts || patient?.reminders || [],
      });
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Prescription view failed:", err);
    }
  };

  const handleDownloadConsultationPdf = (consult: Consultation) => {
    try {
      const consultDate = consult.date || new Date();
      const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: consult.date,
        therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: activePrescription?.durationDays || 14,
        consultationSummary: consult.summary,
        diagnosis: patient?.treatmentPlan,
        providerAlerts: patient?.reminders || [],
        exercises: hasExercises ? activePrescription?.exercises : [],
      });
      const fileName = getPrescriptionFileName(patient?.name || "Patient", consultDate, hasExercises);
      doc.save(fileName);
    } catch (err) {
      console.error("Consultation download failed:", err);
    }
  };

  const handleViewConsultationPdf = (consult: Consultation) => {
    try {
      const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: consult.date,
        therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: activePrescription?.durationDays || 14,
        consultationSummary: consult.summary,
        diagnosis: patient?.treatmentPlan,
        providerAlerts: patient?.reminders || [],
        exercises: hasExercises ? activePrescription?.exercises : [],
      });
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Consultation view failed:", err);
    }
  };

  const handleEmailConsultationPdf = async (consult: Consultation) => {
    if (!patient?.email || !patient.email.includes("@")) {
      setFormError(`Patient ${patient?.name || "Patient"} does not have a registered email address.`);
      setTimeout(() => setFormError(""), 4000);
      return;
    }

    try {
      const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: consult.date,
        therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: activePrescription?.durationDays || 14,
        consultationSummary: consult.summary,
        diagnosis: patient?.treatmentPlan,
        providerAlerts: patient?.reminders || [],
        exercises: hasExercises ? activePrescription?.exercises : [],
      });
      const dataUri = doc.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      setFormSuccess("Sending consultation report PDF to patient email...");
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CONSULTATION_REPORT",
          payload: {
            patientName: patient.name,
            patientEmail: patient.email,
            date: consult.date,
            therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
            diagnosis: patient?.treatmentPlan,
            summary: consult.summary,
            exercisesCount: hasExercises ? activePrescription?.exercises?.length : 0,
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch email");
      }

      setFormSuccess(`✉️ Consultation report PDF sent to ${patient.email}!`);
      setTimeout(() => setFormSuccess(""), 4000);
    } catch (err: any) {
      console.error("Consultation email failed:", err);
      setFormError(err.message || "Failed to dispatch consultation email.");
      setTimeout(() => setFormError(""), 4000);
    }
  };

  const handleWhatsAppConsultationPdf = async (consult: Consultation) => {
    if (!patient?.phone) {
      setFormError(`Patient ${patient?.name || "Patient"} does not have a registered phone number.`);
      setTimeout(() => setFormError(""), 4000);
      return;
    }

    try {
      const hasExercises = Boolean(activePrescription?.exercises && activePrescription.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: consult.date,
        therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
        durationDays: activePrescription?.durationDays || 14,
        consultationSummary: consult.summary,
        diagnosis: patient?.treatmentPlan,
        providerAlerts: patient?.reminders || [],
        exercises: hasExercises ? activePrescription?.exercises : [],
      });
      const dataUri = doc.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      setFormSuccess("Sending consultation report PDF to patient WhatsApp...");
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CONSULTATION_REPORT",
          payload: {
            patientName: patient.name,
            patientPhone: patient.phone,
            date: consult.date,
            therapistName: consult.therapistName || patient?.therapistName || defaultTherapist,
            diagnosis: patient?.treatmentPlan,
            summary: consult.summary,
            exercisesCount: hasExercises ? activePrescription?.exercises?.length : 0,
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch WhatsApp message");
      }

      setFormSuccess(`📱 Consultation report PDF sent to WhatsApp (${patient.phone})!`);
      setTimeout(() => setFormSuccess(""), 4000);
    } catch (err: any) {
      console.error("Consultation WhatsApp failed:", err);
      setFormError(err.message || "Failed to dispatch consultation WhatsApp.");
      setTimeout(() => setFormError(""), 4000);
    }
  };

  const buildInvoicePdf = (inv: Invoice): jsPDF => {
    return buildUnifiedInvoicePdf({
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.patientName || patient?.name || "Patient",
      patientId: inv.patientId || patient?.id,
      patientEmail: inv.patientEmail || patient?.email,
      patientPhone: inv.patientPhone || patient?.phone,
      clinicAddress: clinicConfig?.address,
      clinicPhone: clinicConfig?.phone,
      therapistName: inv.therapistName || patient?.therapistName || defaultTherapist,
      serviceDate: inv.serviceDate,
      dueDate: inv.dueDate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      items: inv.items,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      discount: inv.discount,
      totalAmount: inv.totalAmount,
      currency: inv.currency || "INR",
      notes: inv.notes,
      voidReason: inv.voidReason,
      replacesInvoiceNumber: inv.replacesInvoiceNumber,
      replacedByInvoiceNumber: inv.replacedByInvoiceNumber,
    });
  };

  const handleDownloadInvoicePdf = (inv: Invoice) => {
    try {
      const pdf = buildInvoicePdf(inv);
      const fileName = getInvoiceFileName(inv.patientName || patient?.name || "Patient", inv.serviceDate || new Date());
      pdf.save(fileName);
    } catch (e) {
      console.error("Error downloading invoice PDF:", e);
    }
  };

  const handleViewInvoicePdf = (inv: Invoice) => {
    try {
      const pdf = buildInvoicePdf(inv);
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    } catch (e) {
      console.error("Error viewing invoice PDF:", e);
    }
  };

  const handleConfirmVoidInvoice = async () => {
    if (!voidingInvoice) return;
    const invToVoid = voidingInvoice;
    const reason = voidReason.trim() || "Clerical correction / bill updated";

    // 1. Instantly quit the modal window so therapist is never stuck
    setVoidingInvoice(null);
    setVoidReason("");
    setFormSuccess(`⚡ Marking invoice ${invToVoid.invoiceNumber} as VOIDED...`);

    try {
      // 2. Update Firestore SSOT
      await voidInvoice(invToVoid.id, reason);
      setFormSuccess(`⚡ Invoice ${invToVoid.invoiceNumber} marked as VOIDED.`);
      setTimeout(() => setFormSuccess(""), 4500);

      // 3. Dispatch automated notices & replace PDF in Google Drive in the background (non-blocking)
      (async () => {
        // Auto-dispatch cancellation notice to patient email
        const targetEmail = invToVoid.patientEmail || patient?.email;
        if (targetEmail && targetEmail.includes("@")) {
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_VOID_NOTICE",
              payload: {
                patientName: invToVoid.patientName || patient?.name || "Patient",
                patientEmail: targetEmail,
                invoiceNumber: invToVoid.invoiceNumber,
                amount: invToVoid.totalAmount,
                serviceDate: invToVoid.serviceDate,
                voidReason: reason,
              },
            }),
          }).catch((err) => console.warn("[Invoice Void Email] Dispatch warning:", err));
        }

        // Auto-dispatch cancellation notice to patient WhatsApp
        const targetPhone = invToVoid.patientPhone || patient?.phone;
        if (targetPhone) {
          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_VOID_NOTICE",
              payload: {
                patientName: invToVoid.patientName || patient?.name || "Patient",
                patientPhone: targetPhone,
                invoiceNumber: invToVoid.invoiceNumber,
                amount: invToVoid.totalAmount,
                serviceDate: invToVoid.serviceDate,
                voidReason: reason,
              },
            }),
          }).catch((err) => console.warn("[Invoice Void WhatsApp] Dispatch warning:", err));
        }
        try {
          const driveFolderId = patient?.googleDriveFolderId || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID;
          if (driveFolderId) {
            const voidedInvPayload: Invoice = {
              ...invToVoid,
              status: "voided",
              voidReason: reason,
            };
            const voidPdf = buildInvoicePdf(voidedInvPayload);
            const pdfBlob = voidPdf.output("blob");

            let formattedServiceDate = invToVoid.serviceDate || "";
            if (formattedServiceDate && formattedServiceDate.includes("-")) {
              const parts = formattedServiceDate.split("-");
              if (parts.length === 3 && parts[0].length === 4) {
                formattedServiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }

            const driveFormData = new FormData();
            const pdfFile = new File([pdfBlob], `${invToVoid.invoiceNumber}_Invoice.pdf`, {
              type: "application/pdf",
            });
            driveFormData.append("file", pdfFile);
            driveFormData.append("parentFolderId", driveFolderId);
            driveFormData.append("date", formattedServiceDate);
            driveFormData.append("category", "Invoices");
            driveFormData.append("replaceExisting", "true");

            await fetch("/api/drive/upload", {
              method: "POST",
              body: driveFormData,
            });

            const voidSuffixFormData = new FormData();
            const voidSuffixFile = new File([pdfBlob], `${invToVoid.invoiceNumber}_VOIDED_Invoice.pdf`, {
              type: "application/pdf",
            });
            voidSuffixFormData.append("file", voidSuffixFile);
            voidSuffixFormData.append("parentFolderId", driveFolderId);
            voidSuffixFormData.append("date", formattedServiceDate);
            voidSuffixFormData.append("category", "Invoices");
            voidSuffixFormData.append("replaceExisting", "true");

            await fetch("/api/drive/upload", {
              method: "POST",
              body: voidSuffixFormData,
            });
          }
        } catch (driveErr) {
          console.warn("Failed to replace voided invoice in Google Drive:", driveErr);
        }
      })();
    } catch (err: any) {
      console.error("Error voiding invoice:", err);
      setFormError("Failed to void invoice.");
      setTimeout(() => setFormError(""), 4000);
    }
  };

  const getWhatsAppInvoiceUrl = (inv: Invoice) => {
    const phone = inv.patientPhone || patient?.phone;
    if (!phone) return "#";
    const formattedPhone = getCleanWhatsAppNumber(phone, false);
    if (!formattedPhone) return "#";

    const message = `Hello ${inv.patientName || patient?.name || "Valued Patient"},

Your official treatment invoice from Gait Physio Clinic is ready:

📄 *Invoice #*: ${inv.invoiceNumber}
📅 *Date*: ${inv.serviceDate}
👨‍⚕️ *Therapist*: ${inv.therapistName || "Dr. Kinnera"}
💳 *Total Amount*: ₹${(inv.totalAmount || 0).toLocaleString("en-IN")} (${(inv.status || "PAID").toUpperCase()})

Thank you for choosing Gait Physio Clinic! You can also view your complete billing and prescription history anytime in your Patient Hub.

Warm regards,
*Gait Physio Clinic, Bengaluru*
📞 +91 89044 56243`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleEmailInvoicePdf = async (inv: Invoice) => {
    const targetEmail = inv.patientEmail || patient?.email;
    if (!targetEmail || !targetEmail.includes("@")) {
      setInvoiceDispatchModal({
        isOpen: true,
        channel: "email",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: targetEmail || "No email on file",
        amount: inv.totalAmount || 0,
        message: `Patient ${inv.patientName || patient?.name || ""} does not have a valid email address on file.`,
      });
      return;
    }

    setEmailingInvoiceId(inv.id);
    setFormSuccess("");
    try {
      const pdf = buildInvoicePdf(inv);
      const dataUri = pdf.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INVOICE_DELIVERY",
          payload: {
            patientName: inv.patientName || patient?.name || "Patient",
            patientEmail: targetEmail,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            serviceDate: inv.serviceDate,
            dueDate: inv.dueDate,
            paymentMethod: inv.paymentMethod,
            status: inv.status,
            replacesInvoiceNumber: inv.replacesInvoiceNumber,
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch email via Brevo");
      }

      setFormSuccess(`✉️ Invoice ${inv.invoiceNumber} PDF emailed to ${targetEmail}!`);
      setTimeout(() => setFormSuccess(""), 4000);

      setInvoiceDispatchModal({
        isOpen: true,
        channel: "email",
        status: "success",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: targetEmail,
        amount: inv.totalAmount || 0,
        message: `Official A4 Tax Invoice PDF has been delivered directly to ${targetEmail} with full itemized details.`,
      });
    } catch (err: any) {
      console.error("Failed to email invoice PDF:", err);
      setInvoiceDispatchModal({
        isOpen: true,
        channel: "email",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: targetEmail,
        amount: inv.totalAmount || 0,
        message: err.message || "Failed to dispatch invoice email.",
      });
    } finally {
      setEmailingInvoiceId(null);
    }
  };

  const handleWhatsAppInvoice = async (inv: Invoice) => {
    const targetPhone = inv.patientPhone || patient?.phone;
    if (!targetPhone) {
      setInvoiceDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: "No phone number",
        amount: inv.totalAmount || 0,
        message: `Patient ${inv.patientName || patient?.name || ""} does not have a phone number on file.`,
      });
      return;
    }

    setWhatsAppingInvoiceId(inv.id);
    setFormSuccess("");
    try {
      const pdf = buildInvoicePdf(inv);
      const dataUri = pdf.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INVOICE_DELIVERY",
          payload: {
            patientName: inv.patientName || patient?.name || "Patient",
            patientPhone: targetPhone,
            invoiceNumber: inv.invoiceNumber,
            date: inv.serviceDate,
            amount: inv.totalAmount,
            serviceName: inv.items?.map((i) => i.description).join(", ") || "Physiotherapy Treatment",
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch WhatsApp message");
      }

      setFormSuccess(`📱 Invoice ${inv.invoiceNumber} PDF sent to WhatsApp (${targetPhone})!`);
      setTimeout(() => setFormSuccess(""), 4000);

      setInvoiceDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "success",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: targetPhone,
        amount: inv.totalAmount || 0,
        message: `Official Tax Invoice PDF delivered directly to ${inv.patientName || patient?.name}'s WhatsApp.`,
      });
    } catch (err: any) {
      console.error("Failed to send WhatsApp invoice PDF:", err);
      setInvoiceDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        recipient: targetPhone,
        amount: inv.totalAmount || 0,
        message: err.message || "Automated WhatsApp delivery could not complete. You can still deliver it immediately via WhatsApp Web below.",
        whatsappUrl: getWhatsAppInvoiceUrl(inv),
      });
    } finally {
      setWhatsAppingInvoiceId(null);
    }
  };

  // Build unified items for Medical Scans & Files safely inside useMemo
  const allUnifiedFiles = useMemo(() => {
    const list: Array<{
      id: string;
      category: "PRESCRIPTION" | "INVOICE" | "FILE";
      fileName: string;
      subtitle: string;
      dateStr: string;
      sizeFormatted?: string;
      raw: any;
      isDoctorOnly?: boolean;
      onView?: () => void;
      onDownload?: () => void;
      webViewLink?: string;
      downloadLink?: string;
    }> = [];

    if (!patient) return list;

    // 1. Invoices
    (patientInvoices || []).forEach((inv) => {
      if (!inv) return;
      const invDate = inv.serviceDate || new Date();
      const fileName = getInvoiceFileName(patient?.name || inv.patientName || "Patient", invDate);
      list.push({
        id: inv.id || `inv-${Math.random()}`,
        category: "INVOICE",
        fileName: fileName,
        subtitle: `Invoice #${inv.invoiceNumber} • Rs. ${(inv.totalAmount || 0).toLocaleString("en-IN")} • ${(inv.status || "PAID").toUpperCase()}`,
        dateStr: inv.serviceDate || "Recorded",
        raw: inv,
        onView: () => handleViewInvoicePdf(inv),
        onDownload: () => handleDownloadInvoicePdf(inv)
      });
    });

    // 4. Uploaded Medical Files / Scans
    (files || []).forEach((file) => {
      if (!file) return;
      const fObj = file as any;
      const fId = file.googleDriveFileId || fObj.driveFileId || fObj.fileId;
      const viewUrl = file.webViewLink || fObj.driveViewLink || (fId ? `https://drive.google.com/file/d/${fId}/view` : "");
      const downloadUrl = file.downloadLink || fObj.downloadLink || viewUrl;
      const dateStr = file.dateUploaded || fObj.uploadedAt?.split("T")[0] || "Uploaded";
      const isDocOnly = file.isDoctorOnly === true || fObj.isDoctorOnly === true || fObj.category === "DOCTOR_REFERENCE";

      if (!list.some((f) => f.fileName === file.fileName)) {
        list.push({
          id: file.id || fId || Math.random().toString(),
          category: "FILE",
          fileName: file.fileName || "Medical Document",
          subtitle: isDocOnly 
            ? `Doctor Reference • ${formatBytes(file.fileSize)}`
            : `Verified Medical Scan / Doc • ${formatBytes(file.fileSize)}`,
          dateStr: dateStr,
          sizeFormatted: formatBytes(file.fileSize),
          raw: file,
          isDoctorOnly: isDocOnly,
          webViewLink: viewUrl,
          downloadLink: downloadUrl
        });
      }
    });

    return list;
  }, [patient, consultations, activePrescription, prescriptionsHistory, patientInvoices, files]);

  if (loading) {
    return (
      <div className="flex flex-col h-96 items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-3" />
        <span>Loading clinical patient profile...</span>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col h-96 items-center justify-center text-red-500 text-xs font-semibold">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
        <span>{error || "Failed to load patient detail profile."}</span>
        <Link 
          href="/dashboard/patients" 
          className="mt-4 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 font-black text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-fade max-w-7xl mx-auto">
      
      {/* Back to Directory Link */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 select-none">
        <Link href="/dashboard/patients" className="hover:text-brand-green transition-colors">
          Patients Database
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-500 font-extrabold">{patient.name}</span>
      </div>

      {/* Main Clinical Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-brand-green text-white flex items-center justify-center font-black text-xl uppercase ring-4 ring-brand-green/10 shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-brand-charcoal dark:text-white tracking-tight">
                {patient.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                patient.status === "active" 
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/35" 
                  : patient.status === "pending"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/30"
                    : "bg-slate-100 text-slate-655 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/30"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {patient.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
              <p className="text-slate-400 font-bold">
                Patient ID: <span className="text-brand-charcoal dark:text-white uppercase font-black">{patient.id}</span>
              </p>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              {patient.activated ? (
                <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Portal Active
                </span>
              ) : patient.activationCode ? (
                <div className="inline-flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                    Portal Code: <strong className="text-brand-charcoal dark:text-white">{patient.activationCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSendPortalInvite}
                    className="text-[10px] font-black text-brand-green hover:underline inline-flex items-center gap-1 cursor-pointer bg-brand-green/10 px-2 py-0.5 rounded-md hover:bg-brand-green/20 transition-colors"
                    title="Send WhatsApp & Email invite with correct ID & Activation Code"
                  >
                    <span>Resend Portal Invite</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap self-start md:self-center">
          <button
            onClick={() => setIsPrescriberOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Dumbbell className="h-4.5 w-4.5" />
            Prescribe Exercises
          </button>

          {patient.googleDriveFolderId ? (
            <a
              href={`https://drive.google.com/drive/folders/${patient.googleDriveFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-brand-green hover:border-brand-green/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm"
            >
              <Folder className="h-4.5 w-4.5 text-brand-green" />
              View Drive Folder
            </a>
          ) : (
            <button
              onClick={handleCreateDriveFolder}
              disabled={creatingDriveFolder}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-4 py-2.5 text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Create and link Google Drive folder for this patient"
            >
              {creatingDriveFolder ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
              ) : (
                <Folder className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              )}
              <span>{creatingDriveFolder ? "Creating Folder..." : "Create & Link Drive Folder"}</span>
            </button>
          )}

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
            title="Manage & Delete Patient Data"
          >
            <Trash2 className="h-4 w-4" />
            Delete / Clean
          </button>
        </div>
      </div>

      {/* Main Grid: Left Side Clinical details, Right Side History tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        
        {/* Left Column: Basic Patient Clinical Info (Span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card 1: Patient Information */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Patient Information
            </h2>
            
            <div className="space-y-4">
              {(() => {
                const currentJoinedDateRaw = resolveJoinedDate(patient, consultations);
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase text-slate-400">Treatment Plan</p>
                      <p className="text-xs font-bold text-brand-green mt-1 bg-brand-bg dark:bg-brand-green/10 border border-brand-green/10 px-2.5 py-1 rounded-xl inline-block lowercase">
                        {patient.treatmentPlan}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-extrabold uppercase text-slate-400">Date Joined</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditingJoinedDate) {
                              setJoinedDateInput(currentJoinedDateRaw || new Date().toISOString().split("T")[0]);
                            }
                            setIsEditingJoinedDate(!isEditingJoinedDate);
                          }}
                          className="text-[9px] font-extrabold text-brand-green hover:underline cursor-pointer"
                        >
                          {isEditingJoinedDate ? "Cancel" : "Edit"}
                        </button>
                      </div>
                      {isEditingJoinedDate ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <input
                            type="date"
                            value={joinedDateInput}
                            onChange={(e) => setJoinedDateInput(e.target.value)}
                            className="w-full text-xs font-bold px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-brand-green text-slate-900 dark:text-white cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={handleSaveJoinedDate}
                            disabled={savingJoinedDate || !joinedDateInput}
                            className="px-2.5 py-1 rounded-xl bg-brand-green text-white text-[10px] font-black cursor-pointer hover:bg-brand-green-hover disabled:opacity-50 shrink-0"
                          >
                            {savingJoinedDate ? "..." : "Save"}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-xl inline-block">
                          {formatDisplayDate(currentJoinedDateRaw)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-850 pt-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Gender</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.gender || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Age</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">
                    {patient.age ? `${patient.age} yrs` : patient.dob || "N/A"}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Contact Number</p>
                  {!isEditingPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        const clean = (patient.phone || "").replace(/\D/g, "").slice(-10);
                        setPhoneInput(clean);
                        setIsEditingPhone(true);
                        setPhoneError("");
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-brand-green cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingPhone ? (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1 flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-slate-400 select-none">
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          value={phoneInput}
                          maxLength={10}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPhoneInput(val);
                            if (phoneError) setPhoneError("");
                          }}
                          className="w-full text-xs font-bold pl-10 pr-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-brand-green text-slate-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePhone}
                        disabled={savingPhone || phoneInput.length !== 10}
                        className="px-3 py-1.5 rounded-xl bg-brand-green text-white text-[10px] font-black cursor-pointer hover:bg-brand-green-hover disabled:opacity-50 active:scale-95 shrink-0"
                      >
                        {savingPhone ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPhone(false);
                          setPhoneError("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {phoneError ? (
                      <p className="text-[10px] font-bold text-red-500">{phoneError}</p>
                    ) : (
                      <p className="text-[9px] font-medium text-slate-400 leading-tight">
                        🔒 Updating will link Patient Hub to this number and immediately delink/block the old number.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200">{patient.phone}</p>
                    <button
                      onClick={() => {
                        const cleanPhone = getCleanWhatsAppNumber(patient.phone);
                        const waUrl = `https://wa.me/${cleanPhone}`;
                        window.open(waUrl, "_blank");
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-brand-green bg-brand-sand/50 dark:bg-brand-green/20 px-2.5 py-1 rounded-lg hover:bg-brand-sand transition-colors cursor-pointer"
                      title="Chat on WhatsApp"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Email Address</p>
                  {!patient.email && (
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md">
                      Missing
                    </span>
                  )}
                </div>

                {isEditingEmail ? (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="email"
                        placeholder="patient@gmail.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-brand-green text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveEmail}
                        disabled={savingEmail || !emailInput.trim()}
                        className="px-3 py-1.5 rounded-xl bg-brand-green text-white text-[10px] font-black cursor-pointer hover:bg-brand-green-hover disabled:opacity-50 active:scale-95 shrink-0"
                      >
                        {savingEmail ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingEmail(false);
                          setEmailError("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {emailError && (
                      <p className="text-[10px] font-bold text-red-500">{emailError}</p>
                    )}
                  </div>
                ) : patient.email ? (
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 truncate">{patient.email}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput(patient.email);
                        setIsEditingEmail(true);
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-brand-green cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400 italic font-semibold">Not registered yet</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput("");
                        setIsEditingEmail(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-brand-green bg-brand-green/10 hover:bg-brand-green hover:text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Email</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Residential Address / Locality */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Residential Address</p>
                  {!patient.address && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      Optional
                    </span>
                  )}
                </div>

                {isEditingAddress ? (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="House/Flat No, Area, City..."
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-brand-green text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAddress}
                        disabled={savingAddress}
                        className="px-3 py-1.5 rounded-xl bg-brand-green text-white text-[10px] font-black cursor-pointer hover:bg-brand-green-hover disabled:opacity-50 active:scale-95 shrink-0"
                      >
                        {savingAddress ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAddress(false);
                          setAddressError("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {addressError && (
                      <p className="text-[10px] font-bold text-red-500">{addressError}</p>
                    )}
                  </div>
                ) : patient.address ? (
                  <div className="flex items-start justify-between gap-2 mt-0.5">
                    <div className="flex items-start gap-1.5 text-xs font-bold text-brand-charcoal dark:text-slate-200 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                      <p className="break-words">{patient.address}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressInput(patient.address || "");
                        setIsEditingAddress(true);
                      }}
                      className="text-[10px] font-black text-slate-400 hover:text-brand-green cursor-pointer shrink-0 ml-1"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-400 italic font-semibold">No address added</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressInput("");
                        setIsEditingAddress(true);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-brand-green bg-brand-green/10 hover:bg-brand-green hover:text-white px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Address</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Primary Therapist</p>
                <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.therapistName || defaultTherapist}</p>
              </div>

              {/* Patient Hub Portal Status / Activation Code */}
              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Patient Hub Portal</p>
                {patient.activated ? (
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Active Profile</span>
                  </div>
                ) : patient.email && patient.activationCode ? (
                  <div className="space-y-1.5 mt-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono tracking-wider bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg">
                        {patient.activationCode}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (patient.activationCode) {
                            navigator.clipboard.writeText(patient.activationCode);
                            alert("Portal activation code copied to clipboard!");
                          }
                        }}
                        className="text-[10px] font-black text-brand-green hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Copy Code
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendPortalInvite}
                      className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer active:scale-95"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Send WhatsApp Invite</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Locked (Missing Email)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                      Add patient email above to generate Patient Hub activation code.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: Family Circle & Linked Profiles (Always Available to Staff) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-charcoal dark:text-white font-black text-xs uppercase tracking-wider select-none">
                <Users className="h-4 w-4 text-brand-green" />
                <span>Family Circle ({familyMembers.length + 1})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkFamilyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-green/10 hover:bg-brand-green text-brand-green hover:text-white dark:bg-brand-green/20 dark:hover:bg-brand-green text-[10.5px] font-black transition-all cursor-pointer shadow-2xs group"
                title="Link an existing patient to this Family Circle"
              >
                <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
                <span>Link Member</span>
              </button>
            </div>

            {patient.primaryPatientId && patient.familyHeadName && (
              <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-[11px] text-blue-800 dark:text-blue-300">
                Linked to Family Head: <strong>{patient.familyHeadName}</strong> ({patient.primaryPatientId})
              </div>
            )}

            <div className="space-y-2">
              {/* Current Patient Item */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-brand-green/5 border border-brand-green/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-green text-white font-bold text-xs flex items-center justify-center">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {patient.name} <span className="text-[10px] text-brand-green font-bold">(Viewing)</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{patient.id}</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green uppercase tracking-wide">
                  {patient.relationship || (patient.isPrimaryAccount ? "Head" : "Self")}
                </span>
              </div>

              {/* Other Linked Members */}
              {familyMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800 transition-colors group"
                >
                  <Link
                    href={`/dashboard/patients/${member.id}`}
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center group-hover:bg-brand-green group-hover:text-white transition-colors shrink-0">
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-green transition-colors leading-tight truncate">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{member.id}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {member.relationship || "Member"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnlinkMember(member)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      title={`Unlink ${member.name} from Family Circle`}
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                    <Link href={`/dashboard/patients/${member.id}`}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-green group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Empty state when 0 other members */}
              {familyMembers.length === 0 && (
                <div className="p-3 rounded-2xl bg-slate-50/60 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <p className="text-[11px] text-slate-400">
                    No other family members linked to this account yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLinkFamilyModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Link an existing patient</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Care Metrics (Brand Green Mockup layout) */}
          <div className="bg-brand-green text-white rounded-3xl p-6 shadow-md border border-brand-green/10 space-y-4">
            <div className="flex items-center gap-2 text-white font-extrabold text-xs select-none">
              <Activity className="h-4.5 w-4.5 text-white/80 animate-pulse" />
              <span>Care Metrics</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-white/10 dark:bg-slate-950/40 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black uppercase text-white/60 tracking-wider">Total Visits</p>
                <p className="text-3xl font-black text-white mt-1.5">{consultations.length}</p>
                <p className="text-[8.5px] font-bold text-white/50 mt-1 uppercase tracking-wide">All-time logs</p>
              </div>
              
              <div className="bg-white/10 dark:bg-slate-950/40 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black uppercase text-white/60 tracking-wider">Reliability</p>
                <p className="text-3xl font-black text-emerald-400 mt-1.5">{patient.attendanceRate || 92}%</p>
                <p className="text-[8.5px] font-bold text-white/50 mt-1 uppercase tracking-wide">Appt. Kept</p>
              </div>
            </div>
          </div>

          {/* Card 3: Provider Reminders (Dashed Border Mockup layout) */}
          <div className="border border-dashed border-slate-350 dark:border-slate-800 rounded-3xl p-6 bg-slate-50/50 dark:bg-slate-950/10 space-y-4">
            <div className="flex items-center gap-2 text-brand-charcoal dark:text-white font-black text-[11px] uppercase tracking-wider select-none">
              <BellRing className="h-4 w-4 text-amber-500" />
              <span>Provider Reminders</span>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-0.5">
              {(!patient.reminders || patient.reminders.length === 0) ? (
                <div className="text-[11px] font-semibold text-slate-400 italic py-2 pl-1 select-none">
                  No custom reminders configured. Add below.
                </div>
              ) : (
                patient.reminders.map((rem, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start justify-between gap-3 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-850 shadow-sm relative group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span className="leading-normal">{rem}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(idx)}
                      disabled={updatingReminders}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 rounded transition-all shrink-0 cursor-pointer"
                      title="Delete Reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add input form */}
            <form onSubmit={handleAddReminder} className="flex items-center gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
              <input
                type="text"
                placeholder="Add clinical reminder..."
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
                disabled={updatingReminders}
                required
                className="flex-grow rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-green text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={updatingReminders || !newReminder.trim()}
                className="p-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                title="Add Reminder"
              >
                {updatingReminders ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>

          {/* Card 4: Home Workout Adherence & Patient Compliance Matrix (Pure Read-Only Mirror of Patient Hub SSOT) */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider">
                <Dumbbell className="h-4 w-4 text-brand-green dark:text-teal-400" />
                <span>Home Workout Adherence</span>
              </div>
              <button
                onClick={() => setIsPrescriberOpen(true)}
                className="text-[10px] font-black text-brand-green dark:text-teal-400 hover:underline cursor-pointer"
              >
                {activePrescription ? "Adjust Plan" : "+ Prescribe"}
              </button>
            </div>

            {activePrescription && activePrescription.exercises && activePrescription.exercises.length > 0 ? (
              <div className="space-y-3.5">
                {/* Program Summary Header */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900 dark:text-white">
                      {activePrescription.durationDays || 14}-Day Care Protocol
                    </span>
                    <span className="text-[10px] font-black text-brand-green dark:text-teal-400 bg-brand-green/10 dark:bg-teal-950 px-2 py-0.5 rounded-md">
                      Day {workoutProgress?.currentDayNumber || 1} of {activePrescription.durationDays || 14}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Prescribed: {activePrescription.prescribedDateFormatted} • {activePrescription.exercises.length} Exercises
                  </p>
                </div>

                {/* Adherence Score & Streak */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Adherence
                    </span>
                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {workoutProgress?.adherencePercent || 0}%
                    </p>
                    <p className="text-[8.5px] font-bold text-emerald-600/70 dark:text-emerald-400/70">
                      {workoutProgress?.completedDaysCount || 0} of {activePrescription.durationDays || 14} Days Done
                    </p>
                  </div>

                  <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3 rounded-2xl text-center">
                    <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Active Streak
                    </span>
                    <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                      <Flame className="h-4 w-4 fill-current text-orange-500" />
                      <span>{workoutProgress?.streakDays || 0}d</span>
                    </p>
                    <p className="text-[8.5px] font-bold text-amber-600/70 dark:text-amber-400/70">
                      Consecutive Log
                    </p>
                  </div>
                </div>

                {/* Compliance Matrix with Live Day Ticks */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Patient Compliance Matrix</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{workoutProgress?.completedDaysCount || 0} Days Completed</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: Math.min(activePrescription.durationDays || 14, 28) }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const startDate = activePrescription.startDate || getLocalDateString();
                      const dayDateStr = getProgramDayDateString(startDate, idx);
                      const dayLog = workoutProgress?.dailyLogs?.[dayDateStr];
                      const isDone = dayLog?.isFullyCompleted === true || (dayLog?.completedExerciseIds && dayLog.completedExerciseIds.length > 0);
                      const isCurrent = dayNum === (workoutProgress?.currentDayNumber || 1);
                      const isPassed = dayNum < (workoutProgress?.currentDayNumber || 1);
                      const isMissed = isPassed && !isDone;

                      return (
                        <div
                          key={dayNum}
                          className={`h-7 rounded-xl flex items-center justify-center text-[10px] font-black transition-all shadow-xs ${
                            isDone
                              ? "bg-emerald-500 text-white font-black shadow-xs"
                              : isCurrent
                              ? "bg-[#f9ab55] text-[#062e36] ring-2 ring-[#f9ab55]/80 animate-pulse font-black"
                              : isMissed
                              ? "bg-rose-50 dark:bg-rose-950/30 text-rose-500 border border-rose-200 dark:border-rose-900/40"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                          title={`Day ${dayNum} (${dayDateStr}): ${
                            isDone 
                              ? `Completed (${dayLog?.completedExerciseIds?.length || 0} exercises)` 
                              : isCurrent 
                              ? "Active Today" 
                              : isMissed 
                              ? "Incomplete / Skipped" 
                              : "Scheduled"
                          }`}
                        >
                          {isDone ? "✓" : dayNum}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Prescribed List Preview */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Assigned Routine:
                  </p>
                  {activePrescription.exercises.map((ex, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold truncate max-w-[180px]">{ex.title}</span>
                      <span className="text-[10px] font-bold text-slate-400">{ex.sets}x{ex.repsOrHold}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  No active routine prescribed yet.
                </p>
                <button
                  onClick={() => setIsPrescriberOpen(true)}
                  className="mt-2 text-xs font-black text-brand-green dark:text-teal-400 hover:underline cursor-pointer"
                >
                  + Create Rehabilitation Plan
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Timelines & File Upload Form (Span 8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tab Selector Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`pb-4 text-xs font-black relative transition-all ${
                  activeTab === "timeline"
                    ? "text-brand-green border-b-2 border-brand-green"
                    : "text-slate-400 hover:text-brand-charcoal dark:hover:text-white"
                }`}
              >
                Consultations & Prescriptions ({consultations.length})
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={`pb-4 text-xs font-black relative transition-all ${
                  activeTab === "files"
                    ? "text-brand-green border-b-2 border-brand-green"
                    : "text-slate-400 hover:text-brand-charcoal dark:hover:text-white"
                }`}
              >
                Medical Scans & Reports ({files.length})
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`pb-4 text-xs font-black relative transition-all ${
                  activeTab === "invoices"
                    ? "text-brand-green border-b-2 border-brand-green"
                    : "text-slate-400 hover:text-brand-charcoal dark:hover:text-white"
                }`}
              >
                Invoices & Billing ({patientInvoices.length})
              </button>
            </div>
          </div>

          {/* TAB 1: timeline panel */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              
              {/* Form to Log a New Consultation */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-brand-green" />
                    Log Consultation & Clinical Notes
                  </h3>
                </div>

                <form onSubmit={handleLogVisit} className="space-y-4">
                  {formSuccess && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}
                  {formError && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
                      <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Top Controls Toolbar: Date Picker, Quick Presets, Template & Expand */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Date Input with [Today] and [Yesterday] quick buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 mr-1 select-none">
                        Date:
                      </label>
                      <input
                        type="date"
                        required
                        max={maxDateStr}
                        value={visitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold outline-none focus:border-brand-green text-slate-900 dark:text-white"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuickDate("today")}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-green hover:text-brand-green transition-all cursor-pointer"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickDate("yesterday")}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-green hover:text-brand-green transition-all cursor-pointer"
                        >
                          Yesterday
                        </button>
                      </div>
                    </div>

                    {/* Quick Format & Layout Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={insertSoapSkeleton}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-brand-green hover:text-brand-green transition-all cursor-pointer"
                        title="Insert SOAP Clinical Note Template"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-green" />
                        <span>+ SOAP Template</span>
                      </button>

                      <button
                        type="button"
                        onClick={insertPackageSkeleton}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer"
                        title="Insert 7-Day Package Progress Log Template"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ 7-Day Package Log</span>
                      </button>

                      {notes && (
                        <button
                          type="button"
                          onClick={() => setNotes("")}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                          title="Clear notes"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsEditorExpanded(!isEditorExpanded)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isEditorExpanded
                            ? "bg-brand-green text-white border-brand-green"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-green"
                        }`}
                        title={isEditorExpanded ? "Collapse Editor View" : "Expand Editor View"}
                      >
                        {isEditorExpanded ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>Compact</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand View</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Spacious Clinical Notes Area */}
                  <div className="space-y-1.5">
                    {/* Active Package Draft Banner */}
                    {hasDraft && (
                      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 shadow-xs mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="truncate">
                            <strong>Active Package Draft:</strong> Keep logging each session chronologically. Click <em>Log Consultation</em> when package is complete.
                            {draftMetadata?.savedAt ? ` (Saved ${new Date(draftMetadata.savedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })})` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDiscardDraft}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline shrink-0 cursor-pointer"
                          title="Discard this draft and clear text"
                        >
                          Discard Draft
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Session Details & SOAP Clinical Recovery Notes
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {notes.length > 0 ? `${notes.length} characters` : "Auto-expand supported"}
                      </span>
                    </div>
                    <textarea
                      placeholder="Type clinical session notes (Subjective complaints, Range of motion measurements, Modalities administered, and Home Exercise prescriptions) or click 'Scan Case Sheet' below."
                      rows={isEditorExpanded ? 16 : 8}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-xs sm:text-sm font-mono sm:font-sans font-medium outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 leading-relaxed shadow-inner transition-all"
                    />
                  </div>

                  {/* Drag-and-drop / File upload & AI Scanner Box */}
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col items-center justify-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                        {selectedFile ? `Attached file: ${selectedFile.name}` : "Attach physical case sheet, medical scan, or prescription"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedFile ? `File size: ${formatBytes(selectedFile.size)} • Will upload to Google Drive` : "Select an option below to transcribe handwriting or upload to Drive"}
                      </p>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold hover:bg-red-100 transition-all cursor-pointer border border-red-200 dark:border-red-900"
                        >
                          <X className="w-3 h-3" />
                          <span>Remove / Clear File</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-lg pt-1">
                      {/* Option 1: AI Case Sheet Scanner */}
                      <button
                        type="button"
                        onClick={() => {
                          setScannerType("CLINICAL_ASSESSMENT");
                          setScannerOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white shadow-md shadow-orange-500/20 px-4 py-2.5 text-xs font-black transition-all cursor-pointer active:scale-95"
                      >
                        <Sparkles className="w-4 h-4 text-amber-200" />
                        <span>Scan Case Sheet</span>
                        <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                          AI
                        </span>
                      </button>

                      {/* Option 2: Single Clubbed Button with Dropdown (Upload & Camera) */}
                      <div className="relative" ref={attachDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setShowAttachDropdown((prev) => !prev)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-black text-slate-700 dark:text-slate-350 hover:text-brand-green hover:border-brand-green/30 cursor-pointer shadow-xs transition-all hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                          <Paperclip className="w-4 h-4 text-brand-green" />
                          <span>Attach Document</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showAttachDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {showAttachDropdown && (
                          <div className="absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                            <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                              <Upload className="w-4 h-4 text-brand-green shrink-0" />
                              <span>Choose File (PDF/Scan)</span>
                              <input
                                type="file"
                                id="file-input"
                                className="hidden"
                                onChange={(e) => {
                                  handleFileChange(e);
                                  setShowAttachDropdown(false);
                                }}
                              />
                            </label>
                            <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                              <Camera className="w-4 h-4 text-brand-green shrink-0" />
                              <span>Take Photo (Camera)</span>
                              <input
                                type="file"
                                id="camera-input"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => {
                                  handleFileChange(e);
                                  setShowAttachDropdown(false);
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button & Auto-Clubbed Routine Indicator */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    {activePrescription && activePrescription.exercises && activePrescription.exercises.length > 0 ? (
                      <div className="flex items-center gap-2 select-none text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50">
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Active routine ({activePrescription.exercises.length} exercises) will be automatically included in consultation PDF</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Standard consultation note (no exercises prescribed)
                      </span>
                    )}

                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Save Draft Button */}
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft || !notes.trim()}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Save current progress as a draft without finalizing PDF"
                      >
                        {savingDraft ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                            <span>Saving Draft...</span>
                          </>
                        ) : draftSavedSuccess ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400">Draft Saved!</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4 text-amber-500" />
                            <span>Save Draft</span>
                          </>
                        )}
                      </button>

                      {/* Log Consultation Button */}
                      <button
                        type="submit"
                        disabled={submitting || (!notes.trim() && !selectedFile)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving Session...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-4 h-4" />
                            <span>Log Consultation</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Collapsible Consultation Timeline History */}
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left transition-all hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4.5 h-4.5 text-brand-green" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      Consultation History ({consultations.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <span>{isHistoryCollapsed ? "Show Timeline" : "Collapse Timeline"}</span>
                    {isHistoryCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {!isHistoryCollapsed && (
                  <div className="space-y-4 relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 ml-2 pt-2 animate-fade-in">
                    {consultations.length === 0 ? (
                      <div className="text-slate-400 text-xs font-semibold py-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
                        <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <span>No visit logs recorded for this patient yet.</span>
                      </div>
                    ) : (
                      consultations.map((consult) => {
                        const isExpanded = expandedLogIds.includes(consult.id);
                        const isLong = consult.summary && consult.summary.length > 220;

                        return (
                          <div 
                            key={consult.id} 
                            className="relative group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                          >
                            {/* Circle Dot Marker */}
                            <span className="absolute -left-[31px] top-6.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-slate-950 border-4 border-brand-green ring-2 ring-brand-green/20" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
                              <div className="flex items-center gap-2 text-xs text-brand-green font-black">
                                <Calendar className="w-4 h-4" />
                                <span>{consult.date}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  ⚡ WhatsApp & Email PDF Sent
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-850">
                                  Logged by: {consult.therapistName}
                                </span>
                              </div>
                            </div>

                            <p className={`text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed ${
                              !isExpanded && isLong ? "line-clamp-3" : ""
                            }`}>
                              {consult.summary}
                            </p>

                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewConsultationPdf(consult)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                                  title="View unified consultation PDF"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View PDF</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadConsultationPdf(consult)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green/20 dark:bg-teal-900/30 dark:text-teal-400 transition-all cursor-pointer"
                                  title="Download unified consultation PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download PDF</span>
                                </button>
                                {patient?.email && (
                                  <button
                                    type="button"
                                    onClick={() => handleEmailConsultationPdf(consult)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all cursor-pointer"
                                    title={`Email consultation report PDF to ${patient.email}`}
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    <span>Email PDF</span>
                                  </button>
                                )}
                                {patient?.phone && (
                                  <button
                                    type="button"
                                    onClick={() => handleWhatsAppConsultationPdf(consult)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer"
                                    title={`Send consultation report PDF to WhatsApp (${patient.phone})`}
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>WhatsApp PDF</span>
                                  </button>
                                )}
                              </div>

                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => toggleLogExpand(consult.id)}
                                  className="text-[11px] font-bold text-brand-green hover:underline cursor-pointer border-0 bg-transparent flex items-center gap-1 ml-auto"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Show Less</span>
                                      <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Read Full Note</span>
                                      <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: files list panel */}
          {activeTab === "files" && (
            <div className="space-y-4">
              {/* Scan Doctor Referral & Dedicated Photo / Scan Upload Toolbar */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Clinical Scans, X-Rays & Medical Files
                    </h4>
                    <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Doctor Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Upload medical scans, MRI/X-Ray photos, or scan external doctor referral slips. Files saved here are kept securely for clinical reference and hidden from the patient hub.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                  {/* Hidden file input supporting camera capture & gallery selection */}
                  <input
                    ref={doctorScanFileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleUploadDoctorScan}
                  />

                  {/* Dedicated Upload / Take Photo Button */}
                  <button
                    type="button"
                    disabled={uploadingDoctorScan}
                    onClick={() => doctorScanFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2.5 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
                    title="Upload or snap medical scan/photo with device camera"
                  >
                    {uploadingDoctorScan ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{uploadingDoctorScan ? "Uploading..." : "Upload / Take Photo"}</span>
                  </button>

                  {/* Scan Prescription OCR Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setScannerType("DOCTOR_PRESCRIPTION");
                      setScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white px-4 py-2.5 text-xs font-black transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer shrink-0"
                    title="Extract referral with Gemini OCR"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Scan with OCR</span>
                    <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
                      AI
                    </span>
                  </button>
                </div>
              </div>

              {formSuccess && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-2xl flex items-center justify-between gap-2 animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormSuccess("")}
                    className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-bold rounded-2xl flex items-center justify-between gap-2 animate-shake shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{formError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormError("")}
                    className="text-red-600 hover:text-red-800 p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {files.length === 0 ? (
                <div className="text-slate-400 text-xs font-semibold py-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
                  <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span>No medical scans or diagnostic reports uploaded for this patient.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map((file) => {
                    const fObj = file as any;
                    const fId = file.googleDriveFileId || fObj.driveFileId;
                    const viewUrl = file.webViewLink || fObj.driveViewLink || (fId ? `https://drive.google.com/file/d/${fId}/view` : "");
                    const downloadUrl = file.downloadLink || fObj.downloadLink || viewUrl;
                    const isDocOnly = file.isDoctorOnly === true || fObj.category === "DOCTOR_REFERENCE";

                    return (
                      <div 
                        key={file.id || fId || file.fileName} 
                        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4 hover:scale-[1.01] transition-transform duration-200"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isDocOnly
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                              : "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                          }`}>
                            {isDocOnly ? (
                              <Camera className="w-5 h-5" />
                            ) : (
                              <FileText className="w-5 h-5" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/80 dark:border-teal-800 dark:text-teal-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                                {file.category || "SCAN/REPORT"}
                              </span>
                              {isDocOnly && (
                                <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>Doctor Reference</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-black text-brand-charcoal dark:text-white truncate mt-1">
                              {file.fileName}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 truncate">
                              Uploaded {file.dateUploaded || "Recorded"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {viewUrl && (
                            <a
                              href={viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-brand-green hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
                              title="View Document"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </a>
                          )}

                          {downloadUrl && (
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-brand-green hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
                              title="Download File"
                            >
                              <Download className="w-4.5 h-4.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Invoices & Billing */}
          {activeTab === "invoices" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Patient Invoices & Receipts ({patientInvoices.length})
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Official tax invoices and payment receipts generated for {patient.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsPatientInvoiceModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Invoice</span>
                </button>
              </div>

              {patientInvoices.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <Receipt className="h-10 w-10 text-brand-green mx-auto" />
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white">No Invoices Issued Yet</h4>
                    <p className="text-xs font-bold text-slate-400 max-w-md mx-auto mt-1">
                      Generate an itemized treatment invoice for {patient.name}. It will automatically sync to their Patient Hub portal and Google Drive.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPatientInvoiceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer hover:bg-brand-green-hover transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Generate First Invoice</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientInvoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    const isVoided = inv.status === "voided" || inv.status === "cancelled";

                    return (
                      <div
                        key={inv.id}
                        className={`p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-white dark:hover:bg-slate-850 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isVoided ? "opacity-60 bg-rose-50/10" : ""
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {inv.invoiceNumber}
                            </span>
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                Paid
                              </span>
                            ) : isVoided ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 text-[10px] font-black uppercase" title={inv.voidReason || "Voided"}>
                                <Ban className="w-2.5 h-2.5" />
                                Voided
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-[10px] font-black uppercase">
                                <Clock className="w-2.5 h-2.5" />
                                Pending
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              {inv.serviceDate} • {inv.paymentMethod || "UPI"}
                            </span>
                            {isVoided ? (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-rose-600 dark:text-rose-400">
                                🔒 Voided & Audited
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                                ⚡ Bill Synced
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {inv.items?.map((it) => it.description).filter(Boolean).join(", ") || "Physiotherapy Treatment"}
                          </p>

                          <div className="text-[11px] font-bold text-slate-400">
                            Therapist: <span className="text-slate-600 dark:text-slate-200">{inv.therapistName || "Dr. Kinnera"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Total Amount
                            </span>
                            <span className={`text-sm font-black ${isVoided ? "line-through text-slate-400" : "text-brand-green dark:text-emerald-400"}`}>
                              ₹{(inv.totalAmount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* 1. Cancel / Void Invoice */}
                            {!isVoided && (
                              <button
                                type="button"
                                onClick={() => {
                                  setVoidingInvoice(inv);
                                  setVoidReason("");
                                }}
                                className="p-2 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer shadow-2xs group relative"
                                title="Cancel / Void Bill"
                              >
                                <Ban className="h-4 w-4" />
                                <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                  Cancel / Void bill with audit reason
                                </span>
                              </button>
                            )}

                            {/* 2. WhatsApp Button with PDF */}
                            {(inv.patientPhone || patient.phone) && !isVoided && (
                              <button
                                type="button"
                                disabled={whatsAppingInvoiceId === inv.id}
                                onClick={() => handleWhatsAppInvoice(inv)}
                                className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer shadow-2xs group relative disabled:opacity-50"
                                title="Send WhatsApp PDF invoice to patient"
                              >
                                {whatsAppingInvoiceId === inv.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                                <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-40 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center pointer-events-none">
                                  Send WhatsApp PDF invoice to patient
                                </span>
                              </button>
                            )}

                            {/* 2b. Email PDF Button */}
                            {(inv.patientEmail || patient.email) && !isVoided && (
                              <button
                                type="button"
                                disabled={emailingInvoiceId === inv.id}
                                onClick={() => handleEmailInvoicePdf(inv)}
                                className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 transition-colors cursor-pointer shadow-2xs group relative disabled:opacity-50"
                                title="Email PDF invoice to patient"
                              >
                                {emailingInvoiceId === inv.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-40 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center pointer-events-none">
                                  Email PDF invoice to patient
                                </span>
                              </button>
                            )}

                            {/* 3. Download PDF */}
                            <button
                              type="button"
                              onClick={() => handleDownloadInvoicePdf(inv)}
                              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs group relative"
                              title="Download PDF"
                            >
                              <Download className="h-4 w-4" />
                              <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                Download official PDF tax receipt
                              </span>
                            </button>

                            {/* 4. View PDF Preview */}
                            <button
                              type="button"
                              onClick={() => handleViewInvoicePdf(inv)}
                              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-2xs group relative"
                              title="View Invoice PDF"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-32 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                View full invoice PDF
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Exercise Prescriber Modal */}
      {patient && (
        <ExercisePrescriberModal
          isOpen={isPrescriberOpen}
          onClose={() => setIsPrescriberOpen(false)}
          patientId={patient.id}
          patientName={patient.name}
          pid={patient.id}
          lastSeen={patient.lastVisit || "Today"}
          googleDriveFolderId={patient.googleDriveFolderId}
          therapistName={patient.therapistName || defaultTherapist || "Dr. Kinnera"}
          diagnosis={patient.treatmentPlan}
          consultationSummary={consultations[0]?.summary}
          providerAlerts={patient.reminders}
          onPrescriptionSaved={() => {
            loadPatientDetails();
          }}
        />
      )}

      {/* Gemini AI Document Scanner Modal */}
      {patient && (
        <DocumentScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          documentType={scannerType}
          patientName={patient.name}
          onApply={handleApplyScanResult}
        />
      )}

      {/* Create Invoice Modal for Patient Profile */}
      {isPatientInvoiceModalOpen && patient && (
        <CreateEditInvoiceModal
          isOpen={isPatientInvoiceModalOpen}
          initialInvoice={null}
          initialPatient={patient as any}
          patients={[patient as any]}
          onClose={() => {
            setIsPatientInvoiceModalOpen(false);
          }}
          onSuccess={(msg) => {
            setIsPatientInvoiceModalOpen(false);
            setFormSuccess(msg);
            setTimeout(() => setFormSuccess(""), 4000);
          }}
          buildInvoicePdf={buildInvoicePdf}
        />
      )}

      {/* Void Confirmation Modal */}
      {mounted && voidingInvoice && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl shrink-0">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Cancel / Void Invoice</h3>
                <p className="text-xs text-slate-500 font-semibold">{voidingInvoice.invoiceNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Voiding this bill preserves your accounting audit trail while zeroing out revenue stats for <strong>{voidingInvoice.patientName || patient?.name}</strong> (₹{(voidingInvoice.totalAmount || 0).toLocaleString("en-IN")}).
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reason for Cancellation</label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Wrong treatment billed, duplicate entry..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            {/* Internal Audit Record Indicator */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
              <span>🔒 Internal accounting audit: Zeros out clinic revenue stats & stamps invoice as VOID.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidingInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmVoidInvoice}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Granular Patient Deletion & Data Purge Modal */}
      {isDeleteModalOpen && patient && (
        <PatientDeleteModal
          isOpen={isDeleteModalOpen}
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Link Family Member Modal */}
      {isLinkFamilyModalOpen && patient && (
        <LinkFamilyMemberModal
          isOpen={isLinkFamilyModalOpen}
          onClose={() => setIsLinkFamilyModalOpen(false)}
          currentPatient={patient as any}
          currentFamilyMembers={familyMembers}
          onLinked={handleFamilyLinked}
        />
      )}

      {/* Visual Confirmation Popup Modal for Invoice WhatsApp & Email Dispatch */}
      {mounted && invoiceDispatchModal?.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setInvoiceDispatchModal(null)}
        >
          <div 
            className="w-[92vw] sm:w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with status badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  invoiceDispatchModal.status === "success"
                    ? invoiceDispatchModal.channel === "whatsapp"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                }`}>
                  {invoiceDispatchModal.status === "success" ? (
                    invoiceDispatchModal.channel === "whatsapp" ? (
                      <MessageSquare className="h-6 w-6" />
                    ) : (
                      <Mail className="h-6 w-6" />
                    )
                  ) : (
                    <AlertCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {invoiceDispatchModal.status === "success"
                      ? invoiceDispatchModal.channel === "whatsapp"
                        ? "WhatsApp Invoice Delivered!"
                        : "Invoice Emailed Successfully!"
                      : "Dispatch Notification"}
                  </h3>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                    invoiceDispatchModal.status === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}>
                    {invoiceDispatchModal.status === "success"
                      ? invoiceDispatchModal.channel === "whatsapp"
                        ? "Delivered via WhatsApp with PDF"
                        : "Delivered via Email with PDF"
                      : "Action Required"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceDispatchModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Invoice & Recipient Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Invoice Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #{invoiceDispatchModal.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Patient Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {invoiceDispatchModal.patientName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">
                  {invoiceDispatchModal.channel === "whatsapp" ? "WhatsApp Number" : "Recipient Email"}
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {invoiceDispatchModal.recipient}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-semibold">Billed Amount</span>
                <span className="text-sm font-black text-brand-green dark:text-emerald-400">
                  ₹{invoiceDispatchModal.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Context Message */}
            {invoiceDispatchModal.message && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                {invoiceDispatchModal.message}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {invoiceDispatchModal.status === "error" && invoiceDispatchModal.whatsappUrl ? (
                <>
                  <a
                    href={invoiceDispatchModal.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setInvoiceDispatchModal(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Open WhatsApp Web</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setInvoiceDispatchModal(null)}
                    className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setInvoiceDispatchModal(null)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-charcoal hover:bg-slate-800 dark:bg-brand-green dark:hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Action Toast Notification */}
      {formSuccess && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="bg-brand-charcoal/95 dark:bg-slate-900/95 text-white backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 max-w-md pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold leading-snug">{formSuccess}</p>
          </div>
        </div>
      )}

    </div>
  );
}
