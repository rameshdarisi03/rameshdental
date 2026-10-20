import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-[#062e36] text-slate-800 dark:text-white">
      <div className="text-center space-y-4 animate-fade-in flex flex-col items-center">
        <img
          src="/images/gait_pwa_splash.png"
          alt="Gait Physio Clinic"
          className="h-36 w-36 object-contain drop-shadow-sm animate-pulse"
        />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300/80 font-medium pt-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#062e36] dark:text-[#f9ab55]" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}
