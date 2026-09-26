"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Users, 
  Search, 
  Check, 
  Loader2, 
  AlertCircle, 
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { 
  Patient, 
  getPatients, 
  linkPatientsInFamilyCircle, 
  FAMILY_RELATIONSHIPS, 
  FamilyRelationship 
} from "@/lib/patientsDb";

interface LinkFamilyMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPatient: Patient;
  currentFamilyMembers: Patient[];
  onLinked: () => void;
}

export default function LinkFamilyMemberModal({
  isOpen,
  onClose,
  currentPatient,
  currentFamilyMembers,
  onLinked,
}: LinkFamilyMemberModalProps) {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [relationship, setRelationship] = useState<FamilyRelationship>("Spouse");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load patients list when modal opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedPatient(null);
      setSearchTerm("");
      setError("");
      return;
    }

    let isMounted = true;
    async function fetchList() {
      setLoadingPatients(true);
      setError("");
      try {
        const list = await getPatients();
        if (isMounted) {
          setPatients(list);
        }
      } catch (err) {
        console.error("Failed to fetch patients:", err);
        if (isMounted) {
          setError("Failed to load patient directory. Please check network.");
        }
      } finally {
        if (isMounted) {
          setLoadingPatients(false);
        }
      }
    }

    fetchList();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter candidates: exclude current patient and already linked family members
  const candidatePatients = useMemo(() => {
    const existingIds = new Set<string>();
    if (currentPatient.id) existingIds.add(currentPatient.id);
    currentFamilyMembers.forEach((m) => {
      if (m.id) existingIds.add(m.id);
    });

    const pool = patients.filter((p) => p.id && !existingIds.has(p.id));

    if (!searchTerm.trim()) {
      return pool.slice(0, 15); // Show first 15 by default
    }

    const q = searchTerm.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return pool.filter((p) => {
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchPhone = qDigits.length >= 3 && (p.phone || "").replace(/\D/g, "").includes(qDigits);
      const matchId = (p.id || "").toLowerCase().includes(q);
      const matchEmail = (p.email || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchEmail;
    }).slice(0, 20);
  }, [patients, currentPatient, currentFamilyMembers, searchTerm]);

  if (!mounted || !isOpen || typeof window === "undefined" || !document?.body) {
    return null;
  }

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient to link.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await linkPatientsInFamilyCircle(currentPatient, selectedPatient, relationship);
      onLinked();
      onClose();
    } catch (err: any) {
      console.error("Failed to link patient:", err);
      setError(err?.message || "Failed to link patient to family circle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-['Inter',sans-serif]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-teal-50/60 via-white to-emerald-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                Link Family Member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                Connect patient to <strong className="text-slate-800 dark:text-slate-200">{currentPatient.name}</strong>&apos;s Family Circle
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleLinkSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. Search Patients Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                1. Search Patient to Link *
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Type name, phone (e.g. 98765...), or ID (GPC-...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-green transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Candidates List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                <span>Matching Patients</span>
                {loadingPatients && (
                  <span className="flex items-center gap-1 text-brand-green text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading directory...
                  </span>
                )}
              </div>

              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl max-h-48 sm:max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/30 dark:bg-slate-950/40 p-1.5">
                {candidatePatients.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    {loadingPatients ? "Loading patients..." : "No matching unlinked patients found."}
                  </div>
                ) : (
                  candidatePatients.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setError("");
                        }}
                        className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer select-none my-0.5 ${
                          isSelected 
                            ? "bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700/70 shadow-xs" 
                            : "hover:bg-white dark:hover:bg-slate-800/60 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                            isSelected 
                              ? "bg-brand-green text-white shadow-xs" 
                              : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                          }`}>
                            {p.name?.charAt(0) || "P"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
                              {p.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                              <span className="font-mono font-bold text-slate-500 dark:text-slate-400">{p.id}</span>
                              {p.phone && <span> • {p.phone}</span>}
                            </p>
                          </div>
                        </div>

                        <div className="ml-2 shrink-0">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-brand-green text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 hover:text-brand-green bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg">
                              Select
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Relationship Selector */}
            {selectedPatient && (
              <div className="space-y-1.5 animate-in fade-in">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  2. Select Relationship to {currentPatient.name} *
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer"
                >
                  {FAMILY_RELATIONSHIPS.filter((r) => r !== "Self").map((rel) => (
                    <option key={rel} value={rel}>{rel}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Security & Access Info */}
            <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <span>
                Both patients will share portal access and appear in the Patient Hub profile switcher. Their clinical consultations, prescriptions, and medical files remain strictly isolated.
              </span>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 sm:px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-full transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPatient || isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Linking...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Link to Family Circle</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
