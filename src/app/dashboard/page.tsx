"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { collection, getDocs, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Appointment, DayBlock, getClinicConfig, ClinicConfig } from "@/lib/db";
import { Patient } from "@/lib/patientsDb";
import { 
  Activity, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Stethoscope, 
  Dumbbell, 
  HeartPulse, 
  Flame, 
  TrendingUp, 
  MessageCircle, 
  Plus, 
  FileText, 
  Filter, 
  Layers, 
  ExternalLink, 
  ShieldCheck, 
  ChevronRight, 
  Phone,
  ScanLine,
  UserCheck,
  UserPlus,
  PlayCircle,
  HelpCircle,
  BarChart2,
  CalendarCheck,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import FastTrackPatientImportModal from "@/components/dashboard/FastTrackPatientImportModal";
import { cleanPatientName, isPractoAppointment } from "@/lib/practoSync";
import PractoBadge from "@/components/PractoBadge";

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"]
});

const ibmPlexMono = IBM_Plex_Mono({ 
  weight: ["400", "500", "600", "700"], 
  subsets: ["latin"] 
});

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

// Service categories with rich infographic styling
interface ServiceHourAllocation {
  id: string;
  name: string;
  category: string;
  color: string;
  bgLight: string;
  borderLight: string;
  sessionsCount: number;
  totalMinutes: number;
  percentage: number;
}

