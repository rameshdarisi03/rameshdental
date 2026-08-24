"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Client Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none font-['Inter',sans-serif]">
      <div className="max-w-md w-full bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 p-8 rounded-[28px] shadow-sm space-y-5">
        <div className="h-16 w-16 bg-emerald-50 dark:bg-emerald-950/40 text-brand-green rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="h-8 w-8 text-[#062e36] dark:text-[#f9ab55]" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Something went wrong
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            We encountered a temporary connection issue. Please tap reload to restore your session.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#062e36] hover:bg-[#0a4552] text-white py-3 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-full text-xs font-bold transition-all cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
