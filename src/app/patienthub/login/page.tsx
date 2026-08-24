"use client";

import { useState, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Activity, ShieldAlert, Loader2, Mail, Lock, KeyRound, ArrowLeft, Smartphone, Download, QrCode, Monitor, X } from "lucide-react";
import { FEATURES } from "@/lib/features";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

interface PendingGoogleUser {
  email: string;
  uid: string;
  displayName: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // PWA Native Install Prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installInstructions, setInstallInstructions] = useState<string | null>(null);

  // Pending Google Account state for linking
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleUser | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
      
      // If the prompt already fired and was captured globally in RootLayout
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setIsInstallable(true);
      }
    }

    // Listen for browser PWA install trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      if (typeof window !== "undefined") {
        (window as any).deferredPrompt = e;
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.error("Error triggering install prompt:", err);
      }
    }

    // Fallback: If browser doesn't trigger beforeinstallprompt (e.g. iOS Safari, Chrome on iOS, or already installed)
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setInstallInstructions(
        "To install on iOS: Tap the 'Share' button (square icon with up arrow) at the bottom of Safari, scroll down, and select 'Add to Home Screen'."
      );
    } else if (isAndroid) {
      setInstallInstructions(
        "To install on Android: Tap the three vertical dots menu icon in Chrome (top right), then select 'Add to Home screen' or 'Install app'."
      );
    } else {
      setInstallInstructions(
        "To install on Desktop: Click the 'Install App' icon (square with arrow) at the right side of your Chrome or Edge address bar. \n\nNote: If the install icon is not showing, the app might already be installed on your computer! Please search your Windows Start Menu or macOS Applications list for 'Gait Physio Clinic'."
      );
    }
  };

  useEffect(() => {
    if (errorParam === "not_registered") {
      setError(`Access Denied: The account "${emailParam || ""}" is not linked to any patient record in our system. Please contact the front desk to link your account.`);
    } else if (errorParam === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [errorParam, emailParam]);

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // 1. Look up patient matching email
      const q = query(collection(db, "patients"), where("email", "==", user.email));
      const snap = await getDocs(q);
      let matchedDoc: any = null;
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else if (user.email) {
        const q2 = query(collection(db, "patients"), where("email", "==", user.email.toLowerCase()));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) matchedDoc = snap2.docs[0];
      }

      if (!matchedDoc && user.email) {
        const allSnap = await getDocs(collection(db, "patients"));
        const target = user.email.trim().toLowerCase();
        for (const d of allSnap.docs) {
          if (d.data().email?.trim().toLowerCase() === target) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc) {
        // Not registered - prompt them for Activation Code to link this Google login
        setPendingGoogle({
          email: user.email || "",
          uid: user.uid,
          displayName: user.displayName || "Patient"
        });
        setLoading(false);
        return;
      }

      // Patient found - update UID link and save session
      const patientDoc = matchedDoc;
      const patientData = patientDoc.data();
      const sessionObj = { ...patientData, id: patientDoc.id };

      await updateDoc(doc(db, "patients", patientDoc.id), {
        authUid: user.uid,
        activated: true
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(sessionObj));
      }

      router.replace("/patienthub/dashboard");
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to log in with Google.");
      }
      setLoading(false);
    }
  };

  const handleGoogleLinkActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!activationCode || !pendingGoogle) {
      setError("Please enter your activation code.");
      setLoading(false);
      return;
    }

    try {
      // Find patient matching activation code
      const cleanCode = activationCode.trim().toUpperCase();
      let matchedDoc: any = null;
      const q = query(collection(db, "patients"), where("activationCode", "==", cleanCode));
      const snap = await getDocs(q);

      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else {
        const allSnap = await getDocs(collection(db, "patients"));
        for (const d of allSnap.docs) {
          const data = d.data();
          if (data.activationCode?.trim().toUpperCase() === cleanCode || d.id.toUpperCase() === cleanCode) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc) {
        setError("Invalid activation code. Please check with your clinic receptionist.");
        setLoading(false);
        return;
      }

      const patientDoc = matchedDoc;
      const patientData = patientDoc.data();
      const sessionObj = {
        ...patientData,
        id: patientDoc.id,
        email: pendingGoogle.email.toLowerCase().trim(),
        authUid: pendingGoogle.uid,
        activated: true
      };
      
      // Update patient doc to link Google account details
      await updateDoc(doc(db, "patients", patientDoc.id), {
        email: pendingGoogle.email.toLowerCase().trim(),
        authUid: pendingGoogle.uid,
        activated: true,
        activationCode: "" // clear code so it cannot be used again
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(sessionObj));
      }

      router.replace("/patienthub/dashboard");
    } catch (err: any) {
      console.error("Linking Google account failed:", err);
      setError(err.message || "Failed to link Google account.");
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in email and password fields.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Mode:
        if (!activationCode) {
          setError("Activation code is required for initial sign-up.");
          setLoading(false);
          return;
        }

        // 1. Create the Firebase Auth account first to get authenticated state
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

        // 2. Query Firestore now that we are authenticated
        try {
          const cleanCode = activationCode.trim().toUpperCase();
          let matchedDoc: any = null;
          const q = query(
            collection(db, "patients"), 
            where("activationCode", "==", cleanCode)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            matchedDoc = snap.docs[0];
          } else {
            const allSnap = await getDocs(collection(db, "patients"));
            for (const d of allSnap.docs) {
              const data = d.data();
              if (data.activationCode?.trim().toUpperCase() === cleanCode || d.id.toUpperCase() === cleanCode) {
                matchedDoc = d;
                break;
              }
            }
          }

          if (!matchedDoc) {
            // Invalid activation code: delete the newly created auth user to prevent orphaned accounts
            if (auth.currentUser) {
              await auth.currentUser.delete();
            }
            await auth.signOut();
            setError("Invalid activation code. Please contact the front desk to get a valid code.");
            setLoading(false);
            return;
          }

          const patientDoc = matchedDoc;
          const patientData = patientDoc.data();
          const sessionObj = {
            ...patientData,
            id: patientDoc.id,
            email: email.trim().toLowerCase(),
            authUid: cred.user.uid,
            activated: true
          };

          // Link and activate patient record
          await updateDoc(doc(db, "patients", patientDoc.id), {
            email: email.trim().toLowerCase(),
            authUid: cred.user.uid,
            activated: true,
            activationCode: "" // clear activation code
          });

          if (typeof window !== "undefined") {
            localStorage.setItem("gpc_patient", JSON.stringify(sessionObj));
          }
        } catch (dbErr: any) {
          console.error("Database linking error during signup:", dbErr);
          if (auth.currentUser) {
            await auth.currentUser.delete();
          }
          await auth.signOut();
          throw dbErr;
        }
      } else {
        // Sign In Mode:
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

        try {
          let matchedDoc: any = null;
          const target = email.trim().toLowerCase();
          const q1 = query(collection(db, "patients"), where("email", "==", email.trim()));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) matchedDoc = snap1.docs[0];

          if (!matchedDoc) {
            const q2 = query(collection(db, "patients"), where("email", "==", target));
            const snap2 = await getDocs(q2);
            if (!snap2.empty) matchedDoc = snap2.docs[0];
          }

          if (!matchedDoc) {
            const allSnap = await getDocs(collection(db, "patients"));
            for (const d of allSnap.docs) {
              if (d.data().email?.trim().toLowerCase() === target) {
                matchedDoc = d;
                break;
              }
            }
          }

          if (!matchedDoc) {
            await auth.signOut();
            setError("This email address is not registered as a patient. Sign up with an activation code first.");
            setLoading(false);
            return;
          }
          
          const patientDoc = matchedDoc;
          const sessionObj = { ...patientDoc.data(), id: patientDoc.id };

          if (!patientDoc.data().authUid) {
            await updateDoc(doc(db, "patients", patientDoc.id), {
              authUid: cred.user.uid
            });
          }

          if (typeof window !== "undefined") {
            localStorage.setItem("gpc_patient", JSON.stringify(sessionObj));
          }
        } catch (dbErr: any) {
          console.error("Database lookup error during signin:", dbErr);
          await auth.signOut();
          throw dbErr;
        }
      }
      
      router.replace("/patienthub/dashboard");
    } catch (err: any) {
      console.error("Email authentication failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered in our system. Try signing in.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setError("Invalid email or password. Please verify and try again.");
      } else {
        setError(err.message || "Authentication failed.");
      }
      setLoading(false);
    }
  };

  // If Patient Hub is disabled in features configuration
  useEffect(() => {
    if (!FEATURES.enablePatientHub) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:px-6 bg-[#F9F9F7] dark:bg-[#062e36] text-[#1A1C1B] dark:text-white relative gap-6 font-['Inter',sans-serif]">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#21444D]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#f9ab55]/10 rounded-full blur-3xl" />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-white/10 p-7 sm:p-9 rounded-[32px] shadow-[0_16px_48px_rgba(6,46,54,0.08)] relative z-10 select-none animate-fade-in">
        
        {/* Scenario: Pending Google Account Registration */}
        {pendingGoogle ? (
          <div className="space-y-5">
            <button
              onClick={() => setPendingGoogle(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#8a5100] dark:text-[#f9ab55] hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#062e36] text-[#f9ab55] shadow-md mb-1">
                <KeyRound className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">Link Google Account</h2>
              <p className="text-xs text-[#41484A] dark:text-slate-300 leading-relaxed">
                Enter your 8-character activation code to link <span className="font-bold text-[#062e36] dark:text-white">{pendingGoogle.email}</span>.
              </p>
            </div>

            {error && (
              <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3.5 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleGoogleLinkActivation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Activation Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="e.g. GP8842X"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] font-black tracking-widest uppercase text-[#1A1C1B] dark:text-white transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  "Verify & Connect Account"
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Scenario: Regular Login / Signup Form */
          <>
            {/* Brand Header */}
            <div className="text-center flex flex-col items-center space-y-2 mb-6">
              <div className="relative">
                <img 
                  src="/images/gait_physio_logo.png" 
                  alt="GaitPhysio Logo" 
                  className="h-14 w-14 object-contain drop-shadow-[0_4px_16px_rgba(249,171,85,0.25)]"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-1.5 font-['Plus_Jakarta_Sans',sans-serif]">
                  <span>Gait</span> <span className="text-brand-green dark:text-teal-400">Physio</span>
                </h1>
                <p className="text-[10px] text-[#8a5100] dark:text-[#f9ab55] font-extrabold uppercase tracking-[0.2em] mt-0.5">
                  Patient Hub
                </p>
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3.5 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium mb-4">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50 mb-5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.36-2.85-6.36-6.36s2.85-6.36 6.36-6.36c1.53 0 2.93.55 4.02 1.48l3.1-3.1C18.98 2.19 15.82 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c5.84 0 10.84-4.22 10.84-11.24 0-.76-.08-1.46-.22-1.96H12.24z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
              </div>
              <span className="relative bg-white dark:bg-[#121a1d] px-3 text-[10px] font-bold uppercase text-slate-400">OR EMAIL</span>
            </div>

            {/* Email Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              
              {/* Activation Code Field (Only shown on signup) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Activation Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      placeholder="8-Character Code"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] transition-colors text-slate-800 dark:text-slate-100 font-bold tracking-widest uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@email.com"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] transition-colors text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] transition-colors text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : isSignUp ? (
                  "Create Hub Account"
                ) : (
                  "Sign In to Care Portal"
                )}
              </button>
            </form>

            {/* Toggle Mode Button */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(!isSignUp);
                }}
                className="text-xs font-bold text-[#8a5100] dark:text-[#f9ab55] hover:underline cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "First time visiting? Register with Code"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* PWA App Installation Hub */}
      {mounted && !isStandalone && (
        <div className="w-full max-w-md bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-white/10 p-5 rounded-3xl shadow-sm flex items-center justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[#062e36] text-[#f9ab55] flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#062e36] dark:text-white">Install GaitPhysio App</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                1-tap access on your home screen
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 bg-[#062e36] dark:bg-[#f9ab55] text-white dark:text-[#062e36] px-4 py-2 rounded-full text-xs font-bold transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </button>
        </div>
      )}

      {/* PWA Help Overlay Modal */}
      {mounted && installInstructions && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-orange-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-sm shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Installation Guide</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Add to Home Screen</p>
                </div>
              </div>
              <button
                onClick={() => setInstallInstructions(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold">
                {installInstructions}
              </p>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end shrink-0">
              <button
                onClick={() => setInstallInstructions(null)}
                className="bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
