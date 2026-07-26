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
import { collection, query, where, getDocs } from "firebase/firestore";
import { Activity, ShieldAlert, Loader2, Mail, Lock } from "lucide-react";

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
  
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      
      // Look up patient matching email
      const q = query(collection(db, "patients"), where("email", "==", user.email));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError(`Access Denied: Google account "${user.email}" is not registered in our patient database. Contact the front desk to link it.`);
        await auth.signOut();
        setLoading(false);
        return;
      }

      router.push("/patienthub/dashboard");
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to log in with Google.");
      }
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all email and password fields.");
      setLoading(false);
      return;
    }

    try {
      // Query patients table first to verify they are a clinic patient
      const q = query(collection(db, "patients"), where("email", "==", email.trim()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("This email address is not registered in our clinic database. Please contact the front desk first.");
        setLoading(false);
        return;
      }

      if (isSignUp) {
        // Sign Up Flow
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Sign In Flow
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      
      router.push("/patienthub/dashboard");
    } catch (err: any) {
      console.error("Email authentication failed:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This account already exists. Please sign in instead.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else {
        setError(err.message || "Authentication failed.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-[#f8fafc] dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 sm:p-10 rounded-3xl shadow-xl">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green dark:text-emerald-400 mb-4">
            <Activity className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">GPC Patient Hub</h2>
          <p className="mt-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider">
            {isSignUp ? "Create Patient Account" : "Sign In to Your Portal"}
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
            className="text-xs font-black text-slate-500 hover:text-brand-green uppercase tracking-wider"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need access? Register Password"}
          </button>
        </div>

      </div>
    </div>
  );
}
