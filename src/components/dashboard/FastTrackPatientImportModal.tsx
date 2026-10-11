"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Upload,
  UploadCloud,
  Camera,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Trash2,
  Check,
  Users,
  FileText,
  Maximize2,
  Minimize2,
  Plus,
  Filter,
  Loader2,
  Download,
  Copy,
  ChevronRight,
  Lock,
  UserCheck,
  AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import {
  parsePatientSpreadsheetText,
  FastTrackPatientRow,
  FastTrackPatientParseResult,
  SAMPLE_PATIENT_CSV,
  normalizeIndianPhoneNumber,
  formatProperCaseName
} from "@/lib/fastTrackPatientParser";
import {
  executeFastTrackPatientBatchIngest,
  BatchPatientIngestProgress,
  BatchPatientIngestResult
} from "@/lib/fastTrackPatientIngest";

interface FastTrackPatientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  enrolledTherapists?: string[];
}

export default function FastTrackPatientImportModal({
  isOpen,
  onClose,
  onSuccess,
  enrolledTherapists = ["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]
}: FastTrackPatientImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"SHEET" | "CAMERA">("SHEET");
  const [step, setStep] = useState<"INPUT" | "PROCESSING" | "REVIEW" | "SUCCESS">("INPUT");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Input states
  const [pastedText, setPastedText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Camera / Scan state
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Parsing & Processing state
  const [processingStatus, setProcessingStatus] = useState("Analyzing patient data structure...");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [editableRows, setEditableRows] = useState<FastTrackPatientRow[]>([]);
  const [filterMode, setFilterMode] = useState<"ALL" | "READY" | "ISSUES">("ALL");

  // Ingestion state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<BatchPatientIngestProgress | null>(null);
  const [ingestResult, setIngestResult] = useState<BatchPatientIngestResult | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  // Modal lifecycle & Smartphone Back Button Interception
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    // Push state so phone hardware back button / swipe gesture closes modal instead of leaving page
    window.history.pushState({ modalOpen: "fastTrackModal" }, "");

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.modalOpen === "fastTrackModal") {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep("INPUT");
      setPastedText("");
      setFileName(null);
      setScannedImage(null);
      setIngestResult(null);
      setIngestProgress(null);
      setIsSubmitting(false);
      setFilterMode("ALL");
    }
  }, [isOpen]);

  // Handle Confetti on Success
  useEffect(() => {
    if (step === "SUCCESS") {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [step]);

  // Handle File Drop or Upload
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setPastedText(text);
      }
    };
    reader.readAsText(file);
  };

  // Start Analyzing Text / CSV
  const handleStartParsing = async (textToParse?: string) => {
    const raw = textToParse !== undefined ? textToParse : pastedText;
    if (!raw.trim()) return;

    setStep("PROCESSING");
    setProcessingProgress(20);
    setProcessingStatus("Detecting columns and delimiters...");

    await new Promise((r) => setTimeout(r, 200));
    setProcessingProgress(50);
    setProcessingStatus("Normalizing Indian phone numbers and ages...");

    await new Promise((r) => setTimeout(r, 200));
    setProcessingProgress(85);
    setProcessingStatus("Validating clinical fields and therapists...");

    const parsed = parsePatientSpreadsheetText(raw, enrolledTherapists);

    await new Promise((r) => setTimeout(r, 150));
    setProcessingProgress(100);
    setEditableRows(parsed.rows);
    setStep("REVIEW");
  };

  // Handle Gemini OCR Scan for Physical Registers, Photos & PDF Documents
  const handleOcrImageUpload = async (files: FileList | File[] | File) => {
    const fileArray = files instanceof FileList ? Array.from(files) : Array.isArray(files) ? files : [files];
    if (fileArray.length === 0) return;

    setOcrLoading(true);
    setProcessingError(null);
    setStep("PROCESSING");
    setProcessingProgress(15);
    setProcessingStatus(`Loading ${fileArray.length} document(s)...`);

    try {
      const imagesData: { data: string; mimeType: string; name: string }[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        imagesData.push({
          data: base64,
          mimeType: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          name: file.name
        });
      }

      setProcessingProgress(45);
      setProcessingStatus("Gemini AI is reading handwritten entries, diagnosis & records...");

      const res = await fetch("/api/fasttrack/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: imagesData,
          enrolledTherapists
        })
      });

      const data = await res.json();
      setProcessingProgress(90);
      setProcessingStatus("Formatting extracted patient records into data grid...");

      if (data.success && data.rows && data.rows.length > 0) {
        setEditableRows(data.rows);
        await new Promise((r) => setTimeout(r, 200));
        setProcessingProgress(100);
        setStep("REVIEW");
      } else {
        throw new Error(data.error || "No patient records recognized. Please try a clearer photo or spreadsheet.");
      }
    } catch (err: any) {
      console.error("AI OCR Scan Error:", err);
      setProcessingError(err.message || "Failed to scan documents. Please check your image or network.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Row update helpers
  const handleRowChange = (id: string, field: keyof FastTrackPatientRow, val: any) => {
    setEditableRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: val };
        
        // Dynamic re-validation
        const digits = (updated.phone || "").replace(/\D/g, "");
        const isValid = !!updated.name.trim() && digits.length >= 10;
        const warnings: string[] = [];
        if (!updated.name.trim()) warnings.push("Name is required");
        if (digits.length < 10) warnings.push("Invalid phone");

        return { ...updated, isValid, warnings };
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setEditableRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddNewRow = () => {
    const newRow: FastTrackPatientRow = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: "",
      age: "35",
      gender: "Male",
      phone: "+91 ",
      email: "",
      treatmentPlan: "General Physiotherapy Consultation",
      therapistName: enrolledTherapists[0] || "Dr. Kinnera",
      status: "active",
      isValid: false,
      warnings: ["Name and phone required"]
    };
    setEditableRows((prev) => [newRow, ...prev]);
  };

  const handleAutoAssignTherapist = (therapist: string) => {
    setEditableRows((prev) =>
      prev.map((r) => ({ ...r, therapistName: therapist }))
    );
  };

  // Filtered rows for Review grid
  const filteredRows = useMemo(() => {
    if (filterMode === "READY") return editableRows.filter((r) => r.isValid);
    if (filterMode === "ISSUES") return editableRows.filter((r) => !r.isValid || r.warnings.length > 0);
    return editableRows;
  }, [editableRows, filterMode]);

  const validCount = editableRows.filter((r) => r.isValid).length;
  const issueCount = editableRows.length - validCount;

  // Execute Batch Migration
  const handleExecuteBatchIngest = async () => {
    setIsSubmitting(true);
    try {
      const result = await executeFastTrackPatientBatchIngest(
        editableRows,
        (p) => setIngestProgress(p)
      );
      setIngestResult(result);
      setStep("SUCCESS");
      onSuccess?.();
    } catch (err) {
      console.error("Batch ingest execution failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_PATIENT_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Gait_Physio_Sample_Patients_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 font-['Inter',sans-serif]">
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isMaximized ? "max-w-full h-full rounded-none" : "max-w-6xl max-h-[92vh]"
        }`}
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 sm:gap-3 bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  Fast-Track Patient Migration
                </h3>
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-[10px] font-black uppercase tracking-wider shrink-0">
                  Bulk Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Bulk-import clinic roster from Excel, CSV, or paper prescription slips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer hidden sm:block"
              title={isMaximized ? "Restore Size" : "Maximize Screen"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
              aria-label="Close modal"
              title="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: INPUT SCREEN                                                      */}
        {/* ========================================================================= */}
        {step === "INPUT" && (
          <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-grow space-y-5">
            
            {/* Segmented Intake Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setActiveTab("SHEET")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "SHEET"
                    ? "bg-white dark:bg-slate-700 text-brand-green dark:text-teal-400 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Spreadsheet & Paste</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("CAMERA")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === "CAMERA"
                    ? "bg-white dark:bg-slate-700 text-brand-green dark:text-teal-400 shadow-sm font-black"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>Prescriptions & Scans (AI OCR)</span>
              </button>
            </div>

            {/* TAB A: SPREADSHEET / PASTE TEXT */}
            {activeTab === "SHEET" && (
              <div className="space-y-4 max-w-4xl mx-auto">
                
                {/* Drag & Drop File Box */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-brand-green bg-brand-green/5 dark:bg-emerald-950/20 scale-[1.01]"
                      : "border-slate-200 dark:border-slate-800 hover:border-brand-green bg-slate-50/60 dark:bg-slate-800/20"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-12 w-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {fileName ? `Selected: ${fileName}` : "Drop your Clinic CSV / Excel file here"}
                      </p>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        Supports .csv, .xlsx, .tsv, Google Sheets, or clipboard text
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Text Paste Area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Or Paste Raw Patient List / WhatsApp Text:
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPastedText(SAMPLE_PATIENT_CSV);
                          setFileName("Sample_Clinic_Roster.csv");
                        }}
                        className="text-[11px] font-bold text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Load Sample Patients</span>
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        className="text-[11px] font-bold text-slate-500 hover:text-brand-green flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download Sample CSV</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Name, Age, Gender, Phone, Email, Condition, Therapist, Status\nRahul Sharma, 34, Male, 9876543210, rahul@example.com, Cervical Spondylosis, Dr.Kinnera, Active\nAnanya Deshmukh, 28, Female, 9811223344, , Post-op ACL Rehab, Dr.Ridha, Active`}
                    className="w-full text-xs font-mono p-4 rounded-2xl border border-slate-200/80 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200 outline-none focus:border-brand-green transition-all"
                  />
                </div>

                {/* Bottom Action CTA */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!pastedText.trim()}
                    onClick={() => handleStartParsing()}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Sparkles className="h-4 w-4 text-amber-200" />
                    <span>Analyze & Review Patients</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

              </div>
            )}

            {/* TAB B: CAMERA / REGISTER AI OCR */}
            {activeTab === "CAMERA" && (
              <div className="space-y-5 max-w-2xl mx-auto text-center">
                {/* Multi-image / PDF File Input */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleOcrImageUpload(e.target.files);
                    }
                  }}
                />

                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleOcrImageUpload(e.dataTransfer.files);
                    }
                  }}
                  className={`p-8 border-2 border-dashed rounded-3xl space-y-4 transition-all ${
                    isDragging 
                      ? "border-brand-green bg-brand-green/5 dark:bg-emerald-950/20 scale-[1.01]" 
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20"
                  }`}
                >
                  <div className="h-16 w-16 rounded-3xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 mx-auto flex items-center justify-center">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Doctor Prescriptions, Referral Papers & Patient Sheets
                    </h4>
                    <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                      Drop or snap single/multiple photos of doctor prescription slips, hospital referral letters, or patient intake papers. Gemini AI automatically extracts patient names, ages, phone numbers, and diagnosis into the registration table.
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      disabled={ocrLoading}
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-black inline-flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {ocrLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-amber-200" />
                      )}
                      <span>{ocrLoading ? "Scanning with AI..." : "Take Photos / Select Files (PDF & Images)"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PROCESSING SCREEN                                                 */}
        {/* ========================================================================= */}
        {step === "PROCESSING" && (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-6 flex-grow my-auto text-center max-w-md mx-auto w-full">
            {!processingError ? (
              <>
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-brand-green/10 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-10 w-10 text-brand-green" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
                </div>

                <div className="space-y-2 max-w-sm">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Parsing Patient Records
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold min-h-[1.5rem]">
                    {processingStatus}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-200/80 dark:border-slate-700">
                  <div
                    className="bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(processingProgress, 10)}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4 w-full animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-950 dark:text-rose-200">AI Document Scan Notice</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{processingError}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("INPUT");
                      setProcessingError(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                  >
                    Back to Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: INTERACTIVE REVIEW DATA GRID                                      */}
        {/* ========================================================================= */}
        {step === "REVIEW" && (
          <div className="flex flex-col flex-grow overflow-hidden">
            
            {/* Top Toolbar & Filter Strip */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterMode("ALL")}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    filterMode === "ALL"
                      ? "bg-slate-900 text-white dark:bg-slate-700 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({editableRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("READY")}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    filterMode === "READY"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-emerald-600"
                  }`}
                >
                  🟢 Ready ({validCount})
                </button>
                {issueCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("ISSUES")}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      filterMode === "ISSUES"
                        ? "bg-red-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-red-600"
                    }`}
                  >
                    ⚠️ Issues ({issueCount})
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAddNewRow}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-brand-green flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="h-4 w-4 text-brand-green" />
                  <span>Add Patient Row</span>
                </button>

                {/* Auto Assign Therapist Dropdown */}
                <select
                  onChange={(e) => {
                    if (e.target.value) handleAutoAssignTherapist(e.target.value);
                  }}
                  defaultValue=""
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>Auto-Assign Therapist To All...</option>
                  {enrolledTherapists.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer shadow-2xs"
                >
                  Back
                </button>
              </div>

            </div>

            {/* High-Density Interactive Data Grid */}
            <div className="overflow-x-auto overflow-y-auto flex-grow p-3 sm:p-4 overscroll-contain">
              <table className="w-full border-collapse text-left text-xs min-w-[1350px]">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3 w-12 text-center">#</th>
                    <th className="py-3 px-3 min-w-[210px]">Patient Name *</th>
                    <th className="py-3 px-3 min-w-[95px] text-center">Age *</th>
                    <th className="py-3 px-3 min-w-[130px]">Gender</th>
                    <th className="py-3 px-3 min-w-[180px]">Phone Number *</th>
                    <th className="py-3 px-3 min-w-[200px]">Email</th>
                    <th className="py-3 px-3 min-w-[260px]">Chief Complaint / Treatment Plan</th>
                    <th className="py-3 px-3 min-w-[200px]">Assigned Therapist</th>
                    <th className="py-3 px-3 min-w-[145px] text-center">Status</th>
                    <th className="py-3 px-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRows.map((row, idx) => {
                    const isRowValid = row.isValid;

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${
                          !isRowValid ? "bg-red-50/20 dark:bg-red-950/10" : ""
                        }`}
                      >
                        {/* Index & Valid Indicator */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                isRowValid ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                              }`}
                              title={isRowValid ? "Valid Record" : row.warnings.join(", ")}
                            />
                            <span>{idx + 1}</span>
                          </div>
                        </td>

                        {/* Name Input */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => handleRowChange(row.id, "name", e.target.value)}
                            placeholder="Patient Full Name"
                            className="w-full min-w-[190px] text-xs font-bold px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green shadow-2xs"
                          />
                        </td>

                        {/* Age Input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={row.age}
                            onChange={(e) => handleRowChange(row.id, "age", e.target.value)}
                            placeholder="35"
                            className="w-20 px-2 py-2 text-center text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green shadow-2xs mx-auto"
                          />
                        </td>

                        {/* Gender Select */}
                        <td className="py-2 px-2">
                          <select
                            value={row.gender}
                            onChange={(e) => handleRowChange(row.id, "gender", e.target.value)}
                            className="w-28 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer shadow-2xs"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>

                        {/* Phone Input */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.phone}
                            onChange={(e) => handleRowChange(row.id, "phone", e.target.value)}
                            placeholder="+91 9876543210"
                            className="w-full min-w-[160px] text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green shadow-2xs"
                          />
                        </td>

                        {/* Email Input */}
                        <td className="py-2 px-2">
                          <input
                            type="email"
                            value={row.email}
                            onChange={(e) => handleRowChange(row.id, "email", e.target.value)}
                            placeholder="Optional email"
                            className="w-full min-w-[180px] text-xs px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green shadow-2xs"
                          />
                        </td>

                        {/* Treatment Plan / Complaint */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.treatmentPlan}
                            onChange={(e) => handleRowChange(row.id, "treatmentPlan", e.target.value)}
                            placeholder="e.g. Cervical Spondylosis"
                            className="w-full min-w-[240px] text-xs font-medium px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green shadow-2xs"
                          />
                        </td>

                        {/* Therapist Select */}
                        <td className="py-2 px-2">
                          <select
                            value={row.therapistName}
                            onChange={(e) => handleRowChange(row.id, "therapistName", e.target.value)}
                            className="w-full min-w-[180px] text-xs font-bold px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer shadow-2xs"
                          >
                            {enrolledTherapists.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>

                        {/* Status Select */}
                        <td className="py-2 px-2 text-center">
                          <select
                            value={row.status}
                            onChange={(e) => handleRowChange(row.id, "status", e.target.value)}
                            className="w-32 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer shadow-2xs mx-auto"
                          >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Ingestion Bar */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Ready to Migrate: <span className="text-brand-green">{validCount} Patients</span>
                  {issueCount > 0 && <span className="text-red-500 ml-2">({issueCount} rows need review)</span>}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Every patient will be created in Firestore & auto-provisioned with a Google Drive EMR folder.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="px-5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={validCount === 0 || isSubmitting}
                  onClick={handleExecuteBatchIngest}
                  className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Migrating ({ingestProgress?.current || 0}/{validCount})...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Start Batch Migration ({validCount} Patients)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUCCESS REPORT                                                    */}
        {/* ========================================================================= */}
        {step === "SUCCESS" && ingestResult && (
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center space-y-6 flex-grow my-auto text-center max-w-xl mx-auto">
            <div className="h-20 w-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-brand-green flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Patient Migration Completed!
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Successfully onboarded <span className="font-black text-brand-green">{ingestResult.createdCount} patients</span> into the clinic database.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-2xl font-black text-brand-green">{ingestResult.createdCount}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Patients Added</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{ingestResult.createdCount}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Drive Folders Linked</p>
              </div>
            </div>

            {/* Action CTA */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer active:scale-95"
            >
              Open Patient Database
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
