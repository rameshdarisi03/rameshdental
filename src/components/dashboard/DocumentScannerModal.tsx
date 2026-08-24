"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Upload, 
  Camera, 
  Loader2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Stethoscope, 
  Activity, 
  ShieldAlert, 
  Plus, 
  Check,
  RefreshCw,
  Eye
} from "lucide-react";

export interface ClinicalAssessmentResult {
  documentType: "CLINICAL_ASSESSMENT";
  patientName?: string;
  visitDate?: string;
  therapistName?: string;
  subjectiveComplaints?: string;
  vasPainScore?: number;
  objectiveFindings?: {
    lumbarFlexion?: string;
    specialTests?: string;
    postureGait?: string;
  };
  modalitiesAdministered?: string;
  exercisePrescriptions?: string;
  providerRemindersAndAlerts?: string[];
  rawVerbatimTranscript?: string;
  formattedSoapNote?: string;
  rawClinicalTranscription?: string;
  confidenceScore?: number;
}

export interface DoctorPrescriptionResult {
  documentType: "DOCTOR_PRESCRIPTION";
  doctorName?: string;
  hospitalOrClinic?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  prescribedTherapies?: string;
  precautionsAndRestrictions?: string;
  medicationsList?: string;
  providerRemindersAndAlerts?: string[];
  rawVerbatimTranscript?: string;
  summaryForRecord?: string;
  rawClinicalTranscription?: string;
  confidenceScore?: number;
}

export type ScanResult = ClinicalAssessmentResult | DoctorPrescriptionResult;

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: "CLINICAL_ASSESSMENT" | "DOCTOR_PRESCRIPTION";
  patientName?: string;
  onApply: (data: ScanResult, file?: File, previewUrl?: string) => Promise<void> | void;
}