export default function DashboardOverview() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [exerciseCount, setExerciseCount] = useState<number>(31);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fastTrackOpen, setFastTrackOpen] = useState(false);

  // Selected therapist filter ("ALL" or specific doctor name)
  const [selectedTherapist, setSelectedTherapist] = useState<string>("ALL");
  
  // Real-time current clock (for live shift indicator and next-up patient detection)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 1. Load logged-in user profile
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      try {
        setCurrentUser(JSON.parse(userJson));
      } catch (e) {}
    }

    // 2. Timer for live clock updates (every minute)
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(clockInterval);
  }, []);

  // Real-time Data Listeners
  useEffect(() => {
    let isMounted = true;

    async function loadAllData() {
      try {
        setLoading(true);
        // Load Clinic Config
        const cfg = await getClinicConfig();
        if (isMounted) setClinicConfig(cfg);

        // Fetch Exercises Library Count
        try {
          const exSnap = await getDocs(collection(db, "exercise_library"));
          if (isMounted) setExerciseCount(exSnap.size || 31);
        } catch (e) {
          if (isMounted) setExerciseCount(31);
        }
      } catch (err) {
        console.error("Error loading config:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAllData();

    // Subscribe to Appointments
    const unsubApps = onSnapshot(collection(db, "appointments"), (snap) => {
      const list: Appointment[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Appointment));
      setAppointments(list);
    });

    // Subscribe to Patients
    const unsubPatients = onSnapshot(collection(db, "patients"), (snap) => {
      const list: Patient[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Patient));
      setPatients(list);
    });

    // Subscribe to Blocks
    const unsubBlocks = onSnapshot(collection(db, "blocks"), (snap) => {
      const list: DayBlock[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as DayBlock));
      setBlocks(list);
    });

    return () => {
      isMounted = false;
      unsubApps();
      unsubPatients();
      unsubBlocks();
    };
  }, []);

  // Today Date Strings (both ISO YYYY-MM-DD and DD-MM-YYYY formats)
  const todayIso = useMemo(() => {
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, "0");
    const d = String(currentTime.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [currentTime]);

  const todayDisplayDate = useMemo(() => {
    return currentTime.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, [currentTime]);

  // Active Clinic Therapists Roster
  const therapistsList = useMemo(() => {
    if (clinicConfig?.therapists && clinicConfig.therapists.length > 0) {
      return clinicConfig.therapists.filter(
        t => !t.toLowerCase().includes("rohan") && !t.toLowerCase().includes("sarah")
      );
    }
    return ["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"];
  }, [clinicConfig]);

  // Current Clinic Operating Shift Status
  const shiftStatus = useMemo(() => {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Default hours: Morning: 09:30 AM (570) to 01:00 PM (780); Evening: 02:00 PM (840) to 08:00 PM (1200)
    const morningStart = 9 * 60 + 30; // 09:30 AM
    const morningEnd = 13 * 60;       // 01:00 PM
    const eveningStart = 14 * 60;     // 02:00 PM
    const eveningEnd = 20 * 60;       // 08:00 PM

    if (currentMins >= morningStart && currentMins < morningEnd) {
      const remainingMins = morningEnd - currentMins;
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      return {
        label: "Morning Session Active",
        timeWindow: "09:30 AM – 01:00 PM",
        note: hours > 0 ? `${hours}h ${mins}m left in morning shift` : `${mins}m left in morning shift`,
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
        dotColor: "bg-emerald-500 animate-pulse"
      };
    } else if (currentMins >= morningEnd && currentMins < eveningStart) {
      return {
        label: "Midday Clinic Break",
        timeWindow: "01:00 PM – 02:00 PM",
        note: "Evening shift resumes at 02:00 PM",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
        dotColor: "bg-amber-500"
      };
    } else if (currentMins >= eveningStart && currentMins < eveningEnd) {
      const remainingMins = eveningEnd - currentMins;
      const hours = Math.floor(remainingMins / 60);
      const mins = remainingMins % 60;
      return {
        label: "Evening Session Active",
        timeWindow: "02:00 PM – 08:00 PM",
        note: hours > 0 ? `${hours}h ${mins}m left in evening shift` : `${mins}m left in evening shift`,
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60",
        dotColor: "bg-teal-500 animate-pulse"
      };
    } else {
      return {
        label: "Clinic Shift Closed",
        timeWindow: "Reopens at 09:30 AM",
        note: "Emergency walk-ins & morning bookings on standby",
        badgeColor: "bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        dotColor: "bg-slate-400"
      };
    }
  }, [currentTime]);

  // Filter appointments for Today
  const todayAppointments = useMemo(() => {
    return appointments.filter(a => {
      const d = (a.date || "").trim();
      const isToday = d === todayIso || d.split("-").reverse().join("-") === todayIso;
      if (!isToday) return false;

      if (selectedTherapist !== "ALL") {
        const assigned = (a.assignedTherapist || a.actionedByName || "").toLowerCase();
        const filter = selectedTherapist.toLowerCase();
        return assigned.includes(filter) || filter.includes(assigned);
      }
      return true;
    }).sort((a, b) => {
      // Sort chronologically by slot time
      return (a.slot || "").localeCompare(b.slot || "");
    });
  }, [appointments, todayIso, selectedTherapist]);

  // Confirmed, Pending, and Completed for Today
  const confirmedToday = useMemo(() => todayAppointments.filter(a => a.status === "approved"), [todayAppointments]);
  const pendingApprovals = useMemo(() => appointments.filter(a => a.status === "pending"), [appointments]);
  const activePatients = useMemo(() => patients.filter(p => p.status === "active"), [patients]);

  // Next Patient in Queue (Currently in session or upcoming next)
  const nextPatient = useMemo(() => {
    if (confirmedToday.length === 0) return null;
    
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Find slot closest to or after current time
    for (const app of confirmedToday) {
      if (!app.slot) continue;
      const parts = app.slot.split(" ");
      const [rawH, rawM] = (parts[0] || "").split(":").map(Number);
      const isPM = (parts[1] || "").toUpperCase() === "PM";
      let h = rawH;
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      const slotMins = h * 60 + (rawM || 0);

      // If slot is within the next 45 minutes or currently ongoing
      if (slotMins >= currentMins - 30) {
        return {
          ...app,
          isLiveNow: currentMins >= slotMins && currentMins <= slotMins + 30
        };
      }
    }
    return { ...confirmedToday[0], isLiveNow: false };
  }, [confirmedToday, currentTime]);

  // =========================================================================
  // 1. INFOGRAPHIC: Patient Mix (New Inquiries vs. Returning / Continuing Rehab)
  // =========================================================================
  const patientMixData = useMemo(() => {
    const totalRecorded = patients.length;
    if (totalRecorded === 0) {
      return {
        newCount: 0,
        newPercent: 0,
        returningCount: 0,
        returningPercent: 0,
        retentionRate: 0,
        hasData: false
      };
    }

    let newCount = 0;
    let returningCount = 0;

    // A patient is "returning" if they have an active multi-session treatment plan or >1 booking
    patients.forEach(p => {
      const plan = (p.treatmentPlan || "").toLowerCase();
      if (plan.includes("follow-up") || plan.includes("rehab") || plan.includes("package") || p.status === "active") {
        returningCount += 1;
      } else {
        newCount += 1;
      }
    });

    const sum = newCount + returningCount;
    const newPercent = sum > 0 ? Math.round((newCount / sum) * 100) : 0;
    const returningPercent = sum > 0 ? (100 - newPercent) : 0;
    const retentionRate = sum > 0 ? Math.round((returningCount / sum) * 100) : 0;

    return {
      newCount,
      newPercent,
      returningCount,
      returningPercent,
      retentionRate,
      hasData: sum > 0
    };
  }, [patients]);

  // =========================================================================
  // 2. INFOGRAPHIC: Patient Peak Time Distribution (Hour-by-Hour Traffic)
  // =========================================================================
  const peakTimeData = useMemo(() => {
    // 10 standard clinic time slots across Morning and Evening shifts
    const slotBuckets: { slot: string; label: string; count: number; shift: "morning" | "evening" }[] = [
      { slot: "09:30 AM", label: "09:30 AM", count: 0, shift: "morning" },
      { slot: "10:30 AM", label: "10:30 AM", count: 0, shift: "morning" },
      { slot: "11:30 AM", label: "11:30 AM", count: 0, shift: "morning" },
      { slot: "12:30 PM", label: "12:30 PM", count: 0, shift: "morning" },
      { slot: "02:00 PM", label: "02:00 PM", count: 0, shift: "evening" },
      { slot: "03:30 PM", label: "03:30 PM", count: 0, shift: "evening" },
      { slot: "05:00 PM", label: "05:00 PM", count: 0, shift: "evening" },
      { slot: "06:00 PM", label: "06:00 PM", count: 0, shift: "evening" },
      { slot: "07:00 PM", label: "07:00 PM", count: 0, shift: "evening" },
      { slot: "07:30 PM", label: "07:30 PM", count: 0, shift: "evening" }
    ];

    // Tally all approved appointments
    appointments.forEach(a => {
      if (a.status !== "rejected" && a.slot) {
        const match = slotBuckets.find(b => b.slot === a.slot || a.slot.startsWith(b.slot.substring(0, 5)));
        if (match) match.count += 1;
      }
    });

    const maxCount = Math.max(...slotBuckets.map(b => b.count), 0);
    const hasLiveAppointments = appointments.length > 0 && maxCount > 0;

    // Dynamically identify busiest morning and evening slots
    const morningBuckets = [...slotBuckets.filter(b => b.shift === "morning")].sort((a, b) => b.count - a.count);
    const eveningBuckets = [...slotBuckets.filter(b => b.shift === "evening")].sort((a, b) => b.count - a.count);

    const busiestMorning = morningBuckets[0]?.count > 0 
      ? `${morningBuckets[0].label} (${morningBuckets[0].count} session${morningBuckets[0].count > 1 ? "s" : ""})`
      : "Shift open: 09:30 AM – 01:00 PM (No bookings yet)";

    const busiestShift = eveningBuckets[0]?.count > 0
      ? `${eveningBuckets[0].label} (${eveningBuckets[0].count} session${eveningBuckets[0].count > 1 ? "s" : ""})`
      : "Shift open: 02:00 PM – 08:00 PM (No bookings yet)";

    return {
      hasLiveAppointments,
      buckets: slotBuckets.map(b => ({
        ...b,
        // Live scale strictly based on real appointment count: 0 if 0 bookings, or proportional height
        barHeightPct: maxCount > 0 && b.count > 0 ? Math.max(Math.round((b.count / maxCount) * 100), 8) : 0,
        displayCount: b.count
      })),
      busiestShift,
      busiestMorning
    };
  }, [appointments]);

  // =========================================================================
  // 3. INFOGRAPHIC: Split Hours According to Clinical Services
  // =========================================================================
  const serviceHourAllocations = useMemo<ServiceHourAllocation[]>(() => {
    // 5 core clinical service categories
    const categories = [
      {
        id: "gait",
        name: "Biomechanical Gait & Posture",
        category: "Gait Analysis & Spine Alignment",
        color: "#0F4C3A", // Deep Emerald
        bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
        borderLight: "border-emerald-200 dark:border-emerald-800/40",
        defaultDurationMins: 60,
        count: 0
      },
      {
        id: "spine",
        name: "Spine & Disc Decompression",
        category: "Cervical & Lumbar Traction",
        color: "#135242", // Forest Teal
        bgLight: "bg-teal-50 dark:bg-teal-950/30",
        borderLight: "border-teal-200 dark:border-teal-800/40",
        defaultDurationMins: 45,
        count: 0
      },
      {
        id: "postop",
        name: "Post-Op Joint Rehabilitation",
        category: "Knee / ACL / Shoulder Restoration",
        color: "#D9A441", // Warm Ochre
        bgLight: "bg-amber-50 dark:bg-amber-950/30",
        borderLight: "border-amber-200 dark:border-amber-800/40",
        defaultDurationMins: 45,
        count: 0
      },
      {
        id: "manual",
        name: "Dry Needling & Myofascial",
        category: "Trigger Point & Deep Tissue Laser",
        color: "#C65D4B", // Terracotta
        bgLight: "bg-rose-50 dark:bg-rose-950/30",
        borderLight: "border-rose-200 dark:border-rose-800/40",
        defaultDurationMins: 30,
        count: 0
      },
      {
        id: "sports",
        name: "Sports Injury & Return-to-Play",
        category: "Athletic Mobility & Conditioning",
        color: "#0284C7", // Sky Blue
        bgLight: "bg-sky-50 dark:bg-sky-950/30",
        borderLight: "border-sky-200 dark:border-sky-800/40",
        defaultDurationMins: 45,
        count: 0
      }
    ];

    // Tally based on appointments & patient treatment plans
    const sourcePool = appointments.length > 0 ? appointments : patients.map(p => ({ serviceId: p.treatmentPlan || "" }));
    
    sourcePool.forEach(item => {
      const s = ((item as any).serviceId || "").toLowerCase();
      if (s.includes("gait") || s.includes("posture") || s.includes("biomechan")) {
        categories[0].count += 1;
      } else if (s.includes("spine") || s.includes("disc") || s.includes("cervical") || s.includes("lumbar")) {
        categories[1].count += 1;
      } else if (s.includes("knee") || s.includes("acl") || s.includes("post-op") || s.includes("shoulder") || s.includes("replacement")) {
        categories[2].count += 1;
      } else if (s.includes("needling") || s.includes("laser") || s.includes("myofascial") || s.includes("electro")) {
        categories[3].count += 1;
      } else {
        categories[4].count += 1;
      }
    });

    const totalCount = categories.reduce((sum, c) => sum + c.count, 0);

    return categories.map(c => {
      const pct = totalCount > 0 ? Math.round((c.count / totalCount) * 100) : 0;
      const totalMinutes = c.count * c.defaultDurationMins;
      return {
        id: c.id,
        name: c.name,
        category: c.category,
        color: c.color,
        bgLight: c.bgLight,
        borderLight: c.borderLight,
        sessionsCount: c.count,
        totalMinutes,
        percentage: pct
      };
    });
  }, [appointments, patients]);

  // =========================================================================
  // 4. CLINICAL CONTINUITY: Lapsed / At-Risk Patients (>7 Days Inactive)
  // =========================================================================
  const lapsedPatients = useMemo(() => {
    // Look for active patients who haven't had a visit in 7+ days
    const atRisk: { patient: Patient; daysAgo: number }[] = [];
    const now = currentTime.getTime();

    patients.forEach(p => {
      if (p.status !== "active") return;
      
      let lastDate: Date | null = null;
      if (p.lastVisit) {
        lastDate = new Date(p.lastVisit);
      } else if (p.joinedDate) {
        lastDate = new Date(p.joinedDate);
      }

      if (lastDate && !isNaN(lastDate.getTime())) {
        const diffDays = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 7) {
          atRisk.push({ patient: p, daysAgo: diffDays });
        }
      }
    });

    return atRisk.sort((a, b) => b.daysAgo - a.daysAgo).slice(0, 4);
  }, [patients, currentTime]);

  // Helper to open WhatsApp for quick check-in
  const handleWhatsAppCheckIn = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    const text = encodeURIComponent(
      `Hello ${name}, this is Gait Physio Clinic following up on your physiotherapy care plan. We noticed you haven't had a session in the past week. How is your recovery and mobility progressing? Please let us know if you would like to schedule your next session.`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500 font-semibold text-xs space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <span className="font-bold tracking-wide">Initializing Clinical Command Center...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* ===================================================================== */}
      {/* 1. HEADER & LIVE CLINIC PULSE BAR */}
      {/* ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className={`text-xl sm:text-2xl font-black text-brand-charcoal dark:text-white tracking-tight ${spaceGrotesk.className}`}>
                Clinical Operations &amp; Therapy Overview
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {todayDisplayDate} • Patient flow, rehabilitation continuity &amp; active therapy capacity.
              </p>
            </div>
          </div>
        </div>

        {/* Live Shift Status Pill + Fast Intake Trigger */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Shift Indicator */}
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 text-xs font-bold ${shiftStatus.badgeColor}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${shiftStatus.dotColor}`} />
            <div>
              <span className="block font-black leading-tight">{shiftStatus.label}</span>
              <span className={`text-[10px] opacity-80 ${ibmPlexMono.className}`}>{shiftStatus.timeWindow}</span>
            </div>
          </div>

          {/* AI Intake Scan Button */}
          <button
            onClick={() => setFastTrackOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          >
            <ScanLine className="h-4 w-4" />
            <span>FastTrack Intake</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. THERAPIST SWITCHER / FILTER TABS */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-2 rounded-2xl shadow-sm flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 pl-3 pr-2 select-none flex items-center gap-1 shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span>Roster:</span>
        </span>
        
        <button
          onClick={() => setSelectedTherapist("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 select-none ${
            selectedTherapist === "ALL"
              ? "bg-brand-green text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          All Clinic Flow ({confirmedToday.length} today)
        </button>

        {therapistsList.map((docName) => {
          const docTodayCount = appointments.filter(a => {
            const d = (a.date || "").trim();
            const isToday = d === todayIso || d.split("-").reverse().join("-") === todayIso;
            const assigned = (a.assignedTherapist || a.actionedByName || "").toLowerCase();
            return isToday && a.status === "approved" && assigned.includes(docName.toLowerCase());
          }).length;

          const isSelected = selectedTherapist === docName;

          return (
            <button
              key={docName}
              onClick={() => setSelectedTherapist(docName)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 select-none ${
                isSelected
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span>{docName}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                {docTodayCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 3. SECTION: 4 HIGH-IMPACT CLINICAL VITALS (NON-FINANCIAL) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Vital 1: Today's Confirmed Sessions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today&apos;s Sessions</span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black text-brand-charcoal dark:text-white ${ibmPlexMono.className}`}>
                {confirmedToday.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">confirmed</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {todayAppointments.length} total scheduled • {todayAppointments.filter(a => a.type === "manual").length} walk-ins
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min((confirmedToday.length / 15) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Vital 2: Next Patient in Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Next Up in Clinic</span>
            <div className={`h-9 w-9 rounded-2xl flex items-center justify-center font-bold ${
              nextPatient?.isLiveNow 
                ? "bg-amber-100 text-amber-700 animate-pulse" 
                : "bg-teal-50 dark:bg-teal-950/40 text-teal-600"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          {nextPatient ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-brand-charcoal dark:text-white truncate max-w-[160px]" title={cleanPatientName(nextPatient.patientName)}>
                  {cleanPatientName(nextPatient.patientName)}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  nextPatient.isLiveNow 
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}>
                  {nextPatient.slot}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-1">
                {nextPatient.serviceId || "Physiotherapy Session"}
              </p>
            </div>
          ) : (
            <div>
              <span className="text-sm font-bold text-slate-400">No appointments active</span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Tables open for walk-ins</p>
            </div>
          )}
          <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Assigned: {nextPatient?.assignedTherapist || nextPatient?.actionedByName || "Reception Desk"}</span>
          </div>
        </div>

        {/* Vital 3: Pending Inquiries Queue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <div className="h-9 w-9 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black text-brand-charcoal dark:text-white ${ibmPlexMono.className}`}>
                {pendingApprovals.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">requests</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Online portal booking requests waiting for doctor confirmation
            </p>
          </div>
          <Link
            href="/dashboard/appointments"
            className="text-[11px] font-bold text-brand-green hover:underline flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800"
          >
            <span>Open Approvals Desk</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Vital 4: Active Care Cohort */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rehabilitation Cohort</span>
            <div className="h-9 w-9 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center font-bold">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black text-brand-charcoal dark:text-white ${ibmPlexMono.className}`}>
                {activePatients.length}
              </span>
              <span className="text-xs text-slate-400 font-semibold">active patients</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {exerciseCount} clinical exercise protocols available in digital library
            </p>
          </div>
          <Link
            href="/dashboard/patients"
            className="text-[11px] font-bold text-sky-600 hover:underline flex items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800"
          >
            <span>View Patient Registry</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* 4. VISUAL INFOGRAPHICS ROW: PEAK TIMES + PATIENT MIX (DONUT) */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* INFOGRAPHIC 1: Patient Peak Times & Hour-by-Hour Traffic Flow (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
                <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                  Patient Peak Times &amp; Hourly Flow
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Traffic density distribution across Morning (09:30 AM–01:00 PM) &amp; Evening (02:00 PM–08:00 PM) shifts.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Morning</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D9A441]" /> Evening</span>
            </div>
          </div>

          {/* Bar Chart Infographic */}
          <div className="pt-2">
            <div className="h-44 w-full flex items-end justify-between gap-2 sm:gap-3 px-2">
              {peakTimeData.buckets.map((b) => (
                <div key={b.slot} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {b.displayCount}
                  </div>
                  <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 group-hover:brightness-110 ${
                        b.shift === "morning" ? "bg-emerald-500" : "bg-[#D9A441]"
                      }`}
                      style={{ height: `${b.barHeightPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] sm:text-[10px] font-semibold text-slate-400 truncate max-w-[42px] select-none ${ibmPlexMono.className}`}>
                    {b.label.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Insights Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <Flame className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="block font-black text-emerald-900 dark:text-emerald-300 text-[11px]">Primary Morning Peak</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">{peakTimeData.busiestMorning}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <Activity className="h-4 w-4 text-amber-600 shrink-0" />
              <div>
                <span className="block font-black text-amber-900 dark:text-amber-300 text-[11px]">Primary Evening Peak</span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">{peakTimeData.busiestShift}</span>
              </div>
            </div>
          </div>

        </div>

        {/* INFOGRAPHIC 2: Patient Mix Donut Chart (New vs Returning Care) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D9A441]" />
              <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                Patient Mix &amp; Retention
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              First-time evaluations vs. ongoing therapy protocols.
            </p>
          </div>

          {/* Donut Chart Display */}
          <div className="flex items-center justify-center relative my-2">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="38"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="11"
                fill="none"
              />
              {patientMixData.hasData && (
                <>
                  {/* Returning Patients Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-brand-green transition-all duration-1000"
                    strokeWidth="11"
                    strokeDasharray={`${patientMixData.returningPercent * 2.38} 238`}
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* New Patients Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    className="stroke-[#D9A441] transition-all duration-1000"
                    strokeWidth="11"
                    strokeDasharray={`${patientMixData.newPercent * 2.38} 238`}
                    strokeDashoffset={`-${patientMixData.returningPercent * 2.38}`}
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </svg>

            {/* Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className={`text-2xl font-black text-brand-charcoal dark:text-white ${ibmPlexMono.className}`}>
                {patientMixData.hasData ? `${patientMixData.retentionRate}%` : "0%"}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Retention
              </span>
            </div>
          </div>

          {/* Legend and Counts */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
                <span className="text-slate-700 dark:text-slate-300">Returning / Care Plan</span>
              </div>
              <span className={`font-bold text-slate-800 dark:text-white ${ibmPlexMono.className}`}>
                {patientMixData.returningCount} ({patientMixData.returningPercent}%)
              </span>
            </div>

            <div className="flex items-center justify-between font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D9A441]" />
                <span className="text-slate-700 dark:text-slate-300">New Evaluations</span>
              </div>
              <span className={`font-bold text-slate-800 dark:text-white ${ibmPlexMono.className}`}>
                {patientMixData.newCount} ({patientMixData.newPercent}%)
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ===================================================================== */}
      {/* 5. VISUAL INFOGRAPHIC: SPLIT HOURS ACCORDING TO SERVICES */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />
              <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                Clinical Hours &amp; Service Allocation
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Breakdown of clinical therapy time spent across active treatment categories.
            </p>
          </div>

          <span className={`text-xs font-bold text-slate-500 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 ${ibmPlexMono.className}`}>
            5 Active Clinical Disciplines
          </span>
        </div>

        {/* Multi-segment Colored Stacked Bar Infographic */}
        <div className="space-y-3">
          {serviceHourAllocations.some(s => s.percentage > 0) ? (
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              {serviceHourAllocations.map((svc) => (
                <div
                  key={svc.id}
                  style={{ width: `${svc.percentage}%`, backgroundColor: svc.color }}
                  className="h-full transition-all duration-700 hover:opacity-90"
                  title={`${svc.name}: ${svc.percentage}% (${svc.sessionsCount} sessions)`}
                />
              ))}
            </div>
          ) : (
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
              <div className="w-full h-full bg-slate-200/60 dark:bg-slate-700/50" />
            </div>
          )}

          {/* Cards for Each Service Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {serviceHourAllocations.map((svc) => (
              <div 
                key={svc.id}
                className={`p-3.5 rounded-2xl border ${svc.bgLight} ${svc.borderLight} flex flex-col justify-between space-y-2`}
              >
                <div className="flex items-center justify-between">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: svc.color }} />
                  <span className={`text-[10px] font-black text-slate-500 ${ibmPlexMono.className}`}>
                    {svc.percentage}%
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {svc.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {svc.category}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 pt-1 border-t border-black/5 dark:border-white/5 flex justify-between">
                  <span>{svc.sessionsCount} sessions</span>
                  <span className={ibmPlexMono.className}>{Math.round(svc.totalMinutes / 60)} hrs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 6. TODAY'S CLINICAL QUEUE & AT-RISK CONTINUITY FLAGS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Today's Treatment Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                  Today&apos;s Treatment Schedule
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {selectedTherapist === "ALL" ? "All active doctors" : selectedTherapist} • Chronological patient arrivals.
              </p>
            </div>

            <Link
              href="/dashboard/walkin"
              className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Walk-in</span>
            </Link>
          </div>

          {confirmedToday.length > 0 ? (
            <div className="space-y-3">
              {confirmedToday.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="h-10 w-10 rounded-2xl bg-brand-green/10 text-brand-green font-black text-xs flex items-center justify-center shrink-0">
                      {app.slot?.split(" ")[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate" title={cleanPatientName(app.patientName)}>
                          {cleanPatientName(app.patientName)}
                        </span>
                        {isPractoAppointment(app) ? (
                          <PractoBadge size="sm" />
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {app.type === "manual" ? "Walk-in" : "Online"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {app.serviceId || "General Physical Therapy Session"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-500">
                      {app.assignedTherapist || app.actionedByName || "Dr. Kinnera"}
                    </span>
                    <Link
                      href="/dashboard/patients"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-green text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-brand-green transition-all"
                    >
                      Case Sheet
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 px-4 text-center border-2 border-dashed border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                All treatment tables open for today
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active bookings scheduled currently. Front desk is prepared for walk-in arrivals and urgent rehabilitation cases.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard/walkin"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Walk-in Patient</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Rehab Continuity & At-Risk Follow-Up Flags */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                Rehab Continuity Alerts
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Active care plan patients with no visit in &gt;7 days.
            </p>
          </div>

          {lapsedPatients.length > 0 ? (
            <div className="space-y-3">
              {lapsedPatients.map(({ patient, daysAgo }) => (
                <div
                  key={patient.id}
                  className="p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-950/20 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {patient.name}
                    </span>
                    <span className="text-[10px] font-extrabold text-rose-600 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full">
                      {daysAgo}d inactive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">
                    {patient.treatmentPlan || "Rehabilitation Care Plan"}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 dark:border-rose-900/40">
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {patient.therapistName || "Lead Therapist"}
                    </span>
                    {patient.phone && (
                      <button
                        onClick={() => handleWhatsAppCheckIn(patient.phone, patient.name)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 hover:underline"
                      >
                        <MessageCircle className="h-3 w-3" />
                        <span>WhatsApp Check-in</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 px-4 text-center border border-slate-100 dark:border-slate-800 rounded-2xl space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                100% Care Continuity
              </p>
              <p className="text-[11px] text-slate-400">
                No active patients overdue for their rehabilitation sessions.
              </p>
            </div>
          )}

          {/* Quick Roster Breakdown Card */}
          <div className="p-4 rounded-2xl bg-brand-sand/60 dark:bg-slate-850 border border-brand-green/20 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-green">Active Care Protocols</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
              Patients with prescribed Home Exercise Programs (HEPs) can access video guides inside the Patient Hub.
            </p>
            <div className="pt-1">
              <Link
                href="/dashboard/exercises"
                className="text-xs font-black text-brand-green hover:underline flex items-center gap-1"
              >
                <span>Browse 31 Exercise Videos</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ===================================================================== */}
      {/* 7. THERAPIST RAPID CLINICAL ACTION PAD */}
      {/* ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div>
          <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
            Clinical Action Pad
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Quick 1-tap shortcuts for practicing therapists and desk receptionists.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          
          {/* Action 1: FastTrack AI Scan */}
          <button
            onClick={() => setFastTrackOpen(true)}
            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-brand-green bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all hover:scale-[1.02] active:scale-95 group flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0 group-hover:bg-brand-green group-hover:text-white transition-colors">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">AI Case Sheet Scan</span>
              <span className="text-[10px] text-slate-500 font-medium">Extract doctor prescriptions &amp; intake sheets</span>
            </div>
          </button>

          {/* Action 2: Walk-In Registration */}
          <Link
            href="/dashboard/walkin"
            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all hover:scale-[1.02] active:scale-95 group flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Walk-in Intake</span>
              <span className="text-[10px] text-slate-500 font-medium">Instant 30-sec desk check-in &amp; bed lock</span>
            </div>
          </Link>

          {/* Action 3: Schedule Blocks */}
          <Link
            href="/dashboard/blocks"
            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-rose-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all hover:scale-[1.02] active:scale-95 group flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Schedule Hold</span>
              <span className="text-[10px] text-slate-500 font-medium">Block doctor hours or clinic shift leaves</span>
            </div>
          </Link>

          {/* Action 4: Exercise Library */}
          <Link
            href="/dashboard/exercises"
            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/40 text-left transition-all hover:scale-[1.02] active:scale-95 group flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Exercise Protocols</span>
              <span className="text-[10px] text-slate-500 font-medium">Prescribe 31 video exercises to patients</span>
            </div>
          </Link>

        </div>
      </div>

      {/* FastTrack Import Modal */}
      <FastTrackPatientImportModal
        isOpen={fastTrackOpen}
        onClose={() => setFastTrackOpen(false)}
        onSuccess={() => setFastTrackOpen(false)}
        enrolledTherapists={therapistsList}
      />

    </div>
  );
}
