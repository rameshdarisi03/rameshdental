"use client";

import React, { useState, useMemo } from "react";
import { 
  ToothRecord, 
  ToothStatus, 
  DentalChart, 
  updatePatient 
} from "@/lib/patientsDb";
import { 
  Sparkles, 
  Check, 
  AlertCircle, 
  Save, 
  RotateCcw, 
  Info, 
  Plus, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Loader2,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Activity
} from "lucide-react";

// Tooth Name mapping in FDI notation
export const TOOTH_NAMES: Record<number, string> = {
  // Upper Right (Quadrant 1)
  18: "Upper Right 3rd Molar (Wisdom)",
  17: "Upper Right 2nd Molar",
  16: "Upper Right 1st Molar",
  15: "Upper Right 2nd Premolar",
  14: "Upper Right 1st Premolar",
  13: "Upper Right Canine",
  12: "Upper Right Lateral Incisor",
  11: "Upper Right Central Incisor",

  // Upper Left (Quadrant 2)
  21: "Upper Left Central Incisor",
  22: "Upper Left Lateral Incisor",
  23: "Upper Left Canine",
  24: "Upper Left 1st Premolar",
  25: "Upper Left 2nd Premolar",
  26: "Upper Left 1st Molar",
  27: "Upper Left 2nd Molar",
  28: "Upper Left 3rd Molar (Wisdom)",

  // Lower Left (Quadrant 3)
  31: "Lower Left Central Incisor",
  32: "Lower Left Lateral Incisor",
  33: "Lower Left Canine",
  34: "Lower Left 1st Premolar",
  35: "Lower Left 2nd Premolar",
  36: "Lower Left 1st Molar",
  37: "Lower Left 2nd Molar",
  38: "Lower Left 3rd Molar (Wisdom)",

  // Lower Right (Quadrant 4)
  41: "Lower Right Central Incisor",
  42: "Lower Right Lateral Incisor",
  43: "Lower Right Canine",
  44: "Lower Right 1st Premolar",
  45: "Lower Right 2nd Premolar",
  46: "Lower Right 1st Molar",
  47: "Lower Right 2nd Molar",
  48: "Lower Right 3rd Molar (Wisdom)",
};

// FDI to Universal (USA) Numbering map
export const FDI_TO_UNIVERSAL: Record<number, number> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  48: 32, 47: 31, 46: 30, 45: 29, 44: 28, 43: 27, 42: 26, 41: 25,
};

export const TOOTH_STATUS_CONFIG: Record<
  ToothStatus, 
  { label: string; badge: string; bg: string; border: string; text: string; iconText: string }
> = {
  healthy: {
    label: "Healthy / Sound",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    bg: "bg-white dark:bg-slate-900",
    border: "border-slate-300 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    iconText: "OK",
  },
  caries: {
    label: "Caries / Decay",
    badge: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300",
    bg: "bg-red-500/15 dark:bg-red-950/50",
    border: "border-red-500 ring-2 ring-red-400/30",
    text: "text-red-600 dark:text-red-400 font-black",
    iconText: "CA",
  },
  rct_advised: {
    label: "RCT Advised",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300",
    bg: "bg-purple-500/20 dark:bg-purple-950/60",
    border: "border-purple-500 ring-2 ring-purple-400/40",
    text: "text-purple-600 dark:text-purple-300 font-black",
    iconText: "RCT!",
  },
  rct_done: {
    label: "RCT Completed",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300",
    bg: "bg-blue-500/15 dark:bg-blue-950/50",
    border: "border-blue-500",
    text: "text-blue-600 dark:text-blue-300 font-bold",
    iconText: "RCT✓",
  },
  crown_advised: {
    label: "Crown Advised",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300",
    bg: "bg-amber-500/15 dark:bg-amber-950/50",
    border: "border-amber-500 ring-1 ring-amber-400/40",
    text: "text-amber-600 dark:text-amber-300 font-black",
    iconText: "CRN!",
  },
  crown_placed: {
    label: "Crown Placed",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-300",
    bg: "bg-yellow-500/20 dark:bg-yellow-950/50",
    border: "border-yellow-500",
    text: "text-yellow-600 dark:text-yellow-300 font-black",
    iconText: "CRN✓",
  },
  filling: {
    label: "Composite Filling",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300",
    bg: "bg-emerald-500/15 dark:bg-emerald-950/50",
    border: "border-emerald-500",
    text: "text-emerald-600 dark:text-emerald-300 font-bold",
    iconText: "FIL✓",
  },
  missing: {
    label: "Missing / Extracted",
    badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    bg: "bg-slate-100/60 dark:bg-slate-900/60 opacity-60",
    border: "border-dashed border-slate-400 dark:border-slate-600",
    text: "text-slate-400 line-through",
    iconText: "✕",
  },
  implant: {
    label: "Dental Implant",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300",
    bg: "bg-cyan-500/20 dark:bg-cyan-950/60",
    border: "border-cyan-500 ring-2 ring-cyan-400/40",
    text: "text-cyan-600 dark:text-cyan-300 font-black",
    iconText: "IMP✓",
  },
  impacted: {
    label: "Impacted",
    badge: "bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300",
    bg: "bg-pink-500/20 dark:bg-pink-950/60",
    border: "border-pink-500 ring-1 ring-pink-400/40",
    text: "text-pink-600 dark:text-pink-300 font-black",
    iconText: "IMP!",
  },
};

