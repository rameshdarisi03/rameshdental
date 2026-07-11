"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Calendar, Clock, Activity, MessageSquare, Home, Loader2 } from "lucide-react";
import React, { Suspense } from "react";

function SuccessCard() {
  const searchParams = useSearchParams();
  const name = searchParams ? searchParams.get("name") || "Patient" : "Patient";
  const date = searchParams ? searchParams.get("date") || "" : "";
  const slot = searchParams ? searchParams.get("slot") || "" : "";
  const service = searchParams ? searchParams.get("service") || "Physiotherapy Session" : "Physiotherapy Session";

  // Helper to format date display (e.g. 2026-07-09 -> 09 Jul 2026)
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return dateObj.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 sm:px-6">
      <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950/40 p-8 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] text-center space-y-6">
        
        {/* Success Check Area */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Booking Request Received!</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
            Thank you, <strong className="text-brand-charcoal dark:text-white font-extrabold">{name}</strong>. Your appointment request has been submitted and is currently in <span className="inline-flex items-center rounded-md bg-brand-sand dark:bg-brand-green/20 border border-brand-green/20 px-2 py-0.5 text-[10px] font-black text-brand-green uppercase tracking-wider">Pending Review</span> status.
          </p>
        </div>

        {/* Selected Details Card */}
        <div className="border border-slate-100 dark:border-slate-800 bg-[#fbfcfb] dark:bg-slate-900 rounded-2xl p-6 text-left space-y-4 shadow-sm">
          <div className="flex gap-3">
            <Activity className="h-5 w-5 text-brand-green mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Requested Service</p>
              <p className="text-sm font-extrabold text-brand-charcoal dark:text-white leading-tight">{service}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-850 pt-4">
            <div className="flex gap-2">
              <Calendar className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Date</p>
                <p className="text-xs font-black text-brand-charcoal dark:text-white">{formatDateDisplay(date)}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Clock className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-405 font-bold uppercase tracking-wider">Time Slot</p>
                <p className="text-xs font-black text-brand-charcoal dark:text-white">{slot}</p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Notice Banner */}
        <div className="flex gap-3 bg-[#f0f4f2] dark:bg-slate-950 border border-brand-green/20 p-5 rounded-2xl text-left text-xs text-slate-600 dark:text-teal-400">
          <MessageSquare className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px] font-semibold">
            <strong className="text-brand-charcoal font-black block mb-1">What happens next?</strong> Our clinic staff will verify the time slot against the daily roster. Once approved, you will receive an automatic confirmation message directly on your registered WhatsApp number.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Home className="h-4 w-4" />
            Back to Homepage
          </Link>
        </div>

      </div>
    </div>
  );
}

export default function BookSuccess() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <section className="py-20 bg-brand-bg dark:bg-slate-955 flex-grow flex items-center">
        <Suspense fallback={
          <div className="mx-auto flex flex-col items-center justify-center text-slate-500 font-semibold text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-2" />
            <span>Loading success details...</span>
          </div>
        }>
          <SuccessCard />
        </Suspense>
      </section>
    </div>
  );
}
