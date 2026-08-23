"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Search, 
  Check, 
  Send, 
  History, 
  Trash2, 
  RotateCcw, 
  Loader2, 
  Dumbbell, 
  Sparkles,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { 
  ExerciseItem, 
  PrescribedExercise, 
  PatientPrescription, 
  getExerciseLibrary, 
  getPatientPrescription, 
  savePatientPrescription, 
  removePrescribedExercise 
} from "@/lib/exercisesDb";

interface ExercisePrescriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  pid: string;
  lastSeen?: string;
  onPrescriptionSaved?: () => void;
}

const CATEGORIES = [
  "All Regions",
  "Cervical (Neck)",
  "Shoulder",
  "Lumbar (Low Back)",
  "Hip",
  "Knee",
  "Ankle & Foot",
  "Core Stability",
  "Biceps",
  "Triceps",
  "Hamstrings",
  "Calf",
  "Upper Back"
];

export default function ExercisePrescriberModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  pid,
  lastSeen = "Today",
  onPrescriptionSaved
}: ExercisePrescriberModalProps) {
  const [library, setLibrary] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Regions");

  // Previous prescription from database
  const [pastPrescription, setPastPrescription] = useState<PatientPrescription | null>(null);

  // Active tray being edited by therapist
  const [tray, setTray] = useState<PrescribedExercise[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [durationDays, setDurationDays] = useState<number>(14);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, patientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [libData, existingPrescription] = await Promise.all([
        getExerciseLibrary(),
        getPatientPrescription(patientId)
      ]);

      setLibrary(libData);
      setPastPrescription(existingPrescription);

      if (existingPrescription && existingPrescription.exercises) {
        setTray(existingPrescription.exercises);
        setGeneralNotes(existingPrescription.generalNotes || "");
        setDurationDays(existingPrescription.durationDays || 14);
      } else {
        setTray([]);
        setGeneralNotes("");
        setDurationDays(14);
      }
    } catch (err) {
      console.error("Error loading prescriber data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter exercises by category and search term
  const filteredLibrary = library.filter((ex) => {
    const matchesCat = selectedCategory === "All Regions" || ex.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = 
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const isChecked = (exId: string) => tray.some((item) => item.exerciseId === exId);

  // Toggle selection
  const handleToggleExercise = (item: ExerciseItem) => {
    const exists = tray.find((t) => t.exerciseId === item.id);
    if (exists) {
      setTray(tray.filter((t) => t.exerciseId !== item.id));
    } else {
      setTray([
        ...tray,
        {
          exerciseId: item.id,
          title: item.title,
          youtubeUrl: item.youtubeUrl,
          youtubeId: item.youtubeId,
          sets: item.defaultSets || 3,
          repsOrHold: item.defaultReps || "10",
          category: item.category,
          tags: item.tags || []
        }
      ]);
    }
  };

  const updateTrayItem = (exId: string, field: "sets" | "repsOrHold", value: any) => {
    setTray(
      tray.map((t) => (t.exerciseId === exId ? { ...t, [field]: value } : t))
    );
  };

  const removeFromTray = (exId: string) => {
    setTray(tray.filter((t) => t.exerciseId !== exId));
  };

  // Re-prescribe all previously prescribed exercises
  const handleReprescribeAll = () => {
    if (pastPrescription && pastPrescription.exercises) {
      setTray(pastPrescription.exercises);
      if (pastPrescription.generalNotes) {
        setGeneralNotes(pastPrescription.generalNotes);
      }
      if (pastPrescription.durationDays) {
        setDurationDays(pastPrescription.durationDays);
      }
    }
  };

  // Remove individual exercise from previous prescription in Firestore
  const handleRemovePreviousItem = async (exId: string) => {
    try {
      await removePrescribedExercise(patientId, exId);
      // Update local state
      if (pastPrescription) {
        const updatedExs = pastPrescription.exercises.filter((ex) => ex.exerciseId !== exId);
        if (updatedExs.length === 0) {
          setPastPrescription(null);
        } else {
          setPastPrescription({ ...pastPrescription, exercises: updatedExs });
        }
      }
      setTray(tray.filter((item) => item.exerciseId !== exId));
    } catch (err) {
      console.error("Failed to remove exercise:", err);
    }
  };

  // Clear all previous active prescriptions
  const handleClearPreviousPrescription = async () => {
    try {
      await removePrescribedExercise(patientId);
      setPastPrescription(null);
      setTray([]);
      setGeneralNotes("");
    } catch (err) {
      console.error("Failed to clear prescription:", err);
    }
  };

  const handleSavePrescription = async () => {
    setSaving(true);
    try {
      await savePatientPrescription(patientId, tray, generalNotes, durationDays);
      if (onPrescriptionSaved) onPrescriptionSaved();
      onClose();
    } catch (err) {
      console.error("Error saving prescription:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#f8fafc] dark:bg-slate-950 flex flex-col overflow-hidden animate-fade-in">
      
      {/* Top Navigation Bar with Back Button & Centered Search */}
      <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-white dark:bg-slate-900 shadow-xs shrink-0">
        
        {/* Back Button */}
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile</span>
        </button>

        {/* Centered Unclipped Search Bar */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clinical exercises by title, muscle, or region..."
            className="w-full pl-11 pr-4 py-2.5 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green dark:focus:border-teal-500 shadow-inner transition-colors"
          />
        </div>

        {/* Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Prescriber Session"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

        {/* Main Content Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Left Grid: Exercise Selector & History Banner */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            
            {/* Header Title */}
            <div>
              <span className="text-[10px] font-black tracking-widest text-brand-green dark:text-teal-400 uppercase">
                ACTIVE PRESCRIPTION SESSION
              </span>
              <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Patient: {patientName}
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  (PID: {pid})
                </span>
                <span className="text-xs font-semibold text-slate-400 ml-auto">
                  Last Seen: {lastSeen}
                </span>
              </div>
            </div>

            {/* PREVIOUSLY PRESCRIBED HISTORY BANNER (Sky Blue Theme) */}
            {pastPrescription && pastPrescription.exercises && pastPrescription.exercises.length > 0 && (
              <div className="bg-sky-50/90 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sky-800 dark:text-sky-300 font-black text-xs tracking-wider uppercase">
                    <History className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span>PREVIOUSLY PRESCRIBED ({pastPrescription.prescribedDateFormatted})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReprescribeAll}
                      className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Re-prescribe All
                    </button>
                    <button
                      onClick={handleClearPreviousPrescription}
                      className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:text-red-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                      title="Clear Active Prescription from Patient Hub"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear Active
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {pastPrescription.exercises.map((item) => (
                    <div 
                      key={item.exerciseId}
                      className="bg-white dark:bg-slate-900 border border-sky-150 dark:border-sky-900/40 p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs relative group"
                    >
                      <div className="space-y-0.5 overflow-hidden pr-6">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500">
                          {item.sets} sets × {item.repsOrHold}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemovePreviousItem(item.exerciseId)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remove exercise from patient hub"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anatomical Region Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-brand-green text-white shadow-md scale-105"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Exercise Cards Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
                <p className="text-xs font-bold">Loading exercise library...</p>
              </div>
            ) : filteredLibrary.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Dumbbell className="h-10 w-10 mx-auto text-slate-300" />
                <p className="text-xs font-bold">No exercises found matching your filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredLibrary.map((ex) => {
                  const selected = isChecked(ex.id);
                  return (
                    <div
                      key={ex.id}
                      onClick={() => toggleSelectExercise(ex)}
                      className={`group border rounded-2xl p-3 bg-white dark:bg-slate-950 transition-all cursor-pointer select-none relative flex flex-col justify-between ${
                        selected
                          ? "border-brand-green ring-2 ring-brand-green/20 dark:ring-emerald-500/20 shadow-md"
                          : "border-slate-200/80 dark:border-slate-800 hover:border-brand-green/40 hover:shadow-sm"
                      }`}
                    >
                      {/* Video Thumbnail */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 mb-3">
                        <img
                          src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                          alt={ex.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm">
                          {ex.duration}
                        </span>
                      </div>

                      {/* Content Info & Selection Box */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                            {ex.title}
                          </h4>
                        </div>

                        {/* Checkbox Tick Button */}
                        <div
                          className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                            selected
                              ? "bg-brand-green border-brand-green text-white"
                              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                          }`}
                        >
                          {selected && <Check className="h-4 w-4 stroke-[3]" />}
                        </div>
                      </div>

                      {/* Category & Tags */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {ex.category}
                        </span>
                        {ex.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-brand-green/10 text-brand-green dark:text-teal-400 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar: Prescription Tray Panel */}
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              
              {/* Header Badge */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Prescription
                </h3>
                <span className="h-6 w-6 rounded-full bg-brand-green text-white font-black text-xs flex items-center justify-center">
                  {tray.length}
                </span>
              </div>

              {/* Selected List */}
              {tray.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Sparkles className="h-8 w-8 mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">
                    Select exercises from the library on the left to build the home prescription plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                  {tray.map((item) => (
                    <div
                      key={item.exerciseId}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-xs relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {item.title}
                        </h5>
                        <button
                          onClick={() => removeFromTray(item.exerciseId)}
                          className="text-slate-400 hover:text-red-500 p-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Sets & Reps Inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                            SETS
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={item.sets}
                            onChange={(e) => updateTrayItem(item.exerciseId, "sets", parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                            REPS / HOLD
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={item.repsOrHold}
                            onChange={(e) => updateTrayItem(item.exerciseId, "repsOrHold", parseInt(e.target.value) || 10)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Program Duration Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    PROGRAM DURATION
                  </label>
                  <span className="text-[10px] font-black text-brand-green dark:text-teal-400">
                    Review: {new Date(Date.now() + durationDays * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[7, 14, 21, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDurationDays(days)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        durationDays === days
                          ? "bg-brand-green text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {days}D {days === 7 ? "(1W)" : days === 14 ? "(2W)" : days === 21 ? "(3W)" : "(1M)"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-bold">Custom:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-18 px-2 py-1 text-xs font-black text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                  <span className="text-xs font-bold text-slate-500">Days</span>
                </div>
              </div>

              {/* General Notes Field */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  GENERAL NOTES
                </label>
                <textarea
                  rows={3}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="e.g. Stop if pain exceeds 4/10. Perform twice daily after warm shower..."
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-brand-green transition-colors resize-none"
                />
              </div>

            </div>

            {/* Bottom Action CTA */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-6">
              <button
                onClick={handleSavePrescription}
                disabled={saving || tray.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Prescribe ({durationDays} Days) to Hub
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

    </div>
  );
}
