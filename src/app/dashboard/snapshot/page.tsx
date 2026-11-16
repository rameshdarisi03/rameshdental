"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  deleteField,
  Timestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Appointment,
  DayBlock,
  ClinicConfig,
  getClinicConfig,
  generateSlotsFromHours,
  generateSlotsForDay,
  getSlotCapacity,
  DEFAULT_CLINIC_CONFIG,
  isSlotInPast
} from "@/lib/db";
import {
  getPatients,
  updatePatient,
  Patient
} from "@/lib/patientsDb";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";
import { cleanPatientName, isPractoAppointment } from "@/lib/practoSync";
import PractoBadge from "@/components/PractoBadge";
import {
  Calendar,
  CalendarCheck,
  Users,
  Clock,
  User,
  Check,
  X,
  MessageSquare,
  Loader2,
  AlertCircle,
  Plus,
  Lock,
  Unlock,
  CornerDownRight,
  Info,
  ShieldAlert,
  ClipboardList,
  Mail,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  Search,
  Send,
  ExternalLink,
  FileText,
  Sparkles,
  Phone,
  MapPin,
  CalendarSync
} from "lucide-react";
import Link from "next/link";
import RescheduleModal from "@/components/RescheduleModal";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DaySnapshot() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Active user session state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Settings config state
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);

  // Selection states
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [lastClickedSlot, setLastClickedSlot] = useState<string | null>(null);

  // Custom Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    slot: string;
  } | null>(null);

  // Modals state
  const [blockingModalOpen, setBlockingModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  
  // Rejection Safeguard Modal states
  const [rejectionConfirmOpen, setRejectionConfirmOpen] = useState(false);
  const [pendingRejectionSlots, setPendingRejectionSlots] = useState<string[]>([]);

  // WhatsApp dialog modal states
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [pendingActionApp, setPendingActionApp] = useState<Appointment | null>(null);
  const [pendingActionType, setPendingActionType] = useState<"approve" | "reject" | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [manualNotifyWhatsApp, setManualNotifyWhatsApp] = useState(true);

  // Dedicated Patient Action & WhatsApp Hub Modal State
  const [patientActionModalOpen, setPatientActionModalOpen] = useState(false);
  const [activePatientApp, setActivePatientApp] = useState<Appointment | null>(null);
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState("");
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [isCustomDelay, setIsCustomDelay] = useState(false);
  const [customDelayInput, setCustomDelayInput] = useState("");
  const [earlyMinutes, setEarlyMinutes] = useState(10);
  const [rejectionReason, setRejectionReason] = useState("Doctor unavailable or schedule conflict.");
  const [showCustomMsgInput, setShowCustomMsgInput] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [sendingActionType, setSendingActionType] = useState<string | null>(null);

  // Reschedule Modal states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedRescheduleApp, setSelectedRescheduleApp] = useState<Appointment | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 4000);
  };

  // Book for Patient modal drawer states
  const [isBookForPatientOpen, setIsBookForPatientOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    patientAddress: "",
    serviceId: "General Dental Consultation & Checkup",
    notes: "",
  });
  const [submittingPatientForm, setSubmittingPatientForm] = useState(false);

  // Patient lookup state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientType, setPatientType] = useState<"new" | "existing">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const servicesList = [
    "General Dental Consultation & Checkup",
    "Dental Implants & 3D Imaging",
    "Root Canal Treatment (RCT)",
    "Invisible Aligners & Orthodontics",
    "Teeth Whitening & Smile Makeover",
    "Laser Gum Therapy & Scaling",
    "Metal-Free Zirconia Crowns",
  ];

  // Dynamic slots generated according to Settings configurations
  const allSlots = generateSlotsForDay(clinicConfig, selectedDate);

  const isMorningSlot = (time: string) => {
    const [hourStr, minAndMod] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const isPM = minAndMod.includes("PM");
    return !isPM || hour === 12;
  };

  // Fetch appointments and blocks for selected date
  async function fetchDayData() {
    setLoading(true);
    setSelectedSlots([]);
    setLastClickedSlot(null);
    try {
      // 1. Fetch appointments for selectedDate (supporting both YYYY-MM-DD and DD-MM-YYYY)
      const altDate = selectedDate.includes("-") ? selectedDate.split("-").reverse().join("-") : selectedDate;
      const dateList = Array.from(new Set([selectedDate, altDate]));
      const appQuery = query(collection(db, "appointments"), where("date", "in", dateList));
      const appSnapshot = await getDocs(appQuery);
      const appList: Appointment[] = [];
      appSnapshot.forEach((doc) => {
        appList.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(appList);

      // 2. Fetch blocks for selectedDate
      const blockQuery = query(collection(db, "blocks"), where("date", "in", dateList));
      const blockSnapshot = await getDocs(blockQuery);
      const blockList: DayBlock[] = [];
      blockSnapshot.forEach((doc) => {
        blockList.push({ id: doc.id, ...doc.data() } as DayBlock);
      });
      setBlocks(blockList);
    } catch (error) {
      console.error("Error fetching day snapshot data: ", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDayData();
  }, [selectedDate]);

  useEffect(() => {
    setMounted(true);
    // 1. Load clinic config
    async function loadConfig() {
      try {
        const fetched = await getClinicConfig();
        setClinicConfig(fetched);
      } catch (err) {
        console.error(err);
      }
    }
    loadConfig();

    // 2. Fetch logged-in user profile
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }

    // 3. Fetch patients list for existing lookup
    async function loadPatients() {
      try {
        const fetched = await getPatients();
        setPatients(fetched);
      } catch (err) {
        console.error("Failed to load patients list: ", err);
      }
    }
    loadPatients();

    // 4. Continuous Background Practo Sync (Auto-syncs on mount, every 10 min, and on tab focus)
    const autoSyncPractoSilently = async () => {
      try {
        const res = await fetch("/api/practo/sync", { method: "POST" });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.importedCount > 0) {
            fetchDayData();
          }
        }
      } catch (e) {}
    };
    autoSyncPractoSilently();
    const syncInterval = setInterval(autoSyncPractoSilently, 10 * 60 * 1000);
    const handleWindowFocus = () => autoSyncPractoSilently();
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  // Close context menu on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [contextMenu]);

  // Check if slot has passed, respecting Staff Walk-in Grace Window from Settings
  const checkSlotInPast = (slot: string) => {
    return isSlotInPast(slot, selectedDate, {
      isAdmin: true,
      graceType: clinicConfig.adminWalkInGraceType || "end_of_slot",
      slotDuration: clinicConfig.slotDuration || 30,
    });
  };

  // Click slot handler with Shift-Key support
  const handleSlotClick = (e: React.MouseEvent, slot: string) => {
    if (e.button === 2) return; // ignore right clicks

    // Ignore selection of past free slots
    const state = getSlotState(slot);
    if (state.type === "free" && checkSlotInPast(slot)) {
      return;
    }

    if (e.shiftKey && lastClickedSlot) {
      const startIdx = allSlots.indexOf(lastClickedSlot);
      const endIdx = allSlots.indexOf(slot);
      if (startIdx !== -1 && endIdx !== -1) {
        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        
        // Filter out past free slots from range selection
        const range = allSlots.slice(minIdx, maxIdx + 1).filter((s) => {
          const sState = getSlotState(s);
          return !(sState.type === "free" && checkSlotInPast(s));
        });
        
        setSelectedSlots((prev) => {
          const combined = new Set([...prev, ...range]);
          return Array.from(combined);
        });
      }
    } else {
      setSelectedSlots((prev) => {
        if (prev.includes(slot)) {
          return prev.filter((s) => s !== slot);
        } else {
          return [...prev, slot];
        }
      });
      setLastClickedSlot(slot);
    }
  };

  // Custom Context Menu trigger
  const handleContextMenu = (e: React.MouseEvent, slot: string) => {
    e.preventDefault();
    
    // Ignore context menu on past free slots
    const state = getSlotState(slot);
    if (state.type === "free" && checkSlotInPast(slot)) {
      return;
    }

    if (!selectedSlots.includes(slot)) {
      setSelectedSlots([slot]);
      setLastClickedSlot(slot);
    }

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      slot: slot
    });
  };

  // Open dedicated Patient Action Hub
  const openPatientActions = (app: Appointment) => {
    setActivePatientApp(app);
    setCustomWhatsAppMessage("");
    setShowCustomMsgInput(false);
    setPatientActionModalOpen(true);
  };

  // Assign therapist directly to an appointment (syncs with Appointments & Patients DB)
  const handleAssignTherapist = async (appointmentId: string, therapistName: string) => {
    try {
      const docRef = doc(db, "appointments", appointmentId);
      await updateDoc(docRef, { assignedTherapist: therapistName });
      
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, assignedTherapist: therapistName } : a))
      );

      setActivePatientApp((prev) => (prev && prev.id === appointmentId ? { ...prev, assignedTherapist: therapistName } : prev));

      // Sync with Patients DB if patient exists
      const targetApp = appointments.find((a) => a.id === appointmentId);
      if (targetApp && targetApp.patientPhone) {
        const cleanPhone = targetApp.patientPhone.replace(/\D/g, "");
        const matchedPatient = patients.find((p) => p.phone && p.phone.replace(/\D/g, "").includes(cleanPhone.slice(-10)));
        if (matchedPatient && matchedPatient.id) {
          await updatePatient(matchedPatient.id, {
            therapistName: therapistName
          });
        }
      }
    } catch (err) {
      console.error("Error assigning therapist: ", err);
    }
  };

  // Comprehensive multi-capacity slot state
  const getSlotData = (slot: string) => {
    const slotApps = appointments.filter((a) => a.slot === slot);
    const maxCapacity = getSlotCapacity(clinicConfig, slot);
    const approvedCount = slotApps.filter((a) => a.status === "approved").length;
    const pendingCount = slotApps.filter((a) => a.status === "pending").length;

    let isBlocked = false;
    let blockReasonText = "";
    let blockId = "";

    blocks.forEach((b) => {
      if (b.type === "full_day" || b.type === "holiday") {
        isBlocked = true;
        blockReasonText = b.reason || "Clinic Closure";
        blockId = b.id || "";
      } else if (b.type === "session") {
        if (b.session === "morning" && isMorningSlot(slot)) {
          isBlocked = true;
          blockReasonText = b.reason || "Morning Shift Blocked";
          blockId = b.id || "";
        } else if (b.session === "evening" && !isMorningSlot(slot)) {
          isBlocked = true;
          blockReasonText = b.reason || "Evening Shift Blocked";
          blockId = b.id || "";
        }
      } else if (b.type === "slot" && b.slot === slot) {
        isBlocked = true;
        blockReasonText = b.reason || "Therapist unavailable";
        blockId = b.id || "";
      }
    });

    const isPast = checkSlotInPast(slot);
    const remainingSlots = isBlocked || isPast ? 0 : Math.max(0, maxCapacity - approvedCount);

    return {
      slotApps,
      maxCapacity,
      approvedCount,
      pendingCount,
      remainingSlots,
      isBlocked,
      blockReasonText,
      blockId,
      isPast,
    };
  };

  // Check state of slot (legacy / single reference helper)
  const getSlotState = (slot: string) => {
    const data = getSlotData(slot);
    if (data.isBlocked) {
      return { type: "blocked", reason: data.blockReasonText, blockId: data.blockId } as const;
    }
    if (data.slotApps.length > 0) {
      return { type: "appointment", data: data.slotApps[0] } as const;
    }
    return { type: "free" } as const;
  };

  // Trigger Rejection warning popup
  const handlePreviousDay = () => {
    if (!selectedDate) return;
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Single-appointment status update with zero bulk side effects
  const handleSingleAppointmentStatus = async (
    appointmentId: string, 
    newStatus: "approved" | "rejected",
    sendWhatsApp: boolean = false,
    customReason?: string
  ) => {
    try {
      const effectiveReason = customReason || rejectionReason || "Schedule conflict or clinic slot capacity limits.";
      const docRef = doc(db, "appointments", appointmentId);
      const auditData = {
        status: newStatus,
        rejectionReason: newStatus === "rejected" ? effectiveReason : deleteField(),
        actionedByUid: currentUser?.uid || "system",
        actionedByName: currentUser?.name || "Clinic Staff",
        actionedByRole: currentUser?.role || "receptionist",
        actionedAt: Timestamp.now()
      };
      await updateDoc(docRef, auditData);

      // Local state update immediately (0ms lag)
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, ...auditData } : a))
      );

      const targetApp = appointments.find((a) => a.id === appointmentId);
      const updatedApp = targetApp ? { ...targetApp, ...auditData } : null;

      // Trigger Automated Email if patient has an email
      if (updatedApp && updatedApp.patientEmail) {
        if (newStatus === "approved") {
          const calUrl = generateGoogleCalendarUrl(updatedApp as Appointment);
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "APPOINTMENT_APPROVED",
              payload: {
                patientName: updatedApp.patientName,
                patientEmail: updatedApp.patientEmail,
                serviceId: updatedApp.serviceId,
                date: updatedApp.date,
                slot: updatedApp.slot,
                assignedTherapist: updatedApp.assignedTherapist || "Clinical Team",
                googleCalendarUrl: calUrl,
              },
            }),
          }).catch((err) => console.warn("[Email Engine] Failed to dispatch approval email:", err));
        } else if (newStatus === "rejected") {
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "APPOINTMENT_REJECTED",
              payload: {
                patientName: updatedApp.patientName,
                patientEmail: updatedApp.patientEmail,
                serviceId: updatedApp.serviceId,
                date: updatedApp.date,
                slot: updatedApp.slot,
                reason: effectiveReason,
              },
            }),
          }).catch((err) => console.warn("[Email Engine] Failed to dispatch rejection email:", err));
        }
      }

      // Trigger Automated WhatsApp Notification if patient has a phone number
      if (updatedApp && updatedApp.patientPhone) {
        if (newStatus === "approved") {
          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "APPOINTMENT_APPROVED",
              payload: {
                patientName: updatedApp.patientName,
                patientPhone: updatedApp.patientPhone,
                serviceName: updatedApp.serviceId,
                date: updatedApp.date,
                slot: updatedApp.slot,
                therapistName: updatedApp.assignedTherapist || "Clinical Team",
              },
            }),
          }).catch((err) => console.warn("[WhatsApp Engine] Failed to dispatch approval WhatsApp:", err));
        } else if (newStatus === "rejected") {
          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "APPOINTMENT_REJECTED",
              payload: {
                patientName: updatedApp.patientName,
                patientPhone: updatedApp.patientPhone,
                serviceName: updatedApp.serviceId,
                date: updatedApp.date,
                slot: updatedApp.slot,
                reason: effectiveReason,
              },
            }),
          }).catch((err) => console.warn("[WhatsApp Engine] Failed to dispatch rejection WhatsApp:", err));
        }
      }

      if (sendWhatsApp && targetApp) {
        triggerWhatsAppRedirect({ ...targetApp, ...auditData }, newStatus === "approved");
      }
    } catch (err) {
      console.error("Error updating appointment status: ", err);
      alert("Failed to update appointment.");
    }
  };

  const handleStatusChange = handleSingleAppointmentStatus;

  const triggerRejectionGuard = (targetApp?: Appointment) => {
    if (targetApp) {
      setPendingActionApp(targetApp);
      setPendingRejectionSlots([]);
      setRejectionConfirmOpen(true);
      return;
    }

    const targetApps = appointments.filter((app) => selectedSlots.includes(app.slot));
    if (targetApps.length === 0) {
      alert("No patient appointments selected to reject.");
      return;
    }
    setPendingRejectionSlots(selectedSlots);
    setRejectionConfirmOpen(true);
  };

  const handleRejectionConfirmed = async () => {
    setLoading(true);
    setRejectionConfirmOpen(false);
    try {
      const effectiveReason = rejectionReason.trim() || "Doctor unavailable or schedule conflict.";
      if (pendingActionApp && pendingActionApp.id) {
        // Isolated single-patient rejection
        await handleSingleAppointmentStatus(pendingActionApp.id, "rejected", false, effectiveReason);
        showToast(`Appointment rejected. WhatsApp & Email cancellation sent to ${cleanPatientName(pendingActionApp.patientName)}!`);
        setPendingActionApp(null);
      } else if (pendingRejectionSlots.length > 0) {
        const targetApps = appointments.filter((app) => pendingRejectionSlots.includes(app.slot));
        for (const app of targetApps) {
          if (app.id) {
            await handleSingleAppointmentStatus(app.id, "rejected", false, effectiveReason);
          }
        }
        showToast(`${targetApps.length} appointment(s) rejected & notified!`);
        setPendingRejectionSlots([]);
      }

      await fetchDayData();
    } catch (error) {
      console.error("Rejection error: ", error);
      alert("Failed to reject appointments.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger approve confirm flow
  const handleApprove = (targetApp?: Appointment) => {
    if (targetApp) {
      setPendingActionApp(targetApp);
      setPendingActionType("approve");
      setNotificationModalOpen(true);
      return;
    }

    const allSlotApps = appointments.filter((app) => selectedSlots.includes(app.slot));
    if (allSlotApps.length === 0) {
      alert("No patient appointments found in the selected slot(s). Use 'Book Patient' to book a new appointment.");
      return;
    }

    const unapprovedApps = allSlotApps.filter((app) => app.status !== "approved");
    const appToActOn = unapprovedApps.length > 0 ? unapprovedApps[0] : allSlotApps[0];

    setPendingActionApp(appToActOn);
    setPendingActionType("approve");
    setNotificationModalOpen(true);
  };

  const confirmApproval = async (shouldNotify: boolean) => {
    if (!pendingActionApp || !pendingActionApp.id) return;
    setLoading(true);
    try {
      // Isolated single patient approval
      await handleSingleAppointmentStatus(pendingActionApp.id, "approved", shouldNotify);

      setNotificationModalOpen(false);
      setPendingActionApp(null);
      setPendingActionType(null);
      setSelectedSlots([]);
      await fetchDayData();
    } catch (error) {
      console.error("Approval error: ", error);
      alert("Failed to approve appointment.");
    } finally {
      setLoading(false);
    }
  };

  // Submit manual booking for patient drawer form
  const handleBookForPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) return;

    setSubmittingPatientForm(true);
    try {
      // Manual bookings in snapshot book all selected slots Contiguously
      const batch = writeBatch(db);
      const appRef = collection(db, "appointments");
      let firstAppointmentId = "";

      const primaryBookingDetails = {
        patientName: patientForm.patientName,
        patientPhone: patientForm.patientPhone,
        patientEmail: patientForm.patientEmail,
        patientAddress: patientForm.patientAddress ? patientForm.patientAddress.trim() : "",
        serviceId: patientForm.serviceId,
        date: selectedDate,
        notes: patientForm.notes,
        status: "approved" as const,
        type: "manual" as const,
        createdAt: Timestamp.now(),
        createdByUid: currentUser?.uid || "system",
        createdByName: currentUser?.name || "Clinic Staff",
        createdByRole: currentUser?.role || "receptionist",
        actionedByUid: currentUser?.uid || "system",
        actionedByName: currentUser?.name || "Clinic Staff",
        actionedByRole: currentUser?.role || "receptionist",
        actionedAt: Timestamp.now()
      };

      // Add each selected slot as a separate approved slot mapping
      for (const slot of selectedSlots) {
        const docRef = doc(appRef);
        batch.set(docRef, {
          ...primaryBookingDetails,
          slot: slot
        });
      }
      await batch.commit();

      const bookingDate = selectedDate; // YYYY-MM-DD
      const bookingService = patientForm.serviceId;
      const patientName = patientForm.patientName;
      const patientPhone = patientForm.patientPhone;
      const patientEmail = patientForm.patientEmail;
      const patientAddress = patientForm.patientAddress ? patientForm.patientAddress.trim() : "";

      setIsBookForPatientOpen(false);
      // Reset form
      setPatientForm({
        patientName: "",
        patientPhone: "",
        patientEmail: "",
        patientAddress: "",
        serviceId: "General Dental Consultation & Checkup",
        notes: "",
      });

      // Date comparison logic
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayStr = `${year}-${month}-${day}`; // YYYY-MM-DD
      const isFuture = bookingDate > todayStr;
      
      const formatToDDMMYYYY = (d: string) => {
        const parts = d.split("-");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return d;
      };
      
      const formattedBookingDate = formatToDDMMYYYY(bookingDate);

      // Patient profile is NOT created on booking to prevent junk records for potential no-shows.
      // Permanent patient IDs and Google Drive folders are ONLY generated when explicitly registered in the Patient Database.
      if (patientType === "existing" && selectedPatient && selectedPatient.id) {
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

      // Directly trigger WhatsApp without modal if checked
      if (manualNotifyWhatsApp) {
        triggerWhatsAppConfirmation({
          ...primaryBookingDetails,
          slot: selectedSlots[0]
        }, true);
      }

      setSelectedSlots([]);
      await fetchDayData();
    } catch (error) {
      console.error("Manual booking error: ", error);
      alert("Failed to book patient slot.");
    } finally {
      setSubmittingPatientForm(false);
    }
  };

  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let { name, value } = e.target;
    if (name === "patientPhone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }
    setPatientForm((prev) => ({ ...prev, [name]: value }));
  };

  // Block Slots rules
  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) return;

    setLoading(true);
    setBlockingModalOpen(false);
    try {
      const batch = writeBatch(db);
      const blocksRef = collection(db, "blocks");

      selectedSlots.forEach((slot) => {
        const slotState = getSlotState(slot);
        if (slotState.type === "free" || (slotState.type === "appointment" && slotState.data.status === "rejected")) {
          const docRef = doc(blocksRef);
          batch.set(docRef, {
            date: selectedDate,
            type: "slot",
            slot: slot,
            reason: blockReason || "Therapist unavailable",
            createdAt: Timestamp.now()
          });
        }
      });

      await batch.commit();
      setBlockReason("");
      setSelectedSlots([]);
      await fetchDayData();
    } catch (error) {
      console.error("Blocking error: ", error);
      alert("Failed to block slots.");
    } finally {
      setLoading(false);
    }
  };

  // Unblock Slots rules
  const handleUnblock = async () => {
    const blockIdsToDelete = selectedSlots
      .map((slot) => getSlotState(slot))
      .filter((state) => state.type === "blocked" && state.blockId)
      .map((state) => (state as any).blockId as string);

    if (blockIdsToDelete.length === 0) return;

    if (!confirm(`Unlock ${blockIdsToDelete.length} selected slot(s)?`)) return;

    setLoading(true);
    try {
      await Promise.all(blockIdsToDelete.map((id) => deleteDoc(doc(db, "blocks", id))));
      setSelectedSlots([]);
      await fetchDayData();
    } catch (error) {
      console.error(error);
      alert("Failed to unlock slots.");
    } finally {
      setLoading(false);
    }
  };

  const generateGoogleCalendarUrl = (app: Appointment) => {
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
      const title = encodeURIComponent(`Session at Ramesh Dental Clinic`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeStr}/${endTimeStr}`;
    } catch (err) {
      console.error(err);
      return "";
    }
  };

  // Automated WhatsApp Dispatch with Rich Templates, Delay Notes & Cloud API (with wa.me redirect fallback)
  const sendWhatsAppWithTemplate = async (
    app: Appointment,
    templateType: "confirm" | "delay" | "early" | "custom",
    customMsg?: string,
    mode: "api" | "redirect" = "api"
  ) => {
    const matchedP = patients.find(
      (p) =>
        (app.patientId && p.id === app.patientId) ||
        (app.patientName && p.name && p.name.trim().toLowerCase() === app.patientName.trim().toLowerCase())
    );
    const targetPhone = matchedP?.phone || app.patientPhone || app.phone;
    const cleanPhone = getCleanWhatsAppNumber(targetPhone);

    const effectiveDelay = isCustomDelay && customDelayInput ? parseInt(customDelayInput, 10) || delayMinutes : delayMinutes;
    const doctorText = app.assignedTherapist ? ` with *${app.assignedTherapist}*` : " with *Dr. Ramesh Darisi*";
    let message = "";

    if (templateType === "confirm") {
      const calendarUrl = generateGoogleCalendarUrl(app);
      const calendarMsg = calendarUrl ? `\n\nAdd to Google Calendar: ${calendarUrl}` : "";
      message = `Hi *${app.patientName}*, your appointment for *${app.serviceId}*${doctorText} on *${app.date}* at *${app.slot}* at Ramesh Dental Clinic is CONFIRMED!${calendarMsg}\n\nLooking forward to seeing you.`;
    } else if (templateType === "delay") {
      message = `Hi *${app.patientName}*, regarding your dental appointment scheduled at *${app.slot}* today${doctorText}:\nOur dentist is currently completing an in-depth clinical procedure with an ongoing patient. Kindly arrive approximately *${effectiveDelay} minutes after your scheduled time*. Thank you for your kind understanding! - Ramesh Dental Clinic`;
    } else if (templateType === "early") {
      message = `Hi *${app.patientName}*, kindly arrive approximately *${earlyMinutes} minutes before your scheduled appointment at ${app.slot}* today for initial clinical registration & dental prep. See you soon! - Ramesh Dental Clinic`;
    } else if (templateType === "custom") {
      message = customMsg || `Hi *${app.patientName}*, regarding your dental appointment on *${app.date}* at *${app.slot}* at Ramesh Dental Clinic...`;
    }

    if (mode === "redirect") {
      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      const win = window.open(waUrl, "_blank");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = waUrl;
      }
      return;
    }

    setSendingActionType(templateType);
    try {
      if (templateType === "confirm") {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "APPOINTMENT_APPROVED",
            payload: {
              patientName: app.patientName,
              patientPhone: targetPhone,
              serviceName: app.serviceId,
              date: app.date,
              slot: app.slot,
              therapistName: app.assignedTherapist || "Clinical Team",
              appointmentId: app.id,
            },
          }),
        });

        if (app.patientEmail) {
          const calUrl = generateGoogleCalendarUrl(app);
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "APPOINTMENT_APPROVED",
              payload: {
                patientName: app.patientName,
                patientEmail: app.patientEmail,
                serviceId: app.serviceId,
                date: app.date,
                slot: app.slot,
                assignedTherapist: app.assignedTherapist || "Clinical Team",
                googleCalendarUrl: calUrl,
              },
            }),
          }).catch((err) => console.warn(err));
        }

        showToast(`Booking confirmation re-sent to ${app.patientName}'s WhatsApp & Email!`);
      } else {
        await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CUSTOM_TEXT",
            payload: {
              patientPhone: targetPhone,
              text: message,
            },
          }),
        });

        if (app.patientEmail) {
          const subject =
            templateType === "delay"
              ? `🦷 Schedule Update: Running +${effectiveDelay} Mins Late — Ramesh Dental Clinic`
              : templateType === "early"
              ? `🦷 Reminder: Please Arrive ${earlyMinutes} Mins Early — Ramesh Dental Clinic`
              : `🦷 Clinical Update — Ramesh Dental Clinic`;

          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "CUSTOM",
              payload: {
                to: [{ email: app.patientEmail, name: app.patientName }],
                subject,
                htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h3 style="color: #0d9488; margin-top: 0;">🦷 Ramesh Dental Clinic</h3>
                  <p>Hello <strong>${app.patientName}</strong>,</p>
                  <p style="background: #f8fafc; border-left: 4px solid #0d9488; padding: 12px; border-radius: 4px; font-size: 14px; line-height: 1.6;">
                    ${message.replace(/\n/g, "<br/>")}
                  </p>
                  <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                    Ramesh Dental Clinic • Care Desk • +91 98765 43210
                  </p>
                </div>`,
              },
            }),
          }).catch((err) => console.warn("Delay/Early email dispatch notice:", err));
        }

        if (templateType === "delay") {
          showToast(`Delay note (+${effectiveDelay}m) dispatched to ${app.patientName}!`);
        } else if (templateType === "early") {
          showToast(`Early arrival reminder (${earlyMinutes}m) dispatched to ${app.patientName}!`);
        } else {
          showToast(`Custom note dispatched to ${app.patientName}!`);
          setCustomWhatsAppMessage("");
          setShowCustomMsgInput(false);
        }
      }
    } catch (err) {
      console.error("WhatsApp dispatch exception:", err);
      // Fallback to manual window open if network error
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, "_blank");
    } finally {
      setSendingActionType(null);
    }
  };

  const triggerWhatsAppConfirmation = (app: Appointment, isApprove: boolean) => {
    sendWhatsAppWithTemplate(app, isApprove ? "confirm" : "custom");
  };

  const triggerWhatsAppRedirect = (app: Appointment, isApprove: boolean) => {
    sendWhatsAppWithTemplate(app, isApprove ? "confirm" : "custom");
  };

  // Check if context option for booking is allowed (all selected slots must be free and not in the past)
  const isAllFreeSelected = () => {
    return selectedSlots.length > 0 && selectedSlots.every((s) => {
      const state = getSlotState(s);
      return state.type === "free" && !checkSlotInPast(s);
    });
  };

  const totalSlotsCount = allSlots.length;
  const activeDayAppointments = useMemo(() => {
    return appointments.filter((a) => a.status !== "rejected");
  }, [appointments]);

  const approvedDayCount = useMemo(() => {
    return activeDayAppointments.filter((a) => a.status === "approved").length;
  }, [activeDayAppointments]);

  const pendingDayCount = useMemo(() => {
    return activeDayAppointments.filter((a) => a.status === "pending").length;
  }, [activeDayAppointments]);

  const practoDayCount = useMemo(() => {
    return activeDayAppointments.filter((a) => isPractoAppointment(a)).length;
  }, [activeDayAppointments]);

  const sortedActiveAppointments = useMemo(() => {
    return [...activeDayAppointments].sort((a, b) => {
      const idxA = allSlots.indexOf(a.slot);
      const idxB = allSlots.indexOf(b.slot);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return (a.slot || "").localeCompare(b.slot || "");
    });
  }, [activeDayAppointments, allSlots]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return "";
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const bookedCount = activeDayAppointments.length;
  const blockedCount = allSlots.filter((s) => getSlotState(s).type === "blocked").length;
  const availableCount = allSlots.filter((s) => {
    const state = getSlotState(s);
    return state.type === "free" && !checkSlotInPast(s);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header Panel with Integrated Day Stats Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Day Snapshot</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Therapist view: click to select, hold <strong>Shift</strong> to select ranges. Right-click or use toolbar to Approve, Reject, or Block.
          </p>
        </div>

        {/* Right side: Date Selector & Integrated Summary Badges */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Day Metrics Badge Strip */}
          <div className="flex items-center gap-3 bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-750 px-4 py-2 rounded-2xl text-xs font-black select-none">
            <div className="text-center px-1">
              <span className="text-[9px] text-slate-400 block uppercase tracking-wider leading-none">Total</span>
              <span className="text-slate-800 dark:text-slate-200 text-sm font-black">{totalSlotsCount}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-1">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider leading-none">Booked</span>
              <span className="text-brand-green dark:text-emerald-400 text-sm font-black">{bookedCount}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-1">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider leading-none">Available</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black">{availableCount}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center px-1">
              <span className="text-[9px] text-slate-455 block uppercase tracking-wider leading-none">Blocked</span>
              <span className="text-red-500 text-sm font-black">{blockedCount}</span>
            </div>
          </div>

          {/* Date Selector Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePreviousDay}
              title="Previous Day"
              type="button"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleNextDay}
              title="Next Day"
              type="button"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={fetchDayData}
              disabled={loading}
              title="Refresh snapshot data"
              type="button"
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-green" : ""}`} />
            </button>

            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-brand-green" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs font-bold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 QUICK DAY APPOINTMENTS COUNTER & PREVIEW HUB */}
      {activeDayAppointments.length === 0 ? (
        <div className="md:hidden bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  0 Appointments
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  All Slots Free
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                No bookings or walk-ins found for {formattedSelectedDate || selectedDate}.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <span className="text-xs font-bold text-slate-400">
              {totalSlotsCount} time slots available
            </span>
          </div>
        </div>
      ) : (
        <div className="md:hidden bg-gradient-to-r from-emerald-500/10 via-brand-sand/40 to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-brand-green/30 dark:border-emerald-800/50 p-3.5 sm:p-4 rounded-2xl space-y-2.5 animate-fade-in shadow-xs">
          {/* Header row: Count & Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-green text-white flex items-center justify-center shadow-xs shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {activeDayAppointments.length} {activeDayAppointments.length === 1 ? "Appointment" : "Appointments"}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    • {formattedSelectedDate}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Quick preview of scheduled patients. Tap any chip to manage or view details.
                </p>
              </div>
            </div>

            {/* Pill summary counters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {approvedDayCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[10px] font-black text-emerald-800 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  {approvedDayCount} Approved
                </span>
              )}
              {pendingDayCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-[10px] font-black text-amber-800 dark:text-amber-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                  {pendingDayCount} Pending
                </span>
              )}
              {practoDayCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#263077] text-[10px] font-black text-white border border-[#3b4796] shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
                  <span>{practoDayCount} Practo</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
                </span>
              )}
            </div>
          </div>

          {/* Horizontal Quick Patient Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-green" /> Quick Peek:
            </span>
            {sortedActiveAppointments.map((app) => {
              const isPracto = isPractoAppointment(app);
              const cleanName = cleanPatientName(app.patientName);
              return (
                <button
                  key={app.id || `${app.slot}-${cleanName}`}
                  type="button"
                  onClick={() => openPatientActions(app)}
                  title={`Tap to view / manage ${cleanName} (${app.slot})`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-slate-700/80 border border-slate-200/90 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs shrink-0 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-brand-green shrink-0" />
                  <span className="text-brand-green font-black">{app.slot}</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="truncate max-w-[130px]">{cleanName}</span>
                  {isPracto && <PractoBadge size="xs" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Container */}
      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500 text-xs font-semibold">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green mr-2" />
          <span>Syncing day grid...</span>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-h-[70vh] overflow-y-auto pr-2 pb-16 animate-fade-in"
        >
          {allSlots.map((slot) => {
            const slotData = getSlotData(slot);
            const isSelected = selectedSlots.includes(slot);
            const isPast = slotData.isPast;
            
            let cardBorder = "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900";
            if (isSelected) {
              cardBorder = "ring-4 ring-brand-green border-brand-green bg-emerald-50/20 dark:bg-emerald-950/20";
            } else if (slotData.isBlocked) {
              cardBorder = "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 opacity-85";
            } else if (slotData.approvedCount >= slotData.maxCapacity) {
              cardBorder = "border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20";
            } else if (slotData.pendingCount > 0) {
              cardBorder = "border-amber-300 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10";
            }

            return (
              <div
                key={slot}
                id={`slot-${slot.replace(/[^a-zA-Z0-9]/g, "-")}`}
                onClick={(e) => handleSlotClick(e, slot)}
                onContextMenu={(e) => handleContextMenu(e, slot)}
                className={`group relative border rounded-[24px] p-4 sm:p-5 shadow-xs transition-all select-none duration-200 flex flex-col justify-between space-y-3.5 ${cardBorder}`}
              >
                {/* Header: Time & Capacity Badge */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-brand-charcoal dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                      {slot}
                    </span>
                    {slotData.isBlocked ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-slate-500 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Blocked
                      </span>
                    ) : slotData.approvedCount >= slotData.maxCapacity ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                        <Check className="w-2.5 h-2.5" /> Full ({slotData.approvedCount}/{slotData.maxCapacity})
                      </span>
                    ) : slotData.approvedCount > 0 || slotData.pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-brand-green dark:text-teal-400 bg-brand-green/10 px-2 py-0.5 rounded-full">
                        {slotData.approvedCount}/{slotData.maxCapacity} Filled
                      </span>
                    ) : isPast ? (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Past Slot
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        {slotData.remainingSlots} Slots Open
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-bold">
                    Cap: {slotData.maxCapacity}
                  </span>
                </div>

                {/* Body: Booked Patients Cards List */}
                <div className="space-y-2.5 flex-grow">
                  {slotData.slotApps.length > 0 ? (
                    slotData.slotApps.map((app) => {
                      const isPending = app.status === "pending";
                      const isApproved = app.status === "approved";
                      const isRejected = app.status === "rejected";

                      let patientCardStyle = "bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/70 dark:border-slate-800";
                      let dividerStyle = "border-slate-200/50 dark:border-slate-800/80";
                      let actionBtnStyle = "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-900/40 text-brand-green hover:bg-emerald-100";

                      if (isApproved) {
                        patientCardStyle = "bg-emerald-50/45 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs";
                        dividerStyle = "border-emerald-200/60 dark:border-emerald-900/40";
                        actionBtnStyle = "bg-emerald-100/70 dark:bg-emerald-900/50 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200/70";
                      } else if (isPending) {
                        patientCardStyle = "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/90 dark:border-amber-800/60 shadow-xs";
                        dividerStyle = "border-amber-200/60 dark:border-amber-900/40";
                        actionBtnStyle = "bg-amber-100/80 dark:bg-amber-900/50 border-amber-300/80 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 hover:bg-amber-200/80";
                      } else if (isRejected) {
                        patientCardStyle = "bg-red-50/40 dark:bg-red-950/25 border-red-200/70 dark:border-red-800/50 opacity-90";
                        dividerStyle = "border-red-200/60 dark:border-red-900/40";
                        actionBtnStyle = "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-100/70";
                      }

                      return (
                        <div
                          key={app.id || app.patientName}
                          className={`p-3 rounded-2xl border space-y-2 transition-all ${patientCardStyle}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate" title={cleanPatientName(app.patientName)}>
                                  {cleanPatientName(app.patientName)}
                                </span>
                                {isPractoAppointment(app) && <PractoBadge size="sm" />}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate font-semibold">
                                {app.serviceId}
                              </p>
                              {app.patientAddress && (
                                <p className="text-[9.5px] text-slate-600 dark:text-slate-300 font-bold truncate flex items-center gap-1 mt-0.5" title={app.patientAddress}>
                                  <MapPin className="w-2.5 h-2.5 text-brand-green shrink-0" />
                                  <span className="truncate">{app.patientAddress}</span>
                                </p>
                              )}
                            </div>

                            {/* Status Badge */}
                            {isApproved && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[9px] font-black text-emerald-700 dark:text-emerald-300 shrink-0">
                                Approved
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-[9px] font-black text-amber-700 dark:text-amber-300 shrink-0 animate-pulse">
                                Pending
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[9px] font-black text-red-700 dark:text-red-300 shrink-0">
                                Rejected
                              </span>
                            )}
                          </div>

                          {/* Therapist Assignment Dropdown */}
                          <div className={`flex items-center gap-2 pt-1 border-t ${dividerStyle}`}>
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <select
                              value={app.assignedTherapist || ""}
                              onChange={(e) => {
                                if (app.id) {
                                  handleAssignTherapist(app.id, e.target.value);
                                }
                              }}
                              className="w-full text-[10px] font-bold bg-transparent outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="">Assign Doctor / Specialist...</option>
                              {(clinicConfig.therapists || []).map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>

                          {/* Individual Patient Action Buttons */}
                          <div className={`flex items-center justify-between gap-2 pt-1.5 border-t ${dividerStyle}`}>
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApprove(app)}
                                  className="flex-1 py-1.5 px-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-[10px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                                  title="Approve booking"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openPatientActions(app)}
                                  className={`py-1.5 px-3 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${actionBtnStyle}`}
                                  title="Open Actions"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Actions</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openPatientActions(app)}
                                className={`w-full py-1.5 px-3 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${actionBtnStyle}`}
                                title="Open Actions"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span>Actions</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : slotData.isBlocked ? (
                    <div className="py-3 text-center space-y-1">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {slotData.blockReasonText}
                      </p>
                      <p className="text-[10px] text-slate-400">Time slot closed</p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500">
                        {isPast ? "No appointments" : "All slots open"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Action: + Book Walk-in / Add Patient button */}
                {slotData.remainingSlots > 0 && !isPast && !slotData.isBlocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSlots([slot]);
                      setIsBookForPatientOpen(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-brand-green/40 hover:border-brand-green bg-brand-green/5 hover:bg-brand-green/10 text-brand-green text-[10px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Book Walk-in ({slotData.remainingSlots} left)</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu?.visible && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[170px] rounded-xl border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 py-1.5 shadow-xl animate-zoom-in"
        >
          <div className="px-4 py-1 text-[9px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-855 uppercase tracking-wider mb-1">
            {selectedSlots.length > 1 ? `${selectedSlots.length} Slots Selected` : `Slot: ${contextMenu.slot}`}
          </div>
          
          {/* Option: Book for Patient (only if all selected are free) */}
          {isAllFreeSelected() && (
            <button
              onClick={() => setIsBookForPatientOpen(true)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-brand-bg/50 hover:text-brand-green"
            >
              <Plus className="h-3.5 w-3.5 text-brand-green" />
              Book for Patient
            </button>
          )}
          {!isAllFreeSelected() && appointments.some((a) => selectedSlots.includes(a.slot)) && (
            <>
              <button
                onClick={handleApprove}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-brand-bg/50 hover:text-brand-green"
              >
                <Check className="h-3.5 w-3.5 text-brand-green" />
                Approve Booking
              </button>
              
              <button
                onClick={triggerRejectionGuard}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
              >
                <X className="h-3.5 w-3.5 text-red-500" />
                Reject Booking
              </button>
            </>
          )}

          <div className="border-t border-slate-100 dark:border-slate-850 my-1" />

          {selectedSlots.some((s) => getSlotState(s).type === "blocked") ? (
            <button
              onClick={handleUnblock}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-805"
            >
              <Unlock className="h-3.5 w-3.5 text-slate-500" />
              Unblock Slot(s)
            </button>
          ) : (
            <button
              onClick={() => setBlockingModalOpen(true)}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-805"
            >
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              Block Slot(s)
            </button>
          )}
        </div>
      )}

      {/* Floating Actions Mobile-friendly Toolbar */}
      {selectedSlots.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-slate-800 text-white rounded-full px-6 py-4 shadow-2xl flex items-center gap-4 animate-slide-up max-w-[95vw] overflow-x-auto">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider shrink-0 border-r border-slate-800 pr-4">
            <span className="h-5 w-5 bg-brand-green text-white rounded-full flex items-center justify-center font-bold text-[10px]">
              {selectedSlots.length}
            </span>
            <span>Selected</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAllFreeSelected() ? (
              <button
                onClick={() => setIsBookForPatientOpen(true)}
                className="inline-flex items-center justify-center gap-1 bg-brand-green hover:bg-brand-green-hover px-4 py-2 text-xs font-black rounded-full transition-all hover:scale-105"
              >
                <Plus className="h-3.5 w-3.5" />
                Book Patient
              </button>
            ) : (
              <>
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center justify-center gap-1 bg-brand-green hover:bg-brand-green-hover px-4 py-2 text-xs font-black rounded-full transition-all hover:scale-105"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </button>

                <button
                  onClick={triggerRejectionGuard}
                  className="inline-flex items-center justify-center gap-1 bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-black rounded-full transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </>
            )}

            {selectedSlots.some((s) => getSlotState(s).type === "blocked") ? (
              <button
                onClick={handleUnblock}
                className="inline-flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-black rounded-full transition-colors"
              >
                <Unlock className="h-3.5 w-3.5" />
                Unblock
              </button>
            ) : (
              <button
                onClick={() => setBlockingModalOpen(true)}
                className="inline-flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-black rounded-full transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                Block
              </button>
            )}

            <button
              onClick={() => setSelectedSlots([])}
              className="text-xs text-slate-400 hover:text-white px-3 font-black"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Book for Patient Modal */}
      {mounted && isBookForPatientOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Book for Patient</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedDate} • Slots: {selectedSlots.join(", ")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchQuery("");
                  setPatientType("new");
                  setIsBookForPatientOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Patient Type Selectors */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-800 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setPatientType("new");
                    setSelectedPatient(null);
                    setSearchQuery("");
                    setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "", patientAddress: "" }));
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                    patientType === "new"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
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
                    setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "", patientAddress: "" }));
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                    patientType === "existing"
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-brand-green"
                  }`}
                >
                  Existing Patient
                </button>
              </div>

              <form id="bookForPatientForm" onSubmit={handleBookForPatientSubmit} className="space-y-4 pt-1">
                
                {patientType === "existing" ? (
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      Search Patient Profile (Name or Phone) *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type patient name or mobile number..."
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green text-slate-900 dark:text-white"
                      />
                    </div>
                    
                    {/* Dropdown suggestions list */}
                    {showDropdown && searchQuery.trim().length > 0 && (
                      <div className="absolute z-30 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1">
                        {patients
                          .filter((p) => 
                            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.phone.includes(searchQuery)
                          )
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(p);
                                setSearchQuery(p.name);
                                setPatientForm(prev => ({
                                  ...prev,
                                  patientName: p.name,
                                  patientPhone: p.phone,
                                  patientEmail: p.email || "",
                                  patientAddress: p.address || "",
                                  serviceId: p.treatmentPlan || prev.serviceId
                                }));
                                setShowDropdown(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-50 dark:border-slate-800 last:border-0"
                            >
                              <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                              <p className="text-[10px] text-slate-400">{p.phone} • {p.treatmentPlan}</p>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="patientName"
                      value={patientForm.patientName}
                      onChange={handlePatientInputChange}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                )}

                {(!selectedPatient || patientType === "new") ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                        Mobile/WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        name="patientPhone"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={patientForm.patientPhone}
                        onChange={handlePatientInputChange}
                        placeholder="e.g. 9206651295 (10 digits)"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                      />
                      <div className="flex items-center justify-between mt-1 px-1">
                        <span className="text-[10px] text-slate-400 font-medium">Indian mobile (10 digits)</span>
                        <span className={`text-[10px] font-bold ${
                          patientForm.patientPhone.length === 10
                            ? "text-emerald-500 font-extrabold"
                            : patientForm.patientPhone.length > 0
                            ? "text-amber-500"
                            : "text-slate-400"
                        }`}>
                          {patientForm.patientPhone.length}/10 digits
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        name="patientEmail"
                        value={patientForm.patientEmail}
                        onChange={handlePatientInputChange}
                        placeholder="john@example.com"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Residential Address / Locality</span>
                        <span className="text-[9px] font-semibold text-slate-400 lowercase">(Optional)</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-2.5 h-4 w-4 text-brand-green" />
                        <input
                          type="text"
                          name="patientAddress"
                          value={patientForm.patientAddress}
                          onChange={handlePatientInputChange}
                          placeholder="e.g. Flat 302, Green Meadows, Indiranagar"
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  selectedPatient && (
                    <div className="bg-emerald-50/50 dark:bg-teal-950/20 border border-emerald-200 dark:border-teal-800/40 p-4 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-brand-green dark:text-teal-400 uppercase tracking-wider">
                        <span>Patient Summary</span>
                        <Link 
                          href={`/dashboard/patients/${selectedPatient.id}`}
                          className="hover:underline flex items-center gap-1 font-bold"
                          target="_blank"
                        >
                          View Full Record <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <p><strong className="text-slate-900 dark:text-white">Phone:</strong> {selectedPatient.phone}</p>
                        {selectedPatient.email && <p><strong className="text-slate-900 dark:text-white">Email:</strong> {selectedPatient.email}</p>}
                        <p><strong className="text-slate-900 dark:text-white">Address:</strong> {selectedPatient.address || patientForm.patientAddress || "Not specified"}</p>
                        <p><strong className="text-slate-900 dark:text-white">Active Plan:</strong> {selectedPatient.treatmentPlan}</p>
                        
                        <div className="pt-2 border-t border-emerald-200/60 dark:border-teal-800/40">
                          <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                            Update Address for this visit:
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2 h-3.5 w-3.5 text-brand-green" />
                            <input
                              type="text"
                              name="patientAddress"
                              value={patientForm.patientAddress}
                              onChange={handlePatientInputChange}
                              placeholder="House/Flat No, Area, Locality..."
                              className="w-full rounded-xl border border-emerald-200 dark:border-teal-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Clinical Service Plan *
                  </label>
                  <select
                    name="serviceId"
                    value={patientForm.serviceId}
                    onChange={handlePatientInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    {servicesList.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Primary Therapist
                  </label>
                  <select
                    name="therapistName"
                    value={patientForm.therapistName}
                    onChange={handlePatientInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold cursor-pointer"
                  >
                    {(clinicConfig.therapists && clinicConfig.therapists.length > 0
                      ? clinicConfig.therapists
                      : ["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"]
                    ).map((docName) => (
                      <option key={docName} value={docName}>{docName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Inquiry Notes / Symptoms
                  </label>
                  <textarea
                    rows={2}
                    name="notes"
                    value={patientForm.notes}
                    onChange={handlePatientInputChange}
                    placeholder="Describe any pain or symptoms..."
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 select-none">
                  <input
                    type="checkbox"
                    id="manualNotifyWhatsApp"
                    checked={manualNotifyWhatsApp}
                    onChange={(e) => setManualNotifyWhatsApp(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer"
                  />
                  <label htmlFor="manualNotifyWhatsApp" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Notify patient via WhatsApp
                  </label>
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchQuery("");
                  setPatientType("new");
                  setIsBookForPatientOpen(false);
                }}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="bookForPatientForm"
                disabled={submittingPatientForm}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {submittingPatientForm ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Blocking Reason Dialog Modal */}
      {mounted && blockingModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Block Selected Slots</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Provide a reason to block these <strong>{selectedSlots.length}</strong> selected slots. Patients will not be able to book them online.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Blocking Reason
                </label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Doctor personal leave, Lunch hour block"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBlockingModalOpen(false)}
                  className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-grow bg-brand-green hover:bg-brand-green-hover text-white rounded-full py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Rejection Safeguard Modal */}
      {mounted && rejectionConfirmOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Cancel & Reject Appointment</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                This will release the slot and automatically dispatch an official cancellation notice via WhatsApp and Email.
              </p>
            </div>

            {/* Quick Reason Preset Chips */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Select Reason (or type custom below)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Doctor Unavailable",
                  "Emergency Clinical Case",
                  "Slot Capacity Exceeded",
                  "Patient Requested Cancellation",
                  "Clinic Closed / Maintenance"
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRejectionReason(chip)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      rejectionReason === chip
                        ? "bg-red-50 dark:bg-red-950/50 border-red-300 text-red-700 dark:text-red-300 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Custom Reason Textarea */}
              <div className="pt-1">
                <textarea
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter specific cancellation reason for patient..."
                  className="w-full text-xs font-semibold p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionConfirmOpen(false);
                  setPendingRejectionSlots([]);
                  setPendingActionApp(null);
                }}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectionConfirmed}
                className="flex-grow bg-red-600 hover:bg-red-500 text-white rounded-full py-2.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Confirm & Send Rejection
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* WhatsApp Rejection/Approval Preview Modal */}
      {mounted && notificationModalOpen && pendingActionApp && pendingActionType && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex justify-center">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${
                pendingActionType === "approve"
                  ? "bg-brand-green/15 dark:bg-teal-500/20 text-brand-green dark:text-teal-400"
                  : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              }`}>
                {pendingActionType === "approve" ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Confirm Appointment Approval
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Are you sure you want to approve this appointment for <strong>{cleanPatientName(pendingActionApp.patientName) || "the selected patient"}</strong>?
              </p>
            </div>

            {/* Automated Dispatch Indicator */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 p-3.5 rounded-2xl text-left space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                ⚡ Automated Meta WhatsApp & Email Dispatch
              </div>
              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 font-medium leading-relaxed">
                Official booking confirmation with Google Calendar 1-tap addition will be dispatched instantly via Clinic Bot.
              </p>
            </div>

            {/* Message Preview Box */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 animate-fade-in break-all max-h-48 overflow-y-auto overscroll-contain">
              <p className="font-bold text-slate-400 text-[10px] uppercase">Message Preview:</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-all whitespace-pre-line text-[11px] sm:text-xs">
                Hi {pendingActionApp.patientName || "there"}, your appointment request for *{pendingActionApp.serviceId || "Physiotherapy Consultation"}* on *{pendingActionApp.date || selectedDate}* at *{pendingActionApp.slot}* at Ramesh Dental Clinic is APPROVED!{"\n\n"}
                Add to Google Calendar: {generateGoogleCalendarUrl(pendingActionApp)}{"\n\n"}
                Looking forward to seeing you.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNotificationModalOpen(false);
                  setPendingActionApp(null);
                  setPendingActionType(null);
                }}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const appId = pendingActionApp.id!;
                  setNotificationModalOpen(false);
                  await handleSingleAppointmentStatus(appId, "approved", false);
                  showToast(`Appointment approved! Automated WhatsApp & Email sent to ${cleanPatientName(pendingActionApp.patientName) || "patient"}.`);
                  setPendingActionApp(null);
                  setPendingActionType(null);
                  setSelectedSlots([]);
                  await fetchDayData();
                }}
                className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Confirm & Auto-Notify
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* 🚀 DEDICATED INDIVIDUAL PATIENT ACTION & WHATSAPP HUB MODAL             */}
      {/* ========================================================================= */}
      {mounted && patientActionModalOpen && activePatientApp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-200/70 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white truncate" title={cleanPatientName(activePatientApp.patientName)}>
                    {cleanPatientName(activePatientApp.patientName)}
                  </h3>
                  {isPractoAppointment(activePatientApp) && <PractoBadge size="md" />}
                  {activePatientApp.status === "approved" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                      Approved
                    </span>
                  )}
                  {activePatientApp.status === "pending" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-[10px] font-black text-amber-700 dark:text-amber-300 animate-pulse">
                      Pending Approval
                    </span>
                  )}
                  {activePatientApp.status === "rejected" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-[10px] font-black text-red-700 dark:text-red-300">
                      Rejected / Cancelled
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-brand-green" />
                    {activePatientApp.date} • {activePatientApp.slot}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {(() => {
                      const matchedP = patients.find(
                        (p) =>
                          (activePatientApp.patientId && p.id === activePatientApp.patientId) ||
                          (activePatientApp.patientName && p.name && p.name.trim().toLowerCase() === activePatientApp.patientName.trim().toLowerCase())
                      );
                      return matchedP?.phone || activePatientApp.patientPhone || activePatientApp.phone;
                    })()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  {activePatientApp.serviceId}
                </p>
                {activePatientApp.patientAddress && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-xl shadow-2xs mt-1">
                    <MapPin className="w-3.5 h-3.5 text-brand-green shrink-0" />
                    <span>{activePatientApp.patientAddress}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setPatientActionModalOpen(false);
                  setActivePatientApp(null);
                }}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain flex-grow">
              
              {/* 1. Status Controls */}
              <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Appointment Status
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Operates on this patient only
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activePatientApp.status === "rejected" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (activePatientApp.id) {
                          await handleSingleAppointmentStatus(activePatientApp.id, "approved", false);
                          setActivePatientApp((prev) => prev ? { ...prev, status: "approved" } : null);
                          showToast(`Appointment restored to Approved! Patient notified.`);
                          await fetchDayData();
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore Appointment to Approved</span>
                    </button>
                  ) : activePatientApp.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          if (activePatientApp.id) {
                            await handleSingleAppointmentStatus(activePatientApp.id, "approved", false);
                            setActivePatientApp((prev) => prev ? { ...prev, status: "approved" } : null);
                            showToast(`Appointment approved! Patient notified.`);
                            await fetchDayData();
                          }
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve Booking</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientActionModalOpen(false);
                          triggerRejectionGuard(activePatientApp);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRescheduleApp(activePatientApp);
                          setPatientActionModalOpen(false);
                          setRescheduleModalOpen(true);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-brand-green dark:text-teal-300 hover:bg-teal-100 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                        title="Reschedule to another date & time (frees up current slot)"
                      >
                        <CalendarSync className="w-4 h-4" />
                        <span>Reschedule Slot</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientActionModalOpen(false);
                          triggerRejectionGuard(activePatientApp);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel Slot</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Assigned Dentist Selector */}
              <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-4 rounded-2xl space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Attending Dentist
                </label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={activePatientApp.assignedTherapist || ""}
                    onChange={(e) => {
                      if (activePatientApp.id) {
                        handleAssignTherapist(activePatientApp.id, e.target.value);
                      }
                    }}
                    className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">Auto-Assign / Unassigned</option>
                    {(clinicConfig.therapists || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. WhatsApp Communication Hub */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-brand-green flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Messages & Delay Alerts
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold">1-Tap Direct Send</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  
                  {/* Template A: Re-send Confirmation */}
                  <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-black text-brand-green flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Re-send Booking Confirmation
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                        Re-dispatches WhatsApp & Email confirmation with calendar link
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={sendingActionType === "confirm"}
                      onClick={() => sendWhatsAppWithTemplate(activePatientApp, "confirm")}
                      className="px-3 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {sendingActionType === "confirm" ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>{sendingActionType === "confirm" ? "Sending..." : "Send"}</span>
                    </button>
                  </div>

                  {/* Template B: Running Late / Session Delay */}
                  <div className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Running Session Delay (Come a bit late)
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Informs patient to arrive late due to ongoing treatment
                        </p>
                      </div>

                      {/* Minutes Selector Pills & Custom Option */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200/80 dark:border-amber-800">
                        {[10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setIsCustomDelay(false);
                              setDelayMinutes(mins);
                            }}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              !isCustomDelay && delayMinutes === mins
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            +{mins}m
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomDelay(!isCustomDelay)}
                          className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                            isCustomDelay
                              ? "bg-amber-500 text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    </div>

                    {isCustomDelay && (
                      <div className="flex items-center gap-2 pt-1 animate-fade-in">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Delay minutes:</span>
                        <input
                          type="number"
                          min="5"
                          max="120"
                          value={customDelayInput}
                          onChange={(e) => setCustomDelayInput(e.target.value)}
                          placeholder="e.g. 25"
                          className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 bg-white dark:bg-slate-900 outline-none"
                        />
                        <span className="text-[11px] font-bold text-slate-500">mins later</span>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={sendingActionType === "delay"}
                      onClick={() => sendWhatsAppWithTemplate(activePatientApp, "delay")}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      {sendingActionType === "delay" ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {sendingActionType === "delay"
                          ? "Sending Delay Alert..."
                          : `Send "+${isCustomDelay && customDelayInput ? customDelayInput : delayMinutes} Mins Late" Delay Note`}
                      </span>
                    </button>
                  </div>

                  {/* Template C: Arrive Early Preparation Alert */}
                  <div className="p-3.5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/30 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-black text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          Please Arrive Early
                        </p>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Pre-session clinical registration & dental prep
                        </p>
                      </div>

                      {/* Early Minutes Selector Pills */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-blue-200 dark:border-blue-800">
                        {[10, 15, 20].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setEarlyMinutes(mins)}
                            className={`px-2.5 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              earlyMinutes === mins
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={sendingActionType === "early"}
                      onClick={() => sendWhatsAppWithTemplate(activePatientApp, "early")}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      {sendingActionType === "early" ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {sendingActionType === "early"
                          ? "Sending Early Reminder..."
                          : `Send "Please Arrive ${earlyMinutes} Mins Early" Note`}
                      </span>
                    </button>
                  </div>

                  {/* Template D: Doctor Smart Custom Message */}
                  <div className="p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/30 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomMsgInput(!showCustomMsgInput)}
                      className="w-full flex items-center justify-between text-xs font-black text-purple-900 dark:text-purple-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        Type Custom Message (Doctor Context Only)
                      </span>
                      <span className="text-[10px] text-purple-600 font-bold">{showCustomMsgInput ? "Hide" : "Expand"}</span>
                    </button>

                    {showCustomMsgInput && (
                      <div className="space-y-2.5 pt-1 animate-fade-in text-left">
                        {/* Auto-prefill context badge */}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/60 text-[11px] text-slate-500 font-semibold space-y-1">
                          <p className="text-[10px] uppercase font-black text-purple-600">Auto-Prefilled Greeting:</p>
                          <p className="italic text-slate-700 dark:text-slate-300">
                            Hi <strong>{cleanPatientName(activePatientApp.patientName)}</strong>, regarding your appointment at Ramesh Dental Clinic:
                          </p>
                        </div>

                        {/* Doctor Context Input */}
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                            Doctor Context Note:
                          </label>
                          <textarea
                            rows={3}
                            value={customWhatsAppMessage}
                            onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                            placeholder="Enter context only (e.g. Please bring previous MRI scans and wear comfortable clothing)..."
                            className="w-full text-xs font-semibold p-2.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-purple-500"
                          />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={!customWhatsAppMessage.trim() || sendingActionType === "custom"}
                            onClick={() => {
                              const fullText = `Hi ${cleanPatientName(activePatientApp.patientName)}, regarding your appointment at Ramesh Dental Clinic:\n\n${customWhatsAppMessage.trim()}\n\n- Dr. ${activePatientApp.assignedTherapist || "Clinical Team"}, Ramesh Dental Clinic`;
                              sendWhatsAppWithTemplate(activePatientApp, "custom", fullText, "api");
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            {sendingActionType === "custom" ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>⚡ Send via Clinic Bot</span>
                          </button>

                          <button
                            type="button"
                            disabled={!customWhatsAppMessage.trim()}
                            onClick={() => {
                              const fullText = `Hi ${cleanPatientName(activePatientApp.patientName)}, regarding your appointment at Ramesh Dental Clinic:\n\n${customWhatsAppMessage.trim()}\n\n- Dr. ${activePatientApp.assignedTherapist || "Clinical Team"}, Ramesh Dental Clinic`;
                              sendWhatsAppWithTemplate(activePatientApp, "custom", fullText, "redirect");
                            }}
                            className="py-2 px-3 rounded-xl border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100/60 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Open in WhatsApp Web"
                          >
                            <span>Open Web</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* 4. Patient Profile & Actions Links */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                <a
                  href={`tel:${(() => {
                    const matchedP = patients.find(
                      (p) =>
                        (activePatientApp.patientId && p.id === activePatientApp.patientId) ||
                        (activePatientApp.patientName && p.name && p.name.trim().toLowerCase() === activePatientApp.patientName.trim().toLowerCase())
                    );
                    return matchedP?.phone || activePatientApp.patientPhone || activePatientApp.phone;
                  })()}`}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-green" />
                  <span>Call Patient</span>
                </a>

                <Link
                  href={`/dashboard/patients?search=${encodeURIComponent(activePatientApp.patientPhone)}`}
                  onClick={() => setPatientActionModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand-green" />
                  <span>Patient Profile</span>
                </Link>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/70 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPatientActionModalOpen(false);
                  setActivePatientApp(null);
                }}
                className="px-6 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="bg-brand-charcoal/95 dark:bg-slate-900/95 text-white backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 max-w-md pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold leading-snug">{actionToast}</p>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && selectedRescheduleApp && (
        <RescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedRescheduleApp(null);
          }}
          appointment={selectedRescheduleApp}
          userRole={currentUser?.role || "receptionist"}
          userName={currentUser?.name || "Clinic Staff"}
          userUid={currentUser?.uid || ""}
          onSuccess={async (updated) => {
            setPatientActionModalOpen(false);
            showToast(`Appointment successfully moved to ${updated.date} at ${updated.slot}! Old slot is now free.`);
            await fetchDayData();
          }}
        />
      )}

    </div>
  );
}
