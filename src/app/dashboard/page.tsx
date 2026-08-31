"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Appointment, DayBlock } from "@/lib/db";
import { Calendar, Clock, Inbox, AlertCircle, ArrowRight, Loader2, Activity } from "lucide-react";

interface CounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

function AnimatedCounter({ value, duration = 800, prefix = "", suffix = "" }: CounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function DashboardHome() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current date string in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all appointments
        const appSnapshot = await getDocs(collection(db, "appointments"));
        const appList: Appointment[] = [];
        appSnapshot.forEach((doc) => {
          appList.push({ id: doc.id, ...doc.data() } as Appointment);
        });
        setAppointments(appList);

        // Fetch all blocks
        const blockSnapshot = await getDocs(collection(db, "blocks"));
        const blockList: DayBlock[] = [];
        blockSnapshot.forEach((doc) => {
          blockList.push({ id: doc.id, ...doc.data() } as DayBlock);
        });
        setBlocks(blockList);
      } catch (error) {
        console.error("Error loading dashboard data: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 font-semibold text-xs">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading stats dashboard...</span>
      </div>
    );
  }

  const todayStr = getTodayDateString();
  const pendingCount = appointments.filter((app) => app.status === "pending").length;
  const todayCount = appointments.filter((app) => app.date === todayStr && app.status === "approved").length;
  const totalCount = appointments.length;
  const activeBlocksCount = blocks.length;

  return (
    <div className="space-y-8">
      {/* Welcome Bar */}
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Clinic Administration Overview</h1>
        <p className="text-xs text-slate-500 mt-1 font-semibold">Review live metrics, schedule availability overrides, and confirm patient booking requests.</p>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Pending Requests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-1 hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] transition-all duration-350 flex items-center gap-4 cursor-default">
          <div className="h-11 w-11 rounded-full bg-amber-50 text-amber-600 ring-4 ring-amber-100/30 flex items-center justify-center shrink-0">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-brand-charcoal dark:text-white mt-1">
              <AnimatedCounter value={pendingCount} />
            </p>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-1 hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] transition-all duration-350 flex items-center gap-4 cursor-default">
          <div className="h-11 w-11 rounded-full bg-brand-sand text-brand-green ring-4 ring-brand-sand/30 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Today</p>
            <p className="text-2xl font-black text-brand-charcoal dark:text-white mt-1">
              <AnimatedCounter value={todayCount} />
            </p>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-1 hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] transition-all duration-350 flex items-center gap-4 cursor-default">
          <div className="h-11 w-11 rounded-full bg-brand-sand/50 text-brand-green ring-4 ring-brand-sand/30 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
            <p className="text-2xl font-black text-brand-charcoal dark:text-white mt-1">
              <AnimatedCounter value={totalCount} />
            </p>
          </div>
        </div>

        {/* Active Blocks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-1 hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] transition-all duration-350 flex items-center gap-4 cursor-default">
          <div className="h-11 w-11 rounded-full bg-rose-50 text-rose-600 ring-4 ring-rose-100/30 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Day Blocks</p>
            <p className="text-2xl font-black text-brand-charcoal dark:text-white mt-1">
              <AnimatedCounter value={activeBlocksCount} />
            </p>
          </div>
        </div>

      </div>

      {/* Quick Actions Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Pending Requests Queue Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-0.5 transition-all duration-300 space-y-4">
          <h3 className="font-black text-brand-charcoal dark:text-white text-lg">Appointment Approvals</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Review online appointment requests, approve slots to trigger patient WhatsApp links, or reject overlapping bookings.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Open Approvals Queue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Blocks & Closures Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-0.5 transition-all duration-300 space-y-4">
          <h3 className="font-black text-brand-charcoal dark:text-white text-lg">Schedule Closures</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
            Block specific clinic hours (morning/evening shifts) or full calendar dates for holidays and physician unavailable days.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/blocks"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-charcoal hover:bg-brand-charcoal/90 text-white px-5 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Manage Day Blocks
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* Info notice about Live connection */}
      <div className="flex gap-3 bg-[#f0f4f2] dark:bg-teal-950/20 border border-brand-green/20 p-5 rounded-2xl text-slate-650 dark:text-teal-400 text-xs">
        <AlertCircle className="h-5 w-5 text-brand-green shrink-0" />
        <p className="leading-relaxed font-semibold">
          <strong className="text-brand-charcoal font-black block mb-1">Database Synchronization:</strong> This staff console is connected to your actual live Firestore database. All actions taken in the sub-routes (approving bookings or creating schedule blocks) will take effect immediately for prospective patients on the public site.
        </p>
      </div>

    </div>
  );
}
