"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { Activity, Lock, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check if already logged in
  useEffect(() => {
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const emailClean = email.trim().toLowerCase();

    try {
      // 1. Attempt login with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, emailClean, password);
      const fbUser = userCredential.user;

      // 2. Fetch user role and profile details from Firestore
      const userDocRef = doc(db, "users", fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const userSession = {
          uid: fbUser.uid,
          email: fbUser.email || emailClean,
          role: userData.role || "receptionist",
          name: userData.name || "Staff Member",
        };

        localStorage.setItem("gpc_user", JSON.stringify(userSession));
        // Set session cookie matching role
        document.cookie = `gpc_session=${userSession.role}; path=/`;
        router.push("/dashboard");
      } else {
        setError("Access Denied. Your profile was not found in the staff database.");
        setLoading(false);
      }
    } catch (err: any) {
      console.warn("Login attempt failed. Checking bootstrap rules...", err.code);

      // 3. Bootstrapping Rule: Auto-create default testing accounts if they don't exist yet
      if (
        (emailClean === "admin@gaitphysio.com" && password === "admin123") ||
        (emailClean === "receptionist@gaitphysio.com" && password === "receptionist123")
      ) {
        try {
          const isDefaultAdmin = emailClean === "admin@gaitphysio.com";
          const defaultRole = isDefaultAdmin ? ("admin" as const) : ("receptionist" as const);
          const defaultName = isDefaultAdmin ? "Dr. Rohan (Admin)" : "Anjali (Receptionist)";

          // Register in Firebase Authentication
          const cred = await createUserWithEmailAndPassword(auth, emailClean, password);
          
          // Write to Firestore users collection
          const userDocRef = doc(db, "users", cred.user.uid);
          const profile = {
            uid: cred.user.uid,
            email: emailClean,
            role: defaultRole,
            name: defaultName,
            createdAt: Timestamp.now()
          };
          await setDoc(userDocRef, profile);

          // Save user session
          localStorage.setItem("gpc_user", JSON.stringify(profile));
          document.cookie = `gpc_session=${defaultRole}; path=/`;
          router.push("/dashboard");
          return;
        } catch (createErr: any) {
          console.error("Auto bootstrap registration failed: ", createErr);
        }
      }

      // Handle standard authentication errors
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email or password. Please check your credentials.");
      } else {
        setError(err.message || "An unexpected sign-in error occurred.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[80vh] px-4 py-12 sm:px-6 lg:px-8 bg-brand-bg dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] relative overflow-hidden animate-fade-in">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-brand-charcoal dark:text-white">
            Gait Physio Staff Portal
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Log in with your credentials to manage schedules, slots, and bookings.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 text-red-700 text-xs font-black rounded-2xl animate-shake">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@gaitphysio.com"
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-11 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-3.5 text-xs font-black shadow-md transition-all duration-250 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
