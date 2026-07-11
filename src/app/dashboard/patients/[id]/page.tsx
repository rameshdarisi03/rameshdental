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
  ExternalLink,
  ChevronRight,
  Camera
} from "lucide-react";
import { 
  getPatientById, 
  getConsultations, 
  getMedicalRecordFiles, 
  addConsultation, 
  addMedicalRecordFile, 
  updatePatient 
} from "@/lib/patientsDb";

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

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [files, setFiles] = useState<MedicalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"timeline" | "files">("timeline");

  // New consultation log / upload form states
  const [notes, setNotes] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [maxDateStr, setMaxDateStr] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");

  // Default active user name (matching clinic mockup credentials)
  const defaultTherapist = "Dr. Sarah Jenkins";

  useEffect(() => {
    if (id) {
      loadPatientDetails();
    }
  }, [id]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
        await addConsultation(id, {
          date: formattedDate,
          summary: notes,
          therapistName: defaultTherapist,
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
    <div className="space-y-6 animate-page-fade">
      
      {/* Back to Directory Link */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
        <Link href="/dashboard/patients" className="hover:text-brand-green transition-colors">
          Patients
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-500">{patient.name}</span>
      </div>

      {/* Main Clinical Profile Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-3xl bg-brand-sand/80 dark:bg-brand-green/20 flex items-center justify-center text-brand-green font-black text-xl uppercase ring-4 ring-brand-sand/30 shrink-0">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">
                {patient.name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold capitalize ${
                patient.status === "active" 
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" 
                  : patient.status === "pending"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                    : "bg-slate-100 text-slate-600"
              }`}>
                {patient.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-1">
              Patient ID: <span className="text-brand-charcoal dark:text-white uppercase font-black">{patient.id}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          {patient.googleDriveFolderId ? (
            <a
              href={`https://drive.google.com/drive/folders/${patient.googleDriveFolderId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-black text-slate-600 dark:text-slate-300 hover:text-brand-green hover:border-brand-green/30 transition-all"
            >
              <Folder className="h-4.5 w-4.5" />
              View Drive Folder
            </a>
          ) : (
            <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800">
              No Drive Folder Associated
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Side Clinical details, Right Side History tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Basic Patient Clinical Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)] space-y-5">
            <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Patient Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Treatment Plan</p>
                <p className="text-xs font-bold text-brand-green mt-0.5 bg-brand-bg dark:bg-brand-green/10 border border-brand-green/10 px-2.5 py-1.5 rounded-xl inline-block">
                  {patient.treatmentPlan}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">Gender</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.gender || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase text-slate-400">DOB</p>
                  <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.dob || "N/A"}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Contact Number</p>
                <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.phone}</p>
              </div>

              <div>
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Email Address</p>
                <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5 truncate">{patient.email}</p>
              </div>

              <div>
                <p className="text-[9px] font-extrabold uppercase text-slate-400">Primary Therapist</p>
                <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{patient.therapistName || defaultTherapist}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timelines & File Upload Form (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
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
            </div>
          </div>

          {/* TAB 1: timeline panel */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              
              {/* Form to Log a New Consultation */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-brand-green" />
                  Log Consultation & Attach Files
                </h3>

                <form onSubmit={handleLogVisit} className="space-y-4">
                  {formSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {formSuccess}
                    </div>
                  )}
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-150 text-red-800 text-xs font-bold rounded-2xl flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      {formError}
                    </div>
                  )}

                  {/* Visit Date */}
                  <div className="w-48">
                    <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      required
                      max={maxDateStr}
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-brand-green text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Consultation Notes */}
                  <div>
                    <label className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">
                      Session Details / Recovery Notes
                    </label>
                    <textarea
                      placeholder="Type brief visit updates (e.g. Range of motion improved by 10 degrees. Prescribed single-leg hops.)"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-4 text-xs font-semibold outline-none focus:border-brand-green text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>

                  {/* Drag-and-drop / File upload Selector */}
                  <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col items-center justify-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <div className="flex flex-col items-center text-center">
                      <p className="text-[10px] font-black text-slate-500">
                        {selectedFile ? `Attached: ${selectedFile.name}` : "Attach medical scans, prescriptions, or files"}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-1">
                        {selectedFile ? `File size: ${formatBytes(selectedFile.size)}` : "Select an option below to add clinical records"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
                      {/* Option 1: File Browser */}
                      <label className="relative flex-grow flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:text-brand-green hover:border-brand-green/30 cursor-pointer shadow-sm transition-all">
                        <Upload className="w-4 h-4 text-brand-green" />
                        Choose File
                        <input
                          type="file"
                          id="file-input"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>

                      {/* Option 2: Camera Capture */}
                      <label className="relative flex-grow flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-[11px] font-black text-slate-600 dark:text-slate-300 hover:text-brand-green hover:border-brand-green/30 cursor-pointer shadow-sm transition-all">
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
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Syncing with Drive...
                        </>
                      ) : (
                        "Log Visit & Upload Records"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* timeline items list */}
              <div className="space-y-4 relative pl-6 border-l border-slate-200/80 dark:border-slate-800">
                {consultations.length === 0 ? (
                  <div className="text-slate-400 text-xs font-semibold py-8 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
                    <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <span>No visit logs recorded for this patient yet.</span>
                  </div>
                ) : (
                  consultations.map((consult) => (
                    <div key={consult.id} className="relative group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)]">
                      {/* Circle Dot Marker */}
                      <span className="absolute -left-8.5 top-7 h-4 w-4 rounded-full bg-brand-sand border-4 border-white dark:border-slate-950 ring-2 ring-brand-green" />
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5 text-xs text-brand-green font-black">
                          <Calendar className="w-4 h-4" />
                          <span>{consult.date}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">
                          Logged by: {consult.therapistName}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {consult.summary}
                      </p>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 2: files list panel */}
          {activeTab === "files" && (
            <div className="space-y-4">
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
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)] flex items-center justify-between gap-4 hover:scale-[1.01] transition-transform duration-200"
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

        </div>

      </div>

    </div>
  );
}
