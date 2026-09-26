"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/public/PageHeader";
import {
  getAppointmentsByDate,
  getBlocksByDate,
  submitBookingRequest,
  getClinicConfig,
  generateSlotsFromHours,
  generateSlotsForDay,
  getSlotCapacity,
  DEFAULT_CLINIC_CONFIG,
  ClinicConfig,
  isSlotInPast,
  WeekdayKey
} from "@/lib/db";
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, FileText, Loader2, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";

// Get today's date formatted as YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get max date string (10 days from today, i.e. today + 9 days)
function getMaxDateString() {
  const today = new Date();
  today.setDate(today.getDate() + 9);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BookingFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedService = searchParams ? searchParams.get("service") || "" : "";
  const preselectedTherapist = searchParams ? searchParams.get("therapist") || "" : "";

  // Settings config state
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);

  // Form State
  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    serviceId: preselectedService || "General Physiotherapy Consultation",
    date: getTodayDateString(),
    slot: "",
    notes: preselectedTherapist ? `Requested Specialist: ${preselectedTherapist}` : "",
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dialCode, setDialCode] = useState("+91");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Firestore availability state for selected date
  const [approvedSlotCounts, setApprovedSlotCounts] = useState<Record<string, number>>({});
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [blockedType, setBlockedType] = useState<"none" | "full" | "morning" | "evening">("none");

  const servicesList = [
    "General Physiotherapy Consultation",
    "Gait & Biomechanical Analysis",
    "Sports Injury Rehabilitation",
    "Spine & Musculoskeletal Care",
    "Post-Operative Orthopedic Care",
    "Dry Needling & Myofascial Release",
    "Custom Insoles & Orthotics Fitment",
  ];

  // Load clinic config
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

  // Generate slots dynamically based on active shift boundaries, respecting individual day open/close hours from daySchedules
  const allSlots = generateSlotsForDay(clinicConfig, formData.date || undefined);

  // Check if a time slot is a morning slot
  const isMorningSlot = (time: string) => {
    const [hourStr, minAndMod] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const isPM = minAndMod.includes("PM");
    return !isPM || hour === 12; // Morning is AM or 12 PM
  };

  // Fetch slot availability when date changes
  useEffect(() => {
    if (!formData.date || loadingConfig) return;

    async function checkAvailability() {
      setLoadingSlots(true);
      setErrorMessage("");
      setApprovedSlotCounts({});
      setBlockedSlots([]);
      setBlockedType("none");

      try {
        // 1. Fetch approved appointments for that date and count by slot
        const appointments = await getAppointmentsByDate(formData.date);
        const counts: Record<string, number> = {};
        appointments.forEach((app) => {
          if (app.status === "approved") {
            counts[app.slot] = (counts[app.slot] || 0) + 1;
          }
        });
        setApprovedSlotCounts(counts);

        // 2. Fetch active day/session blocks
        const blocks = await getBlocksByDate(formData.date);
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
        console.error(err);
        setErrorMessage("Could not load time slots. Please try refreshing.");
      } finally {
        setLoadingSlots(false);
      }
    }

    checkAvailability();
  }, [formData.date, loadingConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "date") {
        next.slot = "";
      }
      return next;
    });
    setErrorMessage("");
  };

  const handleSlotSelect = (selectedSlot: string) => {
    setFormData((prev) => ({ ...prev, slot: selectedSlot }));
    setErrorMessage("");
  };

  // Determine if selectedDate is a weekly holiday
  const checkIsWeeklyHoliday = () => {
    if (!formData.date || !clinicConfig) return false;
    
    // Parse date as local time (split hyphens to avoid timezone shifts)
    const [year, month, day] = formData.date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as keyof ClinicConfig["weeklyHolidays"];
    
    // Check daySchedules first (Single Source of Truth)
    if (clinicConfig.daySchedules && clinicConfig.daySchedules[dayName as WeekdayKey]) {
      return !clinicConfig.daySchedules[dayName as WeekdayKey].isOpen;
    }
    return clinicConfig.weeklyHolidays?.[dayName] === true;
  };

  const isWeeklyHoliday = checkIsWeeklyHoliday();

  const validateForm = () => {
    if (!formData.patientName.trim()) {
      setErrorMessage("Please enter your full name.");
      return false;
    }
    if (!formData.patientPhone.trim() || formData.patientPhone.length < 10) {
      setErrorMessage("Please enter a valid mobile number (10 digits minimum).");
      return false;
    }
    if (!formData.date) {
      setErrorMessage("Please select a preferred date.");
      return false;
    }
    if (isWeeklyHoliday) {
      setErrorMessage("The clinic is closed on weekly holidays.");
      return false;
    }
    if (!formData.slot) {
      setErrorMessage("Please select an available time slot.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      const result = await submitBookingRequest({
        patientName: formData.patientName,
        patientEmail: formData.patientEmail,
        patientPhone: `${dialCode} ${formData.patientPhone.trim()}`,
        serviceId: formData.serviceId,
        date: formData.date,
        slot: formData.slot,
        notes: formData.notes,
      });

      if (result.success) {
        const searchParams = new URLSearchParams({
          name: formData.patientName,
          date: formData.date,
          slot: formData.slot,
          service: formData.serviceId,
        });
        router.push(`/book/success?${searchParams.toString()}`);
      } else {
        setErrorMessage(result.error || "Submission failed. Please check slot availability.");
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to calculate remaining slot capacity
  const getRemainingCapacity = (time: string) => {
    if (isWeeklyHoliday) return 0;
    if (blockedType === "full") return 0;
    if (blockedType === "morning" && isMorningSlot(time)) return 0;
    if (blockedType === "evening" && !isMorningSlot(time)) return 0;
    if (blockedSlots.includes(time)) return 0;
    if (isSlotInPast(time, formData.date, {
      cutoffMinutes: clinicConfig.publicBookingCutoffMinutes ?? 0,
      slotDuration: clinicConfig.slotDuration || 30,
    })) return 0;

    const maxCapacity = getSlotCapacity(clinicConfig, time);
    const booked = approvedSlotCounts[time] || 0;
    return Math.max(0, maxCapacity - booked);
  };

  // Helper to check if a slot is disabled (0 slots left or blocked)
  const isSlotDisabled = (time: string) => {
    return getRemainingCapacity(time) <= 0;
  };

  if (loadingConfig) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg dark:bg-slate-900 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green mr-2" />
        <span className="text-sm font-semibold">Loading scheduling layout...</span>
      </div>
    );
  }

  if (clinicConfig.enablePublicBooking === false) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-brand-bg dark:bg-slate-900">
        <PageHeader
          title="Direct Consultation Booking"
          description="We are currently scheduling all patient consultations directly through our clinic reception."
        />
        <div className="flex-grow flex items-center justify-center p-6 my-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl space-y-6 animate-fade-in-up">
            <div className="h-16 w-16 bg-brand-green/10 dark:bg-brand-green/20 text-brand-green rounded-full flex items-center justify-center mx-auto ring-8 ring-brand-green/10 dark:ring-brand-green/15">
              <Phone className="h-8 w-8 text-brand-green" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-brand-charcoal dark:text-white">
                Personalized Clinical Consultation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                To guarantee you receive customized care suited to your symptoms, our therapists schedule sessions directly with you.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to schedule a physiotherapy appointment.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white py-4 px-4 text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp Us
              </a>
              <a
                href={`tel:${clinicConfig.phone || "+918904456243"}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 py-3.5 px-4 text-xs font-black transition-all active:scale-95 cursor-pointer"
              >
                <Phone className="h-4 w-4 text-brand-green" />
                Call Reception ({clinicConfig.phone || "+91 89044 56243"})
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen">
      <PageHeader
        title="Schedule an Appointment"
        description="Book your physical therapy session or gait analysis. View real-time availability on the right and fill in your details to reserve your slot."
      />

      <section className="py-16 bg-brand-bg dark:bg-slate-900 flex-grow">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          
          {/* Error Message banner */}
          {errorMessage && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 text-xs font-black rounded-2xl animate-shake max-w-md mx-auto text-center shadow-sm">
              {errorMessage}
            </div>
          )}
          {/* Preselected Specialist Banner */}
          {preselectedTherapist && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 dark:text-slate-300">
                  Booking priority consultation with:{" "}
                  <strong className="text-brand-charcoal dark:text-white font-black">{preselectedTherapist}</strong>
                </span>
              </div>
              <Link
                href="/book"
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Clear
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
            
            {/* Left Card: Personal Details */}
            <div className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950/40 p-6 sm:p-8 shadow-[0_6px_25px_-6px_var(--brand-shadow)] space-y-5">
              <h3 className="text-lg font-black text-brand-charcoal dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-black">1</span>
                Patient Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      required
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    WhatsApp/Mobile Number *
                  </label>
                  <div className="flex items-center relative">
                    {/* Country Code Selector (Combo Box) */}
                    <input
                      type="text"
                      list="dial-codes"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      placeholder="+91"
                      className="w-24 rounded-l-2xl border border-r-0 border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-3 text-xs font-bold outline-none focus:border-brand-green text-center text-slate-700 dark:text-white"
                    />
                    <datalist id="dial-codes">
                      <option value="+91">India (+91)</option>
                      <option value="+1">US/Canada (+1)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+61">Australia (+61)</option>
                      <option value="+971">UAE (+971)</option>
                      <option value="+65">Singapore (+65)</option>
                      <option value="+966">Saudi Arabia (+966)</option>
                      <option value="+60">Malaysia (+60)</option>
                      <option value="+64">New Zealand (+64)</option>
                      <option value="+49">Germany (+49)</option>
                      <option value="+33">France (+33)</option>
                      <option value="+353">Ireland (+353)</option>
                      <option value="+27">South Africa (+27)</option>
                      <option value="+94">Sri Lanka (+94)</option>
                      <option value="+977">Nepal (+977)</option>
                      <option value="+880">Bangladesh (+880)</option>
                      <option value="+968">Oman (+968)</option>
                      <option value="+974">Qatar (+974)</option>
                      <option value="+965">Kuwait (+965)</option>
                      <option value="+973">Bahrain (+973)</option>
                    </datalist>
                    {/* Phone Digit Input */}
                    <input
                      type="tel"
                      name="patientPhone"
                      value={formData.patientPhone}
                      onChange={handleInputChange}
                      placeholder="92066 51295"
                      required
                      className="flex-grow rounded-r-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <input
                      type="email"
                      name="patientEmail"
                      value={formData.patientEmail}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Select Physiotherapy Service *
                  </label>
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-3 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-bold"
                  >
                    {servicesList.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Any Notes or Symptoms (Optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Describe any pain or symptoms you are experiencing..."
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Date & Slot Selection */}
            <div className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-950/40 p-6 sm:p-8 shadow-[0_6px_25px_-6px_var(--brand-shadow)] space-y-6 relative overflow-hidden">
              <h3 className="text-lg font-black text-brand-charcoal dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-brand-green text-white flex items-center justify-center text-xs font-black">2</span>
                Choose Date & Time Slot
              </h3>

              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Select Appointment Date (10-Day Booking Limit) *
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <input
                      type="date"
                      name="date"
                      min={getTodayDateString()}
                      max={getMaxDateString()}
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="relative min-h-[220px]">
                  {/* Slots Selection Grid wrapper (with conditional holiday blur) */}
                  <div className={`space-y-3 transition-all duration-300 ${
                    isWeeklyHoliday ? "blur-sm opacity-20 pointer-events-none" : ""
                  }`}>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                      Available Time Slots
                    </label>
                    
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-slate-500 text-xs font-semibold">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
                        <span>Checking slot availability...</span>
                      </div>
                    ) : blockedType === "full" ? (
                      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl text-center text-xs font-semibold text-slate-450 border border-slate-200/80">
                        The clinic is closed on this date (Holiday/Admin block). Please select another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {allSlots.map((time) => {
                          const remaining = getRemainingCapacity(time);
                          const disabled = remaining <= 0;
                          const isSelected = formData.slot === time;
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={disabled}
                              onClick={() => handleSlotSelect(time)}
                              className={`py-2.5 px-2 text-xs font-extrabold rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                                disabled
                                  ? "bg-slate-100 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60"
                                  : isSelected
                                  ? "bg-brand-green border-brand-green text-white shadow-md shadow-brand-green/20 scale-[1.02]"
                                  : "bg-brand-sand/70 dark:bg-teal-950/30 border-brand-green/25 dark:border-teal-800/50 text-brand-green dark:text-teal-300 hover:bg-brand-green/15 dark:hover:bg-teal-900/30"
                              }`}
                            >
                              <span className="leading-tight">{time}</span>
                              {!disabled && (
                                <span className={`text-[9px] font-bold tracking-tight ${isSelected ? "text-white/90" : "text-brand-green dark:text-teal-400 opacity-90"}`}>
                                  {remaining} {remaining === 1 ? "slot" : "slots"} left
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Holiday Banner Card overlay (when weekly closed days are selected) */}
                  {isWeeklyHoliday && (
                    <div className="absolute inset-0 flex items-center justify-center p-4 animate-fade-in-up">
                      <div className="border border-red-500/20 dark:border-red-900/50 p-6 rounded-3xl shadow-xl text-center space-y-3 max-w-sm w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95">
                        <div className="h-10 w-10 rounded-full bg-red-50 dark:bg-red-950/80 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <h4 className="font-black text-brand-charcoal dark:text-white text-base">Clinic is Closed</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">
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

                {/* Submit Action Block */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !formData.slot || isWeeklyHoliday}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-10 py-4 text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Booking Request
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>

          </form>
        </div>
      </section>
    </div>
  );
}

export default function Book() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 bg-brand-bg dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-2" />
        <span className="text-sm font-semibold">Loading booking engine...</span>
      </div>
    }>
      <BookingFormContent />
    </Suspense>
  );
}
