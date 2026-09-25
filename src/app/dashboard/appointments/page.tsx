"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Appointment,
  DayBlock,
  ClinicConfig,
  getClinicConfig,
  generateSlotsFromHours,
  getSlotCapacity,
  DEFAULT_CLINIC_CONFIG,
  getAppointmentsByDate,
  getBlocksByDate,
  isSlotInPast
} from "@/lib/db";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Plus,
  Check,
  X,
  MessageSquare,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ShieldAlert,
  ClipboardList,
  RotateCw
} from "lucide-react";

// Helper to get today's date formatted as YYYY-MM-DD
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DashboardAppointments() {
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Logged in user profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Settings config state
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);

  // Modals & Drawers state
  const [isManualBookingOpen, setIsManualBookingOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    serviceId: "General Physiotherapy Consultation",
    date: "",
    slot: "",
    notes: "",
  });
  const [submittingManual, setSubmittingManual] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  
  // Rejection Confirmation states
  const [rejectionConfirmOpen, setRejectionConfirmOpen] = useState(false);
  const [pendingRejectionId, setPendingRejectionId] = useState<string | null>(null);

  // WhatsApp popup modal states
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [pendingNotificationApp, setPendingNotificationApp] = useState<Appointment | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [manualNotifyWhatsApp, setManualNotifyWhatsApp] = useState(true);

  // Manual Booking Date availability details
  const [manualDateAppointments, setManualDateAppointments] = useState<Appointment[]>([]);
  const [manualDateBlocks, setManualDateBlocks] = useState<DayBlock[]>([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);

  const servicesList = [
    "General Physiotherapy Consultation",
    "Gait & Biomechanical Analysis",
    "Sports Injury Rehabilitation",
    "Spine & Musculoskeletal Care",
    "Post-Operative Orthopedic Care",
    "Dry Needling & Myofascial Release",
    "Custom Insoles & Orthotics Fitment",
  ];

  // Dynamic slots generated according to Settings
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

  // Fetch appointments and configurations
  async function fetchAppointments() {
    setLoading(true);
    try {
      const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const appList: Appointment[] = [];
      snapshot.forEach((doc) => {
        appList.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      setAppointments(appList);
    } catch (error) {
      console.error("Error loading appointments: ", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchAppointments();

    // 1. Fetch clinic configuration
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
  }, []);

  // Fetch availability specifically for manual booking dates
  useEffect(() => {
    if (!manualForm.date) return;
    async function loadManualAvailability() {
      setLoadingManualSlots(true);
      try {
        const apps = await getAppointmentsByDate(manualForm.date);
        const blks = await getBlocksByDate(manualForm.date);
        setManualDateAppointments(apps);
        setManualDateBlocks(blks);
      } catch (error) {
        console.error("Error fetching manual availability: ", error);
      } finally {
        setLoadingManualSlots(false);
      }
    }
    loadManualAvailability();
  }, [manualForm.date]);

  // Update appointment status in Firestore with staff auditing
  const handleStatusChange = async (appId: string, newStatus: "approved" | "rejected", shouldNotify = false) => {
    setActionLoadingId(appId);
    try {
      const appRef = doc(db, "appointments", appId);
      const auditData = {
        status: newStatus,
        actionedByUid: currentUser?.uid || "system",
        actionedByName: currentUser?.name || "Clinic Staff",
        actionedByRole: currentUser?.role || "receptionist",
        actionedAt: Timestamp.now(),
      };
      await updateDoc(appRef, auditData);
      
      // Update local state
      setAppointments((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, ...auditData } : app))
      );

      // Trigger Automated Email if patient has an email
      const targetApp = appointments.find((a) => a.id === appId);
      const updatedApp = targetApp ? { ...targetApp, ...auditData } : null;

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
                reason: "Schedule conflict or clinic slot capacity limits.",
              },
            }),
          }).catch((err) => console.warn("[Email Engine] Failed to dispatch rejection email:", err));
        }
      }

      // Trigger WhatsApp if approved and requested
      if (newStatus === "approved" && shouldNotify) {
        const approvedApp = appointments.find((a) => a.id === appId);
        if (approvedApp) {
          triggerWhatsAppConfirmation({ ...approvedApp, ...auditData });
        }
      }
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rejection Warning Modal Trigger
  const triggerRejectionGuard = (appId: string) => {
    setPendingRejectionId(appId);
    setRejectionConfirmOpen(true);
  };

  const handleRejectionConfirmed = () => {
    if (pendingRejectionId) {
      handleStatusChange(pendingRejectionId, "rejected");
    }
    setRejectionConfirmOpen(false);
    setPendingRejectionId(null);
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

  // Pre-fill WhatsApp confirmation message
  const triggerWhatsAppConfirmation = (app: Appointment) => {
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

  const initiateApprovalProcess = (app: Appointment) => {
    setPendingNotificationApp(app);
    setNotifyWhatsApp(true);
    setNotificationModalOpen(true);
  };

  // Handle Manual Staff Booking submission with staff audit
  const handleManualBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.slot) {
      alert("Please select an available time slot card before confirming the booking.");
      return;
    }
    setSubmittingManual(true);
    try {
      const newBooking = {
        patientName: manualForm.patientName,
        patientPhone: manualForm.patientPhone,
        patientEmail: manualForm.patientEmail,
        serviceId: manualForm.serviceId,
        date: manualForm.date,
        slot: manualForm.slot,
        notes: manualForm.notes,
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

      await addDoc(collection(db, "appointments"), newBooking);

      setIsManualBookingOpen(false);

      // Trigger Walk-in / Manual Booking Confirmation Email
      if (manualForm.patientEmail) {
        const calUrl = generateGoogleCalendarUrl(newBooking as Appointment);
        fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "WALKIN_CONFIRMED",
            payload: {
              patientName: manualForm.patientName,
              patientEmail: manualForm.patientEmail,
              serviceId: manualForm.serviceId,
              date: manualForm.date,
              slot: manualForm.slot,
              assignedTherapist: "Clinical Team",
              googleCalendarUrl: calUrl,
            },
          }),
        }).catch((err) => console.warn("[Email Engine] Failed to dispatch manual booking email:", err));
      }
      
      // Directly trigger WhatsApp without modal if checked
      if (manualNotifyWhatsApp) {
        triggerWhatsAppConfirmation(newBooking as Appointment);
      }

      // Reset form
      setManualForm({
        patientName: "",
        patientEmail: "",
        patientPhone: "",
        serviceId: "General Physiotherapy Consultation",
        date: "",
        slot: "",
        notes: "",
      });

      fetchAppointments();
    } catch (error) {
      console.error("Error creating manual booking: ", error);
      alert("Failed to submit booking.");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setManualForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "date") {
        next.slot = "";
      }
      return next;
    });
  };

  // Filter list by tab and search query
  const filteredAppointments = appointments.filter((app) => {
    const matchesTab = app.status === activeTab;
    const matchesSearch =
      app.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.patientPhone.includes(searchQuery) ||
      app.serviceId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Check if slot is blocked on selected date for manual form
  const getManualSlotStatus = (time: string) => {
    // 0. Check if slot is in the past (for today's date)
    if (isSlotInPast(time, manualForm.date)) {
      return { disabled: true, label: `${time} (Unavailable - Past)` };
    }

    // 1. Check capacity vs approved appointments
    const maxCapacity = getSlotCapacity(clinicConfig, time);
    const approvedCount = manualDateAppointments.filter(a => a.slot === time && a.status === "approved").length;
    const remaining = Math.max(0, maxCapacity - approvedCount);
    if (remaining <= 0) {
      return { disabled: true, label: `${time} (Fully Booked - ${approvedCount}/${maxCapacity})` };
    }

    // 2. Check blocks
    let isBlocked = false;
    let blockReason = "";
    manualDateBlocks.forEach((b) => {
      if (b.type === "full_day" || b.type === "holiday") {
        isBlocked = true;
        blockReason = b.reason || "Holiday";
      } else if (b.type === "session") {
        if (b.session === "morning" && isMorningSlot(time)) {
          isBlocked = true;
          blockReason = b.reason || "Morning block";
        } else if (b.session === "evening" && !isMorningSlot(time)) {
          isBlocked = true;
          blockReason = b.reason || "Evening block";
        }
      } else if (b.type === "slot" && b.slot === time) {
        isBlocked = true;
        blockReason = b.reason || "Slot Override";
      }
    });

    if (isBlocked) {
      return { disabled: true, label: `${time} (Blocked - ${blockReason})` };
    }

    return { disabled: false, label: `${time} (${remaining} ${remaining === 1 ? 'slot' : 'slots'} left)` };
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Appointments Queue</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Review pending requests, check availability slots, and manually book call-ins.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={fetchAppointments}
            disabled={loading}
            title="Refresh database"
            type="button"
            className="p-3 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <RotateCw className={`h-4.5 w-4.5 ${loading ? "animate-spin text-brand-green" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-200/80 dark:border-slate-805 pb-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 w-full sm:w-auto">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-4 py-2 text-xs font-black capitalize rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-brand-green/10 text-brand-green"
                  : "text-slate-500 hover:text-brand-green"
              }`}
            >
              {tab} ({appointments.filter((a) => a.status === tab).length})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, phone, service..."
            className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-white dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white font-semibold"
          />
        </div>
      </div>

      {/* Appointment Listings */}
      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500 text-xs font-semibold">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green mr-2" />
          <span>Syncing appointments database...</span>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-slate-450 space-y-2 shadow-sm">
          <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
          <p className="font-black text-brand-charcoal dark:text-white">No appointments found</p>
          <p className="text-xs font-semibold">There are no slots matching this status/criteria on file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAppointments.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] transition-all duration-300"
            >
              {/* Patient and Service info */}
              <div className="space-y-3 flex-grow">
                <div className="flex items-center gap-3">
                  <h4 className="font-black text-brand-charcoal dark:text-white text-base leading-tight">{app.patientName}</h4>
                  {app.type === "manual" && (
                    <span className="inline-flex items-center rounded-md bg-brand-sand/80 dark:bg-brand-green/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-green">
                      Staff Manual
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4 text-xs text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-brand-green" />
                    {app.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-green" />
                    {app.slot}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-brand-green" />
                    {app.patientPhone}
                  </span>
                  {app.assignedTherapist && (
                    <span className="flex items-center gap-1.5 text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                      <User className="h-3.5 w-3.5" />
                      {app.assignedTherapist}
                    </span>
                  )}
                </div>

                <div className="bg-brand-bg dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <p className="text-xs font-black text-brand-green dark:text-white">{app.serviceId}</p>
                  {app.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 leading-relaxed">
                      "Notes: {app.notes}"
                    </p>
                  )}
                </div>

                {/* Audit Trail text */}
                {(app.createdByName || app.actionedByName) && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 font-bold uppercase tracking-wide">
                    <ClipboardList className="h-3.5 w-3.5 text-brand-green" />
                    <span>
                      {app.type === "manual" && app.createdByName && `Booked by ${app.createdByName} (${app.createdByRole})`}
                      {app.type === "manual" && app.createdByName && app.actionedByName && app.status !== "pending" && " • "}
                      {app.actionedByName && app.status === "approved" && `Approved by ${app.actionedByName} (${app.actionedByRole})`}
                      {app.actionedByName && app.status === "rejected" && `Rejected by ${app.actionedByName} (${app.actionedByRole})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto border-t md:border-t-0 border-slate-100 dark:border-slate-850 pt-4 md:pt-0">
                {activeTab === "pending" && (
                  <>
                    <button
                      onClick={() => initiateApprovalProcess(app)}
                      disabled={actionLoadingId === app.id}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-4.5 py-2.5 text-xs font-black shadow-sm transition-all duration-200"
                    >
                      {actionLoadingId === app.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    
                    <button
                      onClick={() => triggerRejectionGuard(app.id!)}
                      disabled={actionLoadingId === app.id}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 text-red-650 hover:bg-red-50 px-4.5 py-2.5 text-xs font-black transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </>
                )}

                {activeTab === "approved" && (
                  <>
                    <button
                      onClick={() => triggerWhatsAppConfirmation(app)}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 text-brand-green px-5 py-2.5 text-xs font-black hover:bg-brand-sand transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp Link
                    </button>
                    <button
                      onClick={() => triggerRejectionGuard(app.id!)}
                      disabled={actionLoadingId === app.id}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-2 text-xs font-black transition-colors"
                    >
                      Cancel Slot
                    </button>
                  </>
                )}

                {activeTab === "rejected" && (
                  <button
                    onClick={() => handleStatusChange(app.id!, "approved")}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1 rounded-full bg-brand-charcoal hover:bg-brand-charcoal/90 text-white px-4.5 py-2.5 text-xs font-black transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Rejection Accidental Safeguard Warning Modal */}
      {mounted && rejectionConfirmOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Confirm Rejection</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Are you sure you want to decline this appointment request? This will release the slot and inform the patient.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectionConfirmOpen(false);
                  setPendingRejectionId(null);
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
                Reject Appointment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom WhatsApp Notification Modal */}
      {mounted && notificationModalOpen && pendingNotificationApp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-brand-green/15 dark:bg-teal-500/20 text-brand-green dark:text-teal-400 flex items-center justify-center shadow-sm">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Confirm Appointment Approval</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Are you sure you want to approve this appointment for <strong>{pendingNotificationApp.patientName}</strong>?
              </p>
            </div>

            {/* Checkbox toggle */}
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

            {/* Preview box - shows only if checked */}
            {notifyWhatsApp && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 animate-fade-in max-h-48 overflow-y-auto overscroll-contain">
                <p className="font-bold text-slate-400 text-[10px] uppercase">Message Preview:</p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 break-all whitespace-pre-line text-[11px] sm:text-xs">
                  Hi {pendingNotificationApp.patientName}, your appointment request for *{pendingNotificationApp.serviceId}* on *{pendingNotificationApp.date}* at *{pendingNotificationApp.slot}* at Gait Physio Clinic is APPROVED!{"\n\n"}
                  Add to Google Calendar: {generateGoogleCalendarUrl(pendingNotificationApp)}{"\n\n"}
                  Looking forward to seeing you.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNotificationModalOpen(false);
                  setPendingNotificationApp(null);
                }}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const appId = pendingNotificationApp.id!;
                  setNotificationModalOpen(false);
                  await handleStatusChange(appId, "approved", notifyWhatsApp);
                  setPendingNotificationApp(null);
                }}
                className="flex-grow flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Yes, Approve
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
