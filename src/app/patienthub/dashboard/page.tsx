"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getPatientPrescription, getExerciseLibrary, extractYoutubeId, PatientPrescription } from "@/lib/exercisesDb";
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
  Download
} from "lucide-react";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";

interface DisplayExercise {
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
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>(DEFAULT_EXERCISES);
  const [patientInvoices, setPatientInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let invUnsub = () => {};

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
      if (user && user.email) {
        invUnsub = subscribePatientInvoices(user.email, setPatientInvoices);
      }
    });

    return () => {
      invUnsub();
    };
  }, []);

  useEffect(() => {
    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      setPatient(JSON.parse(localData));
      setLoading(false);
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const q = query(collection(db, "patients"), where("email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const matched = { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient;
            setPatient(matched);
            localStorage.setItem("gpc_patient", JSON.stringify(matched));

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
                  title: liveItem?.title || ex.title,
                  description: `${ex.sets} sets × ${ex.repsOrHold}`,
                  duration: liveItem?.duration || "2 mins",
                  youtubeId: freshYtId,
                  tags: ex.tags || [ex.category]
                };
              });
              setExercises(mapped);
            }
          }
        } catch (err) {
          console.error("Failed to sync patient details:", err);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12 font-['Inter',sans-serif]">
      
      {/* 1. Greeting & Recovery Momentum */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Welcome back, {patientName}.
          </h1>
          <p className="text-xs sm:text-sm text-[#41484A] dark:text-slate-300 font-medium mt-1">
            Your recovery program is active. Let&apos;s keep your progress moving forward.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#f9ab55]/20 text-[#8a5100] dark:text-[#f9ab55] border border-[#f9ab55]/30 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#f9ab55] animate-ping" />
            Active Care Plan
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

      {/* 4. Today's Prescribed Routine & Recovery Progress */}
      <section className="bg-white dark:bg-[#121a1d] border border-[#21444D]/10 dark:border-slate-800 rounded-[28px] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55]">
              {prescription ? `Prescribed on ${prescription.prescribedDateFormatted}` : "Clinical Protocol"}
            </span>
            <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              Today&apos;s Prescribed Exercises
            </h2>
          </div>

          <Link
            href="/patienthub/exercises"
            className="inline-flex items-center gap-1.5 bg-[#062e36] hover:bg-[#21444D] text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-xs"
          >
            <span>Full Workout Plan</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#f9ab55]" />
          </Link>
        </div>

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
