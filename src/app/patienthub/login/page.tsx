"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { 
  ShieldAlert, 
  Loader2, 
  Mail, 
  Lock, 
  KeyRound, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Smartphone, 
  CheckCircle2, 
  RotateCcw,
  MessageCircle,
  Check
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
    loginWithPhoneOtp
  } = usePatientAuth();
  
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");
  const codeParam = searchParams.get("code");

  // Primary Auth Mode: "options" (default 3 buttons) | "otp" (phone) | "email" (progressive)
  const [authMethod, setAuthMethod] = useState<"options" | "otp" | "email">("options");

  // Progressive Email Steps:
  // "enter_email" -> "password" (existing) | "signup_otp" (new) -> "signup_password"
  // "reset_otp" -> "reset_password" (forgot password)
  const [emailStep, setEmailStep] = useState<
    "enter_email" | "password" | "signup_otp" | "signup_password" | "reset_otp" | "reset_password"
  >("enter_email");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [activationCode, setActivationCode] = useState("");

  // Mobile OTP States
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState<"idle" | "sent">("idle");

  // Shared Feedback States
  const [countdown, setCountdown] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (codeParam) {
      setActivationCode(codeParam.trim().toUpperCase());
    }
    if (emailParam) {
      setEmail(emailParam.trim().toLowerCase());
    }
  }, [codeParam, emailParam]);

  useEffect(() => {
    if (errorParam === "not_registered") {
      setError(`Access Denied: The account "${emailParam || ""}" is not linked to any patient record in our system. Please contact our reception desk at +91 89044 56243.`);
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

  // Resend countdown timer
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Google Authentication
  const handleGoogleLogin = async () => {
    setError("");
    setSuccessMessage("");
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
    setSuccessMessage("");
    setIsSubmitting(true);

    const result = await linkGoogleWithActivationCode(activationCode);
    setIsSubmitting(false);

    if (result.success) {
      if (typeof window !== "undefined") {
        window.location.href = "/patienthub/dashboard";
      }
    }
  };

  // =========================================================================
  // Progressive Email Flow Handlers
  // =========================================================================

  // Step 1: Check Email in Clinic Database
  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/email/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "This email address has not been registered with the clinic. Please contact our reception desk at +91 89044 56243.");
        setIsSubmitting(false);
        return;
      }

      setPatientName(data.patientName || "Valued Patient");

      if (data.hasPassword) {
        // Existing user with password -> Direct password prompt (NO OTP)
        setEmailStep("password");
        setIsSubmitting(false);
      } else {
        // First-time signup -> Send verification OTP to email
        const otpRes = await fetch("/api/patient/email-otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, purpose: "signup" }),
        });
        const otpData = await otpRes.json().catch(() => ({}));

        if (!otpRes.ok || !otpData.success) {
          setError(otpData.error || "Failed to send email verification code.");
          setIsSubmitting(false);
          return;
        }

        setEmailStep("signup_otp");
        setCountdown(60);
        setSuccessMessage(`A 6-digit verification code has been sent to ${cleanEmail}.`);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to clinic verification server.");
      setIsSubmitting(false);
    }
  };

  // Step 2A: Direct Password Login (No OTP)
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginWithEmail(email, password);
    setIsSubmitting(false);

    if (result.success) {
      if (typeof window !== "undefined") {
        window.location.href = "/patienthub/dashboard";
      }
    }
  };

  // Step 2B: Verify Signup OTP
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const cleanOtp = emailOtp.trim().replace(/\s+/g, "");
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanOtp, purpose: "signup" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired verification code.");
        setIsSubmitting(false);
        return;
      }

      setEmailStep("signup_password");
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("Email verified! Please create your portal password (min. 10 characters).");
    } catch (err: any) {
      setError(err?.message || "Failed to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2C: Complete Signup with Password (Min 10 Chars)
  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: emailOtp.trim().replace(/\s+/g, ""),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to complete account activation.");
        setIsSubmitting(false);
        return;
      }

      // Automatically sign in with newly set password
      const loginRes = await loginWithEmail(email, password);
      if (loginRes.success) {
        if (typeof window !== "undefined") {
          window.location.href = "/patienthub/dashboard";
        }
      } else {
        // Fallback: invite them to sign in
        setEmailStep("password");
        setSuccessMessage("Account activated successfully! Please sign in with your new password.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to complete signup.");
      setIsSubmitting(false);
    }
  };

  // Forgot Password: Send Reset OTP
  const handleInitiateForgotPassword = async () => {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/patient/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "reset" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send password reset code.");
        setIsSubmitting(false);
        return;
      }

      setEmailOtp("");
      setEmailStep("reset_otp");
      setCountdown(60);
      setSuccessMessage(`A 6-digit password reset code has been sent to ${email.trim().toLowerCase()}.`);
    } catch (err: any) {
      setError(err?.message || "Failed to request password reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Reset OTP
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const cleanOtp = emailOtp.trim().replace(/\s+/g, "");
    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the 6-digit reset code sent to your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/email-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: cleanOtp, purpose: "reset" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid or expired reset code.");
        setIsSubmitting(false);
        return;
      }

      setEmailStep("reset_password");
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("Code verified! Set your new password (min. 10 characters).");
    } catch (err: any) {
      setError(err?.message || "Failed to verify reset code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Password Reset (Min 10 Chars)
  const handleCompleteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (password.length < 10) {
      setError("New password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patient/email-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: emailOtp.trim().replace(/\s+/g, ""),
          newPassword: password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to update password.");
        setIsSubmitting(false);
        return;
      }

      // Auto sign-in with updated password
      const loginRes = await loginWithEmail(email, password);
      if (loginRes.success) {
        if (typeof window !== "undefined") {
          window.location.href = "/patienthub/dashboard";
        }
      } else {
        setEmailStep("password");
        setSuccessMessage("Password reset successful! Please sign in with your new password.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
      setIsSubmitting(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async (purpose: "signup" | "reset") => {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/patient/email-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), purpose }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to resend code.");
        setIsSubmitting(false);
        return;
      }

      setCountdown(60);
      setSuccessMessage(`A fresh 6-digit code has been sent to ${email.trim().toLowerCase()}.`);
    } catch (err: any) {
      setError(err?.message || "Network error while resending code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // Mobile WhatsApp OTP Handlers
  // =========================================================================

  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMessage("");

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
      setSuccessMessage(`Verification code sent to WhatsApp: +91 ${cleanDigits}`);
    } catch (err: any) {
      setError(err?.message || "Network error while requesting verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
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

      const loginRes = await loginWithPhoneOtp(data.customToken, cleanDigits, data.profiles);
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
          /* Scenario 1: Mobile Phone & WhatsApp OTP                                    */
          /* ========================================================================= */
          <>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMessage("");
                setAuthMethod("options");
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

            {error && (
              <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3.5 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium mb-4">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="text-center pb-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Enter your registered mobile number to receive a 6-digit WhatsApp OTP.
              </p>
            </div>

            {otpStep === "idle" ? (
              <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
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
              <form onSubmit={handleVerifyPhoneOtp} className="space-y-4">
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

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 px-1">
                  {countdown > 0 ? (
                    <span>Resend OTP in <strong className="text-emerald-600">{countdown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendPhoneOtp()}
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
                      setSuccessMessage("");
                    }}
                    className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
              </form>
            )}
          </>
        ) : authMethod === "email" ? (
          /* ========================================================================= */
          /* Scenario 2: Progressive Email Flow (Continue with Email ID)                */
          /* ========================================================================= */
          <>
            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccessMessage("");
                setAuthMethod("options");
                setEmailStep("enter_email");
                setPassword("");
                setConfirmPassword("");
                setEmailOtp("");
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
                <p className="text-[10px] text-teal-700 dark:text-teal-300 font-extrabold uppercase tracking-[0.2em] mt-0.5 flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3" /> Email Portal Access
                </p>
              </div>
            </div>

            {error && (
              <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3.5 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium mb-4">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Sub-step 1: Enter Email ID */}
            {emailStep === "enter_email" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Enter your registered email address to continue.
                  </p>
                </div>

                <form onSubmit={handleCheckEmail} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. name@example.com"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.includes("@")}
                    className="flex w-full items-center justify-center bg-[#062e36] hover:bg-[#093c47] text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Continue with Email ID →</span>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Sub-step 2A: Direct Password Login (No OTP) */}
            {emailStep === "password" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Welcome back, {patientName}!
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter your password for <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                  </p>
                </div>

                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={handleInitiateForgotPassword}
                        disabled={loading}
                        className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="flex w-full items-center justify-center bg-[#062e36] hover:bg-[#093c47] text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Sign In to Patient Hub</span>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep("enter_email");
                        setPassword("");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Use a different email address
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Sub-step 2B: First-Time Signup — OTP Verification */}
            {emailStep === "signup_otp" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Verify Your Email Address
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    We sent a 6-digit verification code to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifySignupOtp} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Enter 6-Digit Email Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        required
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full text-center tracking-[0.5em] text-xl font-black py-3 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20 text-[#062e36] dark:text-teal-300 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || emailOtp.length < 6}
                    className="flex w-full items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Verify Code &amp; Continue →</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 px-1">
                    {countdown > 0 ? (
                      <span>Resend code in <strong className="text-teal-600">{countdown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResendEmailOtp("signup")}
                        disabled={loading}
                        className="text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <RotateCcw className="h-3 w-3" /> Resend Code
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep("enter_email");
                        setEmailOtp("");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Sub-step 2C: First-Time Signup — Set Password (Min 10 Chars) */}
            {emailStep === "signup_password" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Welcome, {patientName}!
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Create a password to activate your portal. (Minimum 10 characters)
                  </p>
                </div>

                <form onSubmit={handleCompleteSignup} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Create Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoFocus
                        minLength={10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 10 characters"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={10}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Helpers */}
                  <div className="space-y-1 pt-1 px-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-3 w-3 rounded-full flex items-center justify-center ${password.length >= 10 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                        <Check className="h-2 w-2" />
                      </div>
                      <span className={password.length >= 10 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                        Minimum 10 characters long
                      </span>
                    </div>
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-full flex items-center justify-center ${password && password === confirmPassword ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                          <Check className="h-2 w-2" />
                        </div>
                        <span className={password && password === confirmPassword ? "text-emerald-600 font-semibold" : "text-red-500"}>
                          {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password.length < 10 || password !== confirmPassword}
                    className="flex w-full items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2 mt-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Complete Signup &amp; Activate</span>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Sub-step 3A: Forgot Password — OTP Verification */}
            {emailStep === "reset_otp" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Password Reset Verification
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter the 6-digit code sent to <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                  <div className="space-y-1.5 text-center">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Enter 6-Digit Reset Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoFocus
                        required
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="• • • • • •"
                        className="w-full text-center tracking-[0.5em] text-xl font-black py-3 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50/40 dark:bg-teal-950/20 text-[#062e36] dark:text-teal-300 outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || emailOtp.length < 6}
                    className="flex w-full items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Verify Reset Code →</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1 px-1">
                    {countdown > 0 ? (
                      <span>Resend code in <strong className="text-teal-600">{countdown}s</strong></span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResendEmailOtp("reset")}
                        disabled={loading}
                        className="text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <RotateCcw className="h-3 w-3" /> Resend Code
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEmailStep("password");
                        setEmailOtp("");
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Sub-step 3B: Forgot Password — Set New Password (Min 10 Chars) */}
            {emailStep === "reset_password" && (
              <>
                <div className="text-center pb-2">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Create New Password
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose a new secure password (minimum 10 characters) for <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleCompleteResetPassword} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoFocus
                        minLength={10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 10 characters"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={10}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-11 py-3 text-xs outline-none focus:border-teal-600 dark:focus:border-teal-400 transition-colors text-slate-800 dark:text-slate-100 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Helpers */}
                  <div className="space-y-1 pt-1 px-1 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-3 w-3 rounded-full flex items-center justify-center ${password.length >= 10 ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                        <Check className="h-2 w-2" />
                      </div>
                      <span className={password.length >= 10 ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                        Minimum 10 characters long
                      </span>
                    </div>
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 rounded-full flex items-center justify-center ${password && password === confirmPassword ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"}`}>
                          <Check className="h-2 w-2" />
                        </div>
                        <span className={password && password === confirmPassword ? "text-emerald-600 font-semibold" : "text-red-500"}>
                          {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || password.length < 10 || password !== confirmPassword}
                    className="flex w-full items-center justify-center bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 gap-2 mt-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>Reset Password &amp; Sign In</span>
                    )}
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          /* ========================================================================= */
          /* Scenario 3: Primary Unified Entry Screen (Options Stack)                   */
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

            {/* Success Alert Box */}
            {successMessage && (
              <div className="flex gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-medium mb-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Context Hint */}
            <div className="text-center pb-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Choose your preferred sign-in method to access your personalized home exercises, clinical recovery plans, and treatment invoices.
              </p>
            </div>

            {/* Unified 3-Button Stack */}
            <div className="space-y-3">
              {/* Button 1: Google SSO */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="relative flex w-full items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              >
                <div className="absolute left-5 flex items-center justify-center w-5 h-5 shrink-0 pointer-events-none">
                  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24">
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
                </div>
                <span>Continue with Google</span>
              </button>

              {/* Button 2: Continue with Phone Number */}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                  setOtpStep("idle");
                  setAuthMethod("otp");
                }}
                disabled={loading}
                className="relative flex w-full items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              >
                <div className="absolute left-5 flex items-center justify-center w-5 h-5 shrink-0 pointer-events-none">
                  <PhoneVectorIcon className="h-5 w-5 text-slate-900 dark:text-white" />
                </div>
                <span>Continue with Phone Number</span>
              </button>

              {/* Button 3: Continue with Email ID (Placed right below phone number) */}
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                  setEmailStep("enter_email");
                  setAuthMethod("email");
                }}
                disabled={loading}
                className="relative flex w-full items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-xs cursor-pointer disabled:opacity-50 group"
              >
                <div className="absolute left-5 flex items-center justify-center w-5 h-5 shrink-0 pointer-events-none">
                  <EmailVectorIcon className="h-5 w-5 text-slate-900 dark:text-white" />
                </div>
                <span>Continue with Email ID</span>
              </button>
            </div>

            {/* Subtle Reassurance Footer */}
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                🔒 Secure 256-bit encrypted healthcare portal verified by clinic front desk.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        Gait Physio Clinic &bull; Bengaluru &bull; Need help? Contact +91 89044 56243
      </div>
    </div>
  );
}

/**
 * Custom vector icon matching the uploaded smartphone silhouette vector
 */
function PhoneVectorIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <mask id="phone-btn-vector-mask">
        <rect width="24" height="24" fill="white" />
        {/* Top speaker pill */}
        <rect x="9.5" y="3.4" width="5" height="1.3" rx="0.65" fill="black" />
        {/* Screen cutout */}
        <rect x="5.4" y="5.8" width="13.2" height="12.2" rx="0.6" fill="black" />
        {/* Circular home button */}
        <circle cx="12" cy="19.7" r="1.25" fill="black" />
      </mask>
      <rect
        x="4.2"
        y="1.5"
        width="15.6"
        height="21"
        rx="3.5"
        fill="currentColor"
        mask="url(#phone-btn-vector-mask)"
      />
    </svg>
  );
}

/**
 * Custom vector icon matching the uploaded email envelope silhouette vector
 */
function EmailVectorIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <mask id="email-btn-vector-mask">
        <rect width="24" height="24" fill="white" />
        {/* Flap V-fold line */}
        <path
          d="M2.5 5.5 L11.2 12.3 Q12 12.9 12.8 12.3 L21.5 5.5"
          stroke="black"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bottom diagonal folds */}
        <path
          d="M2.5 18.5 L10.5 11.8"
          stroke="black"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M21.5 18.5 L13.5 11.8"
          stroke="black"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </mask>
      <rect
        x="2"
        y="5"
        width="20"
        height="14"
        rx="2.5"
        fill="currentColor"
        mask="url(#email-btn-vector-mask)"
      />
    </svg>
  );
}
