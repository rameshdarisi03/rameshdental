"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Loader2, 
  FileText, 
  Calendar, 
  Clock, 
  UserPlus, 
  Folder,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Trash2,
  Users,
  MapPin,
  X,
  RotateCcw,
  Send
} from "lucide-react";
import { getPatients, createPatient, updatePatient, checkDuplicatePatient, DuplicateCheckResult, PatientDeleteOptions, FAMILY_RELATIONSHIPS, FamilyRelationship } from "@/lib/patientsDb";
import { getClinicConfig, ClinicConfig, generateSlotsFromHours, generateSlotsForDay, isSlotInPast, getRecentAppointments, Appointment } from "@/lib/db";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, doc, updateDoc } from "firebase/firestore";
import { sanitizePhone, sanitizeName, isValidIndianPhone, isValidEmail } from "@/lib/sanitizer";
import FastTrackPatientImportModal from "@/components/dashboard/FastTrackPatientImportModal";
import PatientDeleteModal from "@/components/dashboard/PatientDeleteModal";
import { getCleanWhatsAppNumber, sanitizePhoneInput } from "@/lib/phoneUtils";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  dob?: string;
  age?: string | number;
  gender?: string;
  treatmentPlan: string;
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string;
  therapistName?: string;
  joinedDate?: string;
  lastVisit?: string;
  upcoming?: string;
  activated?: boolean;
  activationCode?: string;
  familyGroupId?: string;
  relationship?: string;
  isPrimaryAccount?: boolean;
  primaryPatientId?: string;
  familyHeadName?: string;
  linkedEmails?: string[];
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [daysSortOrder, setDaysSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [enrolledTherapists, setEnrolledTherapists] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Fast-Track Migration modal state
  const [fastTrackOpen, setFastTrackOpen] = useState(false);

  // Registration modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [dialCode, setDialCode] = useState("+91");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    gender: "Male",
    treatmentPlan: "",
    therapistName: "Dr.Kinnera",
    status: "active" as "active" | "completed" | "pending",
    joinedDate: getTodayDateString(),
    upcoming: "",
  });

  // Walk-in slot blocking toggle state
  const [isWalkInSession, setIsWalkInSession] = useState(false);
  const [walkInSlot, setWalkInSlot] = useState("");
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [todaySlots, setTodaySlots] = useState<string[]>([]);

  // Quick Booking Autofill state (Walk-ins & Online bookings)
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [selectedBookingSource, setSelectedBookingSource] = useState<Appointment | null>(null);
  const [showRecentBookingsList, setShowRecentBookingsList] = useState(false);

  // Action Menu dropdown state (stores patient ID of open menu)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPatientForDelete, setSelectedPatientForDelete] = useState<Patient | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const handleDeleteSuccess = (deletedOptions: PatientDeleteOptions) => {
    setToastMessage("Selected patient data purged successfully.");
    setTimeout(() => setToastMessage(""), 4000);
    fetchPatientsList();
  };

  // Initial Fetch of Patients & Keyboard Shortcut (Ctrl+K / ⌘K)
  useEffect(() => {
    setMounted(true);
    fetchPatientsList();
    fetchEnrolledTherapists();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in another input or textarea or modal is open
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && target !== searchInputRef.current))) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "/" && target?.tagName !== "INPUT" && target?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function fetchEnrolledTherapists() {
    try {
      const config = await getClinicConfig();
      if (config) {
        setClinicConfig(config);
        if (config.therapists && config.therapists.length > 0) {
          setEnrolledTherapists(config.therapists);
          // Default patient assigned therapist to the first one in the list
          setFormData((prev) => ({
            ...prev,
            therapistName: config.therapists[0]
          }));
        }
        const slots = generateSlotsForDay(config, undefined);
        setTodaySlots(slots);
      } else {
        setEnrolledTherapists(["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]);
      }
    } catch (err) {
      console.error("Error loading enrolled therapists: ", err);
      setEnrolledTherapists(["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]);
    }
  };

  // Helper to parse dates like "DD-MM-YYYY" or "YYYY-MM-DD" or "Month DD, YYYY"
  function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (clean.toLowerCase().includes("pending") || clean.toLowerCase().includes("unscheduled") || clean === "—" || clean === "") {
      return null;
    }
    
    // Try standard JS Date parsing
    let parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed;
    
    // Try DD-MM-YYYY format
    const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
      const year = parseInt(dmyMatch[3], 10);
      parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    
    return null;
  }

  function getDaysLeft(dateStr?: string): number | null {
    const parsed = parseDate(dateStr);
    if (!parsed) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    
    const diffTime = parsed.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Filter & Sort Patients Locally
  useEffect(() => {
    const search = searchQuery.toLowerCase().trim();
    let result = patients.filter((patient) => {
      // 1. Search Query filter (matches name, ID, phone, email)
      const matchesSearch = 
        search === "" ||
        patient.name.toLowerCase().includes(search) ||
        patient.id?.toLowerCase().includes(search) ||
        patient.phone.includes(search) ||
        patient.email.toLowerCase().includes(search);

      // 2. Status filter
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;

      // 3. Therapist filter
      const matchesTherapist = 
        therapistFilter === "all" || 
        patient.therapistName === therapistFilter;

      return matchesSearch && matchesStatus && matchesTherapist;
    });

    // Sort by Days Left if order is set
    if (daysSortOrder !== "none") {
      result = [...result].sort((a, b) => {
        const daysA = getDaysLeft(a.upcoming);
        const daysB = getDaysLeft(b.upcoming);
        
        if (daysA === null && daysB === null) return 0;
        if (daysA === null) return 1; // Unscheduled goes to bottom
        if (daysB === null) return -1;
        
        // Past slots go below future slots
        if (daysA < 0 && daysB >= 0) return 1;
        if (daysB < 0 && daysA >= 0) return -1;
        
        if (daysSortOrder === "asc") {
          return daysA - daysB;
        } else {
          return daysB - daysA;
        }
      });
    }

    setFilteredPatients(result);
  }, [patients, searchQuery, statusFilter, therapistFilter, daysSortOrder]);

  const fetchPatientsList = async () => {
    setLoading(true);
    setError("");
    try {
      // Direct call to Client Firestore
      const list = await getPatients();
      setPatients(list as Patient[]);
    } catch (err: any) {
      console.error("Error fetching patients list:", err);
      setError("Failed to load patient records from database.");
    } finally {
      setLoading(false);
    }
  };

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [isFamilyMemberRegistration, setIsFamilyMemberRegistration] = useState(false);
  const [familyRelationship, setFamilyRelationship] = useState<FamilyRelationship>("Spouse");
  const [linkedFamilyHead, setLinkedFamilyHead] = useState<any | null>(null);

  // Load recent appointments for quick autofill
  const loadRecentAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const list = await getRecentAppointments(60);
      setRecentAppointments(list);
    } catch (err) {
      console.error("Failed to load recent appointments for autofill:", err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (modalOpen) {
      loadRecentAppointments();
      setAppointmentSearch("");
      setShowRecentBookingsList(false);
    } else {
      setSelectedBookingSource(null);
      setAppointmentSearch("");
      setShowRecentBookingsList(false);
    }
  }, [modalOpen]);

  // Helper to determine if an appointment is already registered
  const isAppointmentRegistered = (app: Appointment) => {
    const appPhoneDigits = (app.patientPhone || "").replace(/\D/g, "");
    const appName = (app.patientName || "").trim().toLowerCase();
    return patients.some((p) => {
      const pPhoneDigits = (p.phone || "").replace(/\D/g, "");
      const pName = (p.name || "").trim().toLowerCase();
      const phoneMatch = appPhoneDigits.length >= 10 && pPhoneDigits.length >= 10 && appPhoneDigits.slice(-10) === pPhoneDigits.slice(-10);
      const nameMatch = appName.length >= 3 && appName === pName;
      return phoneMatch || nameMatch;
    });
  };

  // Filtered appointments based on search query or default unregistered list
  const filteredAppointments = recentAppointments.filter((app) => {
    const q = appointmentSearch.trim().toLowerCase();
    const isReg = isAppointmentRegistered(app);
    if (!q) {
      return !isReg;
    }
    const nameMatch = (app.patientName || "").toLowerCase().includes(q);
    const phoneMatch = (app.patientPhone || "").toLowerCase().includes(q);
    const emailMatch = (app.patientEmail || "").toLowerCase().includes(q);
    const serviceMatch = (app.serviceId || "").toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch || serviceMatch;
  });

  const handleSelectBooking = (app: Appointment) => {
    setSelectedBookingSource(app);

    // Extract dial code & phone digits
    let parsedDial = "+91";
    let parsedPhone = "";
    if (app.patientPhone) {
      const trimmed = app.patientPhone.trim();
      if (trimmed.startsWith("+")) {
        const parts = trimmed.split(" ");
        if (parts.length > 1) {
          parsedDial = parts[0];
          parsedPhone = sanitizePhoneInput(parts.slice(1).join(""), parsedDial);
        } else if (trimmed.startsWith("+91")) {
          parsedDial = "+91";
          parsedPhone = sanitizePhoneInput(trimmed.slice(3), "+91");
        } else {
          parsedDial = trimmed.slice(0, 3);
          parsedPhone = sanitizePhoneInput(trimmed.slice(3), parsedDial);
        }
      } else {
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length === 12 && digits.startsWith("91")) {
          parsedDial = "+91";
          parsedPhone = digits.slice(2);
        } else {
          parsedDial = "+91";
          parsedPhone = sanitizePhoneInput(digits, "+91");
        }
      }
    }

    setDialCode(parsedDial);

    setFormData((prev) => ({
      ...prev,
      name: app.patientName || prev.name,
      email: app.patientEmail || prev.email,
      phone: parsedPhone || prev.phone,
      address: app.patientAddress || prev.address,
      treatmentPlan: app.serviceId || prev.treatmentPlan,
      therapistName: app.assignedTherapist || prev.therapistName,
      upcoming: app.date ? `${app.date}${app.slot ? ` (${app.slot})` : ""}` : prev.upcoming,
      joinedDate: app.date || prev.joinedDate || getTodayDateString(),
    }));

    if (app.type === "walk-in") {
      setIsWalkInSession(true);
      if (app.slot) {
        setWalkInSlot(app.slot);
      }
    } else {
      setIsWalkInSession(false);
      setWalkInSlot("");
    }

    // Trigger duplicate / family member detection
    if (parsedPhone.length >= 10 || (app.patientName && app.patientName.length >= 3) || (app.patientEmail && app.patientEmail.includes("@"))) {
      checkDuplicatePatient(parsedPhone, app.patientName || "", app.patientEmail || "").then((res) => {
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
    }

    setAppointmentSearch("");
    setShowRecentBookingsList(false);
    setFormError("");
  };

  const handleClearAutofill = () => {
    setSelectedBookingSource(null);
    setAppointmentSearch("");
    setShowRecentBookingsList(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      age: "",
      gender: "Male",
      treatmentPlan: "",
      therapistName: enrolledTherapists[0] || "Dr.Kinnera",
      status: "active",
      joinedDate: getTodayDateString(),
      upcoming: "",
    });
    setDialCode("+91");
    setIsWalkInSession(false);
    setWalkInSlot("");
    setDuplicateInfo(null);
    setIsFamilyMemberRegistration(false);
    setLinkedFamilyHead(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // Real-time phone sanitization: strictly digits only, max 10 for India (+91), max 15 for international
    if (name === "phone") {
      const isIndia = dialCode.trim() === "+91" || dialCode.trim() === "91";
      value = value.replace(/\D/g, "").slice(0, isIndia ? 10 : 15);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      
      // Trigger real-time duplicate check if phone, name, or email is entered
      if (name === "phone" || name === "name" || name === "email") {
        const cleanPhone = sanitizePhone(name === "phone" ? value : prev.phone);
        const cleanName = sanitizeName(name === "name" ? value : prev.name);
        const cleanEmail = (name === "email" ? value : prev.email).trim().toLowerCase();

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

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    const cleanPhone = sanitizePhone(formData.phone);
    const cleanName = sanitizeName(formData.name);

    if (!cleanName || cleanName.length < 2) {
      setFormError("Please enter a valid patient name.");
      setSubmitting(false);
      return;
    }

    if (dialCode === "+91" && !isValidIndianPhone(cleanPhone)) {
      setFormError("Please enter a valid 10-digit Indian mobile number (e.g. 98765 43210).");
      setSubmitting(false);
      return;
    }

    if (formData.email && formData.email.trim() && !isValidEmail(formData.email)) {
      setFormError("Please enter a valid email address.");
      setSubmitting(false);
      return;
    }

    try {
      const isWalkIn = isWalkInSession && Boolean(walkInSlot);

      // 1. Create Patient in Firestore Client-side
      console.log("[Client Page] Creating patient profile in Firestore...", cleanName);
      const newPatientPayload: any = {
        name: cleanName,
        email: formData.email ? formData.email.trim().toLowerCase() : "",
        phone: `${dialCode} ${cleanPhone}`,
        address: formData.address ? formData.address.trim() : "",
        age: formData.age ? String(formData.age).trim() : "",
        gender: formData.gender,
        treatmentPlan: formData.treatmentPlan,
        status: formData.status,
        therapistName: formData.therapistName,
        joinedDate: formData.joinedDate || getTodayDateString(),
        upcoming: isWalkIn ? `Today (${walkInSlot})` : (formData.upcoming || formData.joinedDate || "Pending Schedule"),
        lastVisit: isWalkIn ? "Today" : "N/A"
      };

      if (isFamilyMemberRegistration && linkedFamilyHead) {
        newPatientPayload.relationship = familyRelationship;
        newPatientPayload.primaryPatientId = linkedFamilyHead.id;
        newPatientPayload.familyHeadName = linkedFamilyHead.name;
        newPatientPayload.familyGroupId = linkedFamilyHead.familyGroupId || `FAM-${linkedFamilyHead.id}`;
        const linkedEmailsSet = new Set<string>();
        if (linkedFamilyHead.email) linkedEmailsSet.add(linkedFamilyHead.email.toLowerCase().trim());
        (linkedFamilyHead.linkedEmails || []).forEach((e: string) => linkedEmailsSet.add(e.toLowerCase().trim()));
        if (formData.email) linkedEmailsSet.add(formData.email.toLowerCase().trim());
        newPatientPayload.linkedEmails = Array.from(linkedEmailsSet);
      }

      const newPatient = await createPatient(newPatientPayload);

      console.log("[Client Page] Created Patient doc ID:", newPatient.id);

      // 1b. If walk-in session, block the slot in appointments collection (skip if this was already an existing booking)
      if (isWalkIn && !selectedBookingSource?.id) {
        try {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const formattedBookingDate = `${yyyy}-${mm}-${dd}`;

          await addDoc(collection(db, "appointments"), {
            patientName: cleanName,
            patientPhone: `${dialCode} ${cleanPhone}`,
            patientEmail: formData.email ? formData.email.trim().toLowerCase() : "",
            serviceId: formData.treatmentPlan || "General Physiotherapy Consultation",
            date: formattedBookingDate,
            slot: walkInSlot,
            notes: "Direct in-clinic walk-in registered at reception.",
            status: "approved",
            type: "walk-in",
            assignedTherapist: formData.therapistName,
            createdAt: Timestamp.now(),
            actionedAt: Timestamp.now(),
          });
          console.log("[Client Page] Blocked walk-in slot in appointments:", walkInSlot);
        } catch (appErr) {
          console.error("Failed to block walk-in appointment slot:", appErr);
        }
      }

      // Fallback: In case Drive folder wasn't provisioned during createPatient
      if (!newPatient.googleDriveFolderId) {
        try {
          const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => "") : "";
          const driveResponse = await fetch("/api/drive/create-folder", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
              patientId: newPatient.id,
              patientName: newPatient.name
            }),
          });
          if (driveResponse.ok) {
            const driveResult = await driveResponse.json();
            if (driveResult.success && driveResult.folderId) {
              newPatient.googleDriveFolderId = driveResult.folderId;
              try {
                const pRef = doc(db, "patients", newPatient.id);
                await updateDoc(pRef, { googleDriveFolderId: driveResult.folderId });
              } catch (uErr) {
                console.warn("Could not write folderId to patient doc in fallback:", uErr);
              }
            }
          }
        } catch (driveErr) {
          console.error("[Client Page] Google Drive folder creation fallback warning:", driveErr);
        }
      }

      setModalOpen(false);
      setIsWalkInSession(false);
      setWalkInSlot("");
      setSelectedBookingSource(null);
      setAppointmentSearch("");
      setShowRecentBookingsList(false);
      setIsFamilyMemberRegistration(false);
      setLinkedFamilyHead(null);
      setFamilyRelationship("Spouse");
      setDuplicateInfo(null);
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        age: "",
        gender: "Male",
        treatmentPlan: "",
        therapistName: enrolledTherapists[0] || "Dr.Kinnera",
        status: "active",
        joinedDate: getTodayDateString(),
        upcoming: "",
      });
      
      // Refresh list
      fetchPatientsList();
    } catch (err: unknown) {
      console.error("Error registering patient:", err);
      const msg = err instanceof Error ? err.message : "Failed to save patient profile. Verify your internet connection.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState("");

  const handleResendPortalInvite = async (targetPatient: Patient) => {
    if (!targetPatient.activationCode) return;
    setResendingInviteId(targetPatient.id);
    setInviteSuccessMsg("");
    try {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com");
      let waStatus = false;
      let emailStatus = false;

      // 1. Email invite
      if (targetPatient.email) {
        try {
          const res = await fetch(`${baseUrl}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "PATIENT_ONBOARDING",
              payload: {
                patientId: targetPatient.id,
                patientName: targetPatient.name,
                patientEmail: targetPatient.email,
                activationCode: targetPatient.activationCode,
              },
            }),
          });
          const d = await res.json();
          if (d.success) emailStatus = true;
        } catch (e) {
          console.warn("[Portal Invite Email Error]", e);
        }
      }

      // 2. WhatsApp invite
      if (targetPatient.phone) {
        try {
          const res = await fetch(`${baseUrl}/api/whatsapp/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "PATIENT_ONBOARDING",
              payload: {
                patientId: targetPatient.id,
                patientName: targetPatient.name,
                patientPhone: targetPatient.phone,
                patientEmail: targetPatient.email,
                activationCode: targetPatient.activationCode,
              },
            }),
          });
          const d = await res.json();
          if (d.success) waStatus = true;
          else console.warn("[Portal Invite WA Error]", d.error);
        } catch (e) {
          console.warn("[Portal Invite WhatsApp Error]", e);
        }
      }

      const sentVia = [
        waStatus ? "WhatsApp" : "",
        emailStatus ? "Email" : ""
      ].filter(Boolean).join(" & ");

      if (sentVia) {
        setInviteSuccessMsg(`✅ Portal invitation dispatched to ${targetPatient.name} via ${sentVia}! (Patient ID: ${targetPatient.id} • Portal Code: ${targetPatient.activationCode})`);
      } else {
        setInviteSuccessMsg(`✅ Portal invitation triggered for ${targetPatient.name} (ID: ${targetPatient.id} • Code: ${targetPatient.activationCode})`);
      }
      setTimeout(() => setInviteSuccessMsg(""), 7000);
    } catch (e) {
      console.warn("Error resending portal invite:", e);
    } finally {
      setResendingInviteId(null);
    }
  };

  // Close dropdown menu when clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Filter lists internally
  const therapistList = Array.from(
    new Set([
      ...enrolledTherapists,
      ...patients.map((p) => p.therapistName).filter(Boolean)
    ])
  );

  return (
    <div className="space-y-8 animate-page-fade relative">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
            Patients Database
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage patient records, recovery journeys, and treatment plans in one centralized clinical hub.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFastTrackOpen(true)}
            className="px-5 py-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-purple-600 hover:opacity-95 text-white text-xs font-black transition-all shadow-md shadow-orange-500/20 flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>FastTrack Migration</span>
            <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wider">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Patient</span>
          </button>
        </div>
      </div>

      {/* Portal Invite Success Banner */}
      {inviteSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{inviteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setInviteSuccessMsg("")}
            className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Clinical Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Active Patients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-[0_6px_25px_-6px_var(--brand-shadow)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Active Patient Recovery
            </span>
            <div className="h-7 px-2.5 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-black text-[11px]">
              {patients.filter((p) => p.status === "active").length} Active
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
              {patients.length}
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">Total Enrolled</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-500"
              style={{ width: `${patients.length > 0 ? Math.round((patients.filter((p) => p.status === "active").length / patients.length) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Completed Protocols */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-[0_6px_25px_-6px_var(--brand-shadow)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Completed Protocols
            </span>
            <span className="text-emerald-500 font-bold text-xs">Discharged</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
              {patients.filter((p) => p.status === "completed").length}
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">Recovered</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${patients.length > 0 ? Math.round((patients.filter((p) => p.status === "completed").length / patients.length) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Pending Intake */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-[0_6px_25px_-6px_var(--brand-shadow)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Pending Evaluation
            </span>
            <div className="h-7 px-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black text-[11px]">
              {patients.filter((p) => p.status === "pending").length} In Review
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
              {patients.filter((p) => p.status === "pending").length}
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">Intakes Awaiting</span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${patients.length > 0 ? Math.round((patients.filter((p) => p.status === "pending").length / patients.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Container: Search, Filter Tabs & Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_25px_-6px_var(--brand-shadow)] overflow-hidden">
        
        {/* Search, Status Tabs & Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Left Side: Status Filtering Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto scrollbar-none shadow-2xs">
            {["all", "active", "pending", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                }}
                className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold capitalize rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? "bg-white dark:bg-slate-700 text-brand-charcoal dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-brand-green dark:hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Right Side: High-Visibility Search and Therapist Select Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            
            {/* Highlighted, Prominent Search Bar (Desktop / Tablet / Mobile) */}
            <div className="group relative flex items-center w-full sm:w-80 md:w-96 lg:w-[350px] xl:w-[420px] rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 pl-2.5 pr-3 py-1.5 shadow-xs hover:border-brand-green/70 dark:hover:border-teal-400/70 focus-within:border-brand-green dark:focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-brand-green/15 dark:focus-within:ring-teal-400/20 focus-within:shadow-md transition-all">
              
              {/* Highlight Icon Badge */}
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-brand-green/10 dark:bg-teal-400/15 text-brand-green dark:text-teal-400 shrink-0 transition-transform group-focus-within:scale-110">
                <Search className="h-4 w-4 stroke-[2.5]" />
              </div>

              {/* Text Input */}
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search patient, ID (GPC-...), phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full bg-transparent px-3 py-1.5 text-xs sm:text-sm font-semibold outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 tracking-tight"
              />

              {/* Trailing Controls: Results Pill + Clear Button or Keyboard Shortcut */}
              <div className="flex items-center gap-1.5 shrink-0">
                {searchQuery.trim() !== "" ? (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-brand-green/15 text-brand-green dark:bg-teal-400/20 dark:text-teal-300 border border-brand-green/20 select-none animate-fade-in">
                      {filteredPatients.length} {filteredPatients.length === 1 ? "match" : "matches"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-1.5 py-0.5 rounded-md shadow-2xs select-none pointer-events-none">
                    ⌘K
                  </kbd>
                )}
              </div>
            </div>

            {/* Therapist Filter Select Dropdown */}
            <div className="relative w-full sm:w-52 shrink-0">
              <select
                value={therapistFilter}
                onChange={(e) => {
                  setTherapistFilter(e.target.value);
                }}
                className="w-full rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 pl-4 pr-9 py-2.5 text-xs font-bold outline-none hover:border-brand-green/70 dark:hover:border-teal-400/70 focus:border-brand-green dark:focus:border-teal-400 focus:ring-4 focus:ring-brand-green/15 dark:focus:ring-teal-400/20 appearance-none cursor-pointer text-slate-800 dark:text-slate-200 transition-all shadow-xs"
              >
                <option value="all">Filter by Therapist</option>
                {therapistList.map((therapist) => (
                  <option key={therapist} value={therapist}>
                    {therapist}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

          </div>
        </div>

        {/* Directory Table Grid */}
        <div className="overflow-x-auto overflow-y-auto max-h-[580px] overscroll-contain relative">
          {loading ? (
            <div className="flex flex-col h-64 items-center justify-center text-slate-500 text-xs font-semibold">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green mb-2" />
              <span>Loading patient database records...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col h-64 items-center justify-center text-red-500 text-xs font-semibold">
              <AlertCircle className="h-6 w-6 mb-2 text-red-400" />
              <span>{error}</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center text-slate-400 text-xs font-semibold">
              <FileText className="h-6 w-6 mb-2 text-slate-300" />
              <span>No patient records found matching your filters.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                <tr className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Patient Name & ID</th>
                  <th className="px-6 py-4">Treatment Plan</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4">Upcoming</th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:text-brand-green select-none transition-colors"
                    onClick={() => {
                      setDaysSortOrder((prev) => {
                        if (prev === "none") return "asc";
                        if (prev === "asc") return "desc";
                        return "none";
                      });
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Days Left</span>
                      <span className="text-[8px]">
                        {daysSortOrder === "asc" ? "▲" : daysSortOrder === "desc" ? "▼" : "⇅"}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPatients.map((patient) => {
                  const statusColors = {
                    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
                    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                  };

                  return (
                    <tr 
                      key={patient.id}
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      {/* Name & ID Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-2 ring-brand-sand/30 flex items-center justify-center text-brand-green font-black text-xs uppercase shrink-0">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <Link 
                              href={`/dashboard/patients/${patient.id}`}
                              className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green transition-colors"
                            >
                              {patient.name}
                            </Link>
                            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">
                              {patient.id}
                            </p>
                            <p className="text-[9px] font-black uppercase mt-1 leading-none">
                              {patient.activated ? (
                                <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                  Portal Active
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 flex-wrap mt-1">
                                  <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-all font-mono text-[9px] font-bold">
                                    Code: {patient.activationCode || "N/A"}
                                  </span>
                                  {patient.activationCode && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleResendPortalInvite(patient);
                                      }}
                                      disabled={resendingInviteId === patient.id}
                                      className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2 py-0.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                                      title={`Send WhatsApp & Email Portal Invitation to ${patient.name}`}
                                    >
                                      {resendingInviteId === patient.id ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                                          <span>Sending...</span>
                                        </>
                                      ) : (
                                        <>
                                          <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                          <span>Send Invite</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Treatment Plan Column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-xl bg-brand-bg dark:bg-brand-green/10 border border-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                          {patient.treatmentPlan}
                        </span>
                      </td>

                      {/* Last Visit Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {patient.lastVisit || "N/A"}
                      </td>

                      {/* Upcoming Slot Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {patient.upcoming || "Pending Schedule"}
                      </td>

                      {/* Days Left Countdown */}
                      <td className="px-6 py-4">
                        {(() => {
                          const days = getDaysLeft(patient.upcoming);
                          if (days === null) {
                            return <span className="text-slate-400 font-semibold text-xs">—</span>;
                          }
                          if (days < 0) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                Past Slot
                              </span>
                            );
                          }
                          if (days === 0) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400 animate-pulse">
                                Today
                              </span>
                            );
                          }
                          if (days === 1) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                                Tomorrow
                              </span>
                            );
                          }
                          if (days <= 2) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                                2 Days Left
                              </span>
                            );
                          }
                          if (days <= 7) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                {days} Days Left
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {days} Days Left
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold capitalize ${statusColors[patient.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            patient.status === "active" 
                              ? "bg-emerald-500" 
                              : patient.status === "pending" 
                                ? "bg-amber-500" 
                                : "bg-slate-400"
                          }`} />
                          {patient.status}
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === patient.id ? null : patient.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                        
                        {/* Dropdown Menu Box */}
                        {activeMenuId === patient.id && (
                          <div 
                            className="absolute right-6 top-12 z-20 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl py-2 animate-fade-in text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                             <Link
                              href={`/dashboard/patients/${patient.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                            >
                              <FileText className="w-4 h-4 text-brand-green" />
                              Clinical Profile
                            </Link>
                            <Link
                              href={`/dashboard/walkin?patientId=${patient.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                            >
                              <Calendar className="w-4 h-4 text-brand-green" />
                              Book Appointment
                            </Link>
                            {patient.googleDriveFolderId && (
                              <a
                                href={`https://drive.google.com/drive/folders/${patient.googleDriveFolderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                              >
                                <Folder className="w-4 h-4" />
                                Google Drive
                              </a>
                            )}
                            {!patient.activated && patient.activationCode && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(null);
                                  await handleResendPortalInvite(patient);
                                }}
                                disabled={resendingInviteId === patient.id}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-brand-green hover:bg-brand-bg/50 dark:hover:bg-slate-800 text-left disabled:opacity-50"
                              >
                                {resendingInviteId === patient.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                                ) : (
                                  <Send className="w-4 h-4 text-brand-green" />
                                )}
                                <span>{resendingInviteId === patient.id ? "Sending Invite..." : "Send Portal Invite"}</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const waUrl = `https://wa.me/${getCleanWhatsAppNumber(patient.phone)}`;
                                window.open(waUrl, "_blank");
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800 text-left"
                            >
                              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              WhatsApp Chat
                            </button>

                            <button
                              onClick={() => {
                                setSelectedPatientForDelete(patient);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left border-t border-slate-100 dark:border-slate-800"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete / Purge...
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Unlimited Scroll Directory Summary Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-xs font-black">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
              {filteredPatients.length} Patients Listed
            </span>
            {searchQuery && (
              <span className="text-[11px] text-slate-400 font-semibold">
                (Filtered from {patients.length} total)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
            <span>Scroll smoothly to view all records</span>
          </div>
        </div>
      </div>

      {/* New Patient Registration Overlay Modal Dialog */}
      {mounted && modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Register New Patient</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Creates clinical folder & Universal ID (GPC-XXXXX)</p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePatient} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* ⚡ Quick Autofill from Recent Walk-in / Online Booking */}
                <div className="col-span-2 p-3 sm:p-3.5 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-slate-50 dark:from-slate-850 dark:via-slate-850 dark:to-slate-900 border border-teal-200/90 dark:border-slate-700/80 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-brand-green text-white text-[10px] font-black">
                        ⚡
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        Autofill from Recent Booking
                      </span>
                    </div>
                    {recentAppointments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowRecentBookingsList((prev) => !prev)}
                        className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 underline cursor-pointer"
                      >
                        {showRecentBookingsList ? "Hide List" : `Browse Recent (${filteredAppointments.length})`}
                      </button>
                    )}
                  </div>

                  {/* Active Selected Source Notification */}
                  {selectedBookingSource ? (
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-emerald-950 dark:text-emerald-200">
                            Populated from {selectedBookingSource.type === "walk-in" ? "Walk-in" : "Online Booking"}:
                          </span>{" "}
                          <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                            {selectedBookingSource.patientName} ({selectedBookingSource.date} • {selectedBookingSource.slot})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAutofill}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Clear autofill and reset form"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search walk-in or online booking by Name, Phone, or Email..."
                          value={appointmentSearch}
                          onChange={(e) => {
                            setAppointmentSearch(e.target.value);
                            if (!showRecentBookingsList) setShowRecentBookingsList(true);
                          }}
                          onFocus={() => setShowRecentBookingsList(true)}
                          className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-green transition-colors"
                        />
                        {appointmentSearch && (
                          <button
                            type="button"
                            onClick={() => setAppointmentSearch("")}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown / Suggestions List */}
                      {(showRecentBookingsList || appointmentSearch) && (
                        <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 p-1 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-inner">
                          {loadingAppointments ? (
                            <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-green" />
                              <span>Loading recent bookings...</span>
                            </div>
                          ) : filteredAppointments.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              {appointmentSearch ? "No matching bookings found" : "No recent unregistered bookings found"}
                            </div>
                          ) : (
                            filteredAppointments.slice(0, 8).map((app) => {
                              const isReg = isAppointmentRegistered(app);
                              return (
                                <div
                                  key={app.id || `${app.patientName}-${app.date}-${app.slot}`}
                                  onClick={() => !isReg && handleSelectBooking(app)}
                                  className={`p-2 rounded-xl flex items-center justify-between gap-2 transition-all ${
                                    isReg
                                      ? "opacity-50 bg-slate-50 dark:bg-slate-850 cursor-not-allowed"
                                      : "hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer border border-transparent hover:border-emerald-200 dark:hover:border-slate-700"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                        {app.patientName}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                          app.type === "walk-in"
                                            ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                                            : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                        }`}
                                      >
                                        {app.type === "walk-in" ? "🚶 Walk-in" : "🌐 Online"}
                                      </span>
                                      {isReg && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                          Already Registered
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                                      <span>📞 {app.patientPhone}</span>
                                      {app.date && (
                                        <span>• 📅 {app.date} ({app.slot})</span>
                                      )}
                                      {app.serviceId && (
                                        <span className="truncate max-w-[140px]">• 🩺 {app.serviceId}</span>
                                      )}
                                    </div>
                                  </div>

                                  {!isReg && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectBooking(app);
                                      }}
                                      className="px-2.5 py-1 bg-brand-green hover:bg-brand-green-hover text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-2xs"
                                    >
                                      Autofill →
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Full Name */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Marcus Thorne"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-center">
                    {/* Country Code Selector (Combo Box) */}
                    <input
                      type="text"
                      list="dial-codes"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      placeholder="+91"
                      className="w-24 rounded-l-2xl border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-900 px-3 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-center text-slate-700 dark:text-slate-300"
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
                    {/* Phone Digit input */}
                    <input
                      type="tel"
                      name="phone"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={dialCode.trim() === "+91" || dialCode.trim() === "91" ? 10 : 15}
                      placeholder={dialCode.trim() === "+91" ? "98765 43210 (10 digits)" : "Phone number"}
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="flex-grow rounded-r-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                  {/* Clean live character counter badge */}
                  <div className="flex items-center justify-between mt-1 px-1">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {dialCode.trim() === "+91" ? "Indian mobile (10 digits)" : "Mobile number"}
                    </span>
                    <span className={`text-[10px] font-bold ${
                      formData.phone.length === (dialCode.trim() === "+91" ? 10 : 15)
                        ? "text-emerald-500 font-extrabold"
                        : formData.phone.length > 0
                        ? "text-amber-500"
                        : "text-slate-400"
                    }`}>
                      {formData.phone.length}/{dialCode.trim() === "+91" ? 10 : 15} digits
                    </span>
                  </div>
                </div>

                {/* Real-Time Exact Duplicate Patient Alert Banner (Full Width) */}
                {duplicateInfo?.isDuplicate && duplicateInfo.existingPatient && (
                  <div className="col-span-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700/60 rounded-2xl flex items-start gap-3 animate-slide-down">
                    <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1.5 text-xs flex-1">
                      <p className="font-black text-rose-900 dark:text-rose-200">
                        ⚠️ Patient Already Exists in Database ({duplicateInfo.matchField === "email" ? "Matching Email" : "Matching Phone"})
                      </p>
                      <p className="text-rose-800 dark:text-rose-300 font-semibold">
                        <strong>{duplicateInfo.existingPatient.name}</strong> (PID: <span className="font-mono font-black">{duplicateInfo.existingPatient.id}</span>)
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          href={`/dashboard/patients/${duplicateInfo.existingPatient.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-black text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded-xl shadow-2xs transition-colors"
                        >
                          <span>Open Existing Profile ↗</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* Family Member Shared Contact Notice & Relationship Selector (Full Width) */}
                {!duplicateInfo?.isDuplicate && duplicateInfo?.matchType === "family_member" && duplicateInfo.existingPatient && (
                  <div className="col-span-2 p-4 bg-blue-50/90 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-3 animate-slide-down">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-2.5 text-xs flex-1">
                      <div>
                        <p className="font-black text-blue-900 dark:text-blue-200 text-sm">
                          ℹ️ Shared Contact: Linked to Existing Patient
                        </p>
                        <p className="text-blue-800 dark:text-blue-300 font-medium mt-0.5 leading-relaxed">
                          This {duplicateInfo.matchField === "email" ? "email address" : "phone number"} belongs to registered patient <strong>{duplicateInfo.existingPatient.name}</strong> (PID: <span className="font-mono font-bold">{duplicateInfo.existingPatient.id}</span>).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFamilyMemberRegistration(true);
                            setLinkedFamilyHead(duplicateInfo.existingPatient!);
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl shadow-2xs transition-colors cursor-pointer ${
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

                {/* Patient Age */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Age (Years) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="age"
                    required
                    min="1"
                    max="120"
                    placeholder="e.g. 34"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green cursor-pointer text-slate-700 dark:text-slate-350"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Residential Address / Locality */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Residential Address / Locality</span>
                    <span className="text-[9px] font-bold text-slate-400 lowercase">(Optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                    <input
                      type="text"
                      name="address"
                      placeholder="e.g. Flat 302, Green Meadows, Indiranagar, Bangalore"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Treatment Plan */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Treatment Plan / Condition
                  </label>
                  <input
                    type="text"
                    name="treatmentPlan"
                    required
                    placeholder="e.g. Post-op ACL Recovery, Chronic Back Pain"
                    value={formData.treatmentPlan}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Assigned Therapist */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Assigned Therapist
                  </label>
                  <select
                    name="therapistName"
                    value={formData.therapistName}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green cursor-pointer text-slate-700 dark:text-slate-350"
                  >
                    {enrolledTherapists.map((therapist) => (
                      <option key={therapist} value={therapist}>
                        {therapist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Joined / First Visit */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Date Joined / First Visit
                  </label>
                  <input
                    type="date"
                    name="joinedDate"
                    value={formData.joinedDate}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green cursor-pointer text-slate-900 dark:text-white"
                  />
                </div>

                {/* In-Clinic Walk-in Session Toggle */}
                <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-850 space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="walkInCheck"
                        checked={isWalkInSession}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIsWalkInSession(checked);
                          if (checked && todaySlots.length > 0) {
                            const today = getTodayDateString();
                            const available = todaySlots.find(
                              (s) => !isSlotInPast(s, today, {
                                isAdmin: true,
                                graceType: clinicConfig?.adminWalkInGraceType || "end_of_slot",
                                slotDuration: clinicConfig?.slotDuration || 30,
                              })
                            );
                            setWalkInSlot(available || todaySlots[0]);
                          }
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                      />
                      <label htmlFor="walkInCheck" className="cursor-pointer select-none">
                        <span className="block text-xs font-black text-teal-950 dark:text-teal-200">
                          In-Clinic Walk-in (Block Today&apos;s Treatment Bay)
                        </span>
                        <span className="block text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                          Patient is physically in the clinic. Automatically logs an approved session on today&apos;s roster.
                        </span>
                      </label>
                    </div>

                    <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-200/70 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 shrink-0">
                      ⚡ Walk-in
                    </span>
                  </div>

                  {/* Slot selector when walk-in is toggled ON */}
                  {isWalkInSession && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                          Select Today&apos;s Time Slot <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            value={walkInSlot}
                            onChange={(e) => setWalkInSlot(e.target.value)}
                            required={isWalkInSession}
                            className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-bold outline-none focus:border-brand-green text-slate-800 dark:text-slate-200 cursor-pointer pr-8"
                          >
                            {todaySlots.map((slot) => {
                              const isPast = isSlotInPast(slot, getTodayDateString(), {
                                isAdmin: true,
                                graceType: clinicConfig?.adminWalkInGraceType || "end_of_slot",
                                slotDuration: clinicConfig?.slotDuration || 30,
                              });
                              return (
                                <option key={slot} value={slot}>
                                  {slot} {isPast ? "— [Past Grace Window]" : "— [Active / Available]"}
                                </option>
                              );
                            })}
                          </select>
                          <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                          Session Status
                        </label>
                        <div className="flex items-center gap-2 h-[38px] px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Auto-Approved (In-Session)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Action Buttons */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating folder...
                    </>
                  ) : (
                    "Save Patient Profile"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Fast-Track Migration Engine Modal */}
      <FastTrackPatientImportModal
        isOpen={fastTrackOpen}
        onClose={() => setFastTrackOpen(false)}
        onSuccess={() => {
          fetchPatientsList();
        }}
        enrolledTherapists={enrolledTherapists}
      />

      {/* Granular Patient Deletion & Data Purge Modal */}
      {selectedPatientForDelete && (
        <PatientDeleteModal
          isOpen={!!selectedPatientForDelete}
          patientId={selectedPatientForDelete.id}
          patientName={selectedPatientForDelete.name}
          onClose={() => setSelectedPatientForDelete(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl animate-fade-in text-xs font-black">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
