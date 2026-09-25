"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [relationship, setRelationship] = useState<FamilyRelationship>("Spouse");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
    return pool.filter((p) => {
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchPhone = (p.phone || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
      const matchId = (p.id || "").toLowerCase().includes(q);
      const matchEmail = (p.email || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchId || matchEmail;
    }).slice(0, 20);
  }, [patients, currentPatient, currentFamilyMembers, searchTerm]);

  if (!isOpen) return null;

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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Link Family Member
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Connect an existing patient to <span className="font-bold text-slate-800 dark:text-slate-200">{currentPatient.name}</span>&apos;s Family Circle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleLinkSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Search Patients Input */}
          <div className="space-y-1.5">
            <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400">
              1. Search Patient to Link *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type name, phone (e.g. 98765...), or ID (GPC-...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
              />
            </div>
          </div>

          {/* Candidates List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-bold uppercase tracking-wider px-1">
              <span>Matching Patients</span>
              {loadingPatients && (
                <span className="flex items-center gap-1 text-brand-green">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading directory...
                </span>
              )}
            </div>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/30 dark:bg-slate-950/40 p-1">
              {candidatePatients.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  {loadingPatients ? "Searching..." : "No matching unlinked patients found."}
                </div>
              ) : (
                candidatePatients.map((p) => {
                  const isSelected = selectedPatient?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatient(p)}
                      className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-brand-green/10 border border-brand-green/40 shadow-xs" 
                          : "hover:bg-white dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                          isSelected ? "bg-brand-green text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {p.id} {p.phone && `• ${p.phone}`}
                          </p>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-brand-green text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 hover:text-brand-green">
                          Select
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Relationship Selector */}
          {selectedPatient && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                2. Select Relationship to {currentPatient.name} *
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
              >
                {FAMILY_RELATIONSHIPS.filter((r) => r !== "Self").map((rel) => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
          )}

          {/* Security & Access Info */}
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Both patients will share portal access and appear in the Patient Hub profile switcher. Their consultations, prescriptions, and medical files remain strictly isolated.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedPatient || isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Linking Profiles...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Link to Family Circle</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
