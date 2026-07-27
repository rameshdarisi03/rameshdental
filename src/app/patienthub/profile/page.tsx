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
      await auth.signOut();
      localStorage.removeItem("gpc_patient");
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
    <div className="max-w-2xl mx-auto space-y-6 pb-12 select-none">
      
      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm text-center space-y-4">
        {/* Large Initials Avatar */}
        <div className="h-20 w-20 rounded-full bg-brand-green/10 text-brand-green dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center font-black text-2xl mx-auto border-4 border-slate-50 dark:border-slate-800 shadow-md">
          {initials}
        </div>
        
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
            {patientName}
          </h1>
          <p className="text-xs text-slate-450 font-bold tracking-wider uppercase mt-1">
            GPC ID: {patient?.id || "GPC-BOOK"}
          </p>
        </div>

        {/* Plan of Care badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400">
          <Activity className="h-3.5 w-3.5" />
          <span>Active Plan: {patient?.treatmentPlan || "Cervical Spine Recovery"}</span>
        </div>
      </div>

      {/* Account Details Block */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Hub Account Details</h3>
        
        <div className="space-y-3.5">
          <div className="flex items-center gap-3 py-1">
            <span className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-450 rounded-xl">
              <User className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Full Name</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">{patientName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <span className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-450 rounded-xl">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Email Address</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">{patient?.email || "No registered email"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <span className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-450 rounded-xl">
              <Phone className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Contact Phone</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100">{patient?.phone || "No registered phone"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 py-1">
            <span className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-450 rounded-xl">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider leading-none mb-1">Portal Authentication</p>
              <p className="text-xs font-black text-slate-850 dark:text-emerald-400">Firebase Secured Access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Isolated Medical Records & Drive Vault */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-brand-green dark:text-teal-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Medical Scans & Records Vault
            </h3>
          </div>
          <span className="text-[9px] font-black bg-brand-green/10 text-brand-green dark:text-teal-400 px-2.5 py-0.5 rounded-full uppercase">
            Isolated Folder
          </span>
        </div>

        <p className="text-xs text-slate-500 font-bold leading-relaxed">
          Your clinical records, X-rays, MRI scans, and consultation summaries are encrypted and stored in your private dedicated folder.
        </p>

        {patient?.googleDriveFolderId ? (
          <a
            href={`https://drive.google.com/drive/folders/${patient.googleDriveFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Folder className="h-4 w-4 text-brand-green" />
            Open Private Medical Records Vault →
          </a>
        ) : (
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-xs font-bold text-slate-400">
            No medical scans attached to your record yet.
          </div>
        )}
      </div>

      {/* Preferences & Settings */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Settings & Preferences</h3>

        <div className="space-y-2">
          {/* Theme switcher option */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-colors cursor-pointer border-0"
          >
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-250">
              {isDark ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
              <span className="text-xs font-black">Portal theme</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isDark ? "Dark Mode" : "Light Mode"}</span>
          </button>

          {/* Dummy WhatsApp updates toggle */}
          <div className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl">
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-250">
              <BellRing className="h-4.5 w-4.5 text-brand-green" />
              <span className="text-xs font-black">WhatsApp Reminders</span>
            </div>
            <span className="text-[10px] font-black text-brand-green uppercase tracking-widest">Active</span>
          </div>

          {/* Reset password reminder link */}
          <a
            href="https://wa.me/919206651295?text=I%20would%20like%20to%20reset%20my%20Patient%20Hub%20portal%2520password"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-2xl transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-250">
              <Key className="h-4.5 w-4.5 text-slate-400" />
              <span className="text-xs font-black">Request Password Reset</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support</span>
          </a>
        </div>
      </div>

      {/* Log out primary trigger button */}
      <button
        onClick={handleLogout}
        className="w-full inline-flex items-center justify-center gap-2 bg-red-650 hover:bg-red-600 text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer"
      >
        <LogOut className="h-4.5 w-4.5" />
        Log Out Patient Hub
      </button>

    </div>
  );
}
