"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { Activity, ShieldAlert, Loader2, Mail, Lock, KeyRound, ArrowLeft, Download, X, CheckCircle2, Smartphone, Sparkles } from "lucide-react";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    patient,
    loading: authLoading,
    error: authError,
    setError: setAuthError,
    pendingGoogle,
    setPendingGoogle,
    loginWithGoogle,
    linkGoogleWithActivationCode,
    loginWithEmail,
    signUpWithCode
  } = usePatientAuth();
  
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");
  const installParam = searchParams.get("install");

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // PWA Native Install Prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showAlreadyInstalledModal, setShowAlreadyInstalledModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const ua = (navigator.userAgent || "").toLowerCase();
      if (/ipad|iphone|ipod/.test(ua) && !(window as any).MSStream) {
        setDeviceType("ios");
      } else if (/android/.test(ua)) {
        setDeviceType("android");
      } else {
        setDeviceType("desktop");
      }

      const standalone =
        (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        (document.referrer && document.referrer.indexOf("android-app://") !== -1)) &&
        window.location.pathname.startsWith("/patienthub");
      setIsStandalone(standalone);

      if (standalone) {
        setIsAppInstalled(true);
      }

      if ("getInstalledRelatedApps" in navigator) {
        (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
          if (Array.isArray(relatedApps)) {
            const isPatientApp = relatedApps.some((app: any) => {
              const id = (app.id || "").toLowerCase();
              const url = (app.url || "").toLowerCase();
              return (
                id.includes("patient") ||
                url.includes("manifest-patient") ||
                id === "/patienthub" ||
                url.includes("/patienthub")
              );
            });
            setIsAppInstalled(isPatientApp);
            if (!isPatientApp) {
              try {
                localStorage.removeItem("gpc_pwa_installed");
              } catch (e) {}
            }
          }
        }).catch(() => {});
      }
      
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setIsInstallable(true);
        setIsAppInstalled(false);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
        setIsAppInstalled(false);
        try {
          localStorage.removeItem("gpc_pwa_installed");
        } catch (err) {}
        (window as any).deferredPrompt = e;
      };

      const handleAppInstalled = () => {
        setIsAppInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          (window as any).deferredPrompt = null;
          localStorage.setItem("gpc_pwa_installed", "true");
        }
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  // Auto-trigger native install if arrived via direct install link (?install=1)
  useEffect(() => {
    if (installParam === "1" || installParam === "true") {
      const promptToUse = deferredPrompt || (typeof window !== "undefined" && (window as any).deferredPrompt);
      if (promptToUse) {
        try {
          promptToUse.prompt();
        } catch (e) {}
        return;
      }

      if (isStandalone) {
        setShowAlreadyInstalledModal(true);
        return;
      }

      if (deviceType === "ios") {
        setShowIOSModal(true);
        return;
      }

      // On desktop / android: wait briefly for beforeinstallprompt event if browser is initializing
      const timer = setTimeout(() => {
        const latePrompt = (window as any).deferredPrompt;
        if (latePrompt) {
          try {
            latePrompt.prompt();
          } catch (e) {}
        } else if (isAppInstalled) {
          setShowAlreadyInstalledModal(true);
        }
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [installParam, deferredPrompt, isAppInstalled, isStandalone, deviceType]);

  const handleInstallClick = async () => {
    // 1. If currently running in standalone PWA app mode
    if (isStandalone) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 2. Native install prompt (Android Chrome, Edge, Samsung Internet, Desktop Chrome)
    // If prompt is available, the app is NOT installed and can be installed immediately!
    const promptToUse = deferredPrompt || (typeof window !== "undefined" && (window as any).deferredPrompt);
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === "accepted") {
          setIsAppInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          if (typeof window !== "undefined") {
            (window as any).deferredPrompt = null;
          }
        }
        return;
      } catch (err) {
        console.error("Direct install error:", err);
      }
    }

    // 3. If already installed
    if (isAppInstalled) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 4. On iOS
    if (deviceType === "ios") {
      setShowIOSModal(true);
      return;
    }

    // 5. Fallback
    setShowAlreadyInstalledModal(true);
  };

  useEffect(() => {
    if (errorParam === "not_registered") {
      setError(`Access Denied: The account "${emailParam || ""}" is not linked to any patient record in our system. Please contact the front desk to link your account.`);
    } else if (errorParam === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [errorParam, emailParam]);

  // Sync auth context error
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);
    const result = await loginWithGoogle();
    setIsSubmitting(false);

    if (result.success) {
      if (typeof window !== "undefined") {
        window.location.href = "/patienthub/dashboard";
      }
    }
  };

  const handleGoogleLinkActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const result = await linkGoogleWithActivationCode(activationCode);
    setIsSubmitting(false);

    if (result.success) {
      if (typeof window !== "undefined") {
        window.location.href = "/patienthub/dashboard";
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!email || !password) {
      setError("Please fill in email and password fields.");
      setIsSubmitting(false);
      return;
    }

    if (isSignUp) {
      if (!activationCode) {
        setError("Activation code is required for initial sign-up.");
        setIsSubmitting(false);
        return;
      }
      const result = await signUpWithCode(email, password, activationCode);
      setIsSubmitting(false);
      if (result.success) {
        if (typeof window !== "undefined") {
          window.location.href = "/patienthub/dashboard";
        }
      }
    } else {
      const result = await loginWithEmail(email, password);
      setIsSubmitting(false);
      if (result.success) {
        if (typeof window !== "undefined") {
          window.location.href = "/patienthub/dashboard";
        }
      }
    }
  };

  // If Patient Hub is disabled in features configuration
  useEffect(() => {
    if (!FEATURES.enablePatientHub) {
      router.replace("/");
    }
  }, [router]);

  const loading = isSubmitting || authLoading;

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

      {/* PWA App Installation Button & Status Note */}
      {mounted && (
        <div className="flex flex-col items-center gap-2 text-center max-w-sm px-4 z-10">
          {!isStandalone ? (
            <>
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#062e36] hover:bg-[#0a4552] dark:bg-white/10 dark:hover:bg-white/20 text-white text-xs sm:text-sm font-black transition-all border border-[#062e36]/20 dark:border-white/20 shadow-md hover:shadow-lg active:scale-95 text-center cursor-pointer group"
              >
                <Download className="w-4 h-4 text-[#f9ab55] group-hover:animate-bounce" />
                <span>Install GaitPhysio PatientHub App</span>
              </button>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Already installed? Look for <strong>GaitPhysio</strong> on your home screen or Windows Start Menu.
              </p>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Running in GaitPhysio App Mode
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: App Already Installed Notice */}
      {showAlreadyInstalledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowAlreadyInstalledModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                App Already Installed!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                <strong>GaitPhysio Patient Hub</strong> is already installed on your device. You can launch it directly from your home screen, app drawer, or Windows Start Menu anytime!
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAlreadyInstalledModal(false)}
                className="w-full py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: iOS Direct Add to Home Screen Sheet */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-955/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Install Patient Hub on iPhone
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                To install the Patient Hub app on iOS:
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong>Share</strong> icon at the bottom of Safari.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Build Identifier Badge */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          BUILD: 2026.08.24-V9 (CLEAN ENGINE)
        </span>
      </div>
    </div>
  );
}
