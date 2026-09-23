"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  Search, 
  Check, 
  Send, 
  History, 
  Trash2, 
  Loader2, 
  Dumbbell, 
  Sparkles,
  ArrowLeft,
  ClipboardList,
  ChevronRight,
  Plus
} from "lucide-react";
import { 
  ExerciseItem, 
  PrescribedExercise, 
  PatientPrescription, 
  getExerciseLibrary, 
  getPatientPrescription, 
  savePatientPrescription
} from "@/lib/exercisesDb";

interface ExercisePrescriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  pid: string;
  lastSeen?: string;
  googleDriveFolderId?: string;
  therapistName?: string;
  diagnosis?: string;
  consultationSummary?: string;
  providerAlerts?: string[];
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

// Hydration-safe client-side check
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function ExercisePrescriberModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  pid,
  lastSeen = "Today",
  googleDriveFolderId,
  therapistName = "Dr. Kinnera",
  diagnosis,
  consultationSummary,
  providerAlerts,
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
  const [resetProgressToDay1, setResetProgressToDay1] = useState(false);
  const [mobileTab, setMobileTab] = useState<"library" | "prescription">("library");
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  useEffect(() => {
    let ignore = false;
    if (!isOpen) return;

    Promise.all([
      getExerciseLibrary(),
      getPatientPrescription(patientId)
    ]).then(([libData, existingPrescription]) => {
      if (ignore) return;
      setLibrary(libData);
      setPastPrescription(existingPrescription);

      if (existingPrescription && existingPrescription.exercises && existingPrescription.exercises.length > 0) {
        setTray(existingPrescription.exercises);
        setGeneralNotes(existingPrescription.generalNotes || "");
        setDurationDays(existingPrescription.durationDays || 14);
        setMobileTab("prescription");
      } else {
        setTray([]);
        setGeneralNotes("");
        setDurationDays(14);
        setMobileTab("library");
      }
      setLoading(false);
    }).catch((err) => {
      console.error("Error loading prescriber data:", err);
      if (!ignore) setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [isOpen, patientId]);

  const reviewDateFormatted = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, durationDays || 1));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [durationDays]);

  if (!isOpen || !isMounted) return null;

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

  const updateTrayItem = (exId: string, field: "sets" | "repsOrHold", value: number | string) => {
    setTray(
      tray.map((t) => (t.exerciseId === exId ? { ...t, [field]: value } : t))
    );
  };

  const removeFromTray = (exId: string) => {
    setTray(tray.filter((t) => t.exerciseId !== exId));
  };

  const handleSavePrescription = async () => {
    setSaving(true);
    try {
      // 1. Save active prescription in Firestore (Preserving ongoing start date and past days history unless explicitly reset)
      await savePatientPrescription(
        patientId, 
        tray, 
        generalNotes, 
        durationDays, 
        resetProgressToDay1 ? undefined : pastPrescription?.startDate,
        !resetProgressToDay1
      );

      if (onPrescriptionSaved) onPrescriptionSaved();
      onClose();
    } catch (err) {
      console.error("Error saving prescription:", err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#f8fafc] dark:bg-slate-950 flex flex-col overflow-hidden animate-fade-in">
      
      {/* Top Navigation Bar with Back Button & Centered Search */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 bg-white dark:bg-slate-900 shadow-xs shrink-0">
        
        {/* Back Button */}
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Profile</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Centered Unclipped Search Bar */}
        <div className="flex-1 max-w-xl mx-auto relative">
          <Search className="absolute left-3.5 sm:left-4 top-2.5 sm:top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (mobileTab !== "library") {
                setMobileTab("library");
              }
            }}
            placeholder="Search exercises..."
            className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs font-bold rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green dark:focus:border-teal-500 shadow-inner transition-colors"
          />
        </div>

        {/* Close Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close Prescriber Session"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Segmented Tab Switcher (Visible only on screens < lg) */}
      <div className="lg:hidden px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("library")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
            mobileTab === "library"
              ? "bg-brand-green text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>Exercise Library</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("prescription")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
            mobileTab === "prescription"
              ? "bg-brand-green text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <ClipboardList className="h-3.5 w-3.5" />
          <span>Prescription</span>
          {tray.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                mobileTab === "prescription"
                  ? "bg-white text-brand-green"
                  : "bg-brand-green text-white"
              }`}
            >
              {tray.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Body */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0 relative">
        
        {/* Left Grid: Exercise Selector & History Banner */}
        <div
          className={`p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 overscroll-contain flex-1 relative ${
            mobileTab === "library" ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          }`}
        >
          
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {pastPrescription.exercises.map((item) => (
                  <div 
                    key={item.exerciseId}
                    className="bg-white dark:bg-slate-900 border border-sky-150 dark:border-sky-900/40 p-3 rounded-xl flex items-center justify-between gap-3 shadow-xs relative group"
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] font-semibold text-slate-500">
                        {item.sets} sets × {item.repsOrHold}
                      </p>
                    </div>
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
                    onClick={() => handleToggleExercise(ex)}
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

          {/* Mobile Floating Action Pill when exercises are in tray and viewing library */}
          {tray.length > 0 && (
            <div className="lg:hidden sticky bottom-2 left-0 right-0 z-30 pt-2 pb-1">
              <button
                type="button"
                onClick={() => setMobileTab("prescription")}
                className="w-full bg-[#062e36] hover:bg-[#083c47] text-white py-3 px-4 rounded-2xl shadow-xl flex items-center justify-between font-black text-xs border border-teal-500/30 cursor-pointer transition-all active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-6 w-6 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-black shadow-xs">
                    {tray.length}
                  </span>
                  <span className="text-white font-extrabold">
                    {tray.length === 1 ? "1 Exercise Selected" : `${tray.length} Exercises Selected`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-teal-300 font-black">
                  <span>Review Plan & Prescribe</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Prescription Staging Tray & Send Session */}
        <div
          className={`w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex-col justify-between shrink-0 ${
            mobileTab === "prescription" ? "flex flex-1 h-full min-h-0 overflow-hidden" : "hidden lg:flex"
          }`}
        >
          
          {/* Tray Header & List */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Prescription
                </h3>
                <span className="h-6 w-6 rounded-full bg-brand-green text-white text-xs font-black flex items-center justify-center shadow-xs">
                  {tray.length}
                </span>
              </div>

              {/* Mobile Quick Action to add more exercises from library */}
              <button
                type="button"
                onClick={() => setMobileTab("library")}
                className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-brand-green dark:text-teal-400 bg-brand-green/10 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl hover:bg-brand-green/20 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Exercises</span>
              </button>
            </div>

            {tray.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 text-slate-400">
                <Sparkles className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">
                  Select exercises from the library to build the home prescription plan.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileTab("library")}
                  className="inline-flex items-center gap-1.5 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Browse Exercise Library
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {tray.map((item, index) => (
                  <div
                    key={item.exerciseId}
                    className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-green dark:text-teal-400 block mb-0.5">
                          Exercise #{index + 1}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => removeFromTray(item.exerciseId)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Sets
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.sets}
                          onChange={(e) =>
                            updateTrayItem(item.exerciseId, "sets", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Reps / Hold
                        </label>
                        <input
                          type="text"
                          value={item.repsOrHold}
                          onChange={(e) =>
                            updateTrayItem(item.exerciseId, "repsOrHold", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Duration & Submit */}
          <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 sm:space-y-4 shrink-0">
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  PROGRAM DURATION
                </label>
                <span className="text-[10px] font-black text-brand-green dark:text-teal-400">
                  Review: {reviewDateFormatted}
                </span>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { days: 7, label: "1 Week" },
                  { days: 14, label: "2 Weeks" },
                  { days: 21, label: "3 Weeks" },
                  { days: 28, label: "4 Weeks" }
                ].map((preset) => (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setDurationDays(preset.days)}
                    className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      durationDays === preset.days
                        ? "bg-brand-green text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Number of Days Input */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Custom Duration:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationDays || ""}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDurationDays(isNaN(val) ? 0 : Math.max(1, Math.min(180, val)));
                    }}
                    placeholder="14"
                    className="w-16 px-2 py-1 text-center font-black text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[#062e36] dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Days</span>
                </div>
              </div>

              {/* Protocol Progression Options (Mutually Exclusive) */}
              {pastPrescription && (
                <div className="space-y-1.5 select-none pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Routine Progression Options
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option 1: Preserve ongoing progress */}
                    <label 
                      onClick={() => setResetProgressToDay1(false)}
                      className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
                        !resetProgressToDay1
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-brand-green text-slate-900 dark:text-white shadow-xs ring-1 ring-brand-green/30"
                          : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="protocolProgression"
                        checked={!resetProgressToDay1}
                        onChange={() => setResetProgressToDay1(false)}
                        className="mt-0.5 h-4 w-4 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block leading-tight">
                          Preserve Progress
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug">
                          Continue without losing past completed days
                        </span>
                      </div>
                    </label>

                    {/* Option 2: Start as Fresh Protocol */}
                    <label 
                      onClick={() => setResetProgressToDay1(true)}
                      className={`flex items-start gap-2.5 p-2.5 sm:p-3 rounded-2xl border cursor-pointer transition-all ${
                        resetProgressToDay1
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-brand-green text-slate-900 dark:text-white shadow-xs ring-1 ring-brand-green/30"
                          : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="protocolProgression"
                        checked={resetProgressToDay1}
                        onChange={() => setResetProgressToDay1(true)}
                        className="mt-0.5 h-4 w-4 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer shrink-0"
                      />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block leading-tight">
                          Fresh Protocol
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-snug">
                          Reset routine schedule back to Day 1
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action CTA */}
            <button
              onClick={handleSavePrescription}
              disabled={saving || tray.length === 0 || !durationDays || durationDays < 1}
              className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Prescribe ({durationDays || 14} Days) to Hub
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
