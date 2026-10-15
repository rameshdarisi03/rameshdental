"use client";

import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, Send, CheckCircle2, ShieldCheck, Zap, AlertCircle, ArrowUpRight } from "lucide-react";

interface UsageData {
  success: boolean;
  verifiedName: string;
  displayPhone: string;
  qualityRating: string;
  status: string;
  past14Days: {
    sent: number;
    delivered: number;
    estimatedCostINR: string;
  };
  past30Days: {
    sent: number;
    delivered: number;
    estimatedCostINR: string;
  };
  dailyBreakdown: Array<{
    date: string;
    timestamp: number;
    sent: number;
    delivered: number;
  }>;
  lastUpdated: string;
}

export default function WhatsAppUsageCard() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/whatsapp-usage");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load WhatsApp usage.");
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || "Network error loading usage.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const handleSendFortnightReport = async () => {
    setDispatching(true);
    setDispatchSuccess(null);
    try {
      const res = await fetch("/api/cron/fortnight-usage", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to send fortnight digest.");
      }
      setDispatchSuccess("Fortnightly usage digest dispatched to Dr. Kinnera and Pavan Kumar!");
      setTimeout(() => setDispatchSuccess(null), 6000);
    } catch (err: any) {
      alert(err.message || "Could not dispatch report.");
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-brand-charcoal dark:text-white text-base sm:text-lg leading-tight">
                WhatsApp Cloud API Usage & Spend
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Meta Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              Live consumption metrics, estimated billing in INR, and health stats without logging into Meta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={fetchUsage}
            disabled={loading}
            title="Refresh Meta Metrics"
            type="button"
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-all focus:outline-none"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            onClick={handleSendFortnightReport}
            disabled={dispatching || loading}
            type="button"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-50"
          >
            <Send className={`h-3.5 w-3.5 ${dispatching ? "animate-spin" : ""}`} />
            <span>Send Fortnight Digest Now</span>
          </button>
        </div>
      </div>

      {dispatchSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{dispatchSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Estimated 30-Day Cost */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Est. Spend (30 Days)
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
            <span>₹ {data?.past30Days?.estimatedCostINR || "0.00"}</span>
            <span className="text-xs font-semibold text-slate-400">INR</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1">
            <Zap className="h-3 w-3" />
            ~₹0.115 / utility msg
          </p>
        </div>

        {/* 30-Day Delivered Messages */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Delivered (30 Days)
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {data?.past30Days?.delivered ?? "--"}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1">
            {data?.past30Days?.sent ?? "--"} Total Dispatched
          </p>
        </div>

        {/* 14-Day Consumption */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Fortnight Usage (14D)
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
            {data?.past14Days?.delivered ?? "--"} <span className="text-xs font-normal text-slate-400">msgs</span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1">
            Est. ₹ {data?.past14Days?.estimatedCostINR || "0.00"} INR
          </p>
        </div>

        {/* Account Quality & Status */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Account Health
          </span>
          <div className="flex items-center gap-2 pt-0.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
              {data?.qualityRating === "GREEN" ? "Optimal (High)" : data?.qualityRating || "Optimal"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-semibold pt-1 truncate">
            {data?.displayPhone || "+91 82178 52653"}
          </p>
        </div>
      </div>

      {/* Daily Activity Breakdown */}
      {data?.dailyBreakdown && data.dailyBreakdown.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Recent Daily Dispatches</span>
            <span className="text-[11px] text-slate-400 font-medium">Meta Verified Deliveries</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {data.dailyBreakdown.slice(-6).map((day, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 text-center"
              >
                <div className="text-[11px] font-bold text-slate-400">{day.date}</div>
                <div className="text-base font-black text-slate-800 dark:text-white mt-1">{day.delivered}</div>
                <div className="text-[9px] text-emerald-600 font-semibold mt-0.5">msgs</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fortnight Schedule Info Footer */}
      <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Fortnightly Consumption Alert:</strong> Scheduled automatically on the 1st and 15th of every month at 9:00 AM IST to <strong>Dr. Kinnera</strong> and <strong>Pavan Kumar</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}
