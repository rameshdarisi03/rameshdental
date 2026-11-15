"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Flame,
  MessageSquare
} from "lucide-react";

import { usePatientAuth } from "@/providers/PatientAuthProvider";

interface DisplayExercise {
  id: string;
  title: string;
  description: string;
  duration: string;
  youtubeId: string;
  tags: string[];
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
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
  const { patient, loading: authLoading } = usePatientAuth();
  
  const videoParam = searchParams.get("video");

  const [prescription, setPrescription] = useState<PatientPrescription | null>(null);
  const [exercises, setExercises] = useState<DisplayExercise[]>([]);
  const [activeVideo, setActiveVideo] = useState<string>("");
  const [progress, setProgress] = useState<PatientWorkoutProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [localCompletedIds, setLocalCompletedIds] = useState<string[] | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [markingDay, setMarkingDay] = useState(false);

  useEffect(() => {
    if (!patient || !patient.id) {
      if (!authLoading) setLoading(false);
      return;
    }

    let rxUnsub = () => {};
    let libUnsub = () => {};
    let progUnsub = () => {};

    let currentRx: PatientPrescription | null = null;
    let currentLib: any[] = [];

    const syncExercises = () => {
      if (!currentRx || !currentRx.exercises || currentRx.exercises.length === 0) {
        setExercises([]);
        setActiveVideo("");
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

    libUnsub = subscribeExerciseLibrary((liveLibrary) => {
      currentLib = liveLibrary;
      syncExercises();
    });

    rxUnsub = subscribePatientPrescription(patient.id, (rxData) => {
      currentRx = rxData;
      setPrescription(rxData);
      syncExercises();

      progUnsub();
      progUnsub = subscribePatientWorkoutProgress(patient.id!, rxData, (newProg) => {
        setProgress(newProg);
        setLocalCompletedIds(null);
      });
    });

    setLoading(false);

    return () => {
      rxUnsub();
      libUnsub();
      progUnsub();
    };
  }, [patient, authLoading, videoParam]);

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

        {exercises.length > 0 && (
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
        )}
      </div>

      {exercises.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl bg-white dark:bg-[#121a1d] border border-dashed border-[#21444D]/20 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto shadow-xs border border-teal-200/50 dark:border-teal-800/60">
            <Dumbbell className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
              No Prescribed Exercises Yet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Your dentist has not assigned any home exercises to your profile yet. Once prescribed during or after your clinical consultation, your personalized video routines, sets, reps, and hold targets will appear here.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/patienthub/dashboard"
              className="inline-flex items-center gap-2 bg-[#062e36] hover:bg-[#21444D] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-xs"
            >
              <span>Back to Dashboard</span>
            </Link>
            <a
              href="https://wa.me/918971462949"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask Your Physiotherapist</span>
            </a>
          </div>
        </div>
      ) : (
        <>
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

              {activeExerciseObj?.tags && activeExerciseObj.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeExerciseObj.tags.map((tag, idx) => (
                    <span key={idx} className="bg-white/10 text-slate-200 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border border-white/10">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Exercise Routine List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  Prescribed Exercise Playlist
                </h3>
                <span className="bg-[#21444D]/10 dark:bg-teal-950/60 text-[#21444D] dark:text-teal-300 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {filteredExercises.length} Routines
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredExercises.map((ex) => {
                const isActive = activeVideo === ex.youtubeId;
                const isCompleted = localCompletedIds !== null 
                  ? localCompletedIds.includes(ex.id)
                  : (todayLog?.completedExerciseIds || []).includes(ex.id);
                const isToggling = togglingId === ex.id;

                return (
                  <div
                    key={ex.id}
                    onClick={() => setActiveVideo(ex.youtubeId)}
                    className={`rounded-2xl p-4 transition-all border flex items-center justify-between gap-3 group cursor-pointer ${
                      isActive
                        ? "bg-[#062e36]/5 dark:bg-slate-850 border-[#062e36] dark:border-[#f9ab55] shadow-sm"
                        : "bg-white dark:bg-[#121a1d] border-[#21444D]/10 dark:border-slate-800 hover:border-[#f9ab55] hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive 
                          ? "bg-[#062e36] text-[#f9ab55]" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-[#f9ab55]/20 group-hover:text-[#8a5100]"
                      }`}>
                        <Play className="h-4 w-4 fill-current" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#1A1C1B] dark:text-slate-100 truncate group-hover:text-[#8a5100] dark:group-hover:text-[#f9ab55] transition-colors">
                          {ex.title}
                        </h4>
                        <p className="text-xs font-black text-[#8a5100] dark:text-[#f9ab55] mt-0.5 tracking-tight truncate">
                          {ex.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
        </>
      )}
    </div>
  );
}
