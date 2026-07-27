"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
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
  Receipt
} from "lucide-react";
import { FEATURES } from "@/lib/features";
export default function PatientHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    }>
      <PatientHubContent>{children}</PatientHubContent>
    </Suspense>
  );
}

function PatientHubContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // If the Patient Hub is deactivated, redirect users immediately back to home
    if (!FEATURES.enablePatientHub) {
      router.push("/");
      return;
    }

    // Skip checks for the login page
    if (pathname === "/patienthub/login") {
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/patienthub/login");
        return;
      }

      try {
        const q = query(
          collection(db, "patients"),
          where("email", "==", firebaseUser.email)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          // Access Denied: Not registered as a patient
          await auth.signOut();
          router.push(`/patienthub/login?error=not_registered&email=${encodeURIComponent(firebaseUser.email || "")}`);
          return;
        }

        const docData = snap.docs[0].data();
        const matchedPatient = { id: snap.docs[0].id, ...docData } as Patient;
        setPatient(matchedPatient);
        
        // Cache user info in localStorage for offline availability check
        localStorage.setItem("gpc_patient", JSON.stringify(matchedPatient));
        setCheckingAuth(false);
      } catch (err) {
        console.error("Patient validation error:", err);
        await auth.signOut();
        router.push("/patienthub/login?error=auth_failed");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("gpc_patient");
      router.push("/patienthub/login");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // Render clean children directly during auth check for login page
  if (pathname === "/patienthub/login") {
    return <div className="min-h-screen">{children}</div>;
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand-green mx-auto" />
          <p className="text-xs text-slate-500 font-bold tracking-wider uppercase">Authenticating Patient Hub...</p>
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col pb-20 md:pb-0">
      {/* Top Header Navbar - visible on desktop/tablets */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-slate-900/95 backdrop-blur-sm select-none">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand Logo Link */}
          <Link href="/patienthub/dashboard" className="flex items-center gap-2 font-black text-brand-green dark:text-emerald-400">
            <Activity className="h-6 w-6 text-brand-green" />
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Patient<span className="text-brand-green dark:text-emerald-400">Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/patienthub/dashboard" 
              className={`text-sm font-black transition-colors ${
                pathname === "/patienthub/dashboard"
                  ? "text-brand-green dark:text-emerald-400"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              Dashboard
            </Link>
            <Link 
              href="/patienthub/appointments" 
              className={`text-sm font-black transition-colors ${
                pathname === "/patienthub/appointments"
                  ? "text-brand-green dark:text-emerald-400"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              Appointments
            </Link>
            <Link 
              href="/patienthub/exercises" 
              className={`text-sm font-black transition-colors ${
                pathname === "/patienthub/exercises"
                  ? "text-brand-green dark:text-emerald-400"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              Exercises
            </Link>
            <Link 
              href="/patienthub/profile" 
              className={`text-sm font-black transition-colors ${
                pathname === "/patienthub/profile"
                  ? "text-brand-green dark:text-emerald-400"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              Profile & Billing
            </Link>
          </nav>

          {/* Desktop Right Hand Toolbar */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
              <Bell className="h-4.5 w-4.5" />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-colors">
              <Settings className="h-4.5 w-4.5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
            
            {/* User Initials Avatar */}
            <div className="h-9 w-9 rounded-full bg-brand-green text-white dark:bg-emerald-500 dark:text-slate-950 flex items-center justify-center font-black text-xs shadow-inner">
              {initials}
            </div>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Bottom Navigation Bar - visible on mobile screens only */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 border-t border-slate-200/80 dark:border-slate-800/85 backdrop-blur-md flex justify-around items-center h-16 select-none shadow-lg">
        <Link 
          href="/patienthub/dashboard" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            pathname === "/patienthub/dashboard" 
              ? "text-brand-green dark:text-emerald-400 font-extrabold" 
              : "text-slate-450 hover:text-brand-green"
          }`}
        >
          <Home className="h-5.5 w-5.5" />
          <span className="text-[9px] tracking-wider uppercase font-black mt-1">Home</span>
        </Link>
        
        <Link 
          href="/patienthub/appointments" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            pathname === "/patienthub/appointments" 
              ? "text-brand-green dark:text-emerald-400 font-extrabold" 
              : "text-slate-450 hover:text-brand-green"
          }`}
        >
          <Calendar className="h-5.5 w-5.5" />
          <span className="text-[9px] tracking-wider uppercase font-black mt-1">Calendar</span>
        </Link>

        <Link 
          href="/patienthub/exercises" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            pathname === "/patienthub/exercises" 
              ? "text-brand-green dark:text-emerald-400 font-extrabold" 
              : "text-slate-450 hover:text-brand-green"
          }`}
        >
          <Dumbbell className="h-5.5 w-5.5" />
          <span className="text-[9px] tracking-wider uppercase font-black mt-1">Workouts</span>
        </Link>

        <Link 
          href="/patienthub/profile" 
          className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
            pathname === "/patienthub/profile" 
              ? "text-brand-green dark:text-emerald-400 font-extrabold" 
              : "text-slate-450 hover:text-brand-green"
          }`}
        >
          <User className="h-5.5 w-5.5" />
          <span className="text-[9px] tracking-wider uppercase font-black mt-1">User</span>
        </Link>
      </nav>
    </div>
  );
}
