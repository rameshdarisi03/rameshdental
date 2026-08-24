"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9F9F7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-[28px] border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="h-16 w-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-[#062e36]">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-[#062e36]">Portal Connection Glitch</h2>
          <p className="text-xs text-slate-500">
            A temporary network interruption occurred. Please refresh to continue.
          </p>
          <button
            onClick={() => reset()}
            className="w-full bg-[#062e36] text-white py-3 rounded-full text-xs font-bold cursor-pointer hover:bg-[#0a4552]"
          >
            Refresh Portal
          </button>
        </div>
      </body>
    </html>
  );
}
