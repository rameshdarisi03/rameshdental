"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";
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
  CalendarDays
} from "lucide-react";

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
}

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

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

export default function DashboardAnalytics() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("all");

  // Statistics State
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    revenue: 0,
    noShowRate: 0
  });

  // Chart Data States
  const [weeklyTraffic, setWeeklyTraffic] = useState<{ day: string; count: number }[]>([]);
  const [serviceSplit, setServiceSplit] = useState<{ name: string; count: number; color: string }[]>([]);
  const [hourlyDemand, setHourlyDemand] = useState<{ hour: string; count: number }[]>([]);
  const [staffActivity, setStaffActivity] = useState<{ name: string; approved: number; rejected: number }[]>([]);

  // Key to force-trigger CSS animations when timeRange changes
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
      const q = query(collection(db, "appointments"));
      const snapshot = await getDocs(q);
      const apps: Appointment[] = [];
      snapshot.forEach((docSnap) => {
        apps.push({ id: docSnap.id, ...docSnap.data() } as Appointment);
      });
      setAppointments(apps);
      calculateStats(apps, timeRange);
    } catch (err) {
      console.error("Failed to fetch appointments for analytics: ", err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Helper to check if a date is within past N days
  const isWithinPastDays = (dateStr: string, days: number) => {
    const appDate = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - appDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < days;
  };

  const calculateStats = (apps: Appointment[], range: "week" | "month" | "all") => {
    // 1. Filter appointments based on selected time range
    let filteredApps = [...apps];
    if (range === "week") {
      filteredApps = apps.filter(a => isWithinPastDays(a.date, 7));
    } else if (range === "month") {
      filteredApps = apps.filter(a => isWithinPastDays(a.date, 30));
    }

    const total = filteredApps.length;
    const approved = filteredApps.filter(a => a.status === "approved").length;
    const pending = filteredApps.filter(a => a.status === "pending").length;
    const rejected = filteredApps.filter(a => a.status === "rejected").length;

    // Approximate Pricing Matrix for Estimating Revenue
    let revenue = 0;
    filteredApps.forEach((app) => {
      if (app.status === "approved") {
        const s = app.serviceId;
        if (s.includes("Gait") || s.includes("Biomechanical")) {
          revenue += 1500;
        } else if (s.includes("Sports") || s.includes("Injury") || s.includes("Rehabilitation")) {
          revenue += 1200;
        } else if (s.includes("Post-Surgical") || s.includes("Rehab")) {
          revenue += 1000;
        } else {
          revenue += 800; // General Consultation
        }
      }
    });

    const noShowRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

    setStats({
      total,
      approved,
      pending,
      rejected,
      revenue,
      noShowRate
    });

    // 2. Calculate Weekly Traffic Trend (last 7 days of dates)
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    const traffic = last7Days.map((dateObj) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      
      const count = filteredApps.filter(a => a.date === dateStr).length;
      return {
        day: daysOfWeek[dateObj.getDay()],
        count
      };
    });
    setWeeklyTraffic(traffic);

    // 3. Calculate Service Type split
    const serviceCounts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      serviceCounts[a.serviceId] = (serviceCounts[a.serviceId] || 0) + 1;
    });

    const colors = ["bg-teal-500", "bg-emerald-500", "bg-purple-500", "bg-indigo-500", "bg-pink-500"];
    const serviceList = Object.entries(serviceCounts).map(([name, count], index) => ({
      name: name.replace(" Consultation", "").replace(" Rehabilitation", ""),
      count,
      color: colors[index % colors.length]
    })).sort((a, b) => b.count - a.count);
    setServiceSplit(serviceList);

    // 4. Hourly Demand (aggregate booking count per time slot)
    const hourCounts: Record<string, number> = {};
    filteredApps.forEach((a) => {
      if (a.status === "approved") {
        hourCounts[a.slot] = (hourCounts[a.slot] || 0) + 1;
      }
    });
    const sortedHours = Object.entries(hourCounts).map(([hour, count]) => ({
      hour,
      count
    })).sort((a, b) => {
      // Sort in ascending order (9am -> 6pm)
      const parseTime = (t: string) => {
        const [time, modifier] = t.split(" ");
        let [hours, minutes] = time.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };
      return parseTime(a.hour) - parseTime(b.hour);
    });
    setHourlyDemand(sortedHours);

    // 5. Staff Workload Audit (count approvals/rejections per staff name)
    const staff: Record<string, { approved: number; rejected: number }> = {};
    filteredApps.forEach((a) => {
      const name = a.actionedByName || "Online Patient / System";
      if (!staff[name]) staff[name] = { approved: 0, rejected: 0 };
      if (a.status === "approved") staff[name].approved += 1;
      if (a.status === "rejected") staff[name].rejected += 1;
    });
    const staffListObj = Object.entries(staff)
      .map(([name, vals]) => ({
        name,
        approved: vals.approved,
        rejected: vals.rejected
      }))
      .filter((s) => s.approved > 0 || s.rejected > 0);
    setStaffActivity(staffListObj);

    // Increment animation key to restart CSS transitions on state reload
    setAnimationKey(prev => prev + 1);
  };

  const handleTimeRangeChange = (range: "week" | "month" | "all") => {
    setTimeRange(range);
    calculateStats(appointments, range);
  };

  useEffect(() => {
    checkRole();
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading analytics calculations...</span>
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
          The Advanced Analytics Hub is restricted to administrators only. Receptionist accounts do not have access permissions.
        </p>
      </div>
    );
  }

  // --- SVG Path Calculators for Area Chart ---
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const maxTrafficVal = Math.max(...weeklyTraffic.map(t => t.count), 4);
  const trafficPoints = weeklyTraffic.map((t, idx) => {
    const x = paddingX + (idx * (chartWidth - paddingX * 2)) / (weeklyTraffic.length - 1);
    const y = chartHeight - paddingY - (t.count * (chartHeight - paddingY * 2)) / maxTrafficVal;
    return { x, y, label: t.day, value: t.count };
  });

  const linePathD = trafficPoints.length > 0
    ? `M ${trafficPoints[0].x} ${trafficPoints[0].y} ` + 
      trafficPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  const areaPathD = trafficPoints.length > 0
    ? `${linePathD} L ${trafficPoints[trafficPoints.length - 1].x} ${chartHeight - paddingY} L ${trafficPoints[0].x} ${chartHeight - paddingY} Z`
    : "";

  return (
    <div className="space-y-6">
      {/* Self-contained CSS Animations Injector */}
      <style>{`
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeInArea {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes growWidth {
          from { width: 0%; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-draw-line {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawLine 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-fade-area {
          opacity: 0;
          animation: fadeInArea 1s ease-out 0.8s forwards;
        }
        .animate-grow-bar {
          animation: growWidth 1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .animate-scale-up {
          animation: scaleUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Analytics Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-semibold">Real-time summaries of clinic traffic, revenues, and staff workload audits.</p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Time Range Filter Buttons */}
          <div className="inline-flex rounded-full bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleTimeRangeChange("week")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                timeRange === "week"
                  ? "bg-white dark:bg-slate-800 text-brand-green shadow-sm"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => handleTimeRangeChange("month")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                timeRange === "month"
                  ? "bg-white dark:bg-slate-800 text-brand-green shadow-sm"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => handleTimeRangeChange("all")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                timeRange === "all"
                  ? "bg-white dark:bg-slate-800 text-brand-green shadow-sm"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4.5 py-2.5 text-xs font-black text-slate-700 dark:text-white hover:bg-slate-50 hover:text-brand-green hover:scale-105 active:scale-95 transition-all shadow-sm shrink-0"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-green" : ""}`} />
            Sync Data
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div key={`stats-${animationKey}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Appointments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between animate-scale-up">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total Bookings</span>
              <span className="text-3xl font-black text-brand-charcoal dark:text-white">
                <AnimatedCounter value={stats.total} />
              </span>
            </div>
            <div className="h-11 w-11 bg-brand-sand text-brand-green ring-4 ring-brand-sand/30 rounded-full flex items-center justify-center shrink-0">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 font-semibold">
            <span className="font-black text-brand-green dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3 animate-bounce" />
              {stats.approved}
            </span>
            <span>approved sessions</span>
          </div>
        </div>

        {/* Card 2: Estimated Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between animate-scale-up [animation-delay:100ms]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Est. Revenue</span>
              <span className="text-3xl font-black text-brand-charcoal dark:text-white flex items-center">
                <IndianRupee className="h-6 w-6 stroke-[3]" />
                <AnimatedCounter value={stats.revenue} />
              </span>
            </div>
            <div className="h-11 w-11 bg-[#f0f4f2] text-brand-green ring-4 ring-[#f0f4f2]/30 rounded-full flex items-center justify-center shrink-0">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 font-semibold">
            Calculated from approved visits
          </div>
        </div>

        {/* Card 3: Pending Inquiries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between animate-scale-up [animation-delay:200ms]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pending Queue</span>
              <span className="text-3xl font-black text-brand-charcoal dark:text-white">
                <AnimatedCounter value={stats.pending} />
              </span>
            </div>
            <div className="h-11 w-11 bg-brand-sand text-brand-green ring-4 ring-brand-sand/30 rounded-full flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 font-semibold">
            Awaiting action in queue
          </div>
        </div>

        {/* Card 4: No-Show/Rejection Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between animate-scale-up [animation-delay:300ms]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Cancellation Rate</span>
              <span className="text-3xl font-black text-brand-charcoal dark:text-white">
                <AnimatedCounter value={stats.noShowRate} suffix="%" />
              </span>
            </div>
            <div className="h-11 w-11 bg-red-50 text-red-650 ring-4 ring-red-100/30 rounded-full flex items-center justify-center shrink-0">
              <XOctagon className="h-5 w-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100 font-semibold">
            {stats.rejected} rejected bookings
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart A: Weekly Traffic (Area Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] lg:col-span-2 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-black text-brand-charcoal dark:text-white text-base">Weekly Patient Traffic</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">Total booking counts across the last 7 days.</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-brand-green font-bold bg-brand-sand/40 dark:bg-slate-950 px-3 py-1 rounded-full">
              <CalendarDays className="h-3.5 w-3.5 text-brand-green" />
              <span>Timeline View</span>
            </div>
          </div>

          <div key={`traffic-${animationKey}`} className="relative pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5d7a6d" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#5d7a6d" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#5d7a6d" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3" />
              <line x1={paddingX} y1={(chartHeight - paddingY + paddingY) / 2} x2={chartWidth - paddingX} y2={(chartHeight - paddingY + paddingY) / 2} className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="1" strokeDasharray="3" />
              <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1.5" />

              {/* Filled Area */}
              {areaPathD && <path d={areaPathD} fill="url(#areaGrad)" className="animate-fade-area" />}

              {/* Line Path */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  filter="url(#glow)"
                  className="stroke-brand-green dark:stroke-teal-500 animate-draw-line"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Point Coordinates Circles */}
              {trafficPoints.map((p, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    className="fill-white dark:fill-slate-900 stroke-brand-green dark:stroke-teal-500 hover:r-7 hover:stroke-width-[4px] transition-all duration-250"
                    strokeWidth="2.5"
                  />
                  {/* Tooltip labels */}
                  <text
                    x={p.x}
                    y={p.y - 12}
                    textAnchor="middle"
                    className="text-[10px] font-black fill-brand-charcoal dark:fill-slate-200"
                  >
                    {p.value}
                  </text>
                  {/* X-Axis labels */}
                  <text
                    x={p.x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Chart B: Services Share (List Progress Bars) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-4">
          <div>
            <h3 className="font-black text-brand-charcoal dark:text-white text-base">Popular Services</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">Split of treatment sessions booked.</p>
          </div>

          <div key={`services-${animationKey}`} className="space-y-4 pt-2">
            {serviceSplit.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No service bookings logged yet.</p>
            ) : (
              serviceSplit.slice(0, 4).map((s) => {
                const percent = stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0;
                return (
                  <div key={s.name} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-350">
                      <span className="truncate max-w-[70%] group-hover:text-brand-green transition-colors font-bold text-slate-655">{s.name}</span>
                      <span>{s.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-brand-green animate-grow-bar`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart C: Busiest Hour Slots (Horizontal Bars) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-black text-brand-charcoal dark:text-white text-base">Peak Scheduling Hours</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">Booking slots carrying the highest patient traffic flow.</p>
          </div>

          <div key={`hours-${animationKey}`} className="space-y-3 pt-2">
            {hourlyDemand.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No approved hourly slots scheduled.</p>
            ) : (
              hourlyDemand.slice(0, 5).map((h) => {
                const maxVal = Math.max(...hourlyDemand.map(hd => hd.count), 1);
                const percent = Math.round((h.count / maxVal) * 100);
                return (
                  <div key={h.hour} className="flex items-center gap-3 group">
                    <span className="w-20 text-xs font-bold text-slate-500 group-hover:text-brand-green transition-colors shrink-0">{h.hour}</span>
                    <div className="flex-1 h-7 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden relative flex items-center px-3 hover:shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-green to-brand-green/80 absolute left-0 top-0 rounded-xl animate-grow-bar group-hover:brightness-110 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                      <span className="text-[10px] font-black text-brand-charcoal dark:text-white z-10 select-none">
                        {h.count} visit{h.count > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Staff Workload Auditor */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-4">
          <div>
            <h3 className="font-black text-brand-charcoal dark:text-white text-base">Staff Workload Audit</h3>
            <p className="text-xs text-slate-500 mt-0.5 font-semibold">Actions logged by each therapist or receptionist.</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {staffActivity.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No action logs found for staff users.</p>
            ) : (
              staffActivity.map((s) => (
                <div key={s.name} className="flex items-start gap-3 p-3.5 bg-[#fbfcfb] dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl hover:scale-[1.03] hover:shadow-md transition-all duration-300">
                  <div className="h-8.5 w-8.5 rounded-full bg-brand-sand text-brand-green flex items-center justify-center shrink-0">
                    <UserCheck className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1 overflow-hidden flex-1">
                    <p className="text-xs font-black text-brand-charcoal dark:text-white truncate">{s.name}</p>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold">
                      <span>Approved: <strong className="text-brand-green font-black">{s.approved}</strong></span>
                      <span>Rejected: <strong className="text-red-500 font-black">{s.rejected}</strong></span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
