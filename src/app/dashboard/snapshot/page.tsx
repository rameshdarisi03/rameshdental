"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
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
  createPatient,
  updatePatient,
  Patient
} from "@/lib/patientsDb";
import {
  Calendar,
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
  Phone
} from "lucide-react";
import Link from "next/link";

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
  const [showCustomMsgInput, setShowCustomMsgInput] = useState(false);

  // Book for Patient modal drawer states
  const [isBookForPatientOpen, setIsBookForPatientOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    patientName: "",
    patientPhone: "",
    patientEmail: "",
    serviceId: "General Physiotherapy Consultation",
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
    "General Physiotherapy Consultation",
    "Gait & Biomechanical Analysis",
    "Sports Injury Rehabilitation",
    "Spine & Musculoskeletal Care",
    "Post-Operative Orthopedic Care",
    "Dry Needling & Myofascial Release",
    "Custom Insoles & Orthotics Fitment",
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
    sendWhatsApp: boolean = false
  ) => {
    try {
      const docRef = doc(db, "appointments", appointmentId);
      const auditData = {
        status: newStatus,
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
      if (pendingActionApp && pendingActionApp.id) {
        // Isolated single-patient rejection
        await handleSingleAppointmentStatus(pendingActionApp.id, "rejected", false);
        setPendingActionType("reject");
        setNotificationModalOpen(true);
      } else if (pendingRejectionSlots.length > 0) {
        const targetApps = appointments.filter((app) => pendingRejectionSlots.includes(app.slot));
        const batch = writeBatch(db);
        
        const auditData = {
          status: "rejected" as const,
          actionedByUid: currentUser?.uid || "system",
          actionedByName: currentUser?.name || "Clinic Staff",
          actionedByRole: currentUser?.role || "receptionist",
          actionedAt: Timestamp.now()
        };

        targetApps.forEach((app) => {
          if (app.id) {
            const docRef = doc(db, "appointments", app.id);
            batch.update(docRef, auditData);
          }
        });
        await batch.commit();

        if (targetApps.length > 0) {
          setPendingActionApp({ ...targetApps[0], ...auditData });
          setPendingActionType("reject");
          setNotificationModalOpen(true);
        }
      }

      setPendingRejectionSlots([]);
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
      setNotifyWhatsApp(true);
      setNotificationModalOpen(true);
      return;
    }

    const targetApps = appointments.filter((app) => selectedSlots.includes(app.slot));
    if (targetApps.length === 0) {
      alert("No patient appointments selected to approve.");
      return;
    }

    setPendingActionApp(targetApps[0]);
    setPendingActionType("approve");
    setNotifyWhatsApp(true);
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

      setIsBookForPatientOpen(false);
      // Reset form
      setPatientForm({
        patientName: "",
        patientPhone: "",
        patientEmail: "",
        serviceId: "General Physiotherapy Consultation",
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

      // Automate Patient Profile Integration
      if (patientType === "new") {
        try {
          await createPatient({
            name: patientName,
            email: patientEmail,
            phone: patientPhone,
            treatmentPlan: bookingService,
            status: "active",
            lastVisit: isFuture ? "N/A" : formattedBookingDate,
            upcoming: isFuture ? formattedBookingDate : "Pending Schedule"
          });
        } catch (patientErr) {
          console.error("Failed to automatically register new patient profile: ", patientErr);
        }
      } else if (selectedPatient && selectedPatient.id) {
        try {
          const updateData: any = {
            status: "active",
            treatmentPlan: bookingService
          };
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
    const { name, value } = e.target;
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
      const title = encodeURIComponent(`Session at Gait Physio Clinic`);
      
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeStr}/${endTimeStr}`;
    } catch (err) {
      console.error(err);
      return "";
    }
  };

  // Launch WhatsApp with Rich Pre-Made Templates & Delay Notifications (Popup-blocker proof)
  const sendWhatsAppWithTemplate = (
    app: Appointment,
    templateType: "confirm" | "delay" | "early" | "custom",
    customMsg?: string
  ) => {
    let cleanPhone = app.patientPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = cleanPhone.replace(/^0+/, "");
    }
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      cleanPhone = "919206651295";
    }

    const therapistText = app.assignedTherapist ? ` with *${app.assignedTherapist}*` : "";
    let message = "";

    if (templateType === "confirm") {
      const calendarUrl = generateGoogleCalendarUrl(app);
      const calendarMsg = calendarUrl ? `\n\nAdd to Google Calendar: ${calendarUrl}` : "";
      message = `Hi *${app.patientName}*, your appointment for *${app.serviceId}*${therapistText} on *${app.date}* at *${app.slot}* at Gait Physio Clinic is CONFIRMED!${calendarMsg}\n\nLooking forward to seeing you.`;
    } else if (templateType === "delay") {
      message = `Hi *${app.patientName}*, regarding your session scheduled at *${app.slot}* today${therapistText}:\nOur therapist is currently completing an in-depth clinical procedure with an ongoing patient. Kindly arrive approximately *${delayMinutes} minutes later* (around ${app.slot}). Thank you for your kind understanding!`;
    } else if (templateType === "early") {
      message = `Hi *${app.patientName}*, kindly arrive *10 minutes before* your appointment at *${app.slot}* today for initial biometric preparation. See you soon!`;
    } else if (templateType === "custom") {
      message = customMsg || `Hi *${app.patientName}*, regarding your appointment on *${app.date}* at *${app.slot}* at Gait Physio Clinic...`;
    }

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    // Popup-blocker proof dispatch
    const win = window.open(waUrl, "_blank");
    if (!win || win.closed || typeof win.closed === "undefined") {
      window.location.href = waUrl;
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
  const bookedCount = allSlots.filter((s) => getSlotState(s).type === "appointment").length;
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

      {/* Helper Info Note */}
      <div className="flex gap-2.5 bg-brand-sand/60 dark:bg-slate-900/60 border border-brand-green/20 p-4 rounded-2xl text-slate-655 dark:text-slate-300 text-xs">
        <Info className="h-4.5 w-4.5 text-brand-green shrink-0 mt-0.5" />
        <p className="leading-relaxed font-semibold">
          <strong>Capacity & Therapist Grid:</strong> Multi-patient capacity slots allow concurrent bookings per therapist. Assign therapists directly from the dropdown or 1-tap book walk-ins.
        </p>
      </div>

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
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {app.patientName}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate font-semibold">
                                {app.serviceId}
                              </p>
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
                              <option value="">Assign Therapist...</option>
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
                    setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "" }));
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
                    setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "" }));
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
                        value={patientForm.patientPhone}
                        onChange={handlePatientInputChange}
                        placeholder="e.g. 9206651295"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                      />
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
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        <p><strong className="text-slate-900 dark:text-white">Phone:</strong> {selectedPatient.phone}</p>
                        {selectedPatient.email && <p><strong className="text-slate-900 dark:text-white">Email:</strong> {selectedPatient.email}</p>}
                        <p><strong className="text-slate-900 dark:text-white">Active Plan:</strong> {selectedPatient.treatmentPlan}</p>
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
                      : ["Dr. Sarah Jenkins", "Dr. Rohan Das"]
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
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Confirm Rejection</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Are you sure you want to reject the selected appointment booking(s)? This will cancel their slots, make them available for other patients, and launch a WhatsApp notification template.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionConfirmOpen(false);
                  setPendingRejectionSlots([]);
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
                Reject Appointment(s)
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
                {pendingActionType === "approve" ? "Confirm Appointment Approval" : "Appointment Rejected"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                {pendingActionType === "approve" ? (
                  <>Are you sure you want to approve this appointment for <strong>{pendingActionApp.patientName}</strong>?</>
                ) : (
                  <>Status updated successfully in the system database. Would you like to notify <strong>{pendingActionApp.patientName}</strong> via WhatsApp?</>
                )}
              </p>
            </div>

            {/* Checkbox toggle (only for approval confirmation) */}
            {pendingActionType === "approve" && (
              <div className="flex items-center justify-center gap-2 py-1 select-none">
                <input
                  type="checkbox"
                  id="notifyWhatsApp"
                  checked={notifyWhatsApp}
                  onChange={(e) => setNotifyWhatsApp(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer"
                />
                <label htmlFor="notifyWhatsApp" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                  Notify patient via WhatsApp
                </label>
              </div>
            )}

            {/* Preview Box */}
            {(pendingActionType === "reject" || (pendingActionType === "approve" && notifyWhatsApp)) && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 animate-fade-in break-all max-h-48 overflow-y-auto overscroll-contain">
                <p className="font-bold text-slate-400 text-[10px] uppercase">Message Preview:</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-all whitespace-pre-line text-[11px] sm:text-xs">
                  {pendingActionType === "approve" ? (
                    <>
                      Hi {pendingActionApp.patientName}, your appointment request for *{pendingActionApp.serviceId}* on *{pendingActionApp.date}* at *{pendingActionApp.slot}* at Gait Physio Clinic is APPROVED!{"\n\n"}
                      Add to Google Calendar: {generateGoogleCalendarUrl(pendingActionApp)}{"\n\n"}
                      Looking forward to seeing you.
                    </>
                  ) : (
                    `"Hi ${pendingActionApp.patientName}, we regret to inform you that we had to reschedule/decline your appointment request on *${pendingActionApp.date}* at *${pendingActionApp.slot}* due to schedule overrides. Please visit our website to select another slot."`
                  )}
                </p>
              </div>
            )}

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
                {pendingActionType === "approve" ? "No, Cancel" : "No"}
              </button>
              {pendingActionType === "approve" ? (
                <button
                  type="button"
                  onClick={async () => {
                    const appId = pendingActionApp.id!;
                    setNotificationModalOpen(false);
                    await handleStatusChange(appId, "approved", notifyWhatsApp);
                    setPendingActionApp(null);
                    setPendingActionType(null);
                  }}
                  className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Yes, Approve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const appId = pendingActionApp.id!;
                    setNotificationModalOpen(false);
                    await handleStatusChange(appId, "rejected", true);
                    setPendingActionApp(null);
                    setPendingActionType(null);
                  }}
                  className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <MessageSquare className="h-4 w-4" />
                  Yes, Send WhatsApp
                </button>
              )}
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
                  <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                    {activePatientApp.patientName}
                  </h3>
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
                    {activePatientApp.patientPhone}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                  {activePatientApp.serviceId}
                </p>
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
                  {activePatientApp.status !== "approved" && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (activePatientApp.id) {
                          await handleSingleAppointmentStatus(activePatientApp.id, "approved", false);
                          setActivePatientApp((prev) => prev ? { ...prev, status: "approved" } : null);
                        }
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Booking</span>
                    </button>
                  )}

                  {activePatientApp.status !== "rejected" ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (activePatientApp.id) {
                          setPatientActionModalOpen(false);
                          triggerRejectionGuard(activePatientApp);
                        }
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel / Reject</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        if (activePatientApp.id) {
                          await handleSingleAppointmentStatus(activePatientApp.id, "approved", false);
                          setActivePatientApp((prev) => prev ? { ...prev, status: "approved" } : null);
                        }
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-brand-green hover:bg-emerald-50 text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restore to Approved</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Assigned Therapist Selector */}
              <div className="bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 p-4 rounded-2xl space-y-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                  Assigned Therapist
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
                  
                  {/* Template A: Confirmation */}
                  <button
                    type="button"
                    onClick={() => sendWhatsAppWithTemplate(activePatientApp, "confirm")}
                    className="w-full text-left p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-black text-brand-green flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Send Booking Confirmation
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                        Confirms slot with therapist name and Google Calendar link
                      </p>
                    </div>
                    <Send className="w-4 h-4 text-brand-green shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

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

                      {/* Minutes Selector Pills */}
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-200/80 dark:border-amber-800">
                        {[10, 15, 20, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setDelayMinutes(mins)}
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                              delayMinutes === mins
                                ? "bg-amber-500 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            }`}
                          >
                            +{mins}m
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => sendWhatsAppWithTemplate(activePatientApp, "delay")}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send "+{delayMinutes} Mins Late" Delay Note</span>
                    </button>
                  </div>

                  {/* Template C: Arrive 10m Early */}
                  <button
                    type="button"
                    onClick={() => sendWhatsAppWithTemplate(activePatientApp, "early")}
                    className="w-full text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Please Arrive 10 Mins Early
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold truncate">
                        Pre-session preparation reminder
                      </p>
                    </div>
                    <Send className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Template D: Custom Message Input */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomMsgInput(!showCustomMsgInput)}
                      className="w-full flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500" />
                        Type Custom WhatsApp Message
                      </span>
                      <span className="text-[10px] text-slate-400">{showCustomMsgInput ? "Hide" : "Expand"}</span>
                    </button>

                    {showCustomMsgInput && (
                      <div className="space-y-2 pt-1 animate-fade-in">
                        <textarea
                          rows={3}
                          value={customWhatsAppMessage}
                          onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                          placeholder="Type custom note for patient..."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:border-brand-green"
                        />
                        <button
                          type="button"
                          disabled={!customWhatsAppMessage.trim()}
                          onClick={() => sendWhatsAppWithTemplate(activePatientApp, "custom", customWhatsAppMessage)}
                          className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Custom Message</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* 4. Patient Profile & Actions Links */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                <a
                  href={`tel:${activePatientApp.patientPhone}`}
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

    </div>
  );
}
