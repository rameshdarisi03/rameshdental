"use client";

import React from "react";
import { 
  Check, 
  X, 
  Users 
} from "lucide-react";
import { usePatientAuth } from "@/providers/PatientAuthProvider";

// Avatar color palettes for pleasant Netflix/Prime style distinctiveness
const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-indigo-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-pink-600",
  "from-rose-500 to-red-600",
  "from-cyan-500 to-blue-600",
];

export default function ProfileSelectorModal() {
  const { 
    patient, 
    availableProfiles, 
    selectProfile, 
    showProfileSelector, 
    setShowProfileSelector,
  } = usePatientAuth();

  if (!showProfileSelector) return null;

  const handleSelect = (pid: string) => {
    selectProfile(pid);
  };

  const handleClose = () => {
    // Only allow closing if a profile is currently active
    if (patient) {
      setShowProfileSelector(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && patient) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-brand-green">
              Ramesh Dental Patient Hub
            </span>
          </div>

          {patient && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Profile Switcher"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 pt-2 space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Who is visiting today?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Select your profile to access your personalized home exercises, clinical reports, and appointments.
            </p>
          </div>

          {/* Profile Grid (Netflix / Prime Style) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 max-h-[55vh] overflow-y-auto p-1">
            {availableProfiles.map((p, idx) => {
              const isActive = patient?.id === p.id;
              const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
              const relationshipBadge = p.relationship || (p.isPrimaryAccount ? "Primary / Self" : "Family Member");

              return (
                <button
                  key={p.id || idx}
                  onClick={() => p.id && handleSelect(p.id)}
                  className={`group relative flex flex-col items-center p-4 rounded-2xl border transition-all cursor-pointer text-center ${
                    isActive 
                      ? "border-brand-green bg-brand-green/5 dark:bg-brand-green/10 shadow-md ring-2 ring-brand-green/20" 
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-green/50 hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  {/* Active check badge */}
                  {isActive && (
                    <span className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-brand-green text-white shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}

                  {/* Big Avatar */}
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${gradient} text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200 uppercase`}>
                    {p.name.charAt(0)}
                  </div>

                  {/* Name & Details */}
                  <div className="mt-3 space-y-1 w-full">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                      {p.name}
                    </h3>
                    
                    <div className="flex items-center justify-center gap-1">
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                        {relationshipBadge}
                      </span>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400">
                      {p.id}
                    </p>
                  </div>

                  {isActive && (
                    <span className="mt-2 text-[10px] font-black text-brand-green uppercase tracking-wider">
                      Active Now
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Info Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span className="text-[11px] font-semibold">
              {availableProfiles.length} {availableProfiles.length === 1 ? "Profile" : "Profiles"} in this Family Circle
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-right">
              Need to link a family member? Clinic reception will link them to your account.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
