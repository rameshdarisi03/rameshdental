"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PatientAuthProvider, usePatientAuth } from "@/providers/PatientAuthProvider";
import Link from "next/link";
import { 
  Activity, 
  Home, 
  Calendar, 
  Dumbbell, 
  User, 
  LogOut, 
  Bell, 
  Settings, 
  Loader2,
  FileText,
  Sun,
  Moon
} from "lucide-react";
import { FEATURES } from "@/lib/features";
import ProfileSelectorModal from "@/components/patienthub/ProfileSelectorModal";

// Dedicated Switch Profiles Icon matching user reference image
export function SwitchProfilesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top right user */}
      <circle cx="16" cy="6" r="2.5" />
      <path d="M12.5 12a3.5 3.5 0 0 1 7 0" />

      {/* Bottom left user */}
      <circle cx="8" cy="18" r="2.5" />
      <path d="M4.5 24a3.5 3.5 0 0 1 7 0" />

      {/* Top curved clockwise arrow */}
      <path d="M5.5 8a8 8 0 0 1 7.5-4h1" />
      <polyline points="11 1 14 4 11 7" />

      {/* Bottom curved counter-clockwise arrow */}
      <path d="M18.5 16a8 8 0 0 1-7.5 4h-1" />
      <polyline points="13 23 10 20 13 17" />
    </svg>
  );
}

export default function PatientHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PatientAuthProvider>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        </div>
      }>
        <PatientHubContent>{children}</PatientHubContent>
      </Suspense>
    </PatientAuthProvider>
  );
}

function PatientHubContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { patient, loading, logout, availableProfiles, setShowProfileSelector } = usePatientAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  // Dedicated Clean Route Protection Guard (TenoPilot pattern)
  useEffect(() => {
    if (!FEATURES.enablePatientHub) {
      router.replace("/");
      return;
    }

    if (loading) return;

    if (!patient && pathname !== "/patienthub/login") {
      router.replace("/patienthub/login");
    } else if (patient && pathname === "/patienthub/login") {
      router.replace("/patienthub/dashboard");
    }
  }, [loading, patient, pathname, router]);

  // Render clean children directly for login page
  if (pathname === "/patienthub/login") {
    return <div className="min-h-screen">{children}</div>;
  }

  if (loading || !patient) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#062e36] text-white">
        <div className="text-center space-y-4 animate-fade-in flex flex-col items-center">
          <div className="relative">
            <img 
              src="/images/gait_physio_logo.png" 
              alt="GaitPhysio Logo" 
              className="h-16 w-16 object-contain drop-shadow-[0_8px_24px_rgba(249,171,85,0.3)] animate-pulse"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
              <span>Gait</span> <span className="text-emerald-400">Physio</span>
            </h1>
            <p className="text-[10px] text-[#f9ab55] font-black tracking-[0.25em] uppercase mt-1">
              Patient Hub
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300/80 font-medium pt-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#f9ab55]" />
            <span>{!patient ? "Redirecting to Patient Login..." : "Connecting to your care timeline..."}</span>
          </div>
        </div>
      </div>
    );
  }

  const patientName = patient?.name || "Patient";
  const initials = patientName
    .trim()
    .split(/\s+/)
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "PT";

  return (
    <div className="min-h-screen bg-[#F9F9F7] dark:bg-[#121a1d] text-[#1A1C1B] dark:text-[#f1f0f1] flex flex-col pb-24 md:pb-8 font-['Inter',sans-serif]">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#21444D]/10 dark:border-slate-800 bg-[#F9F9F7]/90 dark:bg-[#062e36]/95 backdrop-blur-md select-none transition-colors">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          
          {/* Brand Logo Link */}
          <Link href="/patienthub/dashboard" className="flex items-center gap-2.5 group">
            <img 
              src="/images/gait_physio_logo.png" 
              alt="GaitPhysio" 
              className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-brand-green dark:text-white leading-none">
                Gait Physio Clinic
              </span>
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55] mt-1">
                Patient Hub
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#21444D]/5 dark:bg-white/5 p-1 rounded-full border border-[#21444D]/10 dark:border-white/10">
            <Link 
              href="/patienthub/dashboard" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pathname === "/patienthub/dashboard"
                  ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
                  : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/patienthub/exercises" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pathname === "/patienthub/exercises"
                  ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
                  : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
              }`}
            >
              Exercises
            </Link>
            <Link 
              href="/patienthub/records" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pathname === "/patienthub/records"
                  ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
                  : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
              }`}
            >
              Health Records
            </Link>
            <Link 
              href="/patienthub/appointments" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pathname === "/patienthub/appointments"
                  ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
                  : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
              }`}
            >
              Appointments
            </Link>
            <Link 
              href="/patienthub/profile" 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                pathname === "/patienthub/profile"
                  ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
                  : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
              }`}
            >
              Profile
            </Link>
          </nav>

          {/* Desktop Right Hand Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-[#21444D]/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="h-4.5 w-4.5 text-[#f9ab55] fill-[#f9ab55]" />
              ) : (
                <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200 fill-current" />
              )}
            </button>

            {/* Switch Profile Button (Visible when circle has > 1 profile) */}
            {availableProfiles && availableProfiles.length > 1 && (
              <button
                onClick={() => setShowProfileSelector(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#21444D]/10 dark:bg-white/10 hover:bg-[#21444D]/20 dark:hover:bg-white/20 text-[#062e36] dark:text-[#f9ab55] border border-[#21444D]/15 dark:border-white/15 transition-all text-xs font-black cursor-pointer shadow-2xs group"
                title="Switch Patient Profile"
              >
                <SwitchProfilesIcon className="w-4 h-4 text-[#8a5100] dark:text-[#f9ab55] group-hover:rotate-180 transition-transform duration-500" />
                <span className="hidden sm:inline">Switch Profile</span>
              </button>
            )}

            <Link
              href="/patienthub/profile"
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
            >
              <div className="h-9 w-9 rounded-full bg-[#062e36] text-[#f9ab55] border border-[#f9ab55]/40 flex items-center justify-center font-bold text-xs shadow-sm">
                {initials}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-[#062e36] dark:text-white truncate max-w-[120px]">
                  {patientName}
                </p>
                <p className="text-[10px] text-[#8a5100] dark:text-[#f9ab55] font-semibold">
                  Active Care
                </p>
              </div>
            </Link>

            <button 
              onClick={logout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full text-red-500 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Netflix/Prime Style Profile Selector Modal */}
      <ProfileSelectorModal />

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-6">
        {children}
      </main>

      {/* Tactile Glassmorphism Bottom Navigation Dock - Mobile */}
      <div className="fixed bottom-3 left-0 right-0 z-40 md:hidden px-4 select-none pointer-events-none">
        <nav className="max-w-md mx-auto pointer-events-auto bg-[#062e36]/95 dark:bg-[#121a1d]/95 backdrop-blur-xl border border-white/15 rounded-full shadow-[0_12px_32px_rgba(6,46,54,0.35)] flex justify-around items-center h-16 px-2">
          
          <Link 
            href="/patienthub/dashboard" 
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all ${
              pathname === "/patienthub/dashboard" 
                ? "text-[#f9ab55] font-extrabold" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[9px] tracking-wider uppercase font-black mt-0.5">Home</span>
            {pathname === "/patienthub/dashboard" && (
              <span className="w-1 h-1 bg-[#f9ab55] rounded-full mt-0.5 animate-pulse" />
            )}
          </Link>
          
          <Link 
            href="/patienthub/exercises" 
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all ${
              pathname === "/patienthub/exercises" 
                ? "text-[#f9ab55] font-extrabold" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Dumbbell className="h-5 w-5" />
            <span className="text-[9px] tracking-wider uppercase font-black mt-0.5">Workouts</span>
            {pathname === "/patienthub/exercises" && (
              <span className="w-1 h-1 bg-[#f9ab55] rounded-full mt-0.5 animate-pulse" />
            )}
          </Link>

          <Link 
            href="/patienthub/records" 
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all ${
              pathname === "/patienthub/records" 
                ? "text-[#f9ab55] font-extrabold" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[9px] tracking-wider uppercase font-black mt-0.5">Records</span>
            {pathname === "/patienthub/records" && (
              <span className="w-1 h-1 bg-[#f9ab55] rounded-full mt-0.5 animate-pulse" />
            )}
          </Link>

          <Link 
            href="/patienthub/appointments" 
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all ${
              pathname === "/patienthub/appointments" 
                ? "text-[#f9ab55] font-extrabold" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[9px] tracking-wider uppercase font-black mt-0.5">Book</span>
            {pathname === "/patienthub/appointments" && (
              <span className="w-1 h-1 bg-[#f9ab55] rounded-full mt-0.5 animate-pulse" />
            )}
          </Link>

          <Link 
            href="/patienthub/profile" 
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all ${
              pathname === "/patienthub/profile" 
                ? "text-[#f9ab55] font-extrabold" 
                : "text-slate-300 hover:text-white"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[9px] tracking-wider uppercase font-black mt-0.5">Profile</span>
            {pathname === "/patienthub/profile" && (
              <span className="w-1 h-1 bg-[#f9ab55] rounded-full mt-0.5 animate-pulse" />
            )}
          </Link>

        </nav>
      </div>
    </div>
  );
}
