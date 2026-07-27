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
  const planName = patient?.treatmentPlan || "Physiotherapy Recovery";
  const upcomingDate = patient?.upcoming || "No session scheduled";

  const milestones = [
    { name: "Pain Reduction", completed: true },
    { name: "Mobility Range", completed: true },
    { name: "Strength Restoration", completed: false }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 px-4 py-8 sm:px-6 lg:px-8 pb-24 space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Good day, {patientName}
          </h1>
          <p className="text-sm text-slate-500 font-bold dark:text-slate-400 mt-1">
            You're making steady progress in your {planName.toLowerCase()} plan.
          </p>
        </div>

        {/* Quick Actions buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/patienthub/appointments"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#1b3d2f] hover:bg-[#122b21] text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-md tracking-wider transition-transform hover:scale-102"
          >
            <Calendar className="h-4 w-4" />
            Book Next Session
          </Link>
          
          <a
            href="https://wa.me/919206651295"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl font-black text-xs shadow-sm tracking-wider transition-colors"
          >
            <MessageSquare className="h-4 w-4 text-brand-green" />
            Message Clinic
          </a>
        </div>
      </div>

      {/* Overview stats layout: Next Session details and Recovery Progress Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Next Session Widget Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between select-none">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5 text-brand-green" />
              <span>Next Session</span>
            </div>
            
            <div>
              <p className="text-xl font-black text-brand-charcoal dark:text-white leading-tight">
                {upcomingDate === "No session scheduled" ? "Schedule Next Visit" : upcomingDate}
              </p>
              <p className="text-xs text-slate-450 font-bold mt-1">
                {upcomingDate === "No session scheduled" ? "No active upcoming booking found" : "Consultation & Rehab"}
              </p>
            </div>

            {/* Doctor Info block */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-850">
              <div className="h-10 w-10 rounded-full bg-[#1b3d2f] text-white flex items-center justify-center font-black text-xs">
                GPC
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">Gait Physio Specialist</p>
                <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Clinical Care Team</p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-400">Location: Clinic Branch</span>
            <Link 
              href="/patienthub/appointments" 
              className="text-xs font-black text-brand-green dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              View Slots <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Milestones Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between select-none">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-brand-green" />
                <span>Rehab Milestones</span>
              </div>
              <span className="text-[10px] font-black bg-brand-green/10 text-brand-green dark:text-teal-400 px-2 py-0.5 rounded-full">
                66% Completed
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-850">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`h-4 w-4 ${m.completed ? "text-brand-green dark:text-teal-400" : "text-slate-300 dark:text-slate-700"}`} />
                    <span className={`text-xs font-bold ${m.completed ? "text-slate-800 dark:text-slate-200" : "text-slate-400 line-through"}`}>
                      {m.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    {m.completed ? "Achieved" : "In Progress"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Billing Statements & Receipts Section */}
      {patientInvoices.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-green dark:text-teal-400">
                Billing & Digital Receipts
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Clinical Invoices ({patientInvoices.length})
              </h2>
            </div>
            <span className="text-xs font-black bg-brand-green/10 text-brand-green dark:text-teal-400 px-3 py-1 rounded-full">
              Real-time Sync
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {patientInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-green/10 text-brand-green dark:text-teal-400 rounded-xl">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      Invoice #{inv.invoiceNumber}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400">
                      Service Date: {inv.serviceDate} • Attending: {inv.therapistName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    ${(inv.totalAmount || 0).toFixed(2)}
                  </span>
                  
                  {inv.status === "paid" && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black uppercase">
                      PAID
                    </span>
                  )}
                  {inv.status === "pending" && (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black uppercase">
                      UNPAID
                    </span>
                  )}
                  {inv.status === "overdue" && (
                    <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-black uppercase">
                      OVERDUE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prescribed Home Exercises Routine Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-green dark:text-teal-400">
              {prescription ? `Prescribed on ${prescription.prescribedDateFormatted}` : "Assigned Care Plan"}
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Daily Exercise Routine
            </h2>
          </div>

          <Link
            href="/patienthub/exercises"
            className="inline-flex items-center gap-1 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Start Routine <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {exercises.map((ex, idx) => (
            <Link
              key={ex.youtubeId + idx}
              href={`/patienthub/exercises?video=${ex.youtubeId}`}
              className="group border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-950 hover:bg-white dark:hover:bg-slate-900 hover:border-brand-green/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-3">
                  <img
                    src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                    alt={ex.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                    <div className="h-9 w-9 rounded-full bg-brand-green text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xs font-black text-slate-900 dark:text-white leading-snug group-hover:text-brand-green transition-colors">
                  {ex.title}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  Target: {ex.description}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-green dark:text-teal-400 pt-3">
                <span>Play Demo</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
