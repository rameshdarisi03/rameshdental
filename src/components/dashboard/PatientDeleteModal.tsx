"use client";

import React, { useState, useEffect } from "react";
import { 
  Trash2, 
  X, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  User, 
  Smartphone, 
  FileText, 
  Loader2, 
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { PatientDeleteOptions, deletePatientData } from "@/lib/patientsDb";

interface PatientDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedOptions: PatientDeleteOptions) => void;
  patientId: string;
  patientName: string;
}

const STORAGE_KEY = "gpc_patient_delete_prefs_v2";

const DEFAULT_PREFS: PatientDeleteOptions = {
  profile: true,
  hub: true,
  documents: true,
};

export default function PatientDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
}: PatientDeleteModalProps) {
  const [options, setOptions] = useState<PatientDeleteOptions>(DEFAULT_PREFS);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Load saved preferences on mount / open
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage("");
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setOptions(JSON.parse(saved));
      } else {
        setOptions(DEFAULT_PREFS);
      }
    } catch (e) {
      setOptions(DEFAULT_PREFS);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle option and auto-save
  const handleToggle = (key: keyof PatientDeleteOptions) => {
    const updated = {
      ...options,
      [key]: !options[key],
    };
    setOptions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save deletion preferences", e);
    }
  };

  const hasAnySelected = Object.values(options).some((v) => v === true);

  const handleExecuteDelete = async () => {
    if (!hasAnySelected) {
      setErrorMessage("Please select at least one component to delete.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deletePatientData(patientId, options);
      onSuccess(options);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "An error occurred while deleting data.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-800/60 shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Manage & Delete Patient Data
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Target: <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong> <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600 dark:text-slate-400">({patientId})</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Checklist */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Select Components to Delete:
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800/60">
              <Sparkles className="w-3 h-3" />
              Auto-saves preferences
            </span>
          </div>

          <div className="space-y-3">
            {/* 1. Core Profile */}
            <div 
              onClick={() => !isDeleting && handleToggle("profile")}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                options.profile
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-xs"
                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400">
                {options.profile ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    1. Patient Profile
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                  Core demographic details, contact numbers, case history & directory listing
                </p>
              </div>
            </div>

            {/* 2. Patient Hub (Portal + Exercises + Notes + Invoices) */}
            <div 
              onClick={() => !isDeleting && handleToggle("hub")}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                options.hub
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-xs"
                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400">
                {options.hub ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    2. Patient Hub
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                  Portal login account, assigned home exercises, consultation logs & clinic invoices
                </p>
              </div>
            </div>

            {/* 3. Medical Documents & Scans */}
            <div 
              onClick={() => !isDeleting && handleToggle("documents")}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                options.documents
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/80 shadow-xs"
                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400">
                {options.documents ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-slate-700 dark:text-slate-300" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    3. Medical Documents & Scans
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                  Uploaded X-rays, MRI scans, lab reports, doctor reference PDFs & prescription files
                </p>
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          {options.profile && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Selecting <em>Patient Profile</em> will completely remove this patient from the directory.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-2xl">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={isDeleting || !hasAnySelected}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black rounded-full transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Executing Purge...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Execute Selected Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
