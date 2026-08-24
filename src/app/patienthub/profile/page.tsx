"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Activity, 
  LogOut, 
  Loader2, 
  Key, 
  BellRing,
  Moon,
  Sun,
  Folder,
  FileText,
  Receipt
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local theme
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark");
    }

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      setPatient(JSON.parse(localData));
      setLoading(false);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "patients"), where("email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const matched = { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient;
            setPatient(matched);
            localStorage.setItem("gpc_patient", JSON.stringify(matched));
          }
        } catch (err) {
          console.error("Failed to sync patient profile:", err);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("gpc_patient");
      setPatient(null);
      await auth.signOut();
      router.push("/patienthub/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

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

      {/* Preferences & Settings */}
      <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-6 rounded-[28px] shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400 px-1">Settings & Assistance</h3>

        <div className="space-y-2">
          {/* Theme switcher option */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3.5 bg-[#FAF9F9] dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-colors cursor-pointer border-0"
          >
            <div className="flex items-center gap-3 text-[#062e36] dark:text-slate-200">
              {isDark ? <Sun className="h-4 w-4 text-[#f9ab55]" /> : <Moon className="h-4 w-4 text-slate-500" />}
              <span className="text-xs font-bold">Portal Theme</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isDark ? "Dark Mode" : "Light Mode"}</span>
          </button>

          {/* Reset password reminder link */}
          <a
            href="https://wa.me/919206651295?text=I%20would%20like%20to%20request%20assistance%20with%20my%20Patient%20Hub%20portal"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3.5 bg-[#FAF9F9] dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 text-[#062e36] dark:text-slate-200">
              <Key className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold">Help Desk & Account Support</span>
            </div>
            <span className="text-[10px] font-bold text-[#8a5100] dark:text-[#f9ab55] uppercase tracking-widest">WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Log out primary trigger button */}
      <button
        onClick={handleLogout}
        className="w-full inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 py-3.5 rounded-full text-xs font-bold uppercase transition-all shadow-xs cursor-pointer border border-red-200/50"
      >
        <LogOut className="h-4 w-4" />
        <span>Log Out of Patient Hub</span>
      </button>

    </div>
  );
}
