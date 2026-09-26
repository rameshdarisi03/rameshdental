"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Staff Dashboard Route Error caught:", error);
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
        <div className="h-16 w-16 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Dashboard Sync Interruption
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            All clinical and patient data is safely saved in the cloud. Tap retry to re-establish your live staff session.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#062e36] hover:bg-[#0a4552] text-white py-3 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Dashboard</span>
          </button>

          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Overview</span>
          </Link>
        </div>

        <div className="pt-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            🌐 View Clinic Website (New Tab)
          </a>
        </div>
      </div>
    </div>
  );
}
