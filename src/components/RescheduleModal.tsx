"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronRight,
  ArrowRight,
  CalendarCheck
} from "lucide-react";
import {
  ClinicConfig,
  getClinicConfig,
  generateSlotsForDay,
  getSlotCapacity,
  DEFAULT_CLINIC_CONFIG,
  getAppointmentsByDate,
  getBlocksByDate,
  isSlotInPast,
  Appointment
} from "@/lib/db";
import { auth } from "@/lib/firebase";

// Format date to YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: (updatedAppointment: any) => void;
  userRole?: "admin" | "receptionist" | "patient";
  userName?: string;
  userUid?: string;
}

export default function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
  userRole = "patient",
  userName = "Patient",
  userUid = "",
}: RescheduleModalProps) {
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const [mounted, setMounted] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [approvedSlotCounts, setApprovedSlotCounts] = useState<Record<string, number>>({});
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [blockedType, setBlockedType] = useState<"none" | "full" | "morning" | "evening">("none");

  // Generate selectable dates (next 14 days starting tomorrow or today)
  const availableDates = React.useMemo(() => {
    const list: { label: string; value: string; dayName: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const val = formatDate(d);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      list.push({ label, value: val, dayName });
    }
    return list;
  }, []);

  // Initialize selected date when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      setError("");
      setSuccessMsg("");
      setSelectedSlot("");
      setReason("");
      // Default to next day or current appointment date
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      setSelectedDate(formatDate(tomorrow));
    }
  }, [isOpen, appointment]);

  // Load clinic config
  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      try {
        setLoadingConfig(true);
        const cfg = await getClinicConfig();
        setClinicConfig(cfg);
      } catch (e) {
        console.error("Failed to load clinic config:", e);
      } finally {
        setLoadingConfig(false);
      }
    }
    load();
  }, [isOpen]);

  // Load slots for selected date
  useEffect(() => {
    if (!isOpen || !selectedDate || loadingConfig) return;

    async function loadAvailability() {
      setLoadingSlots(true);
      setError("");
      setApprovedSlotCounts({});
      setBlockedSlots([]);
      setBlockedType("none");

      try {
        const apps = await getAppointmentsByDate(selectedDate);
        const counts: Record<string, number> = {};
        apps.forEach((a) => {
          // Exclude the current appointment if it is on the same date so its own slot is liberated
          if (a.status === "approved" && a.id !== appointment?.id) {
            counts[a.slot] = (counts[a.slot] || 0) + 1;
          }
        });
        setApprovedSlotCounts(counts);

        const blks = await getBlocksByDate(selectedDate);
        let bState: "none" | "full" | "morning" | "evening" = "none";
        const indBlocked: string[] = [];

        blks.forEach((b) => {
          if (b.type === "full_day" || b.type === "holiday") {
            bState = "full";
          } else if (b.type === "session") {
            if (b.session === "morning") bState = bState === "evening" ? "full" : "morning";
            if (b.session === "evening") bState = bState === "morning" ? "full" : "evening";
          } else if (b.type === "slot" && b.slot) {
            indBlocked.push(b.slot);
          }
        });

        setBlockedType(bState);
        setBlockedSlots(indBlocked);
      } catch (err) {
        console.error("Error loading date availability:", err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadAvailability();
  }, [isOpen, selectedDate, loadingConfig, appointment?.id]);

  if (!isOpen || !appointment || !mounted) return null;

  const allSlots = generateSlotsForDay(clinicConfig, selectedDate);

  const isMorningSlot = (time: string) => {
    const [hourStr, minAndMod] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const isPM = minAndMod?.includes("PM");
    return !isPM || hour === 12;
  };

  const morningSlots = allSlots.filter((s) => isMorningSlot(s));
  const eveningSlots = allSlots.filter((s) => !isMorningSlot(s));

  const handleConfirmReschedule = async () => {
    if (!selectedDate || !selectedSlot) {
      setError("Please select both a new date and a time slot.");
      return;
    }

    if (selectedDate === appointment.date && selectedSlot === appointment.slot) {
      setError("Please choose a different date or time slot than the current one.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          appointmentId: appointment.id,
          newDate: selectedDate,
          newSlot: selectedSlot,
          actionedBy: userName,
          actionedByRole: userRole,
          actionedByUid: userUid,
          reason: reason.trim() || `${userRole === "patient" ? "Patient" : "Staff"} requested reschedule`,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error("Unable to connect to the scheduling service. Please try again.");
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to reschedule appointment.");
      }

      setSuccessMsg(data.message || "Appointment rescheduled successfully!");
      setTimeout(() => {
        onSuccess(data.appointment);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlotGrid = (slots: string[]) => {
    if (slots.length === 0) {
      return (
        <p className="text-xs text-slate-400 italic py-2">No slots configured for this session.</p>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((slot) => {
          const cap = getSlotCapacity(clinicConfig, slot);
          const currentBooked = approvedSlotCounts[slot] || 0;
          const isFull = currentBooked >= cap;
          const isIndBlocked = blockedSlots.includes(slot);
          const isSessionBlocked =
            blockedType === "full" ||
            (blockedType === "morning" && isMorningSlot(slot)) ||
            (blockedType === "evening" && !isMorningSlot(slot));

          const isPast = isSlotInPast(slot, selectedDate, {
            isAdmin: userRole !== "patient",
            graceType: clinicConfig.adminWalkInGraceType || "end_of_slot",
            slotDuration: clinicConfig.slotDuration || 30,
          });

          const isCurrentSlot = selectedDate === appointment.date && slot === appointment.slot;
          const isDisabled = (isFull || isIndBlocked || isSessionBlocked || isPast) && !isCurrentSlot;
          const isSelected = selectedSlot === slot;

          return (
            <button
              key={slot}
              type="button"
              disabled={isDisabled}
              onClick={() => setSelectedSlot(slot)}
              className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer select-none ${
                isSelected
                  ? "bg-brand-green text-white border-brand-green shadow-md scale-102 ring-2 ring-brand-green/30"
                  : isCurrentSlot
                  ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  : isDisabled
                  ? "bg-slate-100 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed line-through"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-green hover:bg-brand-bg/40 dark:hover:bg-slate-750"
              }`}
            >
              <span className="text-xs font-black tracking-tight">{slot}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                {isCurrentSlot
                  ? "Current Slot"
                  : isPast
                  ? "Passed"
                  : isIndBlocked || isSessionBlocked
                  ? "Blocked"
                  : isFull
                  ? "Booked"
                  : `${cap - currentBooked} Left`}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-black uppercase tracking-wider mb-1">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Reschedule Slot</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {userRole === "patient" ? "Request Session Reschedule" : "Reschedule Appointment"}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {userRole === "patient"
                ? "Select your preferred new timing. Our clinic desk will review and confirm your slot shortly."
                : "Moving this appointment will immediately update the schedule and notify the patient."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Slot Info Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Current Confirmed Slot
            </span>
            <p className="font-black text-slate-800 dark:text-slate-100 truncate">
              {appointment.patientName} • {appointment.serviceId}
            </p>
            <p className="text-xs font-extrabold text-brand-green flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{appointment.date} at {appointment.slot}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950/40 text-red-650 uppercase">
              Will Be Released
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          {/* 1. Date Selector Strip */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              1. Choose New Date
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {availableDates.map((item) => {
                const isSelected = selectedDate === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setSelectedDate(item.value);
                      setSelectedSlot("");
                    }}
                    className={`shrink-0 px-3.5 py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-brand-green text-white border-brand-green shadow-md"
                        : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-green/70"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
                      {item.dayName}
                    </span>
                    <span className="text-xs font-black">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Slot Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Select Available Time Slot
              </label>
              {loadingSlots && (
                <div className="flex items-center gap-1.5 text-xs text-brand-green font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking slots...</span>
                </div>
              )}
            </div>

            {loadingSlots ? (
              <div className="py-8 flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Morning Session */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Morning Session
                  </span>
                  {renderSlotGrid(morningSlots)}
                </div>

                {/* Evening Session */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Evening Session
                  </span>
                  {renderSlotGrid(eveningSlots)}
                </div>
              </div>
            )}
          </div>

          {/* 3. Reason Note (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Reason / Reschedule Note (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Patient requested morning slot, travel delay, doctor advice"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 font-semibold outline-none focus:border-brand-green"
            />
          </div>

          {/* Feedback Banners */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting || !selectedDate || !selectedSlot}
            onClick={handleConfirmReschedule}
            className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{userRole === "patient" ? "Submitting Request..." : "Re-allocating Slot..."}</span>
              </>
            ) : (
              <>
                <span>{userRole === "patient" ? "Submit Reschedule Request" : "Confirm & Update Slot"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
