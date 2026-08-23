"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { 
  getPatientPrescription, 
  getExerciseLibrary, 
  extractYoutubeId, 
  PatientPrescription,
  subscribePatientWorkoutProgress,
  PatientWorkoutProgress
} from "@/lib/exercisesDb";
import Link from "next/link";
import { 
  Calendar, 
  MessageSquare, 
  ChevronRight, 
  Activity, 
  Play, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Dumbbell,
  Receipt,
  Flame,
  CheckCircle,
  Sparkles
} from "lucide-react";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";

interface DisplayExercise {
  id?: string;
  title: string;
  description: string;
  duration: string;
  youtubeId: string;
  tags: string[];
}

const DEFAULT_EXERCISES: DisplayExercise[] = [
  {
    title: "Cervical Chin Tucks",
    description: "3 sets of 10 reps",
    duration: "0:38",
    youtubeId: "3R1tA4S0y4k",
    tags: ["CERVICAL", "POSTURE"]
  },
  {
    title: "Scapular Retractions",
    description: "3 sets of 10 reps",
    duration: "0:42",
    youtubeId: "4Yv-pQ2m1Wk",
    tags: ["UPPER BACK", "POSTURE"]
  },
  {
    title: "Wall Slides with Foam Roller",
    description: "3 sets of 10 reps",
    duration: "0:45",
    youtubeId: "wD7V2F3eRns",
    tags: ["SHOULDER", "MOBILITY"]
  }
];

