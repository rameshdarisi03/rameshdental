"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PatientHubError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient Hub Route Error caught:", error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-['Inter',sans-serif]">
      <div className="max-w-md w-full bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] shadow-sm space-y-5">
        <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="h-8 w-8 text-[#062e36] dark:text-[#f9ab55]" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Patient Portal Temporary Issue
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Your patient records and data are completely secure. A brief network synchronization pause occurred.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#062e36] hover:bg-[#0a4552] text-white py-3 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry Connection</span>
          </button>

          <Link
            href="/patienthub/login"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Login Page</span>
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            ← Return to Clinic Website
          </Link>
        </div>
      </div>
    </div>
  );
}
