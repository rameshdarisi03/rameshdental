"use client";

import React, { useState } from "react";
import { 
  Users, 
  Plus, 
  Check, 
  X, 
  Link as LinkIcon, 
  UserPlus, 
  Heart, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { FAMILY_RELATIONSHIPS, FamilyRelationship } from "@/lib/patientsDb";

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
    addFamilyMemberProfile,
    linkExistingProfileByPid
  } = usePatientAuth();

  const [mode, setMode] = useState<"select" | "add" | "link">("select");
  
  // Add family member form state
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState<FamilyRelationship>("Spouse");
  const [newAge, setNewAge] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Link existing PID state
  const [linkPid, setLinkPid] = useState("");
  const [linkVerification, setLinkVerification] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  if (!showProfileSelector) return null;

  const handleSelect = (pid: string) => {
    selectProfile(pid);
  };

  const handleClose = () => {
    // Only allow closing if a profile is currently active
    if (patient) {
      setShowProfileSelector(false);
      setMode("select");
      setFormError("");
      setLinkError("");
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("Please enter the family member's full name.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const res = await addFamilyMemberProfile({
      name: newName.trim(),
      relationship: newRelationship,
      age: newAge.trim() || undefined,
      gender: newGender,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setNewName("");
      setNewAge("");
      setNewPhone("");
      setNewEmail("");
      setMode("select");
    } else {
      setFormError(res.error || "Failed to add family member profile.");
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPid.trim()) {
      setLinkError("Please enter the Patient ID (e.g. GPC-12005).");
      return;
    }
    if (!linkVerification.trim()) {
      setLinkError("Please enter the registered phone number or activation code.");
      return;
    }

    setIsLinking(true);
    setLinkError("");

    const res = await linkExistingProfileByPid(linkPid.trim(), linkVerification.trim());
    setIsLinking(false);

    if (res.success) {
      setLinkPid("");
      setLinkVerification("");
      setMode("select");
    } else {
      setLinkError(res.error || "Failed to link existing profile.");
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
              Gait Physio Patient Hub
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

        {/* Content depending on Mode */}
        {mode === "select" && (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 max-h-[50vh] overflow-y-auto p-1">
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

              {/* + Add Family Member Card */}
              <button
                onClick={() => setMode("add")}
                className="group flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/30 hover:border-brand-green hover:bg-brand-green/5 transition-all cursor-pointer text-center min-h-[170px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-brand-green group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                  <UserPlus className="w-6 h-6" />
                </div>
                <span className="mt-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-brand-green transition-colors">
                  + Add Family Member
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Spouse, Child, Parent
                </span>
              </button>
            </div>

            {/* Bottom Actions: Link existing PID */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-semibold">
                {availableProfiles.length} Profiles in this Family Circle
              </span>
              <button
                onClick={() => setMode("link")}
                className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-brand-green font-bold transition-colors cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link Existing Patient ID</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode: Add Family Member */}
        {mode === "add" && (
          <div className="p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Add Family Member
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Creates an individual clinical profile under your family circle.
                </p>
              </div>
              <button
                onClick={() => {
                  setMode("select");
                  setFormError("");
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Back to Profiles
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nithin Pandey"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Relationship *
                  </label>
                  <select
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value as FamilyRelationship)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  >
                    {FAMILY_RELATIONSHIPS.filter((r) => r !== "Self").map((rel) => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    placeholder="e.g. 32"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Shared or separate number"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Activation:</strong> This profile will immediately share your active access and appear in your profile switcher. Their medical records remain 100% private to their file.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("select")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Save Family Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Mode: Link Existing PID */}
        {mode === "link" && (
          <div className="p-6 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Link Existing Patient ID
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connect an existing family member who already visits Gait Physio Clinic.
                </p>
              </div>
              <button
                onClick={() => {
                  setMode("select");
                  setLinkError("");
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Back to Profiles
              </button>
            </div>

            {linkError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Patient ID (PID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GPC-12005"
                  value={linkPid}
                  onChange={(e) => setLinkPid(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white uppercase font-mono outline-none focus:border-brand-green"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Verification (Registered Phone Number or Activation Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210 or ABCD1234"
                  value={linkVerification}
                  onChange={(e) => setLinkVerification(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Required to protect patient privacy and verify ownership.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("select")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinking}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLinking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying & Linking...</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Link Patient Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
