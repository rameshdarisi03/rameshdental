"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
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
  RotateCcw
} from "lucide-react";
import ExercisePrescriberModal from "@/components/dashboard/ExercisePrescriberModal";
import DocumentScannerModal, { ScanResult } from "@/components/dashboard/DocumentScannerModal";
import { 
  getPatientById, 
  getConsultations, 
  getMedicalRecordFiles, 
  addConsultation, 
  addMedicalRecordFile, 
  updatePatient 
} from "@/lib/patientsDb";
import { getClinicConfig } from "@/lib/db";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  treatmentPlan: string;
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string;
  therapistName?: string;
  lastVisit?: string;
  upcoming?: string;
  reminders?: string[];
  attendanceRate?: number;
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

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"timeline" | "files">("timeline");
  const [isPrescriberOpen, setIsPrescriberOpen] = useState(false);

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

  const [enrolledTherapists, setEnrolledTherapists] = useState<string[]>([]);
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");

  // Editor ergonomics & Collapsible History states
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

  // Reminders states
  const [newReminder, setNewReminder] = useState("");
  const [updatingReminders, setUpdatingReminders] = useState(false);

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

  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  useEffect(() => {
    if (id) {
      loadPatientDetails();
    }
    async function loadTherapists() {
      try {
        const config = await getClinicConfig();
        if (config && config.therapists && config.therapists.length > 0) {
          setEnrolledTherapists(config.therapists);
        } else {
          setEnrolledTherapists(["Dr. Sarah Jenkins", "Dr. Rohan Das"]);
        }
      } catch (err) {
        console.error("Error loading therapists list in patient details:", err);
        setEnrolledTherapists(["Dr. Sarah Jenkins", "Dr. Rohan Das"]);
      }
    }
    loadTherapists();
  }, [id]);

  const defaultTherapist = enrolledTherapists[0] || "Dr. Sarah Jenkins";

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

      // Fetch timelines
      const [cList, fList] = await Promise.all([
        getConsultations(id),
        getMedicalRecordFiles(id)
      ]);

      setConsultations(cList as Consultation[]);
      setFiles(fList as MedicalFile[]);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
  const handleApplyScanResult = async (data: ScanResult, scannedFile?: File) => {
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

    // 2. Handle Case Sheet Mode (Step 1)
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

    // 3. Handle Doctor Prescription / Referral Mode (Step 2)
    if (data.documentType === "DOCTOR_PRESCRIPTION") {
      const summaryText = data.summaryForRecord || 
        `[Doctor Referral: ${data.doctorName || "Orthopedic Doctor"} • ${data.hospitalOrClinic || "Hospital"}]\nDiagnosis: ${data.diagnosis || "N/A"}\nPrescribed: ${data.prescribedTherapies || "Physiotherapy"}\nPrecautions: ${data.precautionsAndRestrictions || "None noted"}`;
      setNotes(summaryText);
      if (scannedFile) {
        setSelectedFile(scannedFile);
      }
      setActiveTab("timeline");
      setFormSuccess("✨ Doctor prescription scanned and analyzed! Review details and click 'Log Visit & Upload Records' to store in Google Drive.");
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

      // Reload
      loadPatientDetails();
    } catch (err: any) {
      console.error("Error logging session:", err);
      setFormError(err.message || "Failed to record consultation details.");
    } finally {
      setSubmitting(false);
    }
  };

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-[#1b3d2f] text-white flex items-center justify-center font-black text-xl uppercase ring-4 ring-emerald-500/10 shrink-0">
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
            <p className="text-xs text-slate-400 font-bold mt-1">
              Patient ID: <span className="text-brand-charcoal dark:text-white uppercase font-black">{patient.id}</span>
            </p>
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
            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 select-none">
              No Drive Folder Associated
            </span>
          )}
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
              <div>
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Treatment Plan</p>
                <p className="text-xs font-bold text-brand-green mt-1 bg-brand-bg dark:bg-brand-green/10 border border-brand-green/10 px-2.5 py-1 rounded-xl inline-block lowercase">
                  {patient.treatmentPlan}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-850 pt-3">
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Gender</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.gender || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">DOB</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.dob || "N/A"}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Contact Number</p>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200">{patient.phone}</p>
                  <button
                    onClick={() => {
                      let cleanPhone = patient.phone.replace(/\D/g, "");
                      if (cleanPhone.startsWith("0")) {
                        cleanPhone = cleanPhone.replace(/^0+/, "");
                      }
                      if (cleanPhone.length === 10) {
                        cleanPhone = "91" + cleanPhone;
                      }
                      if (!cleanPhone || cleanPhone.length < 10) {
                        cleanPhone = "919206651295";
                      }
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
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3">
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Email Address</p>
                <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5 truncate">{patient.email}</p>
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
                ) : (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono tracking-wider bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-lg">
                      {patient.activationCode || "N/A"}
                    </p>
                    <button
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
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Care Metrics (Forest Green Mockup layout) */}
          <div className="bg-[#1b3d2f] text-white rounded-3xl p-6 shadow-md border border-brand-green/10 space-y-4">
            <div className="flex items-center gap-2 text-white font-extrabold text-xs select-none">
              <Activity className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
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
                Consultation Timeline
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={`pb-4 text-xs font-black relative transition-all ${
                  activeTab === "files"
                    ? "text-brand-green border-b-2 border-brand-green"
                    : "text-slate-400 hover:text-brand-charcoal dark:hover:text-white"
                }`}
              >
                Medical Scans & Files ({files.length})
              </button>
              <button
                onClick={() => setActiveTab("invoices")}
                className={`pb-4 text-xs font-black relative transition-all ${
                  activeTab === "invoices"
                    ? "text-brand-green border-b-2 border-brand-green"
                    : "text-slate-400 hover:text-brand-charcoal dark:hover:text-white"
                }`}
              >
                Invoices & Billing
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

                  <button
                    type="button"
                    onClick={() => {
                      setScannerType("CLINICAL_ASSESSMENT");
                      setScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/10 dark:bg-teal-500/20 hover:bg-brand-green hover:text-white text-brand-green dark:text-teal-300 px-4 py-2 text-xs font-black transition-all cursor-pointer border border-brand-green/20 hover:border-brand-green shadow-xs active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Scan Handwritten Case Sheet</span>
                  </button>
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
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Session Details & SOAP Clinical Recovery Notes
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {notes.length > 0 ? `${notes.length} characters` : "Auto-expand supported"}
                      </span>
                    </div>
                    <textarea
                      placeholder="Type clinical session notes (Subjective complaints, Range of motion measurements, Modalities administered, and Home Exercise prescriptions) or click 'Scan Handwritten Case Sheet' above."
                      rows={isEditorExpanded ? 16 : 8}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-xs sm:text-sm font-mono sm:font-sans font-medium outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 leading-relaxed shadow-inner transition-all"
                    />
                  </div>

                  {/* Drag-and-drop / File upload Selector */}
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/30 dark:bg-slate-950/20 flex flex-col items-center justify-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-all">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                        {selectedFile ? `Attached file: ${selectedFile.name}` : "Attach medical scan, paper case sheet, or prescription"}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedFile ? `File size: ${formatBytes(selectedFile.size)} • Will upload to Google Drive` : "Select or snap file below to archive in Google Drive"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
                      <label className="relative flex-grow flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-350 hover:text-brand-green hover:border-brand-green/30 cursor-pointer shadow-sm transition-all hover:bg-slate-50">
                        <Upload className="w-4 h-4 text-brand-green" />
                        Choose File
                        <input
                          type="file"
                          id="file-input"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>

                      <label className="relative flex-grow flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-350 hover:text-brand-green hover:border-brand-green/30 cursor-pointer shadow-sm transition-all hover:bg-slate-50">
                        <Camera className="w-4 h-4 text-brand-green" />
                        Take Photo
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          id="camera-input"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Action Trigger Buttons */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving Consultation & Syncing Drive...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Save Consultation & Upload Records</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Collapsible Consultation History Section */}
              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                  className="flex items-center justify-between w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-brand-green transition-all select-none cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-black text-xs">
                      {consultations.length}
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Consultation History Timeline ({consultations.length} Visits Logged)
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
                      <div className="text-slate-400 text-xs font-semibold py-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
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
                            {/* Circle Dot Marker (connected to timeline) */}
                            <span className="absolute -left-[31px] top-6.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-slate-950 border-4 border-[#1b3d2f] ring-2 ring-emerald-500/20" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
                              <div className="flex items-center gap-2 text-xs text-brand-green font-black">
                                <Calendar className="w-4 h-4" />
                                <span>{consult.date}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-full border border-slate-100 dark:border-slate-850">
                                Logged by: {consult.therapistName}
                              </span>
                            </div>

                            <p className={`text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed ${
                              !isExpanded && isLong ? "line-clamp-3" : ""
                            }`}>
                              {consult.summary}
                            </p>

                            {isLong && (
                              <button
                                type="button"
                                onClick={() => toggleLogExpand(consult.id)}
                                className="mt-2.5 text-[11px] font-bold text-brand-green hover:underline cursor-pointer border-0 bg-transparent flex items-center gap-1"
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
              {/* Scan Doctor Referral / Prescription Action Strip */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-emerald-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-teal-400" />
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Scan Doctor Prescription / Referral Slip
                    </h4>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-teal-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Gemini OCR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Snap a photo of an external doctor's paper referral to extract diagnosis, precautions, and auto-update provider alerts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setScannerType("DOCTOR_PRESCRIPTION");
                    setScannerOpen(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-green dark:hover:bg-brand-green dark:hover:text-white px-5 py-2.5 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-500" />
                  <span>Scan Prescription</span>
                </button>
              </div>

              {files.length === 0 ? (
                <div className="text-slate-400 text-xs font-semibold py-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
                  <Folder className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span>No medical records uploaded for this patient.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map((file) => (
                    <div 
                      key={file.id} 
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4 hover:scale-[1.01] transition-transform duration-200"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-2xl bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-black text-brand-charcoal dark:text-white truncate">
                            {file.fileName}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-1">
                            {file.dateUploaded} • {formatBytes(file.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all"
                            title="View File"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </a>
                        )}
                        {file.downloadLink && (
                          <a
                            href={file.downloadLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-brand-green hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl transition-all"
                            title="Download File"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Invoices & Billing */}
          {activeTab === "invoices" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Patient Billing History
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    Generate & manage billing statements for {patient.name}
                  </p>
                </div>
                <Link
                  href={`/dashboard/invoices`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Create Invoice
                </Link>
              </div>

              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Receipt className="h-10 w-10 text-[#2d5a4c] mx-auto mb-3" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">Clinical Billing Hub Active</h4>
                <p className="text-xs font-bold text-slate-400 max-w-md mx-auto mt-1 mb-4">
                  All invoices generated for {patient.name} automatically sync to their Patient Hub portal in real time.
                </p>
                <Link
                  href="/dashboard/invoices"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-[#2d5a4c] dark:text-emerald-400 hover:underline"
                >
                  Open Billing Center & Issue Statement →
                </Link>
              </div>
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

    </div>
  );
}
