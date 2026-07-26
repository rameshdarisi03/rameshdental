"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
import { 
  Play, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  Clock, 
  Dumbbell,
  CheckCircle,
  HelpCircle
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

export default function ExercisesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    }>
      <ExercisesContent />
    </Suspense>
  );
}

function ExercisesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const videoParam = searchParams.get("video");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  const [activeVideo, setActiveVideo] = useState<string>(DEFAULT_EXERCISES[0].youtubeId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load local cached info if exists
    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      setPatient(JSON.parse(localData));
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
          console.error("Failed to load exercises for patient:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update active video if query param changes
  useEffect(() => {
    if (videoParam) {
      setActiveVideo(videoParam);
    } else if (exercises.length > 0) {
      setActiveVideo(exercises[0].youtubeId);
    }
  }, [videoParam, exercises]);

  const activeExercise = exercises.find((ex) => ex.youtubeId === activeVideo) || exercises[0];

  return (
    <div className="space-y-6 pb-12 select-none">
      
      {/* Header and Back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/patienthub/dashboard")}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-500 hover:text-brand-green transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Prescribed Exercises</h1>
          <p className="text-xs text-slate-450 font-bold mt-0.5">Assigned by: Dr. Sarah Jenkins</p>
        </div>
      </div>

      {/* Main split viewport: Active player on left, routines list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Video Player block */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video w-full bg-slate-950 rounded-3xl overflow-hidden shadow-md border border-slate-200/50 dark:border-slate-800">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
              title={activeExercise?.title || "Exercise Demonstration Video"}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Active Exercise meta details card */}
          {activeExercise && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-black text-brand-charcoal dark:text-white leading-tight">
                  {activeExercise.title}
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Prescribed Routine
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-450 uppercase tracking-wide">
                <span className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5 text-brand-green" /> {activeExercise.description}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-brand-green" /> {activeExercise.duration}</span>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 pt-3 mt-2 text-xs text-slate-500 leading-relaxed font-semibold">
                Perform this exercise slowly and with controlled breathing. If you experience sharp pain, stop immediately and contact your physical therapist at Gait Physio Clinic.
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Exercises Sidebar list selector */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Exercise Playlist</h3>
          
          <div className="space-y-3">
            {exercises.map((ex) => {
              const isActive = ex.youtubeId === activeVideo;
              return (
                <button
                  key={ex.title}
                  onClick={() => router.push(`/patienthub/exercises?video=${ex.youtubeId}`)}
                  className={`w-full text-left flex gap-3 p-3 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                    isActive 
                      ? "bg-emerald-50/40 dark:bg-emerald-950/15 border-brand-green/45 text-brand-green dark:text-emerald-400"
                      : "bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Miniature Thumbnail */}
                  <div className="relative h-14 w-20 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    <img 
                      src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                      alt={ex.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="h-4 w-4 text-white fill-current" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <p className={`text-xs font-black truncate leading-tight ${isActive ? "text-brand-green dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"}`}>
                      {ex.title}
                    </p>
                    <p className="text-[10px] text-slate-450 font-bold">{ex.description}</p>
                    
                    {/* Tags */}
                    <div className="flex gap-1">
                      {ex.tags.slice(0, 1).map((t) => (
                        <span key={t} className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 self-center" />
                </button>
              );
            })}
          </div>

          {/* Help notice widget */}
          <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-[10px] text-slate-500 font-bold leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 uppercase tracking-wider text-slate-450">
              <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
              <span>Instructions</span>
            </div>
            <p>Complete 2 sessions daily (morning and evening). Maintain proper posture alignment as taught by your GPC therapist.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
