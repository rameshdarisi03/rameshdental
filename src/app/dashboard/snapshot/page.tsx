"use client";

import { useEffect, useState, useRef } from "react";
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
  Search
} from "lucide-react";
import Link from "next/link";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DaySnapshot() {
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
  const allSlots = generateSlotsFromHours(
    clinicConfig.morningStart,
    clinicConfig.morningEnd,
    clinicConfig.eveningStart,
    clinicConfig.eveningEnd,
    clinicConfig.slotDuration
  );

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
      // 1. Fetch appointments for selectedDate
      const appQuery = query(collection(db, "appointments"), where("date", "==", selectedDate));
      const appSnapshot = await getDocs(appQuery);
      const appList: Appointment[] = [];
      appSnapshot.forEach((doc) => {
        appList.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(appList);

      // 2. Fetch blocks for selectedDate
      const blockQuery = query(collection(db, "blocks"), where("date", "==", selectedDate));
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

  // Click slot handler with Shift-Key support
  const handleSlotClick = (e: React.MouseEvent, slot: string) => {
    if (e.button === 2) return; // ignore right clicks

    // Ignore selection of past free slots
    const state = getSlotState(slot);
    if (state.type === "free" && isSlotInPast(slot, selectedDate)) {
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
          return !(sState.type === "free" && isSlotInPast(s, selectedDate));
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
    if (state.type === "free" && isSlotInPast(slot, selectedDate)) {
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

  // Check state of slot
  const getSlotState = (slot: string) => {
    const app = appointments.find((a) => a.slot === slot);
    if (app) {
      return { type: "appointment", data: app } as const;
    }

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

    if (isBlocked) {
      return { type: "blocked", reason: blockReasonText, blockId } as const;
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

  const triggerRejectionGuard = () => {
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

      // Launch WhatsApp rejection template popup
      setPendingActionApp({ ...targetApps[0], ...auditData });
      setPendingActionType("reject");
      setNotificationModalOpen(true);

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
  const handleApprove = () => {
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
    if (!pendingActionApp) return;
    setLoading(true);
    try {
      const targetApps = appointments.filter((app) => selectedSlots.includes(app.slot));
      const batch = writeBatch(db);
      const auditData = {
        status: "approved" as const,
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

      if (shouldNotify) {
        triggerWhatsAppConfirmation({ ...pendingActionApp, ...auditData }, true);
      }

      setNotificationModalOpen(false);
      setPendingActionApp(null);
      setPendingActionType(null);
      setSelectedSlots([]);
      await fetchDayData();
    } catch (error) {
      console.error("Approval error: ", error);
      alert("Failed to approve appointments.");
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

      setIsBookForPatientOpen(false);
      // Reset form
      setPatientForm({
        patientName: "",
        patientPhone: "",
        patientEmail: "",
        serviceId: "General Physiotherapy Consultation",
        notes: "",
      });

      // Automate Patient Profile Integration
      if (patientType === "new") {
        try {
          await createPatient({
            name: patientForm.patientName,
            email: patientForm.patientEmail,
            phone: patientForm.patientPhone,
            treatmentPlan: patientForm.serviceId,
            status: "active",
            lastVisit: selectedDate
          });
        } catch (patientErr) {
          console.error("Failed to automatically register new patient profile: ", patientErr);
        }
      } else if (selectedPatient && selectedPatient.id) {
        try {
          await updatePatient(selectedPatient.id, {
            lastVisit: selectedDate,
            status: "active",
            treatmentPlan: patientForm.serviceId
          });
        } catch (patientErr) {
          console.error("Failed to update existing patient last visit: ", patientErr);
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

  // Launch WhatsApp Confirmation
  const triggerWhatsAppConfirmation = (app: Appointment, isApprove: boolean) => {
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

    const calendarUrl = generateGoogleCalendarUrl(app);
    const calendarMsg = isApprove && calendarUrl ? `\n\nAdd to Google Calendar: ${calendarUrl}` : "";
    const message = isApprove
      ? `Hi ${app.patientName}, your appointment request for *${app.serviceId}* on *${app.date}* at *${app.slot}* at Gait Physio Clinic is APPROVED!${calendarMsg}\n\nLooking forward to seeing you.`
      : `Hi ${app.patientName}, we regret to inform you that we had to reschedule/decline your appointment request on *${app.date}* at *${app.slot}* due to schedule overrides. Please visit our website to select another slot.`;

    const encodedMessage = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(waUrl, "_blank");
  };

  // Check if context option for booking is allowed (all selected slots must be free and not in the past)
  const isAllFreeSelected = () => {
    return selectedSlots.length > 0 && selectedSlots.every((s) => {
      const state = getSlotState(s);
      return state.type === "free" && !isSlotInPast(s, selectedDate);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Day Snapshot</h1>
          <p className="text-sm text-slate-500 mt-1">
            Therapist view: click to select, hold <strong>Shift</strong> to select ranges. Right-click or use toolbar to Approve, Reject, or Block.
          </p>
        </div>

        {/* Date Selector and Refresh Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePreviousDay}
            title="Previous Day"
            type="button"
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleNextDay}
            title="Next Day"
            type="button"
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={fetchDayData}
            disabled={loading}
            title="Refresh snapshot data"
            type="button"
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <RotateCw className={`h-4.5 w-4.5 ${loading ? "animate-spin text-brand-green" : ""}`} />
          </button>

          <div className="relative">
            <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 pl-11 pr-4 py-2 text-xs font-bold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Helper Info Note */}
      <div className="flex gap-2.5 bg-[#f0f4f2] dark:bg-teal-950/20 border border-brand-green/20 p-4 rounded-2xl text-slate-650 dark:text-teal-400 text-xs">
        <Info className="h-4.5 w-4.5 text-brand-green shrink-0 mt-0.5" />
        <p className="leading-relaxed font-semibold">
          <strong>Grid Instructions:</strong> Click cells to select, hold <strong>Shift</strong> to select ranges. Right-click to access **Book for Patient**, Approve, Reject, or Block. Floating actions bar handles adjustments on tablet screens.
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
            const slotState = getSlotState(slot);
            const isSelected = selectedSlots.includes(slot);
            
            let cardClasses = "group relative border rounded-3xl p-5 shadow-sm transition-all select-none cursor-pointer duration-300 hover:scale-[1.02] hover:shadow-md ";
            let statusIndicator = null;
            let detailNode = null;

            // Highlight ring if selected
            if (isSelected) {
              cardClasses += "ring-4 ring-brand-green border-brand-green ";
            }

            if (slotState.type === "appointment") {
              const app = slotState.data;
              const isPending = app.status === "pending";
              const isApproved = app.status === "approved";
              const isRejected = app.status === "rejected";

              if (isApproved) {
                cardClasses += "bg-gradient-to-br from-[#f0f4f2] to-[#fafcfb] dark:from-slate-900 dark:to-slate-950 border-l-[6px] border-l-brand-green border-slate-200/80 shadow-sm";
                statusIndicator = (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-green/10 text-[9px] font-black uppercase tracking-wider text-brand-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
                    Approved
                  </span>
                );
              } else if (isPending) {
                cardClasses += "bg-gradient-to-br from-amber-50/80 to-yellow-50/20 dark:from-amber-950/25 dark:to-yellow-950/5 border-l-[6px] border-l-amber-500 border-amber-250/60 dark:border-amber-900/50 shadow-amber-500/5";
                statusIndicator = (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100/60 dark:bg-amber-950/50 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                    Pending
                  </span>
                );
              } else {
                cardClasses += "bg-gradient-to-br from-red-50/80 to-rose-50/20 dark:from-red-955/25 dark:to-rose-950/5 border-l-[6px] border-l-red-500 border-red-250/60 dark:border-red-900/50 shadow-red-500/5";
                statusIndicator = (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100/60 dark:bg-red-950/50 text-[9px] font-black uppercase tracking-wider text-red-650 dark:text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Rejected
                  </span>
                );
              }

              detailNode = (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`font-black text-sm truncate ${
                      isApproved ? "text-brand-charcoal dark:text-emerald-50" :
                      isPending ? "text-amber-950 dark:text-amber-50" :
                      "text-red-955 dark:text-red-50"
                    }`}>{app.patientName}</p>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{slot}</p>
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-350 truncate font-bold leading-tight">{app.serviceId}</p>
                  
                  {/* Audit trail indicator */}
                  {(app.createdByName || app.actionedByName) && (
                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-tight">
                      {app.type === "manual" && app.createdByName && `Manual: ${app.createdByName}`}
                      {app.actionedByName && app.status !== "pending" && ` • Action: ${app.actionedByName}`}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-850">
                    {statusIndicator}
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-tight truncate max-w-[60%]">
                      {app.patientPhone}
                    </p>
                  </div>
                </div>
              );

            } else if (slotState.type === "blocked") {
              cardClasses += "bg-gradient-to-br from-slate-100/90 to-slate-50/40 dark:from-slate-900/60 dark:to-slate-950/40 border-l-[6px] border-l-slate-400/80 border-slate-200 dark:border-slate-800 opacity-90";
              detailNode = (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="inline-flex items-center gap-1 bg-slate-205 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-350">
                      <Lock className="h-2.5 w-2.5 text-slate-500" />
                      Blocked
                    </span>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0 bg-slate-205 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{slot}</p>
                  </div>
                  <p className="text-xs text-slate-550 dark:text-slate-355 truncate font-semibold">Reason: {slotState.reason}</p>
                  <p className="text-[10px] text-slate-400 italic font-medium">Availability overridden</p>
                </div>
              );
            } else {
              // Free Slot
              const isPast = isSlotInPast(slot, selectedDate);
              if (isPast) {
                cardClasses += "bg-slate-100/60 dark:bg-slate-905 border-slate-200 dark:border-slate-800 text-slate-450 opacity-60 cursor-not-allowed hover:scale-100 hover:shadow-none";
              } else {
                cardClasses += "border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/10 hover:border-brand-green/80 hover:bg-[#f0f4f2]/30 cursor-pointer";
              }
              detailNode = (
                <div className="h-full flex flex-col justify-between py-1 min-h-[92px]">
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-black tracking-wider ${isPast ? "text-slate-400" : "text-brand-green"}`}>
                      {isPast ? "PAST SLOT" : "AVAILABLE"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!isPast && <Plus className="h-3 w-3 text-brand-green opacity-0 group-hover:opacity-100 transition-opacity" />}
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 shrink-0 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">{slot}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 italic font-semibold">
                    {isPast ? "Unavailable" : "Free slot"}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={slot}
                onClick={(e) => handleSlotClick(e, slot)}
                onContextMenu={(e) => handleContextMenu(e, slot)}
                className={cardClasses}
              >
                {detailNode}
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

      {/* Book for Patient Modal Drawer */}
      {isBookForPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-955/45 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-205 dark:border-slate-800 p-6 flex flex-col justify-between overflow-y-auto relative animate-slide-in">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-brand-charcoal dark:text-white">Book for Patient</h3>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setSearchQuery("");
                    setPatientType("new");
                    setIsBookForPatientOpen(false);
                  }}
                  className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-slate-450 leading-relaxed font-semibold">
                Manually schedule an approved booking on <strong>{selectedDate}</strong> for slots: <strong>{selectedSlots.join(", ")}</strong>.
              </p>

              {/* Patient Type Selectors */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 border border-slate-200/80 dark:border-slate-855 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setPatientType("new");
                    setSelectedPatient(null);
                    setSearchQuery("");
                    setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "" }));
                  }}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${
                    patientType === "new"
                      ? "bg-[#1b3d2f] text-white shadow-sm"
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
                  className={`flex-1 rounded-lg py-1.5 text-xs font-black transition-all ${
                    patientType === "existing"
                      ? "bg-[#1b3d2f] text-white shadow-sm"
                      : "text-slate-500 hover:text-brand-green"
                  }`}
                >
                  Existing Patient
                </button>
              </div>

              <form id="bookForPatientForm" onSubmit={handleBookForPatientSubmit} className="space-y-4 pt-1">
                
                {patientType === "existing" ? (
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                      Search Patient Profile (Name or Phone) *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-brand-green" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Type patient name or mobile number..."
                        className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green text-slate-900 dark:text-white"
                      />
                    </div>
                    
                    {/* Dropdown suggestions list */}
                    {showDropdown && searchQuery.trim().length > 0 && (
                      <div className="absolute z-30 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xl py-1">
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
                              className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#f0f4f2] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 font-semibold border-b border-slate-50 dark:border-slate-850 last:border-0"
                            >
                              <div className="font-extrabold text-brand-charcoal dark:text-white">{p.name}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">{p.phone} • Plan: {p.treatmentPlan}</div>
                            </button>
                          ))}
                        {patients.filter((p) => 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.phone.includes(searchQuery)
                        ).length === 0 && (
                          <div className="px-3 py-2.5 text-xs text-slate-400 italic text-center">
                            No matching patient records found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="patientName"
                      value={patientForm.patientName}
                      onChange={handlePatientInputChange}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-955 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                )}

                {(!selectedPatient || patientType === "new") ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                        Mobile/WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        name="patientPhone"
                        value={patientForm.patientPhone}
                        onChange={handlePatientInputChange}
                        placeholder="e.g. 9206651295"
                        className="w-full rounded-xl border border-slate-200/80 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-955 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        name="patientEmail"
                        value={patientForm.patientEmail}
                        onChange={handlePatientInputChange}
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                      />
                    </div>
                  </>
                ) : (
                  selectedPatient && (
                    <div className="bg-[#f0f4f2]/40 dark:bg-brand-green/5 border border-brand-green/10 p-4 rounded-xl space-y-2.5 animate-fade-in-up">
                      <div className="flex justify-between items-center text-[9px] font-black text-brand-green uppercase tracking-wider">
                        <span>Patient Summary</span>
                        <Link 
                          href={`/dashboard/patients/${selectedPatient.id}`}
                          target="_blank"
                          className="underline hover:text-brand-green-hover"
                        >
                          Full Profile →
                        </Link>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Patient ID:</div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-350">{selectedPatient.id}</div>
                        
                        <div className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Full Name:</div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-350">{selectedPatient.name}</div>
                        
                        <div className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Phone / Email:</div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-350 truncate">{selectedPatient.phone}</div>
                        
                        <div className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Last Visited:</div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-355">{selectedPatient.lastVisit || "First session"}</div>
                        
                        <div className="text-slate-400 font-bold uppercase text-[8px] tracking-wider">Active Plan:</div>
                        <div className="font-extrabold text-slate-700 dark:text-slate-355 truncate">{selectedPatient.treatmentPlan || "None"}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setSearchQuery("");
                          setPatientForm(prev => ({ ...prev, patientName: "", patientPhone: "", patientEmail: "" }));
                        }}
                        className="text-[9px] text-red-500 font-black underline hover:text-red-755 cursor-pointer block border-0 bg-transparent p-0 pt-0.5"
                      >
                        Change Selection
                      </button>
                    </div>
                  )
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Physiotherapy Service
                  </label>
                  <select
                    name="serviceId"
                    value={patientForm.serviceId}
                    onChange={handlePatientInputChange}
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                  >
                    {servicesList.map((svc) => (
                        <option key={svc} value={svc}>
                          {svc}
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Inquiry Notes / Symptoms
                  </label>
                  <textarea
                    rows={2}
                    name="notes"
                    value={patientForm.notes}
                    onChange={handlePatientInputChange}
                    placeholder="Describe any pain or symptoms..."
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-955 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 select-none">
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
              </form>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchQuery("");
                  setPatientType("new");
                  setIsBookForPatientOpen(false);
                }}
                className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="bookForPatientForm"
                disabled={submittingPatientForm}
                className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-3.5 text-xs font-black shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {submittingPatientForm ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Confirm Booking"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocking Reason Dialog Modal */}
      {blockingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xl space-y-5 animate-zoom-in">
            <h3 className="text-lg font-black text-brand-charcoal dark:text-white">Block Selected Slots</h3>
            <p className="text-xs text-slate-550 leading-relaxed font-semibold">
              Provide a reason to block these <strong>{selectedSlots.length}</strong> selected slots. Patients will not be able to book them online.
            </p>

            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Blocking Reason
                </label>
                <input
                  type="text"
                  required
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Doctor personal leave, Lunch hour block"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setBlockingModalOpen(false)}
                  className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-grow bg-brand-green hover:bg-brand-green-hover text-white rounded-full py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Save Availability Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Safeguard Modal */}
      {rejectionConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xl space-y-5 text-center animate-zoom-in">
            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 mx-auto animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-brand-charcoal dark:text-white">Confirm Rejection</h3>
              <p className="text-xs text-slate-505 leading-relaxed font-semibold">
                Are you sure you want to reject the selected appointment booking(s)? This will cancel their slots, make them available for other patients, and launch a WhatsApp notification template.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectionConfirmOpen(false);
                  setPendingRejectionSlots([]);
                }}
                className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectionConfirmed}
                className="flex-grow bg-red-650 hover:bg-red-500 text-white rounded-full py-3.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                Reject Appointment(s)
              </button>
            </div>
          </div>
        </div>
      )}      {/* WhatsApp Rejection/Approval Preview Modal */}
      {notificationModalOpen && pendingActionApp && pendingActionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xl space-y-5 text-center animate-zoom-in">
            <div className="flex justify-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                pendingActionType === "approve"
                  ? "bg-[#f0f4f2] dark:bg-[#f0f4f2]/20 text-brand-green ring-4 ring-[#f0f4f2]/30"
                  : "bg-red-50 dark:bg-red-950/30 text-red-655"
              }`}>
                {pendingActionType === "approve" ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <X className="h-6 w-6" />
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-brand-charcoal dark:text-white">
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
                <label htmlFor="notifyWhatsApp" className="text-xs font-black text-brand-charcoal dark:text-white cursor-pointer">
                  Notify patient via WhatsApp
                </label>
              </div>
            )}

            {/* Preview Box */}
            {(pendingActionType === "reject" || (pendingActionType === "approve" && notifyWhatsApp)) && (
              <div className="bg-[#fbfcfb] dark:bg-slate-955 p-4 rounded-2xl border border-slate-100 dark:border-slate-855 text-left text-xs space-y-1.5 animate-fade-in break-all">
                <p className="font-bold text-slate-400">Message Preview:</p>
                <p className="text-slate-600 dark:text-slate-455 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-all whitespace-pre-line">
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
                className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                {pendingActionType === "approve" ? "No, Cancel" : "No"}
              </button>
              {pendingActionType === "approve" ? (
                <button
                  type="button"
                  onClick={() => confirmApproval(notifyWhatsApp)}
                  className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Check className="h-4 w-4" />
                  Yes, Approve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    triggerWhatsAppConfirmation(pendingActionApp, false);
                    setNotificationModalOpen(false);
                    setPendingActionApp(null);
                    setPendingActionType(null);
                  }}
                  className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  Yes, Notify
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
