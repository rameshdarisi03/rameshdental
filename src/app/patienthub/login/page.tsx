"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { Activity, ShieldAlert, Loader2, Mail, Lock, KeyRound, ArrowLeft, Sparkles, Eye, EyeOff, UserCheck, UserPlus } from "lucide-react";
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

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              <span className="relative bg-white dark:bg-[#121a1d] px-3 text-[10px] font-bold uppercase text-slate-400">OR EMAIL &amp; PASSWORD</span>
            </div>

            {/* Side-by-Side Segmented Tabs: Existing vs New Patient */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  !isSignUp
                    ? "bg-white dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] shadow-xs border border-slate-200/60 dark:border-white/10"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserCheck className="w-4 h-4 text-brand-green dark:text-teal-400" />
                <span>Existing Patient</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isSignUp
                    ? "bg-white dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] shadow-xs border border-slate-200/60 dark:border-white/10"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserPlus className="w-4 h-4 text-[#f9ab55]" />
                <span>New Patient</span>
              </button>
            </div>

            {/* Form Context Hint */}
            <div className="text-center pb-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isSignUp ? (
                  <>Enter your clinic <strong>Activation Code</strong> to set your password &amp; access records.</>
                ) : (
                  <>Sign in with your registered email and password.</>
                )}
              </p>
            </div>

            {/* Email Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              
              {/* Activation Code Field (Only shown on signup) */}
              {isSignUp && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Activation Code
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Provided by clinic</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      placeholder="e.g. CURYNALQ"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] transition-colors text-slate-800 dark:text-slate-100 font-bold tracking-widest uppercase"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                  Registered Email
                </label>
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
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                  {isSignUp ? "Create Password" : "Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] transition-colors text-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer focus:outline-none transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
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
                  "Create Account"
                ) : (
                  "Login"
                )}
              </button>
            </form>

            {/* Quick helper note at bottom */}
            <div className="text-center pt-3">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(!isSignUp);
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isSignUp ? (
                  <>Already registered? <span className="text-[#8a5100] dark:text-[#f9ab55] underline">Switch to Existing Patient</span></>
                ) : (
                  <>First time with an activation code? <span className="text-[#8a5100] dark:text-[#f9ab55] underline">Switch to New Patient</span></>
                )}
              </button>
            </div>
          </>
        )}
      </div>



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