export default function DocumentScannerModal({
  isOpen,
  onClose,
  documentType,
  patientName,
  onApply,
}: DocumentScannerModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ScanResult | null>(null);
  
  // Editable fields before applying
  const [editedVerbatimText, setEditedVerbatimText] = useState("");
  const [editedSoapNote, setEditedSoapNote] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isPrescriptionMode = documentType === "DOCTOR_PRESCRIPTION";

  const handleCloseAndReset = () => {
    if (isApplying) return;
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setError(null);
    setIsScanning(false);
    setIsApplying(false);
    setEditedVerbatimText("");
    setEditedSoapNote("");
    setEditedSummary("");
    setSelectedAlerts([]);
    onClose();
  };

  const compressImageForOCR = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.75);
            resolve(compressed);
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setExtractedData(null);
    setSelectedFile(file);

    try {
      const compressedDataUrl = await compressImageForOCR(file);
      setPreviewUrl(compressedDataUrl);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile || !previewUrl) {
      setError("Please select or capture a document first.");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: previewUrl,
          documentType: documentType,
          mimeType: selectedFile.type || "image/jpeg",
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Scanning failed with status ${response.status}`);
      }

      const result: ScanResult = await response.json();
      setExtractedData(result);

      const verbatimText = result.rawVerbatimTranscript || (result as any).rawClinicalTranscription || "";
      setEditedVerbatimText(verbatimText);

      let soapText = result.formattedSoapNote || "";
      if (!soapText || soapText.trim() === "") {
        if (isPrescriptionMode) {
          const rx = result as DoctorPrescriptionResult;
          soapText = `Subjective: Patient referred by ${rx.doctorName || "Doctor"} (${rx.hospitalOrClinic || "Hospital"}) for ${rx.diagnosis || "clinical rehabilitation"}.\n\nObjective: Medical prescription review completed. Medications: ${rx.medicationsList || "None recorded"}.\n\nAssessment: ${rx.diagnosis || "Physical therapy referral"}.\n\nPlan: Prescribed therapies: ${rx.prescribedTherapies || "Rehabilitation protocol"}. Precautions: ${rx.precautionsAndRestrictions || "Standard precautions"}.`;
        } else {
          const clin = result as ClinicalAssessmentResult;
          soapText = `Subjective: ${clin.subjectiveComplaints || "Clinical findings recorded"}\n\nObjective: ${clin.objectiveFindings?.specialTests || clin.objectiveFindings?.postureGait || "Physical examination completed"}\n\nAssessment: Physiotherapy Clinical Evaluation\n\nPlan: Modalities: ${clin.modalitiesAdministered || "Physical therapy modalities"}. Exercises: ${clin.exercisePrescriptions || "Active exercise protocol"}.`;
        }
      }
      setEditedSoapNote(soapText);
      setEditedSummary(soapText);

      if (result.providerRemindersAndAlerts && Array.isArray(result.providerRemindersAndAlerts)) {
        setSelectedAlerts(result.providerRemindersAndAlerts);
      }
    } catch (err: any) {
      console.error("Scanning error:", err);
      setError(err.message || "Failed to analyze document. Verify Gemini API key in settings.");
    } finally {
      setIsScanning(false);
    }
  };

  const toggleAlert = (alertText: string) => {
    setSelectedAlerts((prev) =>
      prev.includes(alertText) ? prev.filter((a) => a !== alertText) : [...prev, alertText]
    );
  };

  const handleConfirmApply = async () => {
    if (!extractedData || isApplying) return;

    setIsApplying(true);
    setError(null);

    const combinedSoap = editedVerbatimText
      ? `=== EXACT DOCTOR'S WRITING (VERBATIM) ===\n${editedVerbatimText}\n\n=== STRUCTURED SOAP CLINICAL NOTE ===\n${editedSoapNote}`
      : editedSoapNote;

    const finalData: ScanResult = {
      ...extractedData,
      documentType: documentType,
      providerRemindersAndAlerts: selectedAlerts,
      formattedSoapNote: combinedSoap,
      summaryForRecord: editedSoapNote || editedVerbatimText || "Clinical referral record",
    };

    try {
      await onApply(finalData, selectedFile || undefined, previewUrl || undefined);
      handleCloseAndReset();
    } catch (applyErr: any) {
      console.error("Error applying scanned document:", applyErr);
      setError(applyErr?.message || "Failed to save document. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200/80 dark:border-slate-800 rounded-none sm:rounded-3xl w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-green/15 dark:bg-teal-500/20 text-brand-green dark:text-teal-400 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {isPrescriptionMode ? "Scan Doctor Referral / Prescription" : "Scan Handwritten Clinical Case Sheet"}
                </h3>
                <span className="bg-brand-green/10 text-brand-green dark:text-teal-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0">
                  Gemini AI Vision
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
                {isPrescriptionMode
                  ? `Patient: ${patientName || "Selected Patient"} • Transcribes diagnosis, referring doctor, restrictions, and pre-existing alerts.`
                  : `Patient: ${patientName || "Selected Patient"} • Transcribes VAS pain scores, ROM, tests, and standardizes SOAP notes.`}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseAndReset}
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 overscroll-contain">
          
          {/* Upload & Capture Options (if no scan completed yet) */}
          {!extractedData && (
            <div className="space-y-4">
              {!previewUrl ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* File Upload Option */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-green dark:hover:border-teal-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-brand-green/5 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-brand-green group-hover:scale-110 transition-all mb-3">
                      <Upload className="h-6 w-6" />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      Upload Document Photo
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      PNG, JPG, or WEBP image
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                      }}
                    />
                  </div>

                  {/* Direct Camera Snap Option */}
                  <div
                    onClick={() => cameraInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-brand-green dark:hover:border-teal-400 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-brand-green/5 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-brand-green group-hover:scale-110 transition-all mb-3">
                      <Camera className="h-6 w-6" />
                    </div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                      Take Photo with Camera
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Snap paper sheet directly
                    </p>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/5 flex flex-col items-center p-4">
                  <div className="relative max-h-72 w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/5">
                    <img
                      src={previewUrl}
                      alt="Document Preview"
                      className="max-h-72 object-contain rounded-xl"
                    />
                    {isScanning && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-3">
                        <div className="relative">
                          <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                          <Sparkles className="h-4 w-4 text-amber-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black tracking-tight">Gemini AI Analyzing Handwriting...</p>
                          <p className="text-[11px] text-slate-300">Extracting diagnosis, pain metrics & clinical alerts</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between w-full mt-4">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setError(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retake / Choose Another
                    </button>

                    <button
                      onClick={handleScan}
                      disabled={isScanning}
                      className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing Document...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 text-amber-300" />
                          Extract Medical Data
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Extracted Structured Review Card */}
          {extractedData && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-black">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Handwriting Successfully Recognized & Structured</span>
                </div>
                {extractedData.confidenceScore && (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full">
                    {Math.round(extractedData.confidenceScore * 100)}% Confidence
                  </span>
                )}
              </div>

              {/* Unified Structured Overview */}
              <div className="space-y-4">
                {/* 1. Header Details (Doctor/Hospital or Diagnosis) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(extractedData.doctorName || extractedData.hospitalOrClinic) ? (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-750">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Referring Doctor & Hospital
                      </span>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {extractedData.doctorName || "External Physician"}
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                        {extractedData.hospitalOrClinic || "Medical Center"}
                      </p>
                    </div>
                  ) : extractedData.vasPainScore ? (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-750">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Pain Score (VAS)
                      </span>
                      <p className="text-sm font-black text-red-500">
                        {extractedData.vasPainScore} / 10
                      </p>
                    </div>
                  ) : null}

                  {(extractedData.diagnosis || extractedData.subjectiveComplaints) && (
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-750">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Clinical Diagnosis / Condition
                      </span>
                      <p className="text-xs font-black text-brand-green dark:text-teal-400">
                        {extractedData.diagnosis || extractedData.subjectiveComplaints}
                      </p>
                      {(extractedData.prescriptionDate || extractedData.visitDate) && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Date: {extractedData.prescriptionDate || extractedData.visitDate}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Exact Doctor Writing (Verbatim) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span>1. Exact Doctor Writing (Verbatim Transcription)</span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-bold">
                        As Written on Paper
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={editedVerbatimText}
                    onChange={(e) => setEditedVerbatimText(e.target.value)}
                    rows={4}
                    placeholder="Exact word-for-word text from the physical document..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-brand-green font-mono text-[11px] leading-relaxed"
                  />
                </div>

                {/* 3. Structured SOAP Note */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span>2. Structured SOAP Clinical Session Note</span>
                      <span className="bg-brand-green/10 text-brand-green dark:text-teal-300 text-[10px] px-2 py-0.5 rounded-md font-bold">
                        EMR / SOAP Format
                      </span>
                    </label>
                  </div>
                  <textarea
                    value={editedSoapNote}
                    onChange={(e) => setEditedSoapNote(e.target.value)}
                    rows={5}
                    placeholder="Subjective, Objective, Assessment, Plan notes..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-brand-green font-medium leading-relaxed"
                  />
                </div>
              </div>

              {/* Provider Reminders & Pre-existing Conditions Selector */}
              {extractedData.providerRemindersAndAlerts && extractedData.providerRemindersAndAlerts.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                      Auto-Detected Pre-Existing Conditions & Alerts:
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Select the alerts you want to append to the patient's Provider Reminders:
                  </p>

                  <div className="space-y-2 pt-1">
                    {extractedData.providerRemindersAndAlerts.map((alert, idx) => {
                      const isSelected = selectedAlerts.includes(alert);
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleAlert(alert)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? "bg-amber-100/80 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 font-bold text-amber-950 dark:text-amber-200"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 opacity-60"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 dark:border-slate-750"
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <span>{alert}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            disabled={isApplying}
            onClick={handleCloseAndReset}
            className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>

          {extractedData && (
            <button
              type="button"
              disabled={isApplying}
              onClick={handleConfirmApply}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isPrescriptionMode ? "Generating Clinical PDF & Archiving..." : "Applying SOAP Notes to Visit..."}
                  </span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>
                    {isPrescriptionMode ? "Save as Clinical PDF & Upload to Records" : "Apply SOAP Notes to Visit"}
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
