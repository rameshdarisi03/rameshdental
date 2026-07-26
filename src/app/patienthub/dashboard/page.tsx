"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
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
  TrendingUp
} from "lucide-react";

interface Exercise {
  title: string;
  description: string;
  duration: string;
  youtubeId: string;
  tags: string[];
}

const DEFAULT_EXERCISES: Exercise[] = [
  {
    title: "Cervical Chin Tucks",
    description: "3 sets of 10 reps",
    duration: "5 mins",
    youtubeId: "wD7V2F3eRns",
    tags: ["Neck", "Posture", "Alignment"]
  },
  {
    title: "Scapular Retractions",
    description: "2 sets of 15 reps",
    duration: "8 mins",
    youtubeId: "vN4Jc0qK-j4",
    tags: ["Shoulder", "Strength", "Stability"]
  },
  {
    title: "Isometric Lateral Flexion",
    description: "3 sets of 10s holds",
    duration: "6 mins",
    youtubeId: "5p3dO5H6T1U",
    tags: ["Cervical", "Mobility", "Stretching"]
  }
];

export default function DashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

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
  const planName = patient?.treatmentPlan || "Cervical Spine Recovery";
  const upcomingDate = patient?.upcoming || "No session scheduled";

  // Mock static variables matching the screenshot layout
  const milestones = [
    { name: "Pain Reduction", completed: true },
    { name: "Mobility Range", completed: true },
    { name: "Strength Restoration", completed: false }
  ];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
            Good morning, {patientName}
          </h1>
          <p className="text-sm text-slate-500 font-bold dark:text-slate-400 mt-1">
            You're making steady progress in your {planName.toLowerCase()} recovery.
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
            Message Therapist
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
                {upcomingDate === "No session scheduled" ? "Schedule Next Session" : upcomingDate}
              </p>
              <p className="text-xs text-slate-450 font-bold mt-1">
                {upcomingDate === "No session scheduled" ? "No active upcoming booking found" : "10:30 AM - 11:15 AM (45 mins)"}
              </p>
            </div>

            {/* Doctor Info block */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-850">
              <div className="h-10 w-10 rounded-full bg-[#1b3d2f] text-white flex items-center justify-center font-black text-xs">
                SK
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white">Dr. Sarah Jenkins</p>
                <p className="text-[9px] text-slate-450 font-black uppercase tracking-wider">Senior Specialist PT</p>
              </div>
            </div>
          </div>

          <Link
            href="/patienthub/appointments"
            className="flex items-center justify-between text-xs font-black text-brand-green dark:text-emerald-400 hover:underline pt-5 mt-4 border-t border-slate-100 dark:border-slate-850"
          >
            <span>View Details & Prep</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Recovery Progress Widget Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 select-none">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-brand-green" />
              <span>Recovery Milestones</span>
            </div>
            <span className="text-xs font-black text-brand-green dark:text-emerald-400">75% Completed</span>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-brand-charcoal dark:text-white">Plan of Care: Phase 3</h3>
            <p className="text-[11px] text-slate-450 font-bold leading-relaxed">Prescribed posture correction and alignment training.</p>
          </div>

          {/* Progress Bar slider */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="bg-brand-green dark:bg-emerald-500 h-full rounded-full w-3/4" />
          </div>

          {/* Milestones inline bullets list */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${m.completed ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                <span className={m.completed ? "text-slate-700 dark:text-slate-350" : "text-slate-400"}>
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Exercises Section */}
      <div className="space-y-4 select-none">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-brand-charcoal dark:text-white">My Exercises</h2>
          <Link
            href="/patienthub/exercises"
            className="text-xs font-black text-brand-green dark:text-emerald-400 hover:underline uppercase tracking-wider"
          >
            View All Programs
          </Link>
        </div>

        {/* Exercises Grid Cards list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEFAULT_EXERCISES.map((ex) => (
            <Link
              key={ex.title}
              href={`/patienthub/exercises?video=${ex.youtubeId}`}
              className="group bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:scale-[1.02] transition-transform flex flex-col justify-between"
            >
              {/* Thumbnail image simulator overlay with Play button */}
              <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* Simulated posture sketch background or standard design */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10 opacity-60 group-hover:opacity-80 transition-opacity" />
                
                {/* YouTube Thumbnail fetch fallback style */}
                <img 
                  src={`https://img.youtube.com/vi/${ex.youtubeId}/hqdefault.jpg`} 
                  alt={ex.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                <span className="relative z-20 h-12 w-12 rounded-full bg-white/90 backdrop-blur-sm text-[#1b3d2f] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </span>
              </div>

              {/* Text Description body */}
              <div className="p-5 space-y-2">
                <h3 className="font-extrabold text-sm text-brand-charcoal dark:text-white group-hover:text-brand-green transition-colors leading-tight">
                  {ex.title}
                </h3>
                
                <div className="flex justify-between items-center text-[10px] font-black text-slate-450 uppercase tracking-wide">
                  <span>{ex.description}</span>
                  <span>•</span>
                  <span>{ex.duration}</span>
                </div>

                {/* Badges list */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {ex.tags.map((t) => (
                    <span 
                      key={t}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
