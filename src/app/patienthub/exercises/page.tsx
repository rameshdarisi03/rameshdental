"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
import { getPatientPrescription, getExerciseLibrary, extractYoutubeId, PatientPrescription } from "@/lib/exercisesDb";
import { 
  Play, 
  ChevronRight, 
  ArrowLeft, 
  Loader2, 
  Clock, 
  Dumbbell,
  CheckCircle,
  HelpCircle,
  Sparkles,
  FileText
} from "lucide-react";

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
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>(DEFAULT_EXERCISES);
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

            // Fetch active prescription assigned by therapist & cross reference live exercise library
            const rxData = await getPatientPrescription(matched.id);
            const liveLibrary = await getExerciseLibrary();
            const libMap = new Map(liveLibrary.map((item) => [item.id, item]));

            if (rxData && rxData.exercises && rxData.exercises.length > 0) {
              setPrescription(rxData);
              const mapped: DisplayExercise[] = rxData.exercises.map((ex) => {
                const liveItem = libMap.get(ex.exerciseId);
                const freshYtId = extractYoutubeId(liveItem?.youtubeId || ex.youtubeId || ex.youtubeUrl);
                return {
                  title: liveItem?.title || ex.title,
                  description: `${ex.sets} sets × ${ex.repsOrHold}`,
                  duration: liveItem?.duration || "2-3 mins",
                  youtubeId: freshYtId,
                  tags: ex.tags || [ex.category]
                };
              });
              setExercises(mapped);
              if (videoParam) {
                setActiveVideo(extractYoutubeId(videoParam));
              } else {
                setActiveVideo(mapped[0].youtubeId);
              }
            } else if (videoParam) {
              setActiveVideo(extractYoutubeId(videoParam));
            }
          }
        } catch (err) {
          console.error("Failed to load exercises for patient:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [videoParam]);

  const activeExerciseObj = exercises.find(e => e.youtubeId === activeVideo) || exercises[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 px-4 py-6 sm:px-6 lg:px-8 pb-24 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/patienthub/dashboard")}
              className="h-9 w-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-brand-green transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                Home Exercise Routine
              </h1>
              <p className="text-[11px] font-bold text-slate-500">
                {prescription ? `Prescribed on ${prescription.prescribedDateFormatted}` : "Standard Mobility Routine"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-brand-green/10 text-brand-green dark:text-teal-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <Dumbbell className="h-3.5 w-3.5" />
            <span>{exercises.length} Exercises</span>
          </div>
        </div>

        {/* Therapist Notes Banner (If prescribed) */}
        {prescription && prescription.generalNotes && (
          <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/60 p-4 rounded-2xl flex items-start gap-3 text-xs text-sky-900 dark:text-sky-300 font-semibold shadow-xs">
            <FileText className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-black uppercase tracking-wider text-[10px] text-sky-700 dark:text-sky-400 block">
                Therapist Guidance & Notes
              </span>
              <p className="leading-relaxed">{prescription.generalNotes}</p>
            </div>
          </div>
        )}

        {/* Video Player Display Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-4 overflow-hidden">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
              title={activeExerciseObj?.title || "Exercise Video"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Video Title & Meta */}
          <div className="p-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {activeExerciseObj?.title}
              </h2>
              <span className="bg-brand-sand/60 dark:bg-brand-green/20 text-brand-green dark:text-teal-300 px-3 py-1 rounded-full text-xs font-black">
                {activeExerciseObj?.description}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeExerciseObj?.tags.map((tag) => (
                <span 
                  key={tag}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Playlist Selector List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Prescribed Routine Exercises
          </h3>

          <div className="space-y-2.5">
            {exercises.map((ex, index) => {
              const isActive = ex.youtubeId === activeVideo;
              return (
                <div
                  key={ex.youtubeId + index}
                  onClick={() => setActiveVideo(ex.youtubeId)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isActive
                      ? "bg-white dark:bg-slate-900 border-brand-green shadow-md ring-2 ring-brand-green/10"
                      : "bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                      isActive 
                        ? "bg-brand-green text-white" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      {isActive ? <Play className="h-4 w-4 fill-current ml-0.5" /> : index + 1}
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                        {ex.title}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                        {ex.description}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "text-brand-green translate-x-1" : "text-slate-400"}`} />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
