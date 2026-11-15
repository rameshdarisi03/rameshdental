"use client";

import { useEffect, useState } from "react";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Activity, 
  LogOut, 
  Loader2, 
  BellRing,
  Folder,
  FileText,
  Receipt,
  Users,
  Check
} from "lucide-react";
import { SwitchProfilesIcon } from "@/app/patienthub/layout";

export default function ProfilePage() {
  const router = useRouter();
  const { patient, loading, logout, availableProfiles, selectProfile, setShowProfileSelector } = usePatientAuth();

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  const patientName = patient?.name || "Patient Profile";
  const initials = patientName
    .trim()
    .split(/\s+/)
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PT";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none font-['Inter',sans-serif]">
      
      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-6 sm:p-8 rounded-[28px] shadow-sm text-center space-y-4">
        {/* Large Initials Avatar */}
        <div className="h-20 w-20 rounded-full bg-[#062e36] text-[#f9ab55] border-4 border-[#f9ab55]/40 flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
          {initials}
        </div>
        
        <div>
          <h1 className="text-xl font-bold text-[#062e36] dark:text-white leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
            {patientName}
          </h1>
          <p className="text-xs text-[#8a5100] dark:text-[#f9ab55] font-extrabold tracking-wider uppercase mt-1">
            Care ID: {patient?.id ? patient.id.slice(0, 10).toUpperCase() : "GPC-PATIENT"}
          </p>
        </div>

        {/* Plan of Care badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#f9ab55]/15 text-[#8a5100] dark:text-[#f9ab55] text-xs font-bold px-4 py-1.5 rounded-full border border-[#f9ab55]/30">
          <Activity className="h-3.5 w-3.5" />
          <span>Active: {patient?.treatmentPlan || "Physiotherapy Rehabilitation"}</span>
        </div>
      </div>

      {/* Account Details Block */}
      <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-6 rounded-[28px] shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400 px-1">Patient Profile Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-[#FAF9F9] dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="p-2 bg-[#062e36]/10 text-[#062e36] dark:text-[#f9ab55] rounded-xl">
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Full Name</p>
              <p className="text-xs font-bold text-[#062e36] dark:text-slate-100">{patientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#FAF9F9] dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="p-2 bg-[#062e36]/10 text-[#062e36] dark:text-[#f9ab55] rounded-xl">
              <Mail className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Registered Email</p>
              <p className="text-xs font-bold text-[#062e36] dark:text-slate-100">{patient?.email || "No email registered"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#FAF9F9] dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="p-2 bg-[#062e36]/10 text-[#062e36] dark:text-[#f9ab55] rounded-xl">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Contact Phone</p>
              <p className="text-xs font-bold text-[#062e36] dark:text-slate-100">{patient?.phone || "No phone registered"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#FAF9F9] dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Security Status</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Firebase Encrypted Patient Record</p>
            </div>
          </div>
        </div>
      </div>

      {/* Family Circle & Multi-Profile Management */}
      <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-6 rounded-[28px] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#8a5100] dark:text-[#f9ab55]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400">
              Family Circle ({availableProfiles.length})
            </h3>
          </div>
          {availableProfiles.length > 1 && (
            <button
              onClick={() => setShowProfileSelector(true)}
              className="inline-flex items-center gap-1.5 text-xs font-black text-brand-green dark:text-[#f9ab55] hover:underline cursor-pointer"
            >
              <SwitchProfilesIcon className="w-3.5 h-3.5" />
              <span>Switch Profile</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {availableProfiles.map((p) => {
            const isActive = patient?.id === p.id;
            const relationship = p.relationship || (p.isPrimaryAccount ? "Primary / Self" : "Family Member");
            
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-brand-green/5 dark:bg-brand-green/10 border-brand-green/30 shadow-2xs ring-1 ring-brand-green/20"
                    : "bg-[#FAF9F9] dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-2xs ${
                    isActive
                      ? "bg-brand-green text-white"
                      : "bg-[#062e36] text-[#f9ab55]"
                  }`}>
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#062e36] dark:text-slate-100">
                        {p.name}
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/50">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {relationship} • <span className="font-mono">{p.id}</span>
                    </p>
                  </div>
                </div>

                {!isActive ? (
                  <button
                    onClick={() => p.id && selectProfile(p.id)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-brand-green hover:text-white dark:hover:bg-brand-green text-[#062e36] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    Select
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-brand-green uppercase tracking-wider">
                    Viewing
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#21444D]/10 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">
            Family members are registered and linked by clinic reception.
          </span>
          <a
            href="https://wa.me/918971462949?text=Hello%20Gait%20Physio%20Clinic,%20I%20would%20like%20to%20add/link%20a%20family%20member%20to%20my%20Patient%20Hub%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline cursor-pointer"
          >
            Need to link another member? Chat with clinic →
          </a>
        </div>
      </div>

      {/* Log out primary trigger button */}
      <button
        onClick={logout}
        className="w-full inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 py-3.5 rounded-full text-xs font-bold uppercase transition-all shadow-xs cursor-pointer border border-red-200/50"
      >
        <LogOut className="h-4 w-4" />
        <span>Log Out of Patient Hub</span>
      </button>

    </div>
  );
}
