"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { 
  getPatientPrescription,
  subscribePatientPrescription,
  subscribeExerciseLibrary,
  getExerciseLibrary, 
  extractYoutubeId, 
  getProgramDayDateString,
  getLocalDateString,
  PatientPrescription, 
  subscribePatientWorkoutProgress, 
  PatientWorkoutProgress,
  markPatientDayComplete
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
  FileText,
  Flame,
  CheckCircle,
  Sparkles,
  CalendarSync
} from "lucide-react";
import RescheduleModal from "@/components/RescheduleModal";
import { Appointment } from "@/lib/db";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG } from "@/lib/db";
import { getCleanWhatsAppNumber, getPrimaryDialNumber } from "@/lib/phoneUtils";

import { usePatientAuth } from "@/providers/PatientAuthProvider";

interface DisplayExercise {
  id?: string;
  title: string;
  description: string;
  duration: string;
  youtubeId: string;
  tags: string[];
}

export default function DashboardPage() {
  const { patient, loading: authLoading } = usePatientAuth();
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>([]);
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);
  const [progress, setProgress] = useState<PatientWorkoutProgress | null>(null);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [markingDay, setMarkingDay] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active appointment & reschedule states
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [appointmentLoadedDate, setAppointmentLoadedDate] = useState<string>("");

  useEffect(() => {
    getClinicConfig().then(setClinicConfig).catch(console.error);

    if (!patient || !patient.id) {
      if (!authLoading) setLoading(false);
      return;
    }

    let invUnsub = () => {};
    let rxUnsub = () => {};
    let libUnsub = () => {};
    let progUnsub = () => {};

    let currentRx: PatientPrescription | null = null;
    let currentLib: any[] = [];

    const syncExercises = () => {
      if (!currentRx || !currentRx.exercises || currentRx.exercises.length === 0) {
        setExercises([]);
        return;
      }
      const libMap = new Map(currentLib.map((item) => [item.id, item]));
      const mapped: DisplayExercise[] = currentRx.exercises.map((ex) => {
        const liveItem = libMap.get(ex.exerciseId) || 
          currentLib.find((l) => l.title.toLowerCase().trim() === ex.title.toLowerCase().trim() || l.id === ex.exerciseId);
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
    };

    invUnsub = subscribePatientInvoices({
      patientId: patient.id,
      email: patient.email,
      phone: patient.phone,
      name: patient.name,
      customId: patient.activationCode,
      excludeVoided: true
    }, setPatientInvoices);

    libUnsub = subscribeExerciseLibrary((liveLibrary) => {
      currentLib = liveLibrary;
      syncExercises();
    });

    rxUnsub = subscribePatientPrescription(patient.id, (rxData) => {
      currentRx = rxData;
      setPrescription(rxData);
      syncExercises();

      progUnsub();
      progUnsub = subscribePatientWorkoutProgress(patient.id!, rxData, setProgress);
    });

    // 4. Live real-time subscription for patient's upcoming active appointment
    let appUnsub = () => {};
    try {
      const cleanPhone = (patient.phone || "").replace(/\D/g, "").slice(-10);
      const qApps = query(
        collection(db, "appointments"),
        where("status", "in", ["approved", "pending"])
      );
      appUnsub = onSnapshot(qApps, (snaps) => {
        const todayStr = new Date().toISOString().split("T")[0];
        const matched = snaps.docs
          .map((d) => ({ id: d.id, ...d.data() } as Appointment))
          .filter((a) => {
            const aDigits = (a.patientPhone || "").replace(/\D/g, "").slice(-10);
            return (
              (cleanPhone && aDigits === cleanPhone) ||
              (patient.email && a.patientEmail?.toLowerCase() === patient.email?.toLowerCase()) ||
              (a.patientName?.toLowerCase() === patient.name?.toLowerCase())
            );
          })
          .sort((a, b) => {
            const aIsUpcoming = a.date >= todayStr;
            const bIsUpcoming = b.date >= todayStr;
            if (aIsUpcoming && !bIsUpcoming) return -1;
            if (!aIsUpcoming && bIsUpcoming) return 1;
            if (aIsUpcoming && bIsUpcoming) return a.date.localeCompare(b.date);
            return b.date.localeCompare(a.date);
          });

        if (matched.length > 0) {
          setActiveAppointment(matched[0]);
          setAppointmentLoadedDate(`${matched[0].date} at ${matched[0].slot}`);
        } else {
          setActiveAppointment(null);
        }
      }, (err) => {
        console.warn("Real-time appointments subscription warning:", err);
      });
    } catch (err) {
      console.warn("Failed setting up patient appointment subscription:", err);
    }

    setLoading(false);

    return () => {
      invUnsub();
      rxUnsub();
      libUnsub();
      progUnsub();
    };
  }, [patient, authLoading]);

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
  const hasActiveProtocol = Boolean(prescription && prescription.exercises && prescription.exercises.length > 0);
  const duration = prescription?.durationDays || 14;
  const currentDay = progress?.currentDayNumber || 1;
  const completedDays = progress?.completedDaysCount || 0;
  const streak = progress?.streakDays || 0;
  const percentDone = Math.min(100, Math.round((completedDays / duration) * 100));
  const isTodayDone = progress?.todayIsCompleted || false;

  const handleToggleDayComplete = async () => {
    if (!patient?.id) return;
    setMarkingDay(true);
    try {
      const allExIds = prescription?.exercises?.map((e: any) => e.exerciseId || e.id || e.youtubeId || e.title) || [];
      await markPatientDayComplete(patient.id, getLocalDateString(), allExIds, !isTodayDone);
    } catch (err) {
      console.error("Error toggling day complete:", err);
    } finally {
      setMarkingDay(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12 font-['Inter',sans-serif]">
      
      {/* 1. Greeting & Recovery Momentum */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Welcome back, {patientName}.
          </h1>
          <p className="text-xs sm:text-sm text-[#41484A] dark:text-slate-300 font-medium mt-1">
            {hasActiveProtocol 
              ? `${planName} • Day ${currentDay} of ${duration}` 
              : "Consultation Pending • No active care protocol prescribed yet"}
          </p>
        </div>

        {/* Live Momentum Streak Pill */}
        {hasActiveProtocol && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-[#FFE5D4] dark:bg-amber-950/50 border border-[#f9ab55]/40 text-[#3e230b] dark:text-amber-200 px-4 py-2 rounded-full font-bold text-xs shadow-xs">
              <Flame className="h-4 w-4 fill-current text-orange-500 animate-bounce" />
              <span>{streak} Day Momentum Streak</span>
            </div>
          </div>
        )}
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
              {patient?.therapistName || "Dr. Kinnera (Lead Physiotherapist)"}
            </h3>
            <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#f9ab55]" />
              <span>{upcomingDate === "No session scheduled" ? "No active booking scheduled" : upcomingDate}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          {activeAppointment ? (
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] font-extrabold text-xs px-5 py-3 rounded-full transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
            >
              <CalendarSync className="h-4 w-4" />
              <span>{activeAppointment?.reschedulePending ? "Change Reschedule Slot" : "Reschedule Session"}</span>
            </button>
          ) : (
            <Link
              href="/patienthub/appointments"
              className="inline-flex items-center justify-center gap-2 bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] font-bold text-xs px-5 py-3 rounded-full transition-all shadow-md shrink-0 cursor-pointer"
            >
              <span>Schedule Visit</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          </div>
      </section>

      {/* 3. Quick Action Hub */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
            <FileText className="h-5 w-5" />
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
          href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig?.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to consult with the doctor regarding my therapy routine.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white dark:bg-[#121a1d] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#21444D]/10 dark:border-slate-800 flex flex-col items-center justify-center gap-2.5 hover:border-[#f9ab55] hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-[#1A1C1B] dark:text-slate-200 text-center">Connect with Doctor</span>
        </a>
      </section>

      {/* 4. PRESCRIBED EXERCISES & PROGRESS ROADMAP */}
      <section className="bg-white dark:bg-[#121a1d] border border-[#21444D]/10 dark:border-slate-800 rounded-[28px] p-6 shadow-sm space-y-6">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55]">
              {hasActiveProtocol && prescription ? `${duration}-Day Protocol • Started ${prescription.prescribedDateFormatted}` : "Clinical Protocol"}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Prescribed Exercises
            </h2>
          </div>

          {hasActiveProtocol && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={markingDay}
                onClick={handleToggleDayComplete}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-all shadow-xs cursor-pointer ${
                  isTodayDone
                    ? "bg-emerald-600 text-white"
                    : "bg-[#f9ab55] text-[#062e36] hover:bg-[#e09840]"
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{isTodayDone ? "Completed" : "Complete Day"}</span>
              </button>

              <Link
                href="/patienthub/exercises"
                className="hidden sm:inline-flex items-center gap-2 bg-[#062e36] hover:bg-[#21444D] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-xs shrink-0"
              >
                <span>{isTodayDone ? "Review Workouts" : `Start Day ${currentDay} Routine`}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#f9ab55]" />
              </Link>
            </div>
          )}
        </div>

        {!hasActiveProtocol ? (
          <div className="py-12 px-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto shadow-xs border border-teal-200/50 dark:border-teal-800/60">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                No Care Protocol Prescribed Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Your doctor or physiotherapist will prescribe your personalized rehabilitation exercises and care routine during or after your clinical consultation. They will appear here with video guides.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/patienthub/records"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#062e36] dark:text-teal-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-full shadow-xs hover:border-teal-400 transition-all"
              >
                <span>Check Consultations & Invoices</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#062e36] to-[#21444D] text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-5 relative overflow-hidden">
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

            {/* 14-Day Circular Beads Timeline */}
            <div className="space-y-3 pt-1 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                <span>Program Days Roadmap</span>
                <span>Target Review: Day {duration}</span>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 sm:gap-2.5 md:gap-3">
                {Array.from({ length: Math.min(duration, 14) }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const startDate = prescription?.startDate || getLocalDateString();
                  const dayDateStr = getProgramDayDateString(startDate, idx);
                  const dayLog = progress?.dailyLogs?.[dayDateStr];
                  const isDone = dayLog?.isFullyCompleted === true || (dayLog?.completedExerciseIds && dayLog.completedExerciseIds.length > 0);
                  const isCurrent = dayNum === currentDay;

                  return (
                    <div
                      key={dayNum}
                      className={`w-full max-w-[32px] sm:max-w-[36px] aspect-square mx-auto rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black transition-all ${
                        isDone
                          ? "bg-[#f9ab55] text-[#062e36] shadow-sm font-black"
                          : isCurrent
                          ? "bg-white/20 text-[#f9ab55] ring-2 ring-[#f9ab55] animate-pulse"
                          : "bg-white/10 text-slate-300"
                      }`}
                      title={`Day ${dayNum} (${dayDateStr}): ${isDone ? "Completed" : isCurrent ? "Active Today" : "Pending"}`}
                    >
                      {isDone ? "✓" : dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Dedicated Line: Go to Workout Center */}
            <div className="pt-2 sm:hidden">
              <Link
                href="/patienthub/exercises"
                className="w-full flex items-center justify-center gap-2 bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all uppercase tracking-wider"
              >
                <span>Go to Workout Center</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
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
          href={`tel:${getPrimaryDialNumber(clinicConfig?.phone)}`}
          className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-5 py-2.5 rounded-full border border-white/20 transition-all shrink-0"
        >
          <span>Call Clinic Desk</span>
        </a>
      </section>

      {/* Reschedule Modal */}
      {rescheduleModalOpen && activeAppointment && (
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          appointment={activeAppointment}
          userRole="patient"
          userName={patient?.name || "Patient"}
          userUid={patient?.authUid || patient?.id || ""}
          onSuccess={(updated) => {
            setActiveAppointment(updated);
            setAppointmentLoadedDate(`${updated.date} at ${updated.slot}`);
          }}
        />
      )}

    </div>
  );
}

