"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  ArrowLeft, 
  Sparkles,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface SavedStaffProfile {
  email: string;
  name: string;
  role: string;
  avatarBg: string;
  avatarEmoji?: string;
  lastLoginAt: number;
}

const AVATAR_GRADIENTS = [
  "from-sky-500 via-blue-600 to-indigo-600",
  "from-fuchsia-500 via-pink-600 to-rose-600",
  "from-emerald-400 via-teal-600 to-cyan-700",
  "from-amber-400 via-orange-500 to-red-600",
  "from-violet-500 via-purple-600 to-indigo-800",
];

export default function Login() {
  const router = useRouter();

  // Saved Profiles State (Hotstar / Multi-Account Switcher)
  const [savedProfiles, setSavedProfiles] = useState<SavedStaffProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SavedStaffProfile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Check session & load saved staff profiles
  useEffect(() => {
    // If active session exists, go straight to dashboard
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      router.replace("/dashboard");
      return;
    }

    // Load saved staff profiles from localStorage
    try {
      const stored = localStorage.getItem("gpc_saved_staff_profiles");
      if (stored) {
        const parsed: SavedStaffProfile[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sort by most recently logged in
          parsed.sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
          setSavedProfiles(parsed);
        }
      }
    } catch (e) {
      console.warn("Could not read saved profiles:", e);
    }
  }, [router]);

  // Focus password input whenever a profile is selected
  useEffect(() => {
    if (selectedProfile && passwordInputRef.current) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [selectedProfile]);

  // Save/Upsert Profile to Local Storage
  const persistStaffProfile = (profileData: { email: string; name: string; role: string }) => {
    try {
      const emailLower = profileData.email.trim().toLowerCase();
      const existing = [...savedProfiles];
      const index = existing.findIndex((p) => p.email.toLowerCase() === emailLower);

      const colorIndex = (existing.length + index) % AVATAR_GRADIENTS.length;
      const avatarColor = existing[index]?.avatarBg || AVATAR_GRADIENTS[colorIndex];

      const updatedProfile: SavedStaffProfile = {
        email: emailLower,
        name: profileData.name || "Staff Member",
        role: profileData.role || "staff",
        avatarBg: avatarColor,
        avatarEmoji: profileData.role === "admin" ? "👨‍⚕️" : "🩺",
        lastLoginAt: Date.now(),
      };

      if (index >= 0) {
        existing[index] = { ...existing[index], ...updatedProfile };
      } else {
        existing.unshift(updatedProfile);
      }

      setSavedProfiles(existing);
      localStorage.setItem("gpc_saved_staff_profiles", JSON.stringify(existing));
    } catch (err) {
      console.warn("Failed to persist staff profile:", err);
    }
  };

  // Remove saved profile from switcher (Hotstar Edit Mode)
  const handleDeleteProfile = (e: React.MouseEvent, profileEmail: string) => {
    e.stopPropagation();
    const filtered = savedProfiles.filter((p) => p.email !== profileEmail);
    setSavedProfiles(filtered);
    localStorage.setItem("gpc_saved_staff_profiles", JSON.stringify(filtered));
    if (filtered.length === 0) {
      setIsEditMode(false);
      setShowDirectForm(true);
    }
  };

  // Handle Profile Selection
  const handleSelectProfile = (profile: SavedStaffProfile) => {
    if (isEditMode) return;
    setSelectedProfile(profile);
    setEmail(profile.email);
    setPassword("");
    setError("");
  };

  // Back to Profiles Screen
  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setShowDirectForm(false);
    setError("");
    setPassword("");
  };

  // Submit Login (Handles both Hotstar Profile selection and new staff login)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const targetEmail = (selectedProfile ? selectedProfile.email : email).trim().toLowerCase();

    try {
      // 1. Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      const fbUser = userCredential.user;

      // 2. Fetch User Record
      const userDocRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userSession = {
          uid: fbUser.uid,
          email: fbUser.email || targetEmail,
          role: (userData.role as any) || "receptionist",
          name: userData.name || (selectedProfile ? selectedProfile.name : "Staff Member"),
        };

        // Persist session
        localStorage.setItem("gpc_user", JSON.stringify(userSession));
        document.cookie = `gpc_session=${userSession.role}; path=/`;

        // Automatically save profile to Hotstar multi-profile switcher
        persistStaffProfile({
          email: userSession.email,
          name: userSession.name,
          role: userSession.role,
        });

        router.replace("/dashboard");
      } else {
        setError("Access Denied. Your profile was not found in the staff database.");
        setLoading(false);
      }
    } catch (err: any) {
      console.warn("Login attempt failed. Checking bootstrap rules...", err.code);

      // 3. Fallback Bootstrapping for Demo / Seed Accounts
      if (
        (targetEmail === "admin@gaitphysio.com" && password === "admin123") ||
        (targetEmail === "receptionist@gaitphysio.com" && password === "receptionist123")
      ) {
        try {
          const isDefaultAdmin = targetEmail === "admin@gaitphysio.com";
          const defaultRole = isDefaultAdmin ? ("admin" as const) : ("receptionist" as const);
          const defaultName = isDefaultAdmin ? "Dr. Rohan (Admin)" : "Anjali (Receptionist)";

          const cred = await createUserWithEmailAndPassword(auth, targetEmail, password);
          const userDocRef = doc(db, "users", cred.user.uid);
          const profile = {
            uid: cred.user.uid,
            email: targetEmail,
            role: defaultRole,
            name: defaultName,
            createdAt: Timestamp.now(),
          };
          await setDoc(userDocRef, profile);

          localStorage.setItem("gpc_user", JSON.stringify(profile));
          document.cookie = `gpc_session=${defaultRole}; path=/`;

          persistStaffProfile({
            email: profile.email,
            name: profile.name,
            role: profile.role,
          });

          router.replace("/dashboard");
          return;
        } catch (createErr: any) {
          console.error("Auto bootstrap registration failed:", createErr);
        }
      }

      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid password. Please check your credentials and try again.");
      } else {
        setError(err.message || "An unexpected sign-in error occurred.");
      }
      setLoading(false);
    }
  };

  // Determine whether to show the Hotstar "Who's Logging In?" screen
  const showProfilePicker = savedProfiles.length > 0 && !selectedProfile && !showDirectForm;

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[92vh] px-4 py-10 sm:px-6 lg:px-8 bg-[#070d12] text-white relative overflow-hidden select-none">
      
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/40 via-[#070d12] to-[#04080b] pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Left Clinic Brand Star */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-10 flex items-center gap-2.5 z-20">
        <div className="w-8 h-8 rounded-xl bg-teal-900/40 border border-teal-500/30 p-1 flex items-center justify-center shadow-lg">
          <img
            src="/images/gait_physio_emblem.png"
            alt="Gait Physio Clinic"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-teal-300 hidden sm:inline">
          Gait Physio Portal
        </span>
      </div>

      {/* ========================================================================= */}
      {/* SCENARIO 1: HOTSTAR "WHO'S LOGGING IN?" PROFILE SELECTION GRID             */}
      {/* ========================================================================= */}
      {showProfilePicker && (
        <div className="w-full max-w-4xl mx-auto text-center z-10 space-y-10 animate-fade-in px-4">
          
          {/* Header Row with Hotstar Title & Edit Toggle */}
          <div className="relative flex items-center justify-center">
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                Who&apos;s logging in?
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-2">
                Select your staff profile to enter your password and access clinic records.
              </p>
            </div>

            {/* Top Right "Edit" Button (Hotstar style) */}
            <div className="absolute right-0 top-0 sm:top-2">
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isEditMode
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
              >
                {isEditMode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Profile Tiles Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-4">
            {savedProfiles.map((prof) => (
              <div
                key={prof.email}
                onClick={() => handleSelectProfile(prof)}
                className="group flex flex-col items-center cursor-pointer transition-all duration-300 relative focus:outline-none"
              >
                {/* Delete Badge in Edit Mode */}
                {isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteProfile(e, prof.email)}
                    className="absolute -top-1.5 -right-1.5 z-30 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl border-2 border-[#070d12] animate-bounce"
                    title={`Remove ${prof.name} shortcut`}
                  >
                    <X className="w-4 h-4 font-black" />
                  </button>
                )}

                {/* Circular Avatar */}
                <div
                  className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr ${prof.avatarBg} p-1 shadow-2xl transition-transform duration-300 ${
                    isEditMode ? "animate-pulse" : "group-hover:scale-108 group-hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] group-active:scale-95"
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-[#0d141b] flex flex-col items-center justify-center text-white relative overflow-hidden border-2 border-white/20">
                    <span className="text-3xl sm:text-4xl select-none">
                      {prof.avatarEmoji || "🩺"}
                    </span>
                  </div>
                </div>

                {/* Profile Name & Role */}
                <span className="mt-3.5 text-sm sm:text-base font-bold text-slate-200 group-hover:text-white transition-colors truncate max-w-[120px]">
                  {prof.name}
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400/80 mt-0.5">
                  {prof.role}
                </span>
              </div>
            ))}

            {/* "+ Add" Staff Profile Tile (Hotstar style) */}
            <div
              onClick={() => {
                setShowDirectForm(true);
                setEmail("");
                setPassword("");
                setError("");
              }}
              className="group flex flex-col items-center cursor-pointer transition-all duration-300"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-slate-700 group-hover:border-teal-400 bg-slate-900/60 group-hover:bg-slate-800/80 flex items-center justify-center text-slate-500 group-hover:text-teal-300 group-hover:scale-108 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 group-active:scale-95">
                <Plus className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <span className="mt-3.5 text-sm sm:text-base font-bold text-slate-400 group-hover:text-slate-200 transition-colors">
                Add Staff
              </span>
              <span className="text-[10px] font-semibold text-slate-600 mt-0.5">
                New Login
              </span>
            </div>
          </div>

          {/* Footer Assistance */}
          <div className="pt-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-500 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              Protected by Enterprise Clinical Security
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 2: PASSWORD PROMPT FOR SELECTED PROFILE                          */}
      {/* ========================================================================= */}
      {selectedProfile && (
        <div className="w-full max-w-md mx-auto z-10 animate-fade-in px-4">
          <div className="bg-slate-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Back Button */}
            <button
              type="button"
              onClick={handleBackToProfiles}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to profiles</span>
            </button>

            {/* Profile Avatar Header */}
            <div className="text-center space-y-3 pt-2">
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-[#0d141b] flex items-center justify-center text-3xl">
                  {selectedProfile.avatarEmoji || "🩺"}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-white">
                  {selectedProfile.name}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-950/80 border border-teal-800 text-[10px] font-black uppercase tracking-wider text-teal-300 mt-1">
                  <UserCheck className="w-3 h-3" />
                  <span>{selectedProfile.role}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-red-950/40 border border-red-800 text-red-300 text-xs font-bold rounded-2xl animate-shake">
                {error}
              </div>
            )}

            {/* Password Form (Email Locked) */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Account Email (Locked)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    disabled
                    value={selectedProfile.email}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950/70 pl-11 pr-4 py-3 text-xs font-semibold text-slate-300 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Enter Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-11 py-3 text-xs font-semibold outline-none focus:border-teal-400 transition-colors text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-brand-green hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 text-xs font-black shadow-lg shadow-emerald-950/50 transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying session...</span>
                  </>
                ) : (
                  <span>Unlock Workspace</span>
                )}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleBackToProfiles}
                className="text-xs text-slate-400 hover:text-teal-300 transition-colors font-medium"
              >
                Not {selectedProfile.name}? <span className="underline font-bold">Switch Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENARIO 3: DIRECT LOGIN FORM (FIRST TIME OR "+ ADD STAFF")               */}
      {/* ========================================================================= */}
      {(showDirectForm || savedProfiles.length === 0) && !selectedProfile && (
        <div className="w-full max-w-md mx-auto z-10 animate-fade-in px-4">
          <div className="bg-slate-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
            
            {savedProfiles.length > 0 && (
              <button
                type="button"
                onClick={handleBackToProfiles}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to profile picker</span>
              </button>
            )}

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-2xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-lg">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Staff Management Login
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Log in with your clinic credentials. A 1-tap fast profile shortcut will be created for this device.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-red-950/40 border border-red-800 text-red-300 text-xs font-bold rounded-2xl animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@gaitphysio.com"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-teal-400 transition-colors text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-11 pr-11 py-3 text-xs font-semibold outline-none focus:border-teal-400 transition-colors text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-brand-green hover:from-emerald-500 hover:to-teal-500 text-white py-3.5 text-xs font-black shadow-lg shadow-emerald-950/50 transition-all duration-200 hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In & Create Profile</span>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-500 text-[9px] font-bold tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                MANAGEMENT PORTAL PWA (MULTI-ACCOUNT ENGINE)
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
