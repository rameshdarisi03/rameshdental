"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { 
  Activity, 
  ShieldAlert, 
  Loader2, 
  Mail, 
  Lock, 
  KeyRound, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  EyeOff, 
  UserCheck, 
  UserPlus, 
  Smartphone, 
  CheckCircle2, 
  RotateCcw,
  MessageCircle
} from "lucide-react";
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
    signUpWithCode,
    loginWithPhoneOtp
  } = usePatientAuth();
  
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");
  const codeParam = searchParams.get("code");

  // Mode States
  const [authMethod, setAuthMethod] = useState<"password" | "otp">("password");
  const [isSignUp, setIsSignUp] = useState(false);

  // Email / Password Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activationCode, setActivationCode] = useState("");

  // Mobile OTP Form States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"idle" | "sent">("idle");
  const [countdown, setCountdown] = useState(0);
  const [otpSuccessMessage, setOtpSuccessMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (codeParam) {
      setActivationCode(codeParam.trim().toUpperCase());
      setIsSignUp(true);
    }
  }, [codeParam]);

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

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

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

  // WhatsApp OTP - Send Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setOtpSuccessMessage("");

    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    if (cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanDigits,
          purpose: "auth",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || `Server returned error (${res.status}). Please try again.`);
        setIsSubmitting(false);
        return;
      }

      setOtpStep("sent");
      setCountdown(60);
      setOtpSuccessMessage(`Verification code sent to WhatsApp: +91 ${cleanDigits}`);
    } catch (err: any) {
      setError(err?.message || "Network error while requesting verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp OTP - Verify Code & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the 6-digit verification code sent to your WhatsApp.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanDigits,
          otp: cleanOtp,
          purpose: "auth",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || `Invalid verification code (${res.status}).`);
        setIsSubmitting(false);
        return;
      }

      const loginRes = await loginWithPhoneOtp(data.customToken, cleanDigits);
      if (loginRes.success) {
        if (typeof window !== "undefined") {
          window.location.href = "/patienthub/dashboard";
        }
      } else {
        setError(loginRes.error || "Failed to complete login session.");
      }
    } catch (err: any) {
      setError(err?.message || "Network error while verifying code.");
    } finally {
      setIsSubmitting(false);
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
                    placeholder="e.g. TB32TBG5"
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
        ) : authMethod === "otp" ? (
          /* ========================================================================= */
          /* Scenario: Mobile Number & WhatsApp OTP Login (Method 1)                  */
          /* ========================================================================= */
          <>
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                setError("");
                setOtpSuccessMessage("");
                setAuthMethod("password");
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-[#8a5100] dark:text-[#f9ab55] hover:underline cursor-pointer mb-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Login Options
            </button>

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
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-[0.2em] mt-0.5 flex items-center justify-center gap-1">
                  <Smartphone className="w-3 h-3" /> WhatsApp OTP Sign In
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

            {/* Success Alert Box */}
            {otpSuccessMessage && (
              <div className="flex gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{otpSuccessMessage}</span>
              </div>
            )}

            {/* Context Hint */}
            <div className="text-center pb-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Enter your registered mobile number to receive a 6-digit WhatsApp OTP.
              </p>
            </div>

            {/* Step 1: Input Mobile */}
            {otpStep === "idle" ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                {/* Mobile Number Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                    Registered Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 flex items-center gap-1.5 text-xs font-bold text-slate-500 border-r border-slate-200 dark:border-slate-700 pr-2.5">
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-24 pr-4 py-3 text-xs outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors text-slate-800 dark:text-slate-100 font-bold tracking-wider"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 pl-1">
                    *Must be registered in your patient profile
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.replace(/\D/g, "").length < 10}
                  className="flex w-full items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2 gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="h-4 w-4" />
                      <span>Send WhatsApp OTP</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Step 2: Enter 6-digit OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5 text-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                    Enter 6-Digit WhatsApp Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoFocus
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-xl font-black py-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 text-[#062e36] dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="flex w-full items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Verify &amp; Enter Patient Hub</span>
                  )}
                </button>

                {/* Resend & Change Phone Controls */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 px-1">
                  {countdown > 0 ? (
                    <span>Resend OTP in <strong className="text-emerald-600">{countdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={loading}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <RotateCcw className="h-3 w-3" /> Resend WhatsApp OTP
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("idle");
                      setOtp("");
                      setError("");
                      setOtpSuccessMessage("");
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}

            {/* Style A: Switch back to Email & Password */}
            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setOtpSuccessMessage("");
                  setAuthMethod("password");
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>Or Continue with Email &amp; Password</span>
              </button>
            </div>
          </>
        ) : (
          /* ========================================================================= */
          /* Scenario: Regular Login / Signup Form (Email & Password + Google)         */
          /* ========================================================================= */
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
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50 mb-2.5"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Continue with Phone Number Button (Matching size and style) */}
            <button
              type="button"
              onClick={() => {
                setError("");
                setOtpSuccessMessage("");
                setOtpStep("idle");
                setAuthMethod("otp");
              }}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50 mb-5"
            >
              <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Smartphone className="h-3.5 w-3.5" />
              </div>
              <span>Continue with Phone Number</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80 dark:border-slate-800" />
              </div>
              <span className="relative bg-white dark:bg-[#121a1d] px-3 text-[10px] font-bold uppercase text-slate-400">OR EMAIL &amp; PASSWORD</span>
            </div>

            {/* Side-by-Side Segmented Tabs: Existing vs New User */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(false);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSignUp
                    ? "bg-[#062e36] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserCheck className={`w-4 h-4 ${!isSignUp ? "text-[#f9ab55]" : "text-slate-400"}`} />
                <span>Existing User</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsSignUp(true);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSignUp
                    ? "bg-[#062e36] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <UserPlus className={`w-4 h-4 ${isSignUp ? "text-[#f9ab55]" : "text-slate-400"}`} />
                <span>New User</span>
              </button>
            </div>

            {/* Form Context Hint */}
            <div className="text-center pb-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isSignUp ? (
                  <>Enter the activation code sent to your WhatsApp or Email to create your account.</>
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
                      placeholder="e.g. TB32TBG5"
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