export default function DashboardPage() {
  const [patient, setPatient] = useState<any | null>(null);
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>(DEFAULT_EXERCISES);
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);
  const [progress, setProgress] = useState<PatientWorkoutProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let invUnsub = () => {};
    let progUnsub = () => {};

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      const parsed = JSON.parse(localData);
      setPatient(parsed);
      setLoading(false);
      if (parsed.email) {
        invUnsub = subscribePatientInvoices(parsed.email, setPatientInvoices);
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "patients"), where("email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const matched = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
            setPatient(matched);
            localStorage.setItem("gpc_patient", JSON.stringify(matched));

            if (matched.email) {
              invUnsub = subscribePatientInvoices(matched.email, setPatientInvoices);
            }

            // Fetch active prescribed exercises and cross-reference live library
            const rxData = await getPatientPrescription(matched.id);
            const liveLibrary = await getExerciseLibrary();
            const libMap = new Map(liveLibrary.map((item) => [item.id, item]));

            if (rxData && rxData.exercises && rxData.exercises.length > 0) {
              setPrescription(rxData);
              const mapped: DisplayExercise[] = rxData.exercises.map((ex) => {
                const liveItem = libMap.get(ex.exerciseId) || 
                  liveLibrary.find((l) => l.title.toLowerCase().trim() === ex.title.toLowerCase().trim() || l.id === ex.exerciseId);
                const freshYtId = extractYoutubeId(liveItem?.youtubeId || ex.youtubeId || ex.youtubeUrl);
                return {
                  id: ex.exerciseId,
                  title: liveItem?.title || ex.title,
                  description: `${ex.sets} sets × ${ex.repsOrHold}`,
                  duration: liveItem?.duration || "2 mins",
                  youtubeId: freshYtId,
                  tags: ex.tags || [ex.category]
                };
              });
              setExercises(mapped);

              // Subscribe to real-time workout progress
              progUnsub = subscribePatientWorkoutProgress(matched.id, rxData, setProgress);
            } else {
              progUnsub = subscribePatientWorkoutProgress(matched.id, null, setProgress);
            }
          }
        } catch (err) {
          console.error("Failed to sync patient details:", err);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      invUnsub();
      progUnsub();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  const patientName = patient?.name?.split(" ")[0] || "Guest";
  const planName = patient?.treatmentPlan || "Rehabilitation & Gait Therapy";
  const upcomingDate = patient?.upcoming || "No session scheduled";

  // Program timeline metrics
  const duration = prescription?.durationDays || 14;
  const currentDay = progress?.currentDayNumber || 1;
  const completedDays = progress?.completedDaysCount || 0;
  const streak = progress?.streakDays || 0;
  const percentDone = Math.min(100, Math.round((completedDays / duration) * 100));
  const isTodayDone = progress?.todayIsCompleted || false;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12 font-['Inter',sans-serif]">
      
      {/* 1. Greeting & Recovery Momentum */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Welcome back, {patientName}.
          </h1>
          <p className="text-xs sm:text-sm text-[#41484A] dark:text-slate-300 font-medium mt-1">
            Your recovery program is active. Let&apos;s keep your momentum going today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-400/30 text-xs font-bold shadow-xs">
              <Flame className="h-3.5 w-3.5 fill-current text-orange-500" />
              <span>{streak}-Day Streak</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#f9ab55]/20 text-[#8a5100] dark:text-[#f9ab55] border border-[#f9ab55]/30 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#f9ab55] animate-ping" />
            Active Plan
          </span>
        </div>
      </section>

      {/* 2. Hero Card: Upcoming Care Session */}
      <section className="bg-[#062e36] text-white rounded-[28px] p-6 sm:p-7 shadow-[0_12px_32px_rgba(6,46,54,0.18)] relative overflow-hidden border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#21444D] border border-[#f9ab55]/40 flex items-center justify-center text-[#f9ab55] shrink-0 font-bold text-lg shadow-inner">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f9ab55] block mb-1">
              Next Care Appointment
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {patient?.assignedTherapist || "Dr. Kinnera (Lead Physiotherapist)"}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#f9ab55]" />
              <span>{upcomingDate === "No session scheduled" ? "No active booking scheduled" : upcomingDate}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <Link
            href="/patienthub/appointments"
            className="w-full sm:w-auto bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] font-bold text-xs px-6 py-3.5 rounded-full transition-all duration-200 shadow-md flex items-center justify-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>{upcomingDate === "No session scheduled" ? "Book Visit Slot" : "Manage Booking"}</span>
          </Link>
        </div>
      </section>

      {/* 3. Quick Actions Bento Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link 
          href="/patienthub/appointments"
          className="bg-white dark:bg-[#121a1d] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#21444D]/10 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 hover:border-[#f9ab55] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#f9ab55]/15 text-[#8a5100] dark:text-[#f9ab55] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[#1A1C1B] dark:text-slate-200 text-center">Book Session</span>
        </Link>

        <Link 
          href="/patienthub/records"
          className="bg-white dark:bg-[#121a1d] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#21444D]/10 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 hover:border-[#f9ab55] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#062e36]/10 dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Receipt className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[#1A1C1B] dark:text-slate-200 text-center">Health Records</span>
        </Link>

        <Link 
          href="/patienthub/exercises"
          className="bg-white dark:bg-[#121a1d] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#21444D]/10 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 hover:border-[#f9ab55] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#21444D]/10 text-[#21444D] dark:text-teal-300 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <Dumbbell className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[#1A1C1B] dark:text-slate-200 text-center">My Workouts</span>
        </Link>

        <a 
          href="https://wa.me/919206651295"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-[#121a1d] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#21444D]/10 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 hover:border-[#f9ab55] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[#1A1C1B] dark:text-slate-200 text-center">Care Concierge</span>
        </a>
      </section>

      {/* 4. PRESCRIBED EXERCISES & PROGRESS ROADMAP */}
      <section className="bg-white dark:bg-[#121a1d] border border-[#21444D]/10 dark:border-slate-800 rounded-[28px] p-6 shadow-sm space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55]">
              {prescription ? `${duration}-Day Protocol • Started ${prescription.prescribedDateFormatted}` : "Clinical Protocol"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Prescribed Exercises
            </h2>
          </div>

          <Link
            href="/patienthub/exercises"
            className="inline-flex items-center gap-2 bg-[#062e36] hover:bg-[#21444D] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-xs shrink-0"
          >
            <span>{isTodayDone ? "Review Workouts" : `Start Day ${currentDay} Routine`}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#f9ab55]" />
          </Link>
        </div>

        {/* WORKOUT PROGRESS ROADMAP & STREAK CARD */}
        <div className="bg-gradient-to-br from-[#062e36] to-[#21444D] text-white p-6 rounded-3xl shadow-md space-y-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-[#f9ab55] text-[#062e36] text-[10px] font-black uppercase tracking-wider">
                  Day {currentDay} of {duration}
                </span>
                {isTodayDone && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1 border border-emerald-400/30">
                    <CheckCircle className="h-3 w-3" />
                    Completed Today
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Recovery Journey Progress
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                {completedDays} of {duration} workout days completed ({percentDone}% of program).
              </p>
            </div>

            {/* Circular Progress Indicator */}
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15 shrink-0">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/20"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#f9ab55]"
                    strokeDasharray={`${percentDone}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-xs font-black text-[#f9ab55]">
                  {percentDone}%
                </span>
              </div>
              <div className="text-left leading-tight">
                <p className="text-[11px] font-bold text-white">Program</p>
                <p className="text-[9px] text-[#f9ab55] font-extrabold uppercase tracking-wider">Adherence</p>
              </div>
            </div>
          </div>

          {/* 14-Day Beads Timeline */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              <span>Program Days Tracker</span>
              <span>Target Review: Day {duration}</span>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
              {Array.from({ length: Math.min(duration, 14) }).map((_, idx) => {
                const dayNum = idx + 1;
                const isPassed = dayNum < currentDay;
                const isCurrent = dayNum === currentDay;

                return (
                  <div
                    key={dayNum}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center text-[10px] font-black transition-all ${
                      isPassed
                        ? "bg-emerald-500 text-white shadow-xs"
                        : isCurrent
                        ? isTodayDone
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                          : "bg-[#f9ab55] text-[#062e36] ring-2 ring-[#f9ab55]/60 animate-pulse"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    <span>D{dayNum}</span>
                    <span className="text-[8px]">
                      {isPassed || (isCurrent && isTodayDone) ? "✓" : isCurrent ? "Today" : "•"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick CTA */}
          <div className="pt-1 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              {exercises.length} prescribed exercises in this plan.
            </span>
            <Link
              href="/patienthub/exercises"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f9ab55] hover:underline"
            >
              <span>Go to Workout Center</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Prescribed Exercises Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {exercises.map((ex, idx) => (
            <Link
              key={ex.youtubeId + idx}
              href={`/patienthub/exercises?video=${ex.youtubeId}`}
              className="group border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 bg-[#FAF9F9] dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 hover:border-[#f9ab55]/60 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-3 shadow-xs">
                  <img
                    src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                    alt={ex.title}
                    onError={(e) => {
                      // Fallback clean placeholder if youtube thumb is restricted
                      (e.target as HTMLElement).style.display = "none";
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/25 group-hover:bg-slate-950/15 transition-colors flex items-center justify-center">
                    <div className="h-9 w-9 rounded-full bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-[#062e36] dark:text-white leading-snug group-hover:text-[#8a5100] dark:group-hover:text-[#f9ab55] transition-colors">
                  {ex.title}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Target: {ex.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold text-[#8a5100] dark:text-[#f9ab55] pt-3">
                <span>View Technique</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Clinical Provider Support Card */}
      <section className="bg-gradient-to-br from-[#062e36] to-[#21444D] text-white rounded-[28px] p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#f9ab55] shrink-0 font-bold">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">Gait Physio Clinic • Whitefield</h3>
            <p className="text-xs text-slate-300 font-normal mt-0.5">Need assistance or wish to reschedule? We&apos;re here for you.</p>
          </div>
        </div>

        <a
          href="tel:+919206651295"
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-5 py-2.5 rounded-full border border-white/20 transition-all shrink-0"
        >
          <span>Call Clinic Desk</span>
        </a>
      </section>

    </div>
  );
}