interface DentalOdontogramProps {
  patientId: string;
  initialChart?: DentalChart;
  onInsertToNotes?: (textToAppend: string) => void;
  onChartSaved?: (updatedChart: DentalChart) => void;
}

export default function DentalOdontogram({
  patientId,
  initialChart = {},
  onInsertToNotes,
  onChartSaved,
}: DentalOdontogramProps) {
  const [chart, setChart] = useState<DentalChart>(initialChart);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(16);
  const [selectedSurfaces, setSelectedSurfaces] = useState<("M" | "O" | "D" | "B" | "L")[]>([]);
  const [toothNotes, setToothNotes] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<ToothStatus>("healthy");

  const [notationSystem, setNotationSystem] = useState<"FDI" | "Universal">("FDI");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load tooth details into inspector when selected
  const handleSelectTooth = (toothNum: number) => {
    setSelectedTooth(toothNum);
    const existing = chart[String(toothNum)];
    if (existing) {
      setCurrentStatus(existing.status || "healthy");
      setSelectedSurfaces(existing.surfaces || []);
      setToothNotes(existing.notes || "");
    } else {
      setCurrentStatus("healthy");
      setSelectedSurfaces([]);
      setToothNotes("");
    }
  };

  // Update selected tooth in state
  const handleApplyToothUpdate = (newStatus?: ToothStatus) => {
    if (!selectedTooth) return;
    const statusToUse = newStatus || currentStatus;

    const updatedRecord: ToothRecord = {
      toothNumber: selectedTooth,
      status: statusToUse,
      surfaces: selectedSurfaces,
      notes: toothNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    setChart((prev) => {
      const next = { ...prev, [String(selectedTooth)]: updatedRecord };
      return next;
    });
    setCurrentStatus(statusToUse);
    setHasUnsavedChanges(true);
  };

  // Toggle surface selection (M, O, D, B, L)
  const toggleSurface = (surf: "M" | "O" | "D" | "B" | "L") => {
    setSelectedSurfaces((prev) => {
      const exists = prev.includes(surf);
      const next = exists ? prev.filter((s) => s !== surf) : [...prev, surf];
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Save the entire Odontogram to Firestore
  const handleSaveToFirestore = async () => {
    if (!patientId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updatePatient(patientId, {
        dentalChart: chart,
      });
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      if (onChartSaved) onChartSaved(chart);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save dental chart:", err);
      alert("Failed to save dental chart. Please check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate dental summary to append to Doctor's SOAP Clinical Note
  const handleExportToClinicalNotes = () => {
    const diseasedTeeth = Object.values(chart).filter(
      (t) => t.status && t.status !== "healthy"
    );

    if (diseasedTeeth.length === 0) {
      alert("No conditions marked yet. Mark teeth with Caries, RCT, Crown or Missing first.");
      return;
    }

    let summaryText = `\n[ODONTOGRAM CLINICAL FINDINGS - ${new Date().toLocaleDateString("en-GB")}]\n`;
    diseasedTeeth.forEach((t) => {
      const name = TOOTH_NAMES[t.toothNumber] || `Tooth #${t.toothNumber}`;
      const statusLabel = TOOTH_STATUS_CONFIG[t.status]?.label || t.status;
      const surfacesStr = t.surfaces && t.surfaces.length > 0 ? ` (${t.surfaces.join("")})` : "";
      const notesStr = t.notes ? ` - ${t.notes}` : "";
      summaryText += `• Tooth #${t.toothNumber} [${name}]: ${statusLabel}${surfacesStr}${notesStr}\n`;
    });

    if (onInsertToNotes) {
      onInsertToNotes(summaryText);
      alert("Odontogram findings appended to Clinical Consultation notes!");
    } else {
      navigator.clipboard.writeText(summaryText);
      alert("Odontogram findings copied to clipboard!");
    }
  };

  // Odontogram Statistics
  const stats = useMemo(() => {
    const list = Object.values(chart);
    const cariesCount = list.filter((t) => t.status === "caries").length;
    const rctAdvisedCount = list.filter((t) => t.status === "rct_advised").length;
    const rctDoneCount = list.filter((t) => t.status === "rct_done").length;
    const crownCount = list.filter((t) => t.status === "crown_advised" || t.status === "crown_placed").length;
    const missingCount = list.filter((t) => t.status === "missing").length;
    const implantCount = list.filter((t) => t.status === "implant").length;
    const totalRequiringTreatment = cariesCount + rctAdvisedCount + list.filter((t) => t.status === "crown_advised" || t.status === "impacted").length;

    return {
      cariesCount,
      rctAdvisedCount,
      rctDoneCount,
      crownCount,
      missingCount,
      implantCount,
      totalRequiringTreatment,
    };
  }, [chart]);

  // Teeth quadrants
  const upperRightTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeftTeeth = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRightTeeth = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeftTeeth = [31, 32, 33, 34, 35, 36, 37, 38];

  // Render an individual tooth tile
  const renderToothTile = (toothNum: number) => {
    const record = chart[String(toothNum)];
    const status: ToothStatus = record?.status || "healthy";
    const config = TOOTH_STATUS_CONFIG[status];
    const isSelected = selectedTooth === toothNum;
    const displayNum = notationSystem === "FDI" ? toothNum : FDI_TO_UNIVERSAL[toothNum] || toothNum;
    const hasNotes = Boolean(record?.notes);
    const surfaces = record?.surfaces || [];

    return (
      <button
        key={toothNum}
        type="button"
        onClick={() => handleSelectTooth(toothNum)}
        className={`group relative flex flex-col items-center justify-between p-2 rounded-2xl border transition-all cursor-pointer min-w-[50px] sm:min-w-[58px] min-h-[78px] select-none ${
          config.bg
        } ${config.border} ${
          isSelected
            ? "ring-2 ring-brand-green shadow-lg scale-105 z-10 bg-brand-green/10 dark:bg-emerald-950/40"
            : "hover:scale-102 hover:shadow-md"
        }`}
      >
        {/* Tooth Number */}
        <span className={`text-[11px] font-black ${isSelected ? "text-brand-green dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"}`}>
          #{displayNum}
        </span>

        {/* Anatomical Graphic / Status Representation */}
        <div className="relative w-7 h-7 my-1 flex items-center justify-center">
          {status === "missing" ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-xs">
              ✕
            </div>
          ) : status === "implant" ? (
            <div className="w-5 h-6 rounded-t-sm rounded-b-md border-2 border-cyan-500 bg-cyan-400/20 flex flex-col items-center justify-center text-[7px] font-black text-cyan-600">
              <span className="leading-none">⚙</span>
              <span className="text-[6px]">IMP</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-slate-400/60 dark:border-slate-600 relative overflow-hidden bg-white/70 dark:bg-slate-800/80 shadow-inner flex items-center justify-center">
              {/* Occlusal Center */}
              <div
                className={`w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-700 ${
                  surfaces.includes("O") ? "bg-red-500" : "bg-transparent"
                }`}
              />
              {/* Surface indicator dots if customized */}
              {surfaces.includes("M") && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-amber-500 rounded-r" />}
              {surfaces.includes("D") && <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-2 bg-amber-500 rounded-l" />}
              {surfaces.includes("B") && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-amber-500 rounded-b" />}
              {surfaces.includes("L") && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-1 bg-amber-500 rounded-t" />}
            </div>
          )}
        </div>

        {/* Status Badge Code */}
        <span className={`text-[8px] font-extrabold px-1 rounded uppercase tracking-tighter ${config.text}`}>
          {config.iconText}
        </span>

        {/* Has Notes / Surfaces indicator dot */}
        {(hasNotes || surfaces.length > 0) && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-green rounded-full ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="text-lg">🦷</span>
              <span>Interactive Adult Dental Odontogram (32-Tooth Chart)</span>
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-green/10 text-brand-green dark:bg-emerald-950/60 dark:text-emerald-300">
              FDI Standard
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click any tooth to record dental findings, surface caries, root canals, zirconia crowns, implants, or extractions.
          </p>
        </div>

        {/* Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Notation Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setNotationSystem("FDI")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                notationSystem === "FDI"
                  ? "bg-white dark:bg-slate-900 text-brand-green shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              FDI (11–48)
            </button>
            <button
              type="button"
              onClick={() => setNotationSystem("Universal")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                notationSystem === "Universal"
                  ? "bg-white dark:bg-slate-900 text-brand-green shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Universal (1–32)
            </button>
          </div>

          {/* Export to Notes Button */}
          <button
            type="button"
            onClick={handleExportToClinicalNotes}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand-green hover:text-brand-green transition-all cursor-pointer shadow-xs"
            title="Append Odontogram findings to the Doctor's SOAP Clinical Notes"
          >
            <FileText className="w-3.5 h-3.5 text-brand-green" />
            <span>+ Add to Clinical Note</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveToFirestore}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white transition-all shadow-md cursor-pointer ${
              hasUnsavedChanges
                ? "bg-gradient-to-r from-emerald-600 to-brand-green hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/20 animate-pulse"
                : "bg-slate-800 dark:bg-slate-700 hover:bg-slate-700"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{hasUnsavedChanges ? "Save Changes *" : "Saved"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Dental Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">Needs Treatment</p>
          <p className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">
            {stats.totalRequiringTreatment}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">Active Caries</p>
          <p className="text-xl font-black text-red-500 mt-0.5">
            {stats.cariesCount}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">RCT Advised / Done</p>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
            {stats.rctAdvisedCount} <span className="text-xs font-semibold text-slate-400">/ {stats.rctDoneCount} done</span>
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">Crowns (Prosthesis)</p>
          <p className="text-xl font-black text-amber-500 mt-0.5">
            {stats.crownCount}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">Missing Teeth</p>
          <p className="text-xl font-black text-slate-600 dark:text-slate-300 mt-0.5">
            {stats.missingCount}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase text-slate-400">Implants</p>
          <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 mt-0.5">
            {stats.implantCount}
          </p>
        </div>
      </div>

      {/* Main Dental Arch Grid Container */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 space-y-6 overflow-x-auto">
        {/* UPPER ARCH (MAXILLARY) */}
        <div className="space-y-2 min-w-[700px]">
          <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider px-2">
            <span>Upper Right (Quadrant 1)</span>
            <span className="text-[10px] text-brand-green font-extrabold bg-brand-green/10 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
              MAXILLARY ARCH
            </span>
            <span>Upper Left (Quadrant 2)</span>
          </div>

          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Quad 1: 18 -> 11 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {upperRightTeeth.map((num) => renderToothTile(num))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-slate-300 dark:bg-slate-700 mx-1 flex items-center justify-center relative">
              <span className="absolute -top-3 text-[9px] font-black text-slate-400">MID</span>
            </div>

            {/* Quad 2: 21 -> 28 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {upperLeftTeeth.map((num) => renderToothTile(num))}
            </div>
          </div>
        </div>

        {/* ARCH SEPARATOR LINE */}
        <div className="relative flex items-center justify-center min-w-[700px]">
          <div className="w-full border-t border-dashed border-slate-300 dark:border-slate-700" />
          <span className="absolute bg-slate-200 dark:bg-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest px-3 py-0.5 rounded-full">
            OCCLUSAL PLANE
          </span>
        </div>

        {/* LOWER ARCH (MANDIBULAR) */}
        <div className="space-y-2 min-w-[700px]">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            {/* Quad 4: 48 -> 41 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {lowerRightTeeth.map((num) => renderToothTile(num))}
            </div>

            {/* Midline Divider */}
            <div className="h-16 w-0.5 bg-slate-300 dark:bg-slate-700 mx-1 flex items-center justify-center relative">
              <span className="absolute -bottom-3 text-[9px] font-black text-slate-400">MID</span>
            </div>

            {/* Quad 3: 31 -> 38 */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {lowerLeftTeeth.map((num) => renderToothTile(num))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-black text-slate-500 uppercase tracking-wider px-2">
            <span>Lower Right (Quadrant 4)</span>
            <span className="text-[10px] text-brand-green font-extrabold bg-brand-green/10 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full">
              MANDIBULAR ARCH
            </span>
            <span>Lower Left (Quadrant 3)</span>
          </div>
        </div>
      </div>

      {/* SELECTED TOOTH INSPECTOR & QUICK CONDITION MODAL */}
      {selectedTooth && (
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-brand-green/30 dark:border-emerald-500/20 space-y-4 animate-fade-in shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-brand-green dark:text-emerald-400 font-mono">
                  Tooth #{selectedTooth}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  ({notationSystem === "FDI" ? `Universal #${FDI_TO_UNIVERSAL[selectedTooth]}` : `FDI #${selectedTooth}`})
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  — {TOOTH_NAMES[selectedTooth]}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Current Status:</span>
              <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${TOOTH_STATUS_CONFIG[currentStatus].badge}`}>
                {TOOTH_STATUS_CONFIG[currentStatus].label}
              </span>
            </div>
          </div>

          {/* 1-Click Status Applicator */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Select Clinical Condition / Treatment:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map((st) => {
                const conf = TOOTH_STATUS_CONFIG[st];
                const isCurrent = currentStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setCurrentStatus(st);
                      handleApplyToothUpdate(st);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? `${conf.border} ${conf.bg} ${conf.text} ring-2 ring-brand-green shadow-xs`
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-current" />
                    <span className="truncate">{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tooth Surfaces Selector (Mesial, Occlusal, Distal, Buccal, Lingual) */}
          <div className="pt-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
              Involved Tooth Surfaces:
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { code: "M" as const, label: "M - Mesial" },
                { code: "O" as const, label: "O - Occlusal / Incisal" },
                { code: "D" as const, label: "D - Distal" },
                { code: "B" as const, label: "B - Buccal / Facial" },
                { code: "L" as const, label: "L - Lingual / Palatal" },
              ].map(({ code, label }) => {
                const isSelected = selectedSurfaces.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      toggleSurface(code);
                      handleApplyToothUpdate();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      isSelected
                        ? "bg-brand-green text-white border-brand-green shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-brand-green"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {selectedSurfaces.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSurfaces([]);
                    handleApplyToothUpdate();
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  Clear Surfaces
                </button>
              )}
            </div>
          </div>

          {/* Clinical Notes for this Specific Tooth */}
          <div className="pt-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Specific Tooth Clinical Observation / IOPAR Radiographic Note:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={toothNotes}
                onChange={(e) => {
                  setToothNotes(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                onBlur={() => handleApplyToothUpdate()}
                placeholder="e.g. Deep dentinal caries on DO surface, cold test +ve, periapical radiolucency on IOPAR"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-brand-green"
              />
              <button
                type="button"
                onClick={() => handleApplyToothUpdate()}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-black hover:bg-slate-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Condition Legend */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
          Clinical Notation Legend:
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {(Object.keys(TOOTH_STATUS_CONFIG) as ToothStatus[]).map((st) => {
            const conf = TOOTH_STATUS_CONFIG[st];
            return (
              <div key={st} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                <span className={`w-2.5 h-2.5 rounded-full border ${conf.border} ${conf.bg}`} />
                <span>{conf.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
