"use client";

import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  Appointment,
  ClinicConfig,
  DEFAULT_CLINIC_CONFIG,
  getClinicConfig,
  generateSlotsForDay,
  getAppointmentsByDate,
  getBlocksByDate,
  getSlotCapacity,
  isSlotInPast,
  submitBookingRequest,
  WeekdayKey
} from "@/lib/db";
import { usePatientAuth } from "@/providers/PatientAuthProvider";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  CalendarCheck2,
  CheckCircle,
  ExternalLink,
  X,
  Sparkles
} from "lucide-react";

// Get today's date formatted as YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get max date string (10 days from today)
function getMaxDateString() {
  const today = new Date();
  today.setDate(today.getDate() + 9);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SERVICES_LIST = [
  "General Physiotherapy Consultation",
  "Gait & Biomechanical Analysis",
  "Sports Injury Rehabilitation",
  "Spine & Musculoskeletal Care",
  "Post-Operative Orthopedic Care",
  "Dry Needling & Myofascial Release",
  "Custom Insoles & Orthotics Fitment",
];

export default function AppointmentsPage() {
  const { patient, loading: authLoading } = usePatientAuth();
  const [mounted, setMounted] = useState(false);
  
  // Clinic Config State
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [bookingDate, setBookingDate] = useState(getTodayDateString());
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingService, setBookingService] = useState(SERVICES_LIST[0]);
  const [bookingNotes, setBookingNotes] = useState("");

  // Availability State
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [approvedSlotCounts, setApprovedSlotCounts] = useState<Record<string, number>>({});
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [blockedType, setBlockedType] = useState<"none" | "full" | "morning" | "evening">("none");

  // Interaction State
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Modal Popups State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("");
  const [submittedApp, setSubmittedApp] = useState<{
    service: string;
    date: string;
    slot: string;
    patientName: string;
    patientPhone: string;
  } | null>(null);

  // History State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Fetch clinic configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        const fetched = await getClinicConfig();
        setClinicConfig(fetched);
      } catch (err) {
        console.error("Failed to load clinic settings: ", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // 2. Fetch patient's appointment history
  const fetchPatientHistory = useCallback(async () => {
    if (!patient?.email && !patient?.phone) {
      if (!authLoading) setLoadingHistory(false);
      return;
    }

    try {
      const appsMap = new Map<string, Appointment>();

      const pName = (patient.name || "").trim().toLowerCase();

      // Query by email
      if (patient.email) {
        const cleanEmail = patient.email.toLowerCase().trim();
        const qEmail = query(
          collection(db, "appointments"),
          where("patientEmail", "==", cleanEmail)
        );
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach((d) => {
          const data = d.data() as Appointment;
          const appName = (data.patientName || "").trim().toLowerCase();
          if (!pName || !appName || appName.includes(pName) || pName.includes(appName)) {
            appsMap.set(d.id, { id: d.id, ...data });
          }
        });
      }

      // Query by phone
      if (patient.phone) {
        let clean = patient.phone.replace(/\D/g, "");
        if (clean.startsWith("91") && clean.length > 10) clean = clean.slice(2);
        
        const qPhone = query(
          collection(db, "appointments"),
          where("patientPhone", ">=", clean)
        );
        const snapPhone = await getDocs(qPhone);
        snapPhone.forEach((d) => {
          const data = d.data() as Appointment;
          if (data.patientPhone && data.patientPhone.includes(clean)) {
            const appName = (data.patientName || "").trim().toLowerCase();
            if (!pName || !appName || appName.includes(pName) || pName.includes(appName)) {
              appsMap.set(d.id, { id: d.id, ...data });
            }
          }
        });
      }

      const list = Array.from(appsMap.values());
      list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setAppointments(list);
    } catch (err) {
      console.warn("Failed to load appointment history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [patient, authLoading]);

  useEffect(() => {
    fetchPatientHistory();
  }, [fetchPatientHistory]);

  // 3. Generate slots for selected date based on daySchedules and shift boundaries
  const allSlots = generateSlotsForDay(clinicConfig, bookingDate || undefined);

  const isMorningSlot = (time: string) => {
    const [hourStr, minAndMod] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const isPM = minAndMod.includes("PM");
    return !isPM || hour === 12;
  };

  // Check if selected date is a weekly holiday
  const checkIsWeeklyHoliday = useCallback(() => {
    if (!bookingDate || !clinicConfig) return false;
    const [year, month, day] = bookingDate.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as keyof ClinicConfig["weeklyHolidays"];
    
    if (clinicConfig.daySchedules && clinicConfig.daySchedules[dayName as WeekdayKey]) {
      return !clinicConfig.daySchedules[dayName as WeekdayKey].isOpen;
    }
    return clinicConfig.weeklyHolidays?.[dayName] === true;
  }, [bookingDate, clinicConfig]);

  const isWeeklyHoliday = checkIsWeeklyHoliday();

  // 4. Fetch slot availability when bookingDate changes
  useEffect(() => {
    if (!bookingDate || loadingConfig) return;

    async function checkAvailability() {
      setLoadingSlots(true);
      setErrorMsg("");
      setApprovedSlotCounts({});
      setBlockedSlots([]);
      setBlockedType("none");

      try {
        // Fetch approved appointments for that date
        const dateAppointments = await getAppointmentsByDate(bookingDate);
        const counts: Record<string, number> = {};
        dateAppointments.forEach((app) => {
          if (app.status === "approved") {
            counts[app.slot] = (counts[app.slot] || 0) + 1;
          }
        });
        setApprovedSlotCounts(counts);

        // Fetch active day/session blocks
        const blocks = await getBlocksByDate(bookingDate);
        let blockState: "none" | "full" | "morning" | "evening" = "none";
        const individualBlocked: string[] = [];

        blocks.forEach((b) => {
          if (b.type === "full_day" || b.type === "holiday") {
            blockState = "full";
          } else if (b.type === "session" && b.session === "morning") {
            blockState = blockState === "evening" ? "full" : "morning";
          } else if (b.type === "session" && b.session === "evening") {
            blockState = blockState === "morning" ? "full" : "evening";
          } else if (b.type === "slot" && b.slot) {
            individualBlocked.push(b.slot);
          }
        });
        setBlockedType(blockState);
        setBlockedSlots(individualBlocked);
      } catch (err) {
        console.error("Failed to check slot availability:", err);
        setErrorMsg("Could not verify slot availability. Please try refreshing.");
      } finally {
        setLoadingSlots(false);
      }
    }

    checkAvailability();
  }, [bookingDate, loadingConfig]);

  // Helper to calculate remaining slot capacity
  const getRemainingCapacity = (time: string) => {
    if (isWeeklyHoliday) return 0;
    if (blockedType === "full") return 0;
    if (blockedType === "morning" && isMorningSlot(time)) return 0;
    if (blockedType === "evening" && !isMorningSlot(time)) return 0;
    if (blockedSlots.includes(time)) return 0;
    if (isSlotInPast(time, bookingDate, {
      cutoffMinutes: clinicConfig.publicBookingCutoffMinutes ?? 0,
      slotDuration: clinicConfig.slotDuration || 30,
    })) return 0;

    const maxCapacity = getSlotCapacity(clinicConfig, time);
    const booked = approvedSlotCounts[time] || 0;
    return Math.max(0, maxCapacity - booked);
  };

  const handleSlotSelect = (selectedSlot: string) => {
    setBookingSlot(selectedSlot);
    setErrorMsg("");
  };

  // Doctor's official phone number from clinic config (fallback +918904456243)
  const doctorWhatsAppNumber = getCleanWhatsAppNumber(clinicConfig?.phone) || "918904456243";

  // Handle form submission
  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!patient) {
      setModalErrorMsg("Unable to identify your patient account. Please try logging in again.");
      setShowErrorModal(true);
      return;
    }

    if (!bookingDate) {
      setModalErrorMsg("Please choose your preferred appointment date.");
      setShowErrorModal(true);
      return;
    }

    if (isWeeklyHoliday) {
      setModalErrorMsg("The clinic is closed on weekly holidays. Please choose another date.");
      setShowErrorModal(true);
      return;
    }

    if (!bookingSlot) {
      setModalErrorMsg("Please select an available time slot before submitting your request.");
      setShowErrorModal(true);
      return;
    }

    setSubmitting(true);

    try {
      const patientName = patient?.name || "Patient";
      const patientPhone = patient?.phone || "";
      const patientEmail = patient?.email || "";

      // Submit booking request using standardized db function
      // Writes to 'appointments' with status: "pending", type: "online"
      // Immediately visible in Admin Portal (/dashboard/appointments)
      const result = await submitBookingRequest({
        patientName,
        patientEmail,
        patientPhone,
        serviceId: bookingService,
        date: bookingDate,
        slot: bookingSlot,
        notes: bookingNotes,
      });

      if (result.success) {
        setSubmittedApp({
          service: bookingService,
          date: bookingDate,
          slot: bookingSlot,
          patientName,
          patientPhone,
        });

        // Open Confirmation Popup Modal
        setShowSuccessModal(true);

        // Clear notes & slot selection
        setBookingNotes("");
        setBookingSlot("");

        // Refresh appointment history and availability
        fetchPatientHistory();
        const dateAppointments = await getAppointmentsByDate(bookingDate);
        const counts: Record<string, number> = {};
        dateAppointments.forEach((app) => {
          if (app.status === "approved") {
            counts[app.slot] = (counts[app.slot] || 0) + 1;
          }
        });
        setApprovedSlotCounts(counts);
      } else {
        setModalErrorMsg(result.error || "Submission failed. Please check slot availability and try again.");
        setShowErrorModal(true);
        setErrorMsg(result.error || "Submission failed.");
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      const msg = err.message || "An unexpected database error occurred. Please try again.";
      setModalErrorMsg(msg);
      setShowErrorModal(true);
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig || authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
        <span className="text-xs font-bold text-slate-500 ml-2">Loading clinic schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 font-['Inter',sans-serif]">
      {/* Top Header */}
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55]">
          Direct Clinical Appointments
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-[#062e36] dark:text-white leading-tight font-['Plus_Jakarta_Sans',sans-serif] mt-0.5">
          Request Therapy Appointment
        </h1>
        <p className="text-xs text-[#41484A] dark:text-slate-400 font-medium mt-1">
          Select your preferred treatment, date, and realtime available slot. Your request appears instantly in our clinic reception queue.
        </p>
      </div>

      {/* Main Grid: Left Booking Form (2 cols) & Right History (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Form & Realtime Slot Selection */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleBookSession} className="space-y-6">

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-4 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Section 1: Patient & Treatment Details */}
            <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <h3 className="text-base font-black text-[#062e36] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 font-['Plus_Jakarta_Sans',sans-serif]">
                <span className="h-6 w-6 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-black">1</span>
                Patient & Treatment Details
              </h3>

              {/* Patient Info Summary Badge */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-brand-green shrink-0" />
                    <span className="truncate">{patient?.name || "Patient"}</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Phone</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-brand-green shrink-0" />
                    <span className="truncate">{patient?.phone || "N/A"}</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 text-brand-green shrink-0" />
                    <span className="truncate">{patient?.email || "N/A"}</span>
                  </span>
                </div>
              </div>

              {/* Treatment Program Select */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Select Physiotherapy Program *
                </label>
                <select
                  value={bookingService}
                  onChange={(e) => setBookingService(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 px-4 py-3 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold cursor-pointer transition-colors"
                >
                  {SERVICES_LIST.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes / Symptoms */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  Notes / Symptoms for Doctor (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={2}
                    placeholder="Describe any new pain, stiffness, or mobility concerns..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Choose Date & Realtime Time Slot (Exact Table from Public Booking Portal) */}
            <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-6 relative overflow-hidden">
              <h3 className="text-base font-black text-[#062e36] dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 font-['Plus_Jakarta_Sans',sans-serif]">
                <span className="h-6 w-6 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-black">2</span>
                Choose Date & Realtime Time Slot
              </h3>

              <div className="space-y-5">
                {/* Date Input with 10-day Limit */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 mb-2">
                    Appointment Date (10-Day Booking Window) *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <input
                      type="date"
                      min={getTodayDateString()}
                      max={getMaxDateString()}
                      value={bookingDate}
                      onChange={(e) => {
                        setBookingDate(e.target.value);
                        setBookingSlot("");
                        setErrorMsg("");
                      }}
                      required
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold transition-colors"
                    />
                  </div>
                </div>

                {/* Slots Grid Container with Holiday Overlay */}
                <div className="relative min-h-[220px]">
                  <div className={`space-y-3 transition-all duration-300 ${
                    isWeeklyHoliday ? "blur-sm opacity-20 pointer-events-none" : ""
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                        Available Realtime Time Slots
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Capacity strictly enforced
                      </span>
                    </div>

                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs font-semibold">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
                        <span>Verifying live doctor availability...</span>
                      </div>
                    ) : blockedType === "full" ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl text-center text-xs font-semibold text-slate-500 border border-slate-200/80 dark:border-slate-800">
                        The clinic is closed on this date (Holiday/Admin block). Please select another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {allSlots.map((time) => {
                          const remaining = getRemainingCapacity(time);
                          const disabled = remaining <= 0;
                          const isSelected = bookingSlot === time;

                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleSlotSelect(time)}
                              className={`py-2.5 px-2 text-xs font-extrabold rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                disabled
                                  ? "bg-slate-100 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-brand-green border-brand-green text-white shadow-md shadow-brand-green/20 scale-[1.02]"
                                  : "bg-brand-sand/70 dark:bg-teal-950/30 border-brand-green/25 dark:border-teal-800/50 text-brand-green dark:text-teal-300 hover:bg-brand-green/15 dark:hover:bg-teal-900/30"
                              }`}
                            >
                              <span className="leading-tight">{time}</span>
                              {!disabled && (
                                <span className={`text-[9px] font-bold tracking-tight ${
                                  isSelected ? "text-white/90" : "text-brand-green dark:text-teal-400 opacity-90"
                                }`}>
                                  {remaining} {remaining === 1 ? "slot" : "slots"} left
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Holiday Banner Card Overlay */}
                  {isWeeklyHoliday && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 animate-fade-in-up">
                      <div className="border border-red-500/20 dark:border-red-900/50 p-6 rounded-3xl shadow-xl text-center space-y-3 max-w-sm w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
                        <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <h4 className="font-black text-[#062e36] dark:text-white text-base">Clinic is Closed</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                          We are closed today. Please select another operational date on our scheduling system.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Operational Hours:</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-normal">
                            {clinicConfig.operationalHoursText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Booking Request Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {bookingSlot ? (
                      <span>Selected: <strong className="text-brand-green">{bookingDate}</strong> at <strong className="text-brand-green">{bookingSlot}</strong></span>
                    ) : (
                      <span>Please tap on an available time slot above.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !bookingSlot || isWeeklyHoliday}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3.5 text-xs font-black tracking-wide uppercase shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Booking Request</span>
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Right Column: Appointment History List (1 col wide) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400 flex items-center gap-1.5">
              <CalendarCheck2 className="h-4 w-4 text-[#8a5100] dark:text-[#f9ab55]" />
              <span>My Booking History</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {appointments.length}
            </span>
          </div>

          {loadingHistory ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 p-8 rounded-3xl text-center text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-brand-green mb-2" />
              <span>Loading appointment records...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-xs text-center text-xs text-slate-400 italic space-y-1">
              <CalendarIcon className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
              <p>No past appointment requests found.</p>
              <p className="text-[11px] not-italic text-slate-400">Your submitted bookings will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
              {appointments.map((app, idx) => {
                const isApproved = app.status === "approved";
                const isPending = app.status === "pending";

                return (
                  <div
                    key={app.id || idx}
                    className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-2 hover:border-[#f9ab55]/60 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#062e36] dark:text-white truncate">
                          {app.serviceId}
                        </p>
                        <div className="flex gap-2 items-center text-[10px] font-medium text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3 text-brand-green" />
                            {app.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-brand-green" />
                            {app.slot}
                          </span>
                        </div>
                      </div>

                      {/* Status Pills */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0">
                          Approved
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0">
                          Rejected
                        </span>
                      )}
                    </div>

                    {app.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                        "{app.notes}"
                      </p>
                    )}

                    {/* Quick WhatsApp Desk Followup Button for Pending Requests */}
                    {isPending && (
                      <div className="pt-1">
                        <a
                          href={`https://wa.me/${doctorWhatsAppNumber}?text=${encodeURIComponent(
                            `Hi Front Desk, checking status of my appointment request for *${app.serviceId}* on *${app.date}* at *${app.slot}*.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat with Clinic Desk</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. SUCCESS CONFIRMATION MODAL (POPUP)                                     */}
      {/* ========================================================================= */}
      {mounted && showSuccessModal && submittedApp && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-[#121a1d] border border-slate-100 dark:border-slate-800 p-6 sm:p-7 rounded-[28px] shadow-2xl space-y-5 text-center animate-scale-in max-h-[92vh] overflow-y-auto overscroll-contain">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Checkmark Icon with Glow */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
              <CheckCircle2 className="h-9 w-9 stroke-[2.2]" />
            </div>

            {/* Header Titles */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Booking Request Logged
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Appointment Requested!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                Your request has been delivered to our clinic desk. Our reception team will review and approve your slot.
              </p>
            </div>

            {/* Summary Details Card */}
            <div className="bg-[#FAF9F9] dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-left space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</span>
                <span className="text-xs font-bold text-[#062e36] dark:text-white text-right max-w-[65%] truncate">
                  {submittedApp.service}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Date</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-brand-green shrink-0" />
                    {submittedApp.date}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Slot</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3.5 w-3.5 text-brand-green shrink-0" />
                    {submittedApp.slot}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booking Status</span>
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Pending Approval
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <a
                href={`https://wa.me/${doctorWhatsAppNumber}?text=${encodeURIComponent(
                  `Hi Gait Physio Clinic, I have submitted an appointment request for *${submittedApp.service}* on *${submittedApp.date}* at *${submittedApp.slot}* via Patient Hub.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-3.5 px-6 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Notify Clinic Desk on WhatsApp</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Done / View My Booking History
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 2. ERROR / ALERT MODAL (POPUP)                                            */}
      {/* ========================================================================= */}
      {mounted && showErrorModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#121a1d] border border-slate-100 dark:border-slate-800 p-6 rounded-[28px] shadow-2xl space-y-4 text-center animate-scale-in">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 ring-8 ring-red-50 dark:ring-red-950/30">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                Unable to Book Slot
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {modalErrorMsg}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="w-full bg-[#062e36] dark:bg-slate-800 hover:bg-[#21444D] text-white rounded-full py-3 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Choose Another Time Slot
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
