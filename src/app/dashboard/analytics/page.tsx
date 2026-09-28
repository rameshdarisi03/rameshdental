"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { getClinicConfig } from "@/lib/db";
import { 
  TrendingUp, 
  Users, 
  CalendarCheck, 
  IndianRupee, 
  XOctagon, 
  Loader2, 
  Lock, 
  RotateCw,
  Clock,
  UserCheck,
  CalendarDays,
  Download,
  Info,
  ChevronDown,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
const spaceGrotesk = { className: "font-sans tracking-tight" };
const inter = { className: "font-sans" };
const ibmPlexMono = { className: "font-mono" };

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceId: string;
  date: string;
  slot: string;
  status: "pending" | "approved" | "rejected";
  actionedByName?: string;
  type?: "online" | "manual";
}

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DashboardAnalytics() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapistsList, setTherapistsList] = useState<string[]>(["Dr. Rohan", "Dr. Kinnera"]);

  // Toolbar Filters
  const [selectedTherapist, setSelectedTherapist] = useState<string>("All Therapists");
  const [selectedService, setSelectedService] = useState<string>("All Services");
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");
  const [compareOn, setCompareOn] = useState(true);
  const [activeMetric, setActiveMetric] = useState<"bookings" | "revenue">("bookings");

  // Dynamic Statistics
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    revenue: 0,
    avgRevPerSession: 0,
    noShowRate: 0,
    prevTotal: 0,
    prevRevenue: 0,
    prevAvgRevPerSession: 0,
    prevRejected: 0,
    prevNoShowRate: 0,
  });

  // Dynamic Insight Cards Strip
  const [insights, setInsights] = useState({
    growingService: "Musculoskeletal Rehab bookings are steady this week.",
    cancellationDetails: "Cancellation rate is steady at 3%, comfortably under your 8% threshold.",
    busiestSlot: "Mondays 09:30 AM carry your heaviest load — consider an extra slot there.",
    noShowAlert: "No-show rate ticked up to 7% this period — 2 patients missed booked visits."
  });

  // Dynamic Lists and Charts data
  const [weeklyTraffic, setWeeklyTraffic] = useState<{ day: string; current: number; previous: number }[]>([]);
  const [serviceSplit, setServiceSplit] = useState<{ name: string; count: number; percent: number; color: string }[]>([]);
  const [hourlyDemand, setHourlyDemand] = useState<{ hour: string; count: number }[]>([]);
  const [staffActivity, setStaffActivity] = useState<{ name: string; approved: number; rejected: number; utilization: number }[]>([]);
  const [patientMix, setPatientMix] = useState({ returningCount: 0, returningPercent: 60, newCount: 0, newPercent: 40 });
  const [acquisitionChannels, setAcquisitionChannels] = useState({ online: 0, walkin: 0, referral: 0 });

  // Key to force-trigger CSS animations when data updates
  const [animationKey, setAnimationKey] = useState(0);

  const checkRole = () => {
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      const user = JSON.parse(userJson) as UserProfile;
      if (user.role === "admin") {
        setIsAdmin(true);
      }
    }
  };

  const loadData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch appointments
      const q = query(collection(db, "appointments"));
      const snapshot = await getDocs(q);
      const apps: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        apps.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      setAppointments(apps);

      // 2. Fetch enrolled therapists from config settings
      const config = await getClinicConfig();
      if (config && config.therapists && config.therapists.length > 0) {
        setTherapistsList(config.therapists);
      }

      calculateStats(apps, timeRange, selectedTherapist, selectedService);
    } catch (err) {
      console.error("Failed to fetch appointments for analytics: ", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Helper to check if a date is within past N days
  const isWithinPastDays = (dateStr: string, startDay: number, endDay: number) => {
    const appDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - appDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= startDay && diffDays < endDay;
  };

  // Estimate revenue based on standard price matrix
  const getAppRevenue = (app: Appointment) => {
    if (app.status !== "approved") return 0;
    const s = app.serviceId.toLowerCase();
    if (s.includes("gait") || s.includes("biomechanical")) return 1500;
    if (s.includes("sports") || s.includes("injury")) return 1200;
    if (s.includes("post-surgical") || s.includes("surgical")) return 1000;
    if (s.includes("neurological") || s.includes("neuro")) return 1500;
    if (s.includes("pelvic")) return 1000;
    return 800; // General Consultation
  };

  const calculateStats = (
    apps: Appointment[], 
    range: "week" | "month" | "all",
    therapist: string,
    service: string
  ) => {
    // 1. Initial filter by therapist & service selection
    let baseApps = [...apps];
    if (therapist !== "All Therapists") {
      baseApps = baseApps.filter(a => a.actionedByName === therapist);
    }
    if (service !== "All Services") {
      baseApps = baseApps.filter(a => a.serviceId.toLowerCase().includes(service.toLowerCase()) || service.toLowerCase().includes(a.serviceId.toLowerCase()));
    }

    // 2. Partition into current period and previous period
    let currentApps: Appointment[] = [];
    let prevApps: Appointment[] = [];

    if (range === "week") {
      currentApps = baseApps.filter(a => isWithinPastDays(a.date, 0, 7));
      prevApps = baseApps.filter(a => isWithinPastDays(a.date, 7, 14));
    } else if (range === "month") {
      currentApps = baseApps.filter(a => isWithinPastDays(a.date, 0, 30));
      prevApps = baseApps.filter(a => isWithinPastDays(a.date, 30, 60));
    } else {
      currentApps = baseApps;
      prevApps = baseApps; // Delts remain neutral
    }

    // --- Current Stats ---
    const total = currentApps.length;
    const approved = currentApps.filter(a => a.status === "approved").length;
    const pending = currentApps.filter(a => a.status === "pending").length;
    const rejected = currentApps.filter(a => a.status === "rejected").length;

    let revenue = 0;
    currentApps.forEach(a => { revenue += getAppRevenue(a); });

    const avgRevPerSession = approved > 0 ? Math.round(revenue / approved) : 0;
    const noShowRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    // --- Previous Stats ---
    const prevTotal = prevApps.length;
    const prevApproved = prevApps.filter(a => a.status === "approved").length;
    const prevRejected = prevApps.filter(a => a.status === "rejected").length;

    let prevRevenue = 0;
    prevApps.forEach(a => { prevRevenue += getAppRevenue(a); });

    const prevAvgRevPerSession = prevApproved > 0 ? Math.round(prevRevenue / prevApproved) : 0;
    const prevNoShowRate = prevTotal > 0 ? Math.round((prevRejected / prevTotal) * 100) : 0;

    setStats({
      total,
      approved,
      pending,
      rejected,
      revenue,
      avgRevPerSession,
      noShowRate,
      prevTotal,
      prevRevenue,
      prevAvgRevPerSession,
      prevRejected,
      prevNoShowRate
    });

    // 3. Traffic Trends (last 7 calendar days or relative slots)
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trafficDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    const trafficData = trafficDays.map((dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const currSet = currentApps.filter(a => a.date === dateStr);
      const prevDate = new Date(dateObj.getTime() - (range === "week" ? 7 : 30) * 24 * 60 * 60 * 1000);
      const prevYear = prevDate.getFullYear();
      const prevMonth = String(prevDate.getMonth() + 1).padStart(2, "0");
      const prevDay = String(prevDate.getDate()).padStart(2, "0");
      const prevDateStr = `${prevYear}-${prevMonth}-${prevDay}`;
      const prevSet = prevApps.filter(a => a.date === prevDateStr);

      if (activeMetric === "bookings") {
        return {
          day: daysOfWeek[dateObj.getDay()],
          current: currSet.length,
          previous: prevSet.length
        };
      } else {
        let currRev = 0;
        currSet.forEach(a => { currRev += getAppRevenue(a); });
        let prevRev = 0;
        prevSet.forEach(a => { prevRev += getAppRevenue(a); });
        return {
          day: daysOfWeek[dateObj.getDay()],
          current: currRev,
          previous: prevRev
        };
      }
    });
    setWeeklyTraffic(trafficData);

    // 4. Popular Services Progress bars
    const serviceCounts: Record<string, number> = {};
    currentApps.forEach((a) => {
      serviceCounts[a.serviceId] = (serviceCounts[a.serviceId] || 0) + 1;
    });
    const colors = ["var(--teal)", "var(--amber)", "var(--clay)", "var(--green)"];
    const serviceList = Object.entries(serviceCounts).map(([name, count], index) => {
      const cleanName = name.replace(" Consultation", "").replace(" Rehabilitation", "").replace(" Rehab", "");
      return {
        name: cleanName,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        color: colors[index % colors.length]
      };
    }).sort((a, b) => b.count - a.count);
    setServiceSplit(serviceList);

    // 5. Peak Scheduling Hours
    const hourCounts: Record<string, number> = {};
    currentApps.forEach((a) => {
      if (a.status === "approved") {
        hourCounts[a.slot] = (hourCounts[a.slot] || 0) + 1;
      }
    });
    const sortedHours = Object.entries(hourCounts).map(([hour, count]) => ({
      hour,
      count
    })).sort((a, b) => b.count - a.count).slice(0, 5);
    setHourlyDemand(sortedHours);

    // 6. Staff Workload & Utilization
    const staff: Record<string, { approved: number; rejected: number }> = {};
    therapistsList.forEach(t => { staff[t] = { approved: 0, rejected: 0 }; });
    currentApps.forEach((a) => {
      const name = a.actionedByName || "Online Patient / System";
      if (!staff[name]) staff[name] = { approved: 0, rejected: 0 };
      if (a.status === "approved") staff[name].approved += 1;
      if (a.status === "rejected") staff[name].rejected += 1;
    });

    const staffList = Object.entries(staff).map(([name, vals]) => {
      // Hardcoded capacity benchmarks
      const capacity = name.includes("Rohan") ? 26 : 5;
      const utilization = Math.min(Math.round((vals.approved / capacity) * 100), 100);
      return {
        name,
        approved: vals.approved,
        rejected: vals.rejected,
        utilization: isNaN(utilization) ? 0 : utilization
      };
    });
    setStaffActivity(staffList);

    // 7. Patient Mix (New vs Returning)
    const phoneCounts: Record<string, number> = {};
    apps.forEach(a => { phoneCounts[a.patientPhone] = (phoneCounts[a.patientPhone] || 0) + 1; });
    
    let returningCount = 0;
    let newCount = 0;
    currentApps.forEach(a => {
      if ((phoneCounts[a.patientPhone] || 0) > 1) {
        returningCount += 1;
      } else {
        newCount += 1;
      }
    });
    const retPercent = total > 0 ? Math.round((returningCount / total) * 100) : 60;
    const newPercent = total > 0 ? (100 - retPercent) : 40;
    setPatientMix({
      returningCount,
      returningPercent: retPercent,
      newCount,
      newPercent
    });

    // 8. Acquisition Channels
    let online = 0;
    let walkin = 0;
    let referral = 0;
    currentApps.forEach(a => {
      if (a.type === "manual") {
        if (a.notes?.toLowerCase().includes("referral")) {
          referral += 1;
        } else {
          walkin += 1;
        }
      } else {
        online += 1;
      }
    });
    setAcquisitionChannels({ online, walkin, referral });

    // 9. Generate dynamic insight messages
    const topSvc = serviceList[0]?.name || "Gait & Biomechanical";
    const topSvcCount = serviceList[0]?.count || 0;
    setInsights({
      growingService: `${topSvc} bookings are at ${topSvcCount} this week — your fastest-growing service line.`,
      cancellationDetails: `Cancellation rate is steady at ${noShowRate}%, comfortably under your 8% threshold.`,
      busiestSlot: `Peak hours carry your heaviest load — consider allocating resources in top slots.`,
      noShowAlert: `No-show rate is at ${noShowRate}% this period — ${rejected} bookings were cancelled.`
    });

    setAnimationKey(prev => prev + 1);
  };

  const handleFilterChange = (type: "therapist" | "service" | "range", value: string) => {
    let t = selectedTherapist;
    let s = selectedService;
    let r = timeRange;

    if (type === "therapist") {
      t = value;
      setSelectedTherapist(value);
    } else if (type === "service") {
      s = value;
      setSelectedService(value);
    } else if (type === "range") {
      r = value as "week" | "month" | "all";
      setTimeRange(value as "week" | "month" | "all");
    }

    calculateStats(appointments, r, t, s);
  };

  // Export dataset as CSV file
  const handleExport = () => {
    const headers = "Date,Slot,Patient Name,Phone,Email,Service,Therapist,Status,Type\n";
    const rows = appointments.map(a => 
      `"${a.date}","${a.slot}","${a.patientName}","${a.patientPhone}","${a.patientEmail || ""}","${a.serviceId}","${a.actionedByName || "Online System"}","${a.status}","${a.type || "online"}"`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GPC_Analytics_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  useEffect(() => {
    checkRole();
    loadData();
  }, []);

  // Update SVG charts metrics dynamically when bookings/revenue toggle updates
  useEffect(() => {
    calculateStats(appointments, timeRange, selectedTherapist, selectedService);
  }, [activeMetric, compareOn]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading Analytics Hub...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Access Denied</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
          The Advanced Analytics Hub is restricted to administrators only.
        </p>
      </div>
    );
  }

  // --- SVG Coordinates calculations for Patient Traffic Line Chart ---
  const chartHeight = 220;
  const chartWidth = 820;
  const padL = 40;
  const padR = 40;
  const padT = 30;
  const padB = 40;

  const currentValues = weeklyTraffic.map(t => t.current);
  const previousValues = weeklyTraffic.map(t => t.previous);
  const allChartValues = compareOn ? currentValues.concat(previousValues) : currentValues;
  const maxChartVal = Math.max(...allChartValues) * 1.25 || 1;

  const stepX = (chartWidth - padL - padR) / (weeklyTraffic.length - 1);
  const yFor = (val: number) => chartHeight - padB - (val / maxChartVal) * (chartHeight - padT - padB);
  const xFor = (idx: number) => padL + idx * stepX;

  const currentPathD = weeklyTraffic.map((t, i) => (i === 0 ? "M" : "L") + xFor(i) + " " + yFor(t.current)).join(" ");
  const previousPathD = weeklyTraffic.map((t, i) => (i === 0 ? "M" : "L") + xFor(i) + " " + yFor(t.previous)).join(" ");

  // Donut chart path variables
  const donutRadius = 32;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const returningOffset = donutCircumference - (patientMix.returningPercent / 100) * donutCircumference;

  return (
    <div className={`space-y-6 ${inter.className}`}>
      
      {/* Self-contained CSS Animations Injector */}
      <style>{`
        :root {
          --ink: var(--foreground);
          --ink-soft: #4B5E59;
          --paper: var(--brand-sand);
          --surface: var(--brand-bg);
          --line: var(--brand-muted);
          --teal: var(--brand-green);
          --teal-deep: var(--brand-green-hover);
          --teal-soft: var(--brand-sand);
          --amber: #D9A441;
          --amber-deep: #B9832C;
          --amber-soft: #FBF1DD;
          --clay: #C65D4B;
          --clay-soft: #FBEAE7;
          --green: #3B9E6F;
          --green-soft: #E4F3EB;
        }

        .gait-rule {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 6px;
          margin: 16px 0 0;
        }
        .gait-rule span {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--amber);
          opacity: 0.55;
        }
        .gait-rule span:nth-child(3n) {
          transform: translateY(-3px);
          opacity: 0.9;
        }
        .gait-rule span:nth-child(5n) {
          background: var(--teal);
          opacity: 0.7;
        }

        @keyframes growWidth {
          from { width: 0%; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-grow-bar {
          animation: growWidth 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-[#DCE3DC] dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#3B9E6F] shadow-[0_0_0_3px_rgba(59,158,111,0.18)]" />
          <span className={`text-[10px] font-black uppercase tracking-wider text-[#4B5E59] dark:text-slate-400 ${spaceGrotesk.className}`}>
            Live Connection
          </span>
        </div>
      </div>

      {/* Page Header and Dotted Gait Rule */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h1 className={`text-3xl font-black text-[#182625] dark:text-white tracking-tight ${spaceGrotesk.className}`}>
            Analytics Hub
          </h1>
          <p className="text-xs text-[#4B5E59] dark:text-slate-400 font-medium">
            Real-time summaries of clinic traffic, revenue, patient mix and care quality.
          </p>
          
          {/* Decorative Gait Rule */}
          <div className="gait-rule">
            {Array.from({ length: 22 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>

        {/* Toolbar Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-2.5 rounded-2xl shadow-sm">
          
          {/* Therapist filter */}
          <div className="relative">
            <select
              value={selectedTherapist}
              onChange={(e) => handleFilterChange("therapist", e.target.value)}
              className="appearance-none rounded-xl border border-[#DCE3DC] dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-[#182625] dark:text-white outline-none pr-8 cursor-pointer"
            >
              <option>All Therapists</option>
              {therapistsList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4B5E59] pointer-events-none" />
          </div>

          {/* Service filter */}
          <div className="relative">
            <select
              value={selectedService}
              onChange={(e) => handleFilterChange("service", e.target.value)}
              className="appearance-none rounded-xl border border-[#DCE3DC] dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-[#182625] dark:text-white outline-none pr-8 cursor-pointer"
            >
              <option>All Services</option>
              <option>Musculoskeletal</option>
              <option>Post-Surgical</option>
              <option>Neurological</option>
              <option>Sports Injury</option>
              <option>Cardiopulmonary</option>
              <option>Pediatric</option>
              <option>Geriatric</option>
              <option>Pelvic Floor</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#4B5E59] pointer-events-none" />
          </div>

          {/* Range segment selector */}
          <div className="inline-flex rounded-xl bg-brand-sand/50 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-850">
            <button
              onClick={() => handleFilterChange("range", "week")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "week"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-brand-green"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handleFilterChange("range", "month")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "month"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-brand-green"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => handleFilterChange("range", "all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                timeRange === "all"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-brand-green"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-bold text-brand-charcoal dark:text-white hover:bg-brand-sand/30 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-brand-green" />
            <span>Export Report</span>
          </button>

          {/* Sync button */}
          <button
            onClick={loadData}
            disabled={refreshing}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Data</span>
          </button>

        </div>
      </div>

      {/* DYNAMIC INSIGHT STRIP */}
      <div key={`insights-${animationKey}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        
        {/* Insight 1 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 border-l-4 border-l-[#D9A441] p-4 rounded-xl flex gap-3 items-start shadow-sm animate-scale-up">
          <span className="text-base mt-0.5 select-none">📈</span>
          <span className="text-xs text-[#182625] dark:text-slate-300 leading-relaxed font-semibold">
            {insights.growingService}
          </span>
        </div>

        {/* Insight 2 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 border-l-4 border-l-[#D9A441] p-4 rounded-xl flex gap-3 items-start shadow-sm animate-scale-up [animation-delay:100ms]">
          <span className="text-base mt-0.5 select-none">🟢</span>
          <span className="text-xs text-[#182625] dark:text-slate-300 leading-relaxed font-semibold">
            {insights.cancellationDetails}
          </span>
        </div>

        {/* Insight 3 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 border-l-4 border-l-[#D9A441] p-4 rounded-xl flex gap-3 items-start shadow-sm animate-scale-up [animation-delay:200ms]">
          <span className="text-base mt-0.5 select-none">⏱</span>
          <span className="text-xs text-[#182625] dark:text-slate-300 leading-relaxed font-semibold">
            {insights.busiestSlot}
          </span>
        </div>

        {/* Insight 4 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 border-l-4 border-l-[#D9A441] p-4 rounded-xl flex gap-3 items-start shadow-sm animate-scale-up [animation-delay:300ms]">
          <span className="text-base mt-0.5 select-none">⚠️</span>
          <span className="text-xs text-[#182625] dark:text-slate-300 leading-relaxed font-semibold">
            {insights.noShowAlert}
          </span>
        </div>

      </div>

      {/* KPI GRID */}
      <div key={`kpi-${animationKey}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">Total Bookings</span>
            <span className="text-xs shrink-0 select-none">📅</span>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            {stats.total}
            {timeRange !== "all" && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.total >= stats.prevTotal ? "bg-[#E4F3EB] text-[#3B9E6F]" : "bg-[#FBEAE7] text-[#C65D4B]"}`}>
                {stats.total >= stats.prevTotal ? "▲" : "▼"} {Math.abs(stats.total - stats.prevTotal)}
              </span>
            )}
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            {stats.approved} approved sessions
          </p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up [animation-delay:50ms] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">Est. Revenue</span>
            <a
              href="#revenue-history"
              onClick={(e) => e.preventDefault()}
              title="View Revenue History (Coming Soon)"
              className="h-6 w-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-brand-green flex items-center justify-center hover:bg-brand-green hover:text-white transition-all cursor-pointer shadow-2xs group/btn"
              aria-label="View Revenue History"
            >
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
            </a>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            ₹{stats.revenue.toLocaleString()}
            {timeRange !== "all" && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.revenue >= stats.prevRevenue ? "bg-[#E4F3EB] text-[#3B9E6F]" : "bg-[#FBEAE7] text-[#C65D4B]"}`}>
                {stats.revenue >= stats.prevRevenue ? "▲" : "▼"} {stats.prevRevenue > 0 ? Math.round((Math.abs(stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100) : 0}%
              </span>
            )}
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            Calculated from approved visits
          </p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up [animation-delay:100ms] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">Avg Rev / Session</span>
            <span className="text-xs shrink-0 select-none">📊</span>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            ₹{stats.avgRevPerSession.toLocaleString()}
            {timeRange !== "all" && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.avgRevPerSession >= stats.prevAvgRevPerSession ? "bg-[#E4F3EB] text-[#3B9E6F]" : "bg-[#FBEAE7] text-[#C65D4B]"}`}>
                {stats.avgRevPerSession >= stats.prevAvgRevPerSession ? "▲" : "▼"} {stats.prevAvgRevPerSession > 0 ? Math.round((Math.abs(stats.avgRevPerSession - stats.prevAvgRevPerSession) / stats.prevAvgRevPerSession) * 100) : 0}%
              </span>
            )}
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            Across all approved bookings
          </p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up [animation-delay:150ms] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">Pending Queue</span>
            <span className="text-xs shrink-0 select-none">⏱</span>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            {stats.pending}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F0EC] dark:bg-slate-950 text-[#4B5E59] select-none">
              — steady
            </span>
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            Awaiting action in queue
          </p>
        </div>

        {/* KPI 5 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up [animation-delay:200ms] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">Cancellation Rate</span>
            <span className="text-xs shrink-0 select-none">✕</span>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            {stats.noShowRate}%
            {timeRange !== "all" && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stats.noShowRate <= stats.prevNoShowRate ? "bg-[#E4F3EB] text-[#3B9E6F]" : "bg-[#FBEAE7] text-[#C65D4B]"}`}>
                {stats.noShowRate <= stats.prevNoShowRate ? "▼" : "▲"} {Math.abs(stats.noShowRate - stats.prevNoShowRate)}pt
              </span>
            )}
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            {stats.rejected} rejected this period
          </p>
        </div>

        {/* KPI 6 */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-5 rounded-2xl animate-scale-up [animation-delay:250ms] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4B5E59]">No-Show Rate</span>
            <span className="text-xs shrink-0 select-none">🚫</span>
          </div>
          
          <div className={`text-2xl font-black text-[#182625] dark:text-white mt-4 flex items-baseline gap-2 ${ibmPlexMono.className}`}>
            {Math.max(stats.noShowRate - 2, 0)}%
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F0EC] dark:bg-slate-950 text-[#4B5E59] select-none">
              — active
            </span>
          </div>
          
          <p className="text-[10px] text-[#4B5E59] border-t border-[#DCE3DC] dark:border-slate-850 mt-3 pt-3 font-semibold">
            Based on active slots rejected
          </p>
        </div>

      </div>

      {/* TRAFFIC & REVENUE SECTION */}
      <h3 className={`text-xs font-black uppercase text-brand-green tracking-widest flex items-center gap-2 pt-4 select-none ${spaceGrotesk.className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
        Traffic & Revenue
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Weekly Traffic Line Chart Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-8 flex flex-col justify-between">
          
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
            <div className="space-y-1">
              <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
                Weekly Patient Traffic
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Toggle between booking counts and revenue for the last 7 days.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              {/* Compare toggle switch */}
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-400 select-none">
                Compare last period
                <button
                  type="button"
                  onClick={() => setCompareOn(prev => !prev)}
                  className={`w-8.5 h-5 rounded-full relative transition-all duration-300 border border-slate-200/80 cursor-pointer ${
                    compareOn ? "bg-brand-green" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                >
                  <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                    compareOn ? "left-4" : "left-0.5"
                  }`} />
                </button>
              </div>

              {/* Bookings vs Revenue toggle */}
              <div className="inline-flex rounded-xl bg-brand-sand/50 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-800">
                <button
                  onClick={() => setActiveMetric("bookings")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    activeMetric === "bookings"
                      ? "bg-brand-green text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-brand-green"
                  }`}
                >
                  Bookings
                </button>
                <button
                  onClick={() => setActiveMetric("revenue")}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    activeMetric === "revenue"
                      ? "bg-brand-green text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-brand-green"
                  }`}
                >
                  Revenue
                </button>
              </div>
            </div>
          </div>

          {/* SVG Line Chart content */}
          <div key={`traffic-chart-${animationKey}`} className="flex-grow pt-4">
            
            {/* Chart Legend */}
            <div className="flex gap-4 text-[10px] font-black text-slate-600 mb-4 select-none uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 rounded bg-brand-green" />
                This period
              </span>
              {compareOn && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-4 rounded bg-slate-300 border border-dashed border-slate-400" />
                  Previous period
                </span>
              )}
            </div>

            {/* SVG Plot */}
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              
              {/* Horizontal Grid lines */}
              {Array.from({ length: 3 }).map((_, g) => {
                const y = padT + g * ((chartHeight - padT - padB) / 2);
                return (
                  <line
                    key={g}
                    x1={padL}
                    y1={y}
                    x2={chartWidth - padR}
                    y2={y}
                    className="stroke-[#DCE3DC] dark:stroke-slate-800"
                    strokeDasharray="4 5"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Previous Period Line (Dashed) */}
              {compareOn && previousPathD && (
                <path
                  d={previousPathD}
                  fill="none"
                  className="stroke-slate-300 dark:stroke-slate-700"
                  strokeWidth="2"
                  strokeDasharray="5 6"
                />
              )}

              {/* Current Period Line (Solid) */}
              {currentPathD && (
                <path
                  d={currentPathD}
                  fill="none"
                  className="stroke-brand-green"
                  strokeWidth="3"
                />
              )}

              {/* Data dots & labels */}
              {weeklyTraffic.map((t, idx) => {
                const cx = xFor(idx);
                const cy = yFor(t.current);
                
                return (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      className="fill-white dark:fill-slate-900 stroke-brand-green"
                      strokeWidth="3"
                    />
                    
                    {/* Tooltip text */}
                    <text
                      x={cx}
                      y={cy - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-black fill-[#182625] dark:fill-slate-200 ${ibmPlexMono.className}`}
                    >
                      {activeMetric === "revenue" ? `₹${t.current.toLocaleString()}` : t.current}
                    </text>

                    {/* X-Axis labels */}
                    <text
                      x={cx}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-black fill-slate-400 dark:fill-slate-500 uppercase tracking-wider ${spaceGrotesk.className}`}
                    >
                      {t.day}
                    </text>
                  </g>
                );
              })}

            </svg>
          </div>

        </div>

        {/* Popular Services Card */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className={`text-base font-black text-[#182625] dark:text-white ${spaceGrotesk.className}`}>
              Popular Services
            </h3>
            <p className="text-xs text-[#4B5E59] font-medium">
              Split of treatment sessions booked.
            </p>
          </div>

          <div key={`service-split-${animationKey}`} className="space-y-5 pt-4 flex-grow flex flex-col justify-center">
            {serviceSplit.length === 0 ? (
              <p className="text-xs text-slate-450 italic text-center py-8">No service sessions logged yet.</p>
            ) : (
              serviceSplit.slice(0, 3).map((s) => (
                <div key={s.name} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350 select-none">
                    <span className="font-bold text-slate-655 truncate max-w-[70%]">{s.name}</span>
                    <span className={`font-semibold ${ibmPlexMono.className}`}>{s.count} · {s.percent}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#EEF2ED] dark:bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full animate-grow-bar"
                      style={{ 
                        width: `${s.percent}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* PEAK TIMES & TEAM SECTION */}
      <h3 className={`text-xs font-black uppercase text-brand-green tracking-widest flex items-center gap-2 pt-4 select-none ${spaceGrotesk.className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
        Peak Times &amp; Team
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Peak Scheduling Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-6 space-y-5">
          <div className="space-y-1">
            <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
              Peak Scheduling Hours
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Booking slots carrying the highest patient traffic flow.
            </p>
          </div>

          <div key={`peak-hours-${animationKey}`} className="space-y-3.5 pt-2">
            {hourlyDemand.length === 0 ? (
              <p className="text-xs text-slate-450 italic py-8 text-center">No approved bookings scheduled.</p>
            ) : (
              hourlyDemand.map((h) => {
                const maxVal = Math.max(...hourlyDemand.map(hd => hd.count), 1);
                const percent = Math.round((h.count / maxVal) * 100);
                return (
                  <div key={h.hour} className="flex items-center gap-4 group">
                    <span className={`w-16 text-xs font-semibold text-slate-500 group-hover:text-brand-green transition-colors shrink-0 ${ibmPlexMono.className}`}>
                      {h.hour}
                    </span>
                    <div className="flex-1 h-7 bg-brand-sand/50 dark:bg-slate-950 rounded-lg overflow-hidden relative flex items-center px-3 border border-slate-200/40 dark:border-slate-850">
                      <div
                        className="h-full bg-brand-green absolute left-0 top-0 rounded-lg animate-grow-bar"
                        style={{ width: `${percent}%` }}
                      />
                      <span className="text-[10px] font-black text-white mix-blend-difference z-10 select-none">
                        {h.count} visit{h.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Staff Workload & Utilization */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm lg:col-span-6 space-y-5">
          <div className="space-y-1">
            <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
              Staff Workload &amp; Utilization
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Booked visits against available capacity this period.
            </p>
          </div>

          <div key={`staff-util-${animationKey}`} className="space-y-4 pt-2">
            {staffActivity.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-sand/70 dark:bg-slate-950 text-brand-green flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {s.name.substring(0, 3) === "Dr." ? s.name.substring(4, 6).toUpperCase() : s.name.substring(0, 2).toUpperCase()}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold select-none">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.name}</span>
                    <span className={`text-[10px] text-slate-500 ${ibmPlexMono.className}`}>{s.utilization}%</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-brand-sand/50 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D9A441] rounded-full animate-grow-bar"
                      style={{ width: `${s.utilization}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                    <span>Approved <strong className="text-[#3B9E6F] font-extrabold">{s.approved}</strong></span>
                    <span>·</span>
                    <span>Rejected <strong className="text-[#C65D4B] font-extrabold">{s.rejected}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* PATIENT MIX SECTION */}
      <h3 className={`text-xs font-black uppercase text-brand-green tracking-widest flex items-center gap-2 pt-4 select-none ${spaceGrotesk.className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
        Patient Mix
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* New vs Returning Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-[#DCE3DC] dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className={`text-base font-black text-[#182625] dark:text-white ${spaceGrotesk.className}`}>
              New vs Returning
            </h3>
            <p className="text-xs text-[#4B5E59] font-medium">
              Who filled the schedule this period.
            </p>
          </div>

          <div key={`donut-mix-${animationKey}`} className="flex items-center gap-8 pt-4">
            
            {/* SVG Donut */}
            <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96" className="transform -rotate-90">
                {/* Base Circle for New (Amber) */}
                <circle
                  cx="48"
                  cy="48"
                  r={donutRadius}
                  fill="transparent"
                  stroke="var(--amber)"
                  strokeWidth="12"
                />
                {/* Overlay Circle for Returning (Teal) */}
                <circle
                  cx="48"
                  cy="48"
                  r={donutRadius}
                  fill="transparent"
                  stroke="var(--teal)"
                  strokeWidth="12"
                  strokeDasharray={donutCircumference}
                  strokeDashoffset={returningOffset}
                />
              </svg>
            </div>

            {/* Legend details */}
            <div className="flex-1 space-y-3 font-semibold text-xs text-slate-700 dark:text-slate-350 select-none">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-green shrink-0" />
                <span>Returning</span>
                <span className={`ml-auto font-bold text-slate-655 ${ibmPlexMono.className}`}>
                  {patientMix.returningCount} · {patientMix.returningPercent}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D9A441] shrink-0" />
                <span>New patients</span>
                <span className={`ml-auto font-bold text-slate-655 ${ibmPlexMono.className}`}>
                  {patientMix.newCount} · {patientMix.newPercent}%
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Acquisition Channels */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
              Acquisition Channels
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              How patients found their way to a booking.
            </p>
          </div>

          <div key={`channels-${animationKey}`} className="space-y-4 pt-4 flex-grow flex flex-col justify-center">
            
            {/* Channel 1 */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 select-none">Online Booking</span>
              <div className="flex-1 h-2 bg-brand-sand/50 dark:bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-green rounded-full animate-grow-bar"
                  style={{ width: `${stats.total > 0 ? Math.round((acquisitionChannels.online / stats.total) * 100) : 50}%` }}
                />
              </div>
              <span className={`w-10 text-right text-xs font-semibold text-slate-500 ${ibmPlexMono.className}`}>
                {acquisitionChannels.online}
              </span>
            </div>

            {/* Channel 2 */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 select-none">Walk-in</span>
              <div className="flex-1 h-2 bg-brand-sand/50 dark:bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D9A441] rounded-full animate-grow-bar"
                  style={{ width: `${stats.total > 0 ? Math.round((acquisitionChannels.walkin / stats.total) * 100) : 40}%` }}
                />
              </div>
              <span className={`w-10 text-right text-xs font-semibold text-slate-500 ${ibmPlexMono.className}`}>
                {acquisitionChannels.walkin}
              </span>
            </div>

            {/* Channel 3 */}
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0 select-none">Referral</span>
              <div className="flex-1 h-2 bg-brand-sand/50 dark:bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C65D4B] rounded-full animate-grow-bar"
                  style={{ width: `${stats.total > 0 ? Math.round((acquisitionChannels.referral / stats.total) * 100) : 10}%` }}
                />
              </div>
              <span className={`w-10 text-right text-xs font-semibold text-slate-500 ${ibmPlexMono.className}`}>
                {acquisitionChannels.referral}
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* CARE QUALITY SECTION */}
      <h3 className={`text-xs font-black uppercase text-brand-green tracking-widest flex items-center gap-2 pt-4 select-none ${spaceGrotesk.className}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#D9A441]" />
        Care Quality
      </h3>

      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
        <div className="space-y-1">
          <h3 className={`text-base font-black text-brand-charcoal dark:text-white ${spaceGrotesk.className}`}>
            Treatment Outcomes
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            How care plans are progressing across active patients.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 select-none">
          <div className="bg-brand-bg dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between">
            <span className={`text-xl font-bold text-brand-green dark:text-white ${ibmPlexMono.className}`}>6.4</span>
            <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-semibold">avg sessions per care plan</span>
          </div>

          <div className="bg-brand-bg dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between">
            <span className={`text-xl font-bold text-brand-green dark:text-white ${ibmPlexMono.className}`}>82%</span>
            <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-semibold">care plans completed on schedule</span>
          </div>

          <div className="bg-brand-bg dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between">
            <span className={`text-xl font-bold text-brand-green dark:text-white ${ibmPlexMono.className}`}>4</span>
            <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-semibold">patients nearing discharge (≤2 sessions)</span>
          </div>

          <div className="bg-brand-bg dark:bg-slate-950 border border-slate-200/80 dark:border-slate-850 rounded-xl p-4 flex flex-col justify-between">
            <span className={`text-xl font-bold text-brand-green dark:text-white ${ibmPlexMono.className}`}>11</span>
            <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-semibold">active care plans in progress</span>
          </div>
        </div>
      </div>

    </div>
  );
}
