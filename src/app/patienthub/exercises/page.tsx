"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { 
  getPatientPrescription,
  subscribePatientPrescription,
  subscribeExerciseLibrary,
  getExerciseLibrary, 
  extractYoutubeId, 
  PatientPrescription, 
  subscribePatientWorkoutProgress, 
  toggleExerciseDailyCompletion, 
  getLocalDateString, 
  PatientWorkoutProgress,
  markPatientDayComplete
} from "@/lib/exercisesDb";
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
  FileText,
  ExternalLink,
  Flame
} from "lucide-react";

interface DisplayExercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  youtubeId: string;
  tags: string[];
}

const DEFAULT_EXERCISES: DisplayExercise[] = [
  {
    id: "ex_cervical_chin_tuck",
    title: "Cervical Chin Tucks",
    description: "3 sets of 10 reps",
    duration: "0:38",
    youtubeId: "3R1tA4S0y4k",
    tags: ["CERVICAL", "POSTURE"]
  },
  {
    id: "ex_scapular_retraction",
    title: "Scapular Retractions",
    description: "3 sets of 10 reps",
    duration: "0:42",
    youtubeId: "4Yv-pQ2m1Wk",
    tags: ["UPPER BACK", "POSTURE"]
  },
  {
    id: "ex_wall_slides",
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

  const [patient, setPatient] = useState<any | null>(null);
  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>(DEFAULT_EXERCISES);
  const [activeVideo, setActiveVideo] = useState<string>(DEFAULT_EXERCISES[0].youtubeId);
  const [progress, setProgress] = useState<PatientWorkoutProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localCompletedIds, setLocalCompletedIds] = useState<string[] | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [markingDay, setMarkingDay] = useState(false);

  useEffect(() => {
    let rxUnsub = () => {};
    let libUnsub = () => {};
    let progUnsub = () => {};

    let currentRx: PatientPrescription | null = null;
    let currentLib: any[] = [];

    const syncExercises = () => {
      if (!currentRx || !currentRx.exercises || currentRx.exercises.length === 0) {
        setExercises(DEFAULT_EXERCISES);
        return;
      }
      const libMap = new Map(currentLib.map((item) => [item.id, item]));
      const mapped: DisplayExercise[] = currentRx.exercises.map((ex) => {
        const liveItem = libMap.get(ex.exerciseId) || 
          currentLib.find((l) => l.title.toLowerCase().trim() === ex.title.toLowerCase().trim() || l.id === ex.exerciseId);
        const freshYtId = extractYoutubeId(liveItem?.youtubeId || ex.youtubeId || ex.youtubeUrl);
        return {
          id: ex.exerciseId || freshYtId,
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
      } else if (mapped.length > 0) {
        setActiveVideo(mapped[0].youtubeId);
      }
    };

    const attachPatientListeners = (patientObj: any) => {
      // 1. Subscribe to Live Exercise Library
      libUnsub();
      libUnsub = subscribeExerciseLibrary((liveLibrary) => {
        currentLib = liveLibrary;
        syncExercises();
      });

      // 2. Subscribe to Live Patient Prescription
      rxUnsub();
      rxUnsub = subscribePatientPrescription(patientObj.id, (rxData) => {
        currentRx = rxData;
        setPrescription(rxData);
        syncExercises();

        // 3. Subscribe to Live Workout Progress
        progUnsub();
        progUnsub = subscribePatientWorkoutProgress(patientObj.id, rxData, (newProg) => {
          setProgress(newProg);
          setLocalCompletedIds(null);
        });
      });
    };

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      const parsed = JSON.parse(localData);
      setPatient(parsed);
      setLoading(false);
      attachPatientListeners(parsed);
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
            attachPatientListeners(matched);
          }
        } catch (err) {
          console.error("Failed to load exercises for patient:", err);
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      rxUnsub();
      libUnsub();
      progUnsub();
    };
  }, [videoParam]);

  const todayStr = getLocalDateString();
  const todayLog = progress?.dailyLogs?.[todayStr];
  const serverCompletedIds = todayLog?.completedExerciseIds || [];
  const completedIds = localCompletedIds !== null ? localCompletedIds : serverCompletedIds;

  const handleToggleComplete = async (exerciseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!patient?.id) return;

    // Instant 0ms optimistic UI update
    const isCurrentlyDone = completedIds.includes(exerciseId);
    const nextCompleted = isCurrentlyDone
      ? completedIds.filter(id => id !== exerciseId)
      : [...completedIds, exerciseId];
    setLocalCompletedIds(nextCompleted);

    setTogglingId(exerciseId);
    try {
      await toggleExerciseDailyCompletion(patient.id, exerciseId, exercises.length, todayStr);
    } catch (err) {
      console.error("Error saving exercise completion:", err);
      // Rollback on failure
      setLocalCompletedIds(serverCompletedIds);
    } finally {
      setTogglingId(null);
    }
  };

  const activeExerciseObj = exercises.find(e => e.youtubeId === activeVideo) || exercises[0];

  const categories = ["ALL", "CERVICAL", "SHOULDER", "KNEE", "POSTURE", "MOBILITY"];
  const filteredExercises = filterCategory === "ALL" 
    ? exercises 
    : exercises.filter(ex => ex.tags.some(t => t.toUpperCase().includes(filterCategory)));

  const currentDay = progress?.currentDayNumber || 1;
  const duration = prescription?.durationDays || 14;
  const isTodayDone = progress?.todayIsCompleted || false;

  const handleToggleDayComplete = async () => {
    if (!patient?.id) return;
    setMarkingDay(true);
    try {
      const allExIds = exercises.map(e => e.id);
      await markPatientDayComplete(patient.id, todayStr, allExIds, !isTodayDone);
    } catch (err) {
      console.error("Error toggling day complete:", err);
    } finally {
      setMarkingDay(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in font-['Inter',sans-serif]">
      
      {/* 1. Top Header with Program Day Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/patienthub/dashboard")}
            className="h-10 w-10 rounded-2xl bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 flex items-center justify-center text-[#062e36] dark:text-slate-300 hover:text-[#f9ab55] transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#8a5100] dark:text-[#f9ab55] bg-[#f9ab55]/20 px-2 py-0.5 rounded-md">
                Day {currentDay} of {duration}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                • {duration}-Day Recovery Plan
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
              Prescribed Workouts
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {progress?.streakDays && progress.streakDays > 0 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-400/30 text-xs font-bold">
              <Flame className="h-3.5 w-3.5 fill-current text-orange-500" />
              <span>{progress.streakDays}d Streak</span>
            </span>
          ) : null}
          
          <button
            type="button"
            disabled={markingDay}
            onClick={handleToggleDayComplete}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
              isTodayDone
                ? "bg-emerald-600 text-white"
                : "bg-[#f9ab55] text-[#062e36] hover:bg-[#e09840]"
            }`}
          >
            {markingDay ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            <span>{isTodayDone ? "✓ Day Completed" : "Complete Day Routine"}</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              filterCategory === cat
                ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-xs"
                : "bg-white dark:bg-[#121a1d] text-[#41484A] dark:text-slate-300 border border-[#21444D]/10 dark:border-slate-800 hover:border-[#f9ab55]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 3. Therapist Guidance Banner */}
      {prescription && prescription.generalNotes && (
        <div className="bg-[#FFE5D4]/40 dark:bg-amber-950/20 border border-[#f9ab55]/40 p-4 rounded-2xl flex items-start gap-3 text-xs text-[#3e230b] dark:text-amber-200 font-medium shadow-xs">
          <FileText className="h-5 w-5 text-[#8a5100] dark:text-[#f9ab55] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#8a5100] dark:text-[#f9ab55] block">
              Physiotherapist Instructions & Precautions
            </span>
            <p className="leading-relaxed">{prescription.generalNotes}</p>
          </div>
        </div>
      )}

      {/* 4. Active Video Player Display with Fallback Overlay */}
      <div className="bg-[#062e36] text-white rounded-[28px] p-4 sm:p-6 shadow-xl space-y-4 overflow-hidden border border-white/10">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 shadow-inner">
          <iframe
            src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0&enablejsapi=1`}
            title={activeExerciseObj?.title || "Exercise Video"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="p-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white font-['Plus_Jakarta_Sans',sans-serif]">
              {activeExerciseObj?.title}
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-[#f9ab55] text-[#062e36] px-3 py-1 rounded-full text-xs font-bold">
                {activeExerciseObj?.description}
              </span>
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full border border-white/15 transition-colors"
                title="Open in YouTube"
              >
                <span>Watch on YouTube</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {activeExerciseObj?.tags.map((tag) => (
              <span 
                key={tag}
                className="bg-white/10 text-slate-200 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Exercise Playlist Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400 px-1">
          Assigned Exercises ({filteredExercises.length})
        </h3>

        <div className="space-y-2.5">
          {filteredExercises.map((ex, index) => {
            const isActive = ex.youtubeId === activeVideo;
            const isCompleted = completedIds.includes(ex.id) || completedIds.includes(ex.youtubeId);
            const isToggling = togglingId === ex.id || togglingId === ex.youtubeId;

            return (
              <div
                key={ex.youtubeId + index}
                onClick={() => setActiveVideo(ex.youtubeId)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isActive
                    ? "bg-white dark:bg-[#121a1d] border-[#062e36] dark:border-[#f9ab55] shadow-md ring-2 ring-[#f9ab55]/20"
                    : "bg-white dark:bg-[#121a1d] border-[#21444D]/10 dark:border-slate-800 hover:border-[#f9ab55]/50 shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                    isActive 
                      ? "bg-[#062e36] text-[#f9ab55]" 
                      : "bg-[#FAF9F9] dark:bg-slate-900 text-[#062e36] dark:text-slate-300"
                  }`}>
                    {isActive ? <Play className="h-4 w-4 fill-current ml-0.5" /> : index + 1}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#062e36] dark:text-white leading-snug">
                      {ex.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {ex.description} • {ex.duration}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={(e) => handleToggleComplete(ex.id, e)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#f9ab55]/20 hover:text-[#8a5100]"
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{isCompleted ? "Completed" : "Mark Done"}</span>
                  </button>

                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isActive ? "text-[#f9ab55] translate-x-1" : "text-slate-400"}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

