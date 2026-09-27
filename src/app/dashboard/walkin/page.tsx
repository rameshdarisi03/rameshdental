"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import {
  getAppointmentsByDate,
  getBlocksByDate,
  getClinicConfig,
  generateSlotsFromHours,
  generateSlotsForDay,
  getSlotCapacity,
  DEFAULT_CLINIC_CONFIG,
  ClinicConfig,
  isSlotInPast,
  Appointment
} from "@/lib/db";
import {
  getPatients,
  createPatient,
  updatePatient,
  checkDuplicatePatient,
  DuplicateCheckResult,
  Patient,
  FAMILY_RELATIONSHIPS,
  FamilyRelationship
} from "@/lib/patientsDb";
import { 
  sanitizePhone, 
  sanitizeName, 
  sanitizeText, 
  sanitizeEmail, 
  isValidIndianPhone, 
  isValidEmail 
} from "@/lib/sanitizer";
import Link from "next/link";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Loader2, 
  Check, 
  Bookmark, 
  ArrowRight,
  ShieldCheck,
  Search,
  UserCheck,
  AlertCircle,
  Users,
  MapPin
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

function WalkInBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdQuery = searchParams.get("patientId");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Settings config state
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    patientAddress: "",
    serviceId: "General Physiotherapy Consultation",
    date: getTodayDateString(),
    slot: "",
    assignedTherapist: "",
    notes: "",
  });

  const [dialCode, setDialCode] = useState("+91");
  const [manualNotifyWhatsApp, setManualNotifyWhatsApp] = useState(true);

  // Patient lookup state & Advanced Search
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientType, setPatientType] = useState<"new" | "existing">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch current user from local storage
  useEffect(() => {
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

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

  // Fetch patients list for existing lookup with multi-tier fallback
  const loadPatients = async () => {
    setLoadingPatients(true);
    try {
      const fetched = await getPatients();
      setPatients(fetched);
    } catch (err) {
      console.error("Failed to load patients list: ", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter patients by Name, ID, Phone, Email, or Treatment Plan
  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    const queryDigits = query.replace(/\D/g, "");

    return patients.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const id = (p.id || "").toLowerCase();
      const customId = (p.customId || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      const phone = (p.phone || "");
      const phoneDigits = phone.replace(/\D/g, "");
      const plan = (p.treatmentPlan || "").toLowerCase();

      // 1. Name match (case-insensitive substring)
      if (name.includes(query)) return true;

      // 2. Patient ID match (e.g. "GPC-26464" or "26464")
      if (id.includes(query) || customId.includes(query)) return true;

      // 3. Email match
      if (email.includes(query)) return true;

      // 4. Treatment plan match
      if (plan.includes(query)) return true;

      // 5. Phone match (both raw string and digits-only comparison)
      if (phone.toLowerCase().includes(query)) return true;
      if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) return true;

      return false;
    });
  }, [patients, searchQuery]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setSearchQuery(p.name);
    setShowDropdown(false);

    let rawPhone = (p.phone || "").trim();
    let parsedDial = "+91";

    // Cleanly parse phone number without duplicate country codes
    const digitsOnly = rawPhone.replace(/\D/g, "");
    if (rawPhone.startsWith("+")) {
      const dialMatch = rawPhone.match(/^(\+\d{1,3})/);
      if (dialMatch) {
        parsedDial = dialMatch[1];
      }
      if (digitsOnly.length >= 10) {
        rawPhone = digitsOnly.slice(-10);
      }
    } else if (digitsOnly.length === 10) {
      rawPhone = digitsOnly;
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith("91")) {
      parsedDial = "+91";
      rawPhone = digitsOnly.slice(-10);
    }

    setDialCode(parsedDial);
    setFormData((prev) => ({
      ...prev,
      patientName: p.name,
      patientPhone: rawPhone,
      patientEmail: p.email || "",
      patientAddress: p.address || "",
      serviceId: p.treatmentPlan || prev.serviceId,
      assignedTherapist: p.therapistName || prev.assignedTherapist,
    }));
  };

  // Pre-populate patient details if patientId query param is provided
  useEffect(() => {
    if (patientIdQuery && patients.length > 0) {
      const match = patients.find(p => p.id === patientIdQuery);
      if (match) {
        setPatientType("existing");
        handleSelectPatient(match);
      }
    }
  }, [patients, patientIdQuery]);

  // Generate slots dynamically based on active shift boundaries, respecting individual day open/close hours from daySchedules
  const allSlots = generateSlotsForDay(clinicConfig, formData.date || undefined);

  // Check if a time slot is a morning slot
  const isMorningSlot = (time: string) => {
    const [hourStr, minAndMod] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const isPM = minAndMod.includes("PM");
    return !isPM || hour === 12;
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

  // Helper to calculate remaining slot capacity
  const getRemainingCapacity = (time: string) => {
    if (blockedType === "full") return 0;
    if (blockedType === "morning" && isMorningSlot(time)) return 0;
    if (blockedType === "evening" && !isMorningSlot(time)) return 0;
    if (blockedSlots.includes(time)) return 0;
    if (isSlotInPast(time, formData.date, {
      isAdmin: true,
      graceType: clinicConfig.adminWalkInGraceType || "end_of_slot",
      slotDuration: clinicConfig.slotDuration || 30
    })) return 0;

    const maxCapacity = getSlotCapacity(clinicConfig, time);
    const booked = approvedSlotCounts[time] || 0;
    return Math.max(0, maxCapacity - booked);
  };

  // Helper to check if a slot is disabled (0 slots left or blocked)
  const isSlotDisabled = (time: string) => {
    return getRemainingCapacity(time) <= 0;
  };

  // Real-time duplicate & family circle state
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [isFamilyMemberRegistration, setIsFamilyMemberRegistration] = useState(false);
  const [familyRelationship, setFamilyRelationship] = useState<FamilyRelationship>("Spouse");
  const [linkedFamilyHead, setLinkedFamilyHead] = useState<Patient | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };

      if (patientType === "new" && (name === "patientPhone" || name === "patientName" || name === "patientEmail")) {
        const cleanPhone = sanitizePhone(name === "patientPhone" ? value : prev.patientPhone);
        const cleanName = sanitizeName(name === "patientName" ? value : prev.patientName);
        const cleanEmail = sanitizeEmail(name === "patientEmail" ? value : prev.patientEmail);

        if (cleanPhone.length >= 10 || cleanName.length >= 3 || cleanEmail.includes("@")) {
          checkDuplicatePatient(cleanPhone, cleanName, cleanEmail).then((res) => {
            if (res.isDuplicate || res.matchType === "family_member") {
              setDuplicateInfo(res);
              if (res.matchType === "family_member" && res.existingPatient) {
                setLinkedFamilyHead(res.existingPatient);
              }
            } else {
              setDuplicateInfo(null);
              setIsFamilyMemberRegistration(false);
              setLinkedFamilyHead(null);
            }
          });
        } else {
          setDuplicateInfo(null);
        }
      }
      return next;
    });
  };

  const handleSelectDuplicatePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientType("existing");
    setDuplicateInfo(null);
    setIsFamilyMemberRegistration(false);
    setLinkedFamilyHead(null);
    setFormData((prev) => ({
      ...prev,
      patientName: patient.name,
      patientPhone: patient.phone.replace(/^\+91\s*/, ""),
      patientEmail: patient.email || "",
      patientAddress: patient.address || "",
      assignedTherapist: patient.therapistName || prev.assignedTherapist,
    }));
  };

  const handleSlotSelect = (time: string) => {
    setFormData((prev) => ({ ...prev, slot: time }));
  };

  // Google Calendar Link generator helper
  const generateGoogleCalendarUrl = (app: { date: string; slot: string; serviceId: string }) => {
    try {
      const cleanDate = app.date.replace(/-/g, "");
      const timeMatch = app.slot.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!timeMatch) return "";
      
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2];
      const ampm = timeMatch[3].toUpperCase();
      
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      
      const pad = (num: number) => String(num).padStart(2, "0");
      const startHour = pad(hours);
      const startTimeStr = `${cleanDate}T${startHour}${minutes}00`;
      
      let endHours = hours;
      let endMinutes = parseInt(minutes, 10) + 45;
      if (endMinutes >= 60) {
        endHours += 1;
        endMinutes -= 60;
      }
      if (endHours >= 24) {
        endHours = 23;
        endMinutes = 59;
      }
      
      const endTimeStr = `${cleanDate}T${pad(endHours)}${pad(endMinutes)}00`;
      const title = encodeURIComponent(`Session at Gait Physio Clinic`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeStr}/${endTimeStr}`;
    } catch (err) {
      console.error(err);
      return "";
    }
  };

  // Trigger manual WhatsApp alert redirect
  const triggerWhatsAppRedirect = (app: { patientName: string; patientPhone: string; serviceId: string; date: string; slot: string }) => {
    let cleanPhone = app.patientPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.replace(/^0+/, "");
    }
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      cleanPhone = "918904456243";
    }

    const calendarUrl = generateGoogleCalendarUrl(app);
    const calendarMsg = calendarUrl ? `\n\nAdd to Google Calendar: ${calendarUrl}` : "";
    const message = `Hi ${app.patientName}, your appointment request for *${app.serviceId}* on *${app.date}* at *${app.slot}* at Gait Physio Clinic is APPROVED!${calendarMsg}\n\nLooking forward to seeing you.`;
    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(waUrl, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientType === "existing" && !selectedPatient) {
      setErrorMessage("Please search and select an existing patient first.");
      return;
    }

    if (!formData.slot) {
      setErrorMessage("Please select a time slot before confirming.");
      return;
    }

    const cleanName = sanitizeName(formData.patientName);
    const cleanPhone = sanitizePhone(formData.patientPhone);
    const cleanEmail = sanitizeEmail(formData.patientEmail);
    const cleanNotes = sanitizeText(formData.notes, 2000);

    if (!cleanName || cleanName.length < 2) {
      setErrorMessage("Please enter a valid patient name.");
      return;
    }

    if (dialCode === "+91" && !isValidIndianPhone(cleanPhone)) {
      setErrorMessage("Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).");
      return;
    }

    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const fullPhone = dialCode + cleanPhone;
      
      const newBooking: any = {
        patientName: cleanName,
        patientPhone: fullPhone,
        patientEmail: cleanEmail || "",
        patientAddress: formData.patientAddress ? formData.patientAddress.trim() : "",
        serviceId: formData.serviceId,
        date: formData.date,
        slot: formData.slot,
        notes: cleanNotes || "",
        status: "approved" as const,
        type: "manual" as const,
        createdAt: Timestamp.now(),
        createdByUid: currentUser?.uid || "system",
        createdByName: currentUser?.name || "Clinic Staff",
        createdByRole: currentUser?.role || "receptionist",
        actionedByUid: currentUser?.uid || "system",
        actionedByName: currentUser?.name || "Clinic Staff",
        actionedByRole: currentUser?.role || "receptionist",
        actionedAt: Timestamp.now(),
      };

      if (formData.assignedTherapist && formData.assignedTherapist.trim()) {
        newBooking.assignedTherapist = formData.assignedTherapist.trim();
      }

      await addDoc(collection(db, "appointments"), newBooking);

      setSuccessBooking({
        patientName: formData.patientName,
        patientPhone: fullPhone,
        serviceId: formData.serviceId,
        date: formData.date,
        slot: formData.slot,
      });

      // Trigger Walk-in Booking Confirmation Email
      if (formData.patientEmail) {
        const calUrl = generateGoogleCalendarUrl({
          date: formData.date,
          slot: formData.slot,
          serviceId: formData.serviceId,
        });
        fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "WALKIN_CONFIRMED",
            payload: {
              patientName: formData.patientName,
              patientEmail: formData.patientEmail,
              serviceId: formData.serviceId,
              date: formData.date,
              slot: formData.slot,
              assignedTherapist: formData.assignedTherapist || "Clinical Team",
              googleCalendarUrl: calUrl,
            },
          }),
        }).catch((err) => console.warn("[Email Engine] Failed to dispatch walk-in email:", err));
      }

      // Directly trigger WhatsApp alert if checked
      if (manualNotifyWhatsApp) {
        triggerWhatsAppRedirect({
          patientName: formData.patientName,
          patientPhone: fullPhone,
          serviceId: formData.serviceId,
          date: formData.date,
          slot: formData.slot,
        });
      }

      const bookingDate = formData.date;
      const bookingService = formData.serviceId;
      const patientName = formData.patientName;
      const patientEmail = formData.patientEmail;
      const patientAddress = formData.patientAddress ? formData.patientAddress.trim() : "";

      // Reset Form State
      setFormData({
        patientName: "",
        patientEmail: "",
        patientPhone: "",
        patientAddress: "",
        serviceId: "General Physiotherapy Consultation",
        date: getTodayDateString(),
        slot: "",
        assignedTherapist: "",
        notes: "",
      });

      // Date comparison logic
      const todayStr = getTodayDateString(); // YYYY-MM-DD
      const isFuture = bookingDate > todayStr;
      
      const formatToDDMMYYYY = (d: string) => {
        const parts = d.split("-");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return d;
      };
      
      const formattedBookingDate = formatToDDMMYYYY(bookingDate);

      // Automate Patient Profile Integration
      if (patientType === "new") {
        try {
          const newPatientPayload: any = {
            name: patientName,
            email: patientEmail,
            phone: fullPhone,
            address: patientAddress,
            treatmentPlan: bookingService,
            status: "active",
            lastVisit: isFuture ? "N/A" : formattedBookingDate,
            upcoming: isFuture ? formattedBookingDate : "Pending Schedule"
          };

          if (isFamilyMemberRegistration && linkedFamilyHead) {
            newPatientPayload.relationship = familyRelationship;
            newPatientPayload.primaryPatientId = linkedFamilyHead.id;
            newPatientPayload.familyHeadName = linkedFamilyHead.name;
            newPatientPayload.familyGroupId = linkedFamilyHead.familyGroupId || `FAM-${linkedFamilyHead.id}`;
            const linkedEmailsSet = new Set<string>();
            if (linkedFamilyHead.email) linkedEmailsSet.add(linkedFamilyHead.email.toLowerCase().trim());
            (linkedFamilyHead.linkedEmails || []).forEach(e => linkedEmailsSet.add(e.toLowerCase().trim()));
            if (patientEmail) linkedEmailsSet.add(patientEmail.toLowerCase().trim());
            newPatientPayload.linkedEmails = Array.from(linkedEmailsSet);
          }

          await createPatient(newPatientPayload);
        } catch (patientErr) {
          console.error("Failed to register new patient profile: ", patientErr);
        }
      } else if (selectedPatient && selectedPatient.id) {
        try {
          const updateData: any = {
            status: "active",
            treatmentPlan: bookingService
          };
          if (patientAddress) {
            updateData.address = patientAddress;
          }
          if (isFuture) {
            updateData.upcoming = formattedBookingDate;
          } else {
            updateData.lastVisit = formattedBookingDate;
            updateData.upcoming = "Pending Schedule";
          }
          await updatePatient(selectedPatient.id, updateData);
        } catch (patientErr) {
          console.error("Failed to update existing patient: ", patientErr);
        }
      }

      // Reload patients list to reflect any new additions
      try {
        const fetched = await getPatients();
        setPatients(fetched);
      } catch (err) {
        console.error(err);
      }

      setSelectedPatient(null);
      setSearchQuery("");
      setPatientType("new");
      setIsFamilyMemberRegistration(false);
      setLinkedFamilyHead(null);
      setFamilyRelationship("Spouse");
      setDuplicateInfo(null);

    } catch (err: any) {
      console.error("Booking error: ", err);
      setErrorMessage(err?.message || "Failed to save booking. Please check your database connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500 text-sm font-semibold">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green mr-2" />
        <span>Syncing clinic shift settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header and Bookmark Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal dark:text-white flex items-center gap-2">
            Walk-in & Call Booking
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Dedicated portal for booking call-ins and walk-ins using the full-screen interactive grid layout.
          </p>
        </div>
        <div className="flex gap-2 bg-brand-sand/60 dark:bg-brand-green/10 border border-brand-green/20 px-4 py-2.5 rounded-xl text-brand-green text-xs font-black shrink-0 items-center">
          <Bookmark className="h-4.5 w-4.5 shrink-0" />
          <span>Bookmark this page (Ctrl+D) for fast phone access</span>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successBooking && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-800 dark:text-emerald-400 text-xs font-black shadow-sm flex items-center gap-3 animate-fade-in">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Successfully booked <strong>{successBooking.patientName}</strong> for <strong>{successBooking.serviceId}</strong> on <strong>{successBooking.date}</strong> at <strong>{successBooking.slot}</strong>!
          </span>
          <button 
            onClick={() => setSuccessBooking(null)}
            className="ml-auto underline hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Message banner */}
      {errorMessage && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs font-black rounded-2xl animate-shake shadow-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        {/* Left Column: Form Details */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-black text-brand-charcoal dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-brand-green text-white flex items-center justify-center text-[10px] font-black">1</span>
            Patient Credentials
          </h3>

          {/* Patient Type Selectors */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-850 select-none">
            <button
              type="button"
              onClick={() => {
                setPatientType("new");
                setSelectedPatient(null);
                setSearchQuery("");
                setFormData(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "", patientAddress: "" }));
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition-all ${
                patientType === "new"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              New Patient
            </button>
            <button
              type="button"
              onClick={() => {
                setPatientType("existing");
                setSelectedPatient(null);
                setSearchQuery("");
                setFormData(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "", patientAddress: "" }));
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-black transition-all ${
                patientType === "existing"
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              Existing Patient
            </button>
          </div>

          <div className="space-y-4">
            
            {patientType === "existing" ? (
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Search Patient Profile (Name or Phone) *
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Type patient name or mobile number..."
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Autocomplete dropdown list */}
                {showDropdown && searchQuery.trim().length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute z-20 w-full mt-1.5 max-h-52 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl py-1.5"
                  >
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPatient(p)}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-brand-sand/40 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                          <div className="font-black text-brand-charcoal dark:text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{p.phone} • Plan: {p.treatmentPlan}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                        No matching patient records found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Patient Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Read-Only/Editable Fields depending on Selection */}
            {patientType === "new" ? (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Mobile / WhatsApp Number *
                  </label>
                  <div className="flex items-center relative">
                    <input
                      type="text"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      placeholder="+91"
                      className="w-24 rounded-l-2xl border border-r-0 border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-3.5 text-xs font-bold outline-none focus:border-brand-green text-center text-slate-700 dark:text-slate-355"
                    />
                    <input
                      type="tel"
                      name="patientPhone"
                      value={formData.patientPhone}
                      onChange={handleInputChange}
                      placeholder="9206651295"
                      required
                      className="flex-grow rounded-r-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 px-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
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
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Residential Address / Locality</span>
                    <span className="text-[9px] font-semibold text-slate-400 lowercase">(Optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                    <input
                      type="text"
                      name="patientAddress"
                      value={formData.patientAddress}
                      onChange={handleInputChange}
                      placeholder="e.g. Flat 302, Green Meadows, Indiranagar"
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* 1. Exact Duplicate Warning Card */}
                {duplicateInfo?.isDuplicate && duplicateInfo.existingPatient && patientType === "new" && (
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl flex items-start gap-2.5 animate-slide-down">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs flex-1">
                      <p className="font-black text-amber-900 dark:text-amber-200">
                        ⚠️ Patient Already Exists in Database ({duplicateInfo.matchField === "email" ? "Matching Email" : "Matching Phone"})
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 font-semibold">
                        <strong>{duplicateInfo.existingPatient.name}</strong> (PID: <span className="font-mono font-black">{duplicateInfo.existingPatient.id}</span>)
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectDuplicatePatient(duplicateInfo.existingPatient!)}
                          className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>✓ Load & Select Existing Patient</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Shared Contact / Family Member Card */}
                {!duplicateInfo?.isDuplicate && duplicateInfo?.matchType === "family_member" && duplicateInfo.existingPatient && patientType === "new" && (
                  <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 animate-slide-down">
                    <Users className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-xs flex-1">
                      <div>
                        <p className="font-black text-blue-900 dark:text-blue-200">
                          ℹ️ Shared Contact: Linked to Existing Patient
                        </p>
                        <p className="text-blue-800 dark:text-blue-300 font-medium mt-0.5">
                          This {duplicateInfo.matchField === "email" ? "email address" : "phone number"} belongs to registered patient <strong>{duplicateInfo.existingPatient.name}</strong> (PID: <span className="font-mono font-bold">{duplicateInfo.existingPatient.id}</span>).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSelectDuplicatePatient(duplicateInfo.existingPatient!)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                          <span>This is {duplicateInfo.existingPatient.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsFamilyMemberRegistration(true);
                            setLinkedFamilyHead(duplicateInfo.existingPatient!);
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer ${
                            isFamilyMemberRegistration
                              ? "bg-blue-600 text-white"
                              : "bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
                          }`}
                        >
                          <span>{isFamilyMemberRegistration ? "✓ Registering as Family Member" : `+ Link as Family Member of ${duplicateInfo.existingPatient.name}`}</span>
                        </button>
                      </div>

                      {/* Relationship Dropdown */}
                      {isFamilyMemberRegistration && (
                        <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800/60 space-y-1.5 animate-in fade-in">
                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-200">
                            Relationship to {linkedFamilyHead?.name} *
                          </label>
                          <select
                            value={familyRelationship}
                            onChange={(e) => setFamilyRelationship(e.target.value as any)}
                            className="w-full rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                          >
                            {FAMILY_RELATIONSHIPS.filter(r => r !== "Self").map((rel) => (
                              <option key={rel} value={rel}>{rel}</option>
                            ))}
                          </select>
                          <p className="text-[10.5px] text-blue-700 dark:text-blue-300 leading-relaxed">
                            ✓ Creates an individual patient file for clinical care, and links them into a shared Family Circle in Patient Hub.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              selectedPatient ? (
                <div className="bg-brand-sand/50 dark:bg-brand-green/5 border border-brand-green/10 p-4.5 rounded-2xl space-y-3 animate-fade-in-up">
                  <div className="flex justify-between items-center text-[10px] font-black text-brand-green uppercase tracking-wider">
                    <span>Patient Profile Summary</span>
                    <Link 
                      href={`/dashboard/patients/${selectedPatient.id}`}
                      target="_blank"
                      className="underline hover:text-brand-green-hover"
                    >
                      Full Details →
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Patient ID:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-350">{selectedPatient.id}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Full Name:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-350">{selectedPatient.name}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Phone / Email:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-350 truncate">{dialCode} {formData.patientPhone}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Gender / Age:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-355">{selectedPatient.gender || "Not specified"} / {selectedPatient.age ? `${selectedPatient.age} yrs` : selectedPatient.dob || "N/A"}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Last Visited:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-355">{selectedPatient.lastVisit || "First session"}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Active Plan:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-355 truncate">{selectedPatient.treatmentPlan || "None"}</div>
                    
                    <div className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Address:</div>
                    <div className="font-extrabold text-slate-700 dark:text-slate-355 truncate">{selectedPatient.address || formData.patientAddress || "Not specified"}</div>
                  </div>

                  {/* Quick address updater for this walk-in */}
                  <div className="pt-2 border-t border-emerald-200/50 dark:border-teal-900/40">
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">
                      Update Address for this visit:
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-brand-green" />
                      <input
                        type="text"
                        name="patientAddress"
                        value={formData.patientAddress}
                        onChange={handleInputChange}
                        placeholder="House/Flat No, Area, Locality..."
                        className="w-full rounded-xl border border-emerald-200 dark:border-teal-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs font-semibold outline-none focus:border-brand-green text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSearchQuery("");
                      setFormData(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "", patientAddress: "" }));
                    }}
                    className="text-[10px] text-red-500 font-black underline hover:text-red-750 cursor-pointer block border-0 bg-transparent p-0 pt-1"
                  >
                    Change Patient Selection
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-400 font-semibold">
                    Search and select an existing patient above to proceed.
                  </p>
                </div>
              )
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                Select Service *
              </label>
              <select
                name="serviceId"
                value={formData.serviceId}
                onChange={handleInputChange}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-3.5 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-bold"
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
                Assign Therapist (Optional)
              </label>
              <div className="relative">
                <select
                  name="assignedTherapist"
                  value={formData.assignedTherapist}
                  onChange={handleInputChange}
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-3.5 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-bold"
                >
                  <option value="">Auto-Assign / Any Available</option>
                  {(clinicConfig.therapists || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                Symptoms / Notes (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe pain points or clinical request details..."
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Notification Checkbox */}
            <div className="flex items-center gap-2.5 pt-2 select-none border-t border-slate-100 dark:border-slate-800">
              <input
                type="checkbox"
                id="manualNotifyWhatsApp"
                checked={manualNotifyWhatsApp}
                onChange={(e) => setManualNotifyWhatsApp(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer"
              />
              <label htmlFor="manualNotifyWhatsApp" className="text-xs font-black text-brand-charcoal dark:text-white cursor-pointer">
                Notify patient via WhatsApp
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !formData.slot}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-4 text-sm font-black shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Confirm Offline Booking</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Right Column: Slot Selection Grid */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-black text-brand-charcoal dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-brand-green text-white flex items-center justify-center text-[10px] font-black">2</span>
            Select Date & Time Grid
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                Booking Date (10-Day Horizon) *
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
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-11 pr-4 py-3.5 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
                Time Slots Grid
              </label>
              
              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-500 text-xs font-semibold">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
                  <span>Checking database availability...</span>
                </div>
              ) : blockedType === "full" ? (
                <div className="p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl text-center text-xs font-semibold text-slate-400 border border-slate-200/40">
                  The clinic is marked closed on this date (Holiday/Admin block).
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
                        className={`py-2.5 px-2 text-[11px] font-extrabold rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          disabled
                            ? "bg-slate-100 dark:bg-slate-950 border-slate-200/50 dark:border-slate-850 text-slate-400 cursor-not-allowed opacity-50"
                            : isSelected
                            ? "bg-brand-green border-brand-green text-white shadow-md shadow-brand-green/20 scale-[1.02]"
                            : "bg-brand-sand/70 dark:bg-brand-green/10 border-brand-green/20 text-brand-green hover:bg-brand-green/15"
                        }`}
                      >
                        <span className="leading-tight">{time}</span>
                        {!disabled && (
                          <span className={`text-[8px] font-bold tracking-tight ${isSelected ? "text-emerald-100" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {remaining} {remaining === 1 ? "slot" : "slots"} left
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WalkInBookingPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-screen items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mb-2" />
        <span>Loading walk-in booking details...</span>
      </div>
    }>
      <WalkInBookingContent />
    </Suspense>
  );
}
