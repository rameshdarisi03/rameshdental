"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Activity, ShieldAlert, Loader2, Mail, Lock, KeyRound, ArrowLeft, Smartphone, Download, QrCode } from "lucide-react";
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

  // Pending Google Account state for linking
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleUser | null>(null);

  useEffect(() => {
    // Listen for browser PWA install trigger
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
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

      if (snap.empty) {
        // Not registered - prompt them for Activation Code to link this Google login
        setPendingGoogle({
          email: user.email || "",
          uid: user.uid,
          displayName: user.displayName || "Patient"
        });
        setLoading(false);
        return;
      }

      // Patient found - update UID link just in case
      const patientDoc = snap.docs[0];
      await updateDoc(doc(db, "patients", patientDoc.id), {
        authUid: user.uid,
        activated: true
      });

      router.push("/patienthub/dashboard");
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
      const q = query(collection(db, "patients"), where("activationCode", "==", activationCode.trim().toUpperCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Invalid activation code. Please check with your clinic receptionist.");
        setLoading(false);
        return;
      }

      const patientDoc = snap.docs[0];
      
      // Update patient doc to link Google account details
      await updateDoc(doc(db, "patients", patientDoc.id), {
        email: pendingGoogle.email,
        authUid: pendingGoogle.uid,
        activated: true,
        activationCode: "" // clear code so it cannot be used again
      });

      router.push("/patienthub/dashboard");
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
          const q = query(
            collection(db, "patients"), 
            where("activationCode", "==", activationCode.trim().toUpperCase())
          );
          const snap = await getDocs(q);

          if (snap.empty) {
            // Invalid activation code: delete the newly created auth user to prevent orphaned accounts
            if (auth.currentUser) {
              await auth.currentUser.delete();
            }
            await auth.signOut();
            setError("Invalid activation code. Please contact the front desk to get a valid code.");
            setLoading(false);
            return;
          }

          const patientDoc = snap.docs[0];

          // Link and activate patient record
          await updateDoc(doc(db, "patients", patientDoc.id), {
            email: email.trim(),
            authUid: cred.user.uid,
            activated: true,
            activationCode: "" // clear activation code
          });
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
        // 1. Authenticate first
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

        // 2. Query Firestore now that we are authenticated
        try {
          const q = query(collection(db, "patients"), where("email", "==", email.trim()));
          const snap = await getDocs(q);

          if (snap.empty) {
            // Logged in but has no patient chart: logout immediately
            await auth.signOut();
            setError("This email address is not registered as a patient. Sign up with an activation code first.");
            setLoading(false);
            return;
          }
          
          // Sync authUid just in case it wasn't set
          const patientDoc = snap.docs[0];
          if (!patientDoc.data().authUid) {
            await updateDoc(doc(db, "patients", patientDoc.id), {
              authUid: cred.user.uid
            });
          }
        } catch (dbErr: any) {
          console.error("Database lookup error during signin:", dbErr);
          await auth.signOut();
          throw dbErr;
        }
      }
      
      router.push("/patienthub/dashboard");
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
      router.push("/");
    }
  }, [router]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat relative gap-6"
      style={{ backgroundImage: "url('/images/hero-bg-opt.webp')" }}
    >
      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-slate-950/15 dark:bg-slate-950/40 pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md space-y-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 select-none animate-fade-in">
        
        {/* Scenario: Pending Google Account Registration */}
        {pendingGoogle ? (
          <div className="space-y-6">
            <button
              onClick={() => setPendingGoogle(null)}
              className="flex items-center gap-1 text-xs font-black text-slate-500 hover:text-brand-green uppercase tracking-wider cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </button>

            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green dark:text-emerald-400 mb-4">
                <KeyRound className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Link Google Account</h2>
              <p className="mt-1.5 text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                Enter the activation code sent to you by the clinic to link <span className="text-slate-800 dark:text-slate-200 font-black">{pendingGoogle.email}</span>.
              </p>
            </div>

            {error && (
              <div className="flex gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-4 rounded-2xl text-xs text-red-600 dark:text-red-400 font-semibold">
                <ShieldAlert className="h-5.5 w-5.5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleGoogleLinkActivation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">Activation Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="8-Character Code"
                    className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-slate-100 font-black tracking-widest uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" />
                ) : (
                  "Verify & Link Account"
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Scenario: Regular Login / Signup Form */
          <>
            {/* Brand Header */}
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green dark:text-emerald-400 mb-4">
                <Activity className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">GPC Patient Hub</h2>
              <p className="mt-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
                {isSignUp ? "Register Portal Profile" : "Sign In to Your Portal"}
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="flex gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-4 rounded-2xl text-xs text-red-600 dark:text-red-400 leading-relaxed font-semibold">
                <ShieldAlert className="h-5.5 w-5.5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-205 dark:border-slate-750 bg-white dark:bg-slate-850 px-4 py-3 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {/* Google G Icon */}
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.36-2.85-6.36-6.36s2.85-6.36 6.36-6.36c1.53 0 2.93.55 4.02 1.48l3.1-3.1C18.98 2.19 15.82 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c5.84 0 10.84-4.22 10.84-11.24 0-.76-.08-1.46-.22-1.96H12.24z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
              </div>
              <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] font-black uppercase text-slate-400">OR</span>
            </div>

            {/* Email Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {/* Activation Code Field (Only shown on signup) */}
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">Activation Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      placeholder="8-Character Code"
                      className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-slate-100 font-black tracking-widest uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 transition-colors text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" />
                ) : isSignUp ? (
                  "Register Hub Profile"
                ) : (
                  "Sign In to Hub"
                )}
              </button>
            </form>

            {/* Toggle Mode Button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(!isSignUp);
                }}
                className="text-xs font-black text-slate-500 hover:text-brand-green uppercase tracking-wider cursor-pointer"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need access? Register Password"}
              </button>
            </div>
          </>
        )}

      </div>

      {/* Catchy PWA Install App & QR Code Banner Card */}
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-2xl relative z-10 select-none animate-fade-in flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-white p-2.5 rounded-2xl shadow-inner border border-slate-100 shrink-0">
          <img 
            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https%3A%2F%2Fgait-physio-clinic-v1.vercel.app%2Fpatienthub%2Flogin&color=1b3d2f&bgcolor=ffffff" 
            alt="Scan QR Code to install Patient Hub app"
            className="w-24 h-24 rounded-lg object-contain"
          />
        </div>
        <div className="space-y-2 text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 bg-brand-green/10 text-brand-green dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
            <Smartphone className="h-3 w-3" />
            <span>Install Mobile App</span>
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">Get Patient Hub on Your Phone</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            Scan QR code with your phone camera or tap below to add Patient Hub to your home screen.
          </p>
          
          {isInstallable ? (
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer w-full sm:w-auto mt-1"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </button>
          ) : (
            <p className="text-[9px] text-slate-400 font-extrabold italic pt-0.5">
              Tip: On iOS Safari tap Share → Add to Home Screen
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
