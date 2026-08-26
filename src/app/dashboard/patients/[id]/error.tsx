"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PatientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Patient Detail Error Caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-8 rounded-3xl shadow-lg space-y-4">
        <div className="h-16 w-16 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Unable to Load Patient Profile
          </h2>
          <p className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/50 p-3 rounded-xl break-all">
            {error?.message || "Unknown error occurred"}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          
          <Link
            href="/dashboard/patients"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Patients List</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
