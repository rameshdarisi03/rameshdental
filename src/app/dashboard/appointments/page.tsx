"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteField,
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
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";
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
  RotateCw,
  MapPin,
  CalendarSync,
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
import { getPatients, Patient } from "@/lib/patientsDb";
import RescheduleModal from "@/components/RescheduleModal";

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
  const [rejectionReason, setRejectionReason] = useState("Doctor unavailable or schedule conflict.");

  // WhatsApp popup modal states
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [pendingNotificationApp, setPendingNotificationApp] = useState<Appointment | null>(null);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [manualNotifyWhatsApp, setManualNotifyWhatsApp] = useState(true);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedRescheduleApp, setSelectedRescheduleApp] = useState<Appointment | null>(null);

  // Live master patient list for resolving latest phone & email
  const [patients, setPatients] = useState<Patient[]>([]);

  // Send Confirmation action & Visual Delivery Modal state
  const [sendingConfirmAppId, setSendingConfirmAppId] = useState<string | null>(null);
  const [deliveryModalData, setDeliveryModalData] = useState<{
    isOpen: boolean;
    status: "success" | "error" | "partial";
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    date: string;
    slot: string;
    serviceName?: string;
    therapistName?: string;
    whatsappStatus: "sent" | "failed" | "skipped";
    whatsappMessageId?: string;
    whatsappError?: string;
    emailStatus: "sent" | "failed" | "skipped";
    emailError?: string;
    fallbackWhatsAppUrl?: string;
  } | null>(null);

  // Manual Booking Date availability details
  const [manualDateAppointments, setManualDateAppointments] = useState<Appointment[]>([]);
  const [manualDateBlocks, setManualDateBlocks] = useState<DayBlock[]>([]);
  const [loadingManualSlots, setLoadingManualSlots] = useState(false);

  // Daily Doctor Schedule & Backup state
  const [sendingDoctorSchedule, setSendingDoctorSchedule] = useState(false);
  const [scheduleSentAlert, setScheduleSentAlert] = useState<string | null>(null);

  // Practo Calendar Sync state
  const [syncingPracto, setSyncingPracto] = useState(false);

  const handleSyncPracto = async () => {
    setSyncingPracto(true);
    try {
      const res = await fetch("/api/practo/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Failed to sync Practo appointments.");
      } else {
        alert(data.message || "Practo calendar synced successfully!");
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err?.message || "Error syncing with Practo.");
    } finally {
      setSyncingPracto(false);
    }
  };

  const handleSendDoctorSchedule = async () => {
    setSendingDoctorSchedule(true);
    setScheduleSentAlert(null);
    try {
      const res = await fetch("/api/cron/daily-schedule", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send schedule.");
      }
      setScheduleSentAlert(`Dispatched today's schedule (${data.count} bookings) to Dr. Kinnera's WhatsApp!`);
      setTimeout(() => setScheduleSentAlert(null), 6000);
    } catch (err: any) {
      alert(err.message || "Could not dispatch schedule alert.");
    } finally {
      setSendingDoctorSchedule(false);
    }
  };

  const handleExportCsv = () => {
    if (appointments.length === 0) {
      alert("No appointments to export.");
      return;
    }
    const headers = ["Date", "Slot", "Patient Name", "Phone", "Email", "Service", "Status", "Therapist", "Type", "Notes"];
    const rows = appointments.map((a) => [
      `"${a.date || ""}"`,
      `"${a.slot || ""}"`,
      `"${(a.patientName || "").replace(/"/g, '""')}"`,
      `"${a.patientPhone || ""}"`,
      `"${a.patientEmail || ""}"`,
      `"${(a.serviceId || "").replace(/"/g, '""')}"`,
      `"${a.status || ""}"`,
      `"${(a.assignedTherapist || "").replace(/"/g, '""')}"`,
      `"${a.type || "online"}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GaitPhysio_Appointments_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

    // 1. Fetch clinic configuration & live patients
    async function loadInitialData() {
      try {
        const [fetchedConfig, fetchedPatients] = await Promise.allSettled([
          getClinicConfig(),
          getPatients(),
        ]);
        if (fetchedConfig.status === "fulfilled") setClinicConfig(fetchedConfig.value);
        if (fetchedPatients.status === "fulfilled") setPatients(fetchedPatients.value);
      } catch (err) {
        console.error("Error loading config or patients:", err);
      }
    }
    loadInitialData();

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
  const handleStatusChange = async (appId: string, newStatus: "approved" | "rejected", shouldNotify = false, customReason?: string) => {
    setActionLoadingId(appId);
    try {
      const appRef = doc(db, "appointments", appId);
      const effectiveReason = customReason?.trim() || "Doctor unavailable or schedule conflict.";
      const auditData: any = {
        status: newStatus,
        actionedByUid: currentUser?.uid || "system",
        actionedByName: currentUser?.name || "Clinic Staff",
        actionedByRole: currentUser?.role || "receptionist",
        actionedAt: Timestamp.now(),
      };
      if (newStatus === "rejected") {
        auditData.rejectionReason = effectiveReason;
      } else {
        auditData.rejectionReason = deleteField();
      }
      await updateDoc(appRef, auditData);
      
      // Update local state
      setAppointments((prev) =>
        prev.map((app) => {
          if (app.id === appId) {
            const next = { ...app, ...auditData };
            if (newStatus === "approved") {
              delete next.rejectionReason;
            }
            return next;
          }
          return app;
        })
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
                reason: effectiveReason,
              },
            }),
          }).catch((err) => console.warn("[Email Engine] Failed to dispatch rejection email:", err));
        }
      }

      // Trigger Automated WhatsApp if approved or rejected
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

      // Trigger manual wa.me popup if approved and requested
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


  const handleApproveRescheduleRequest = async (app: Appointment) => {
    if (!app.id || !app.requestedDate || !app.requestedSlot) return;
    setActionLoadingId(app.id);
    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: app.id,
          newDate: app.requestedDate,
          newSlot: app.requestedSlot,
          actionedBy: currentUser?.name || "Clinic Staff",
          actionedByRole: currentUser?.role || "admin",
          actionedByUid: currentUser?.uid || "",
          reason: "Staff approved patient reschedule request",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve reschedule request.");
      }
      fetchAppointments();
    } catch (err: any) {
      console.error("Error approving reschedule request:", err);
      alert(err.message || "Failed to approve reschedule request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRescheduleRequest = async (app: Appointment) => {
    if (!app.id) return;
    if (!confirm("Decline this reschedule request and keep the patient on their original appointment date?")) {
      return;
    }
    setActionLoadingId(app.id);
    try {
      const appRef = doc(db, "appointments", app.id);
      await updateDoc(appRef, {
        reschedulePending: false,
      });
      fetchAppointments();
    } catch (err: any) {
      console.error("Error declining reschedule:", err);
      alert("Failed to decline reschedule request.");
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
      handleStatusChange(pendingRejectionId, "rejected", false, rejectionReason);
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

  // Helper to resolve up-to-date phone and email from patient master directory
  const getEffectivePatient = (app: Appointment) => {
    if (!patients || patients.length === 0) return null;
    const cleanAppPhone = app.patientPhone ? getCleanWhatsAppNumber(app.patientPhone, false) : "";
    return (
      patients.find((p) => {
        if (p.id && p.id === (app as any).patientId) return true;
        if (app.patientName && p.name && p.name.trim().toLowerCase() === app.patientName.trim().toLowerCase()) return true;
        if (cleanAppPhone && p.phone) {
          const cleanPPhone = getCleanWhatsAppNumber(p.phone, false);
          if (cleanPPhone && cleanPPhone === cleanAppPhone) return true;
        }
        return false;
      }) || null
    );
  };

  // Dispatch official Meta WhatsApp & Brevo email confirmation and display visual result modal
  const handleSendConfirmation = async (app: Appointment) => {
    const matchedP = getEffectivePatient(app);
    const effectivePhone = matchedP?.phone || app.patientPhone;
    const effectiveEmail = matchedP?.email || app.patientEmail;

    if (!effectivePhone) {
      alert("This appointment does not have a valid mobile number.");
      return;
    }

    setSendingConfirmAppId(app.id || "sending");

    let waStatus: "sent" | "failed" | "skipped" = "failed";
    let waMsgId: string | undefined;
    let waError: string | undefined;

    let emailStatus: "sent" | "failed" | "skipped" = "skipped";
    let emailError: string | undefined;

    try {
      // 1. Dispatch official Meta WhatsApp template (includes "Add to Calendar" & "Get Location" action buttons)
      const waRes = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "APPOINTMENT_APPROVED",
          payload: {
            patientName: app.patientName,
            patientPhone: effectivePhone,
            serviceName: app.serviceId,
            date: app.date,
            slot: app.slot,
            therapistName: app.assignedTherapist || "Clinical Team",
            appointmentId: app.id,
          },
        }),
      });
      const waData = await waRes.json();
      if (waRes.ok && waData.success) {
        waStatus = "sent";
        waMsgId = waData.messageId;
      } else {
        waStatus = "failed";
        waError = waData.error || "Meta Cloud API failed to accept message.";
      }
    } catch (err: any) {
      waStatus = "failed";
      waError = err.message || "Network error connecting to WhatsApp API.";
    }

    // 2. Dispatch Email Confirmation if patient has email
    if (effectiveEmail && effectiveEmail.includes("@")) {
      try {
        const calUrl = generateGoogleCalendarUrl(app);
        const emailRes = await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "APPOINTMENT_APPROVED",
            payload: {
              patientName: app.patientName,
              patientEmail: effectiveEmail,
              serviceId: app.serviceId,
              date: app.date,
              slot: app.slot,
              assignedTherapist: app.assignedTherapist || "Clinical Team",
              googleCalendarUrl: calUrl,
            },
          }),
        });
        const emailData = await emailRes.json();
        if (emailRes.ok && emailData.success) {
          emailStatus = "sent";
        } else {
          emailStatus = "failed";
          emailError = emailData.error || "Email delivery failed.";
        }
      } catch (err: any) {
        emailStatus = "failed";
        emailError = err.message || "Network error sending email.";
      }
    }

    // Generate fallback direct WhatsApp Web link in case staff wants to open Web WhatsApp
    const cleanPhone = getCleanWhatsAppNumber(effectivePhone);
    const calendarUrl = generateGoogleCalendarUrl(app);
    const calendarMsg = calendarUrl ? `\n\nAdd to Google Calendar: ${calendarUrl}` : "";
    const fallbackMessage = `Hi ${app.patientName}, your appointment for *${app.serviceId}* on *${app.date}* at *${app.slot}* at Gait Physio Clinic is CONFIRMED!${calendarMsg}\n\nLocation: https://maps.google.com/?q=Gait+Physio+Clinic+Whitefield+Bengaluru\n\nLooking forward to seeing you.`;
    const fallbackWhatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fallbackMessage)}`;

    setDeliveryModalData({
      isOpen: true,
      status: waStatus === "sent" ? "success" : "partial",
      patientName: app.patientName,
      patientPhone: effectivePhone,
      patientEmail: effectiveEmail,
      date: app.date,
      slot: app.slot,
      serviceName: app.serviceId,
      therapistName: app.assignedTherapist || "Clinical Team",
      whatsappStatus: waStatus,
      whatsappMessageId: waMsgId,
      whatsappError: waError,
      emailStatus: emailStatus,
      emailError: emailError,
      fallbackWhatsAppUrl: fallbackWhatsAppUrl,
    });

    setSendingConfirmAppId(null);
  };

  // Pre-fill WhatsApp confirmation message
  const triggerWhatsAppConfirmation = (app: Appointment) => {
    const matchedP = getEffectivePatient(app);
    const cleanPhone = getCleanWhatsAppNumber(matchedP?.phone || app.patientPhone);

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
      
      // Automated WhatsApp notification
      if (manualForm.patientPhone) {
        fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "WALKIN_CONFIRMED",
            payload: {
              patientName: manualForm.patientName,
              patientPhone: manualForm.patientPhone,
              serviceName: manualForm.serviceId,
              date: manualForm.date,
              slot: manualForm.slot,
            },
          }),
        }).catch((err) => console.warn("[WhatsApp Engine] Failed to dispatch manual booking WhatsApp:", err));
      }
      
      // Directly trigger WhatsApp popup without modal if checked
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
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={handleExportCsv}
            title="Download full appointments backup in CSV / Excel format"
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none"
          >
            <ClipboardList className="h-4 w-4 text-slate-500" />
            <span className="hidden md:inline">Export CSV</span>
          </button>

          <button
            onClick={handleSendDoctorSchedule}
            disabled={sendingDoctorSchedule}
            title="Send today's schedule to Dr. Kinnera's WhatsApp (8904456243)"
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-50"
          >
            {sendingDoctorSchedule ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
            )}
            <span>Send Dr. Kinnera Schedule</span>
          </button>

          <button
            onClick={handleSyncPracto}
            disabled={syncingPracto}
            title="Sync appointments with Dr. Kinnera's Practo Calendar Feed"
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            <CalendarSync className={`h-4 w-4 ${syncingPracto ? "animate-spin" : ""}`} />
            <span>{syncingPracto ? "Syncing..." : "Sync Practo"}</span>
          </button>

          <button
            onClick={fetchAppointments}
            disabled={loading}
            title="Refresh database"
            type="button"
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <RotateCw className={`h-4 w-4 ${loading ? "animate-spin text-brand-green" : ""}`} />
          </button>
        </div>
      </div>

      {scheduleSentAlert && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{scheduleSentAlert}</span>
        </div>
      )}

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
          {filteredAppointments.map((app) => {
            const matchedP = getEffectivePatient(app);
            const displayPhone = matchedP?.phone || app.patientPhone;
            const displayEmail = matchedP?.email || app.patientEmail;

            return (
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
                  {app.type === "practo" && (
                    <span className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                      Practo
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
                    {displayPhone}
                  </span>
                  {app.assignedTherapist && (
                    <span className="flex items-center gap-1.5 text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                      <User className="h-3.5 w-3.5" />
                      {app.assignedTherapist}
                    </span>
                  )}
                  {app.patientAddress && (
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-brand-green shrink-0" />
                      {app.patientAddress}
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


                {/* Reschedule Request Notice */}
                {app.reschedulePending && app.requestedDate && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Reschedule Requested: <span className="font-black text-amber-600 dark:text-amber-400">{app.requestedDate} ({app.requestedSlot})</span>
                        </div>
                        {app.rescheduleReason && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Reason: {app.rescheduleReason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveRescheduleRequest(app)}
                        disabled={actionLoadingId === app.id}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs cursor-pointer transition-all active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRescheduleRequest(app)}
                        disabled={actionLoadingId === app.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                )}

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
                      type="button"
                      onClick={() => {
                        setSelectedRescheduleApp(app);
                        setRescheduleModalOpen(true);
                      }}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 dark:bg-teal-950/40 text-brand-green dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 px-4 py-2.5 text-xs font-black transition-colors"
                      title="Reschedule to another date & time (frees up current slot)"
                    >
                      <CalendarSync className="h-3.5 w-3.5" />
                      Reschedule
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
                      type="button"
                      onClick={() => {
                        setSelectedRescheduleApp(app);
                        setRescheduleModalOpen(true);
                      }}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 dark:bg-teal-950/40 text-brand-green dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 px-4.5 py-2.5 text-xs font-black transition-colors"
                      title="Reschedule to another date & time (frees up current slot)"
                    >
                      <CalendarSync className="h-3.5 w-3.5" />
                      Reschedule
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendConfirmation(app)}
                      disabled={sendingConfirmAppId === app.id}
                      title="Dispatch official Meta WhatsApp & Email confirmation with Add to Calendar & Get Location buttons"
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingConfirmAppId === app.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Send Confirmation</span>
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
            );
          })}
        </div>
      )}

      {/* Rejection Modal with Reason Selection & Automated Dispatch */}
      {mounted && rejectionConfirmOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="h-12 w-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Decline & Cancel Appointment</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Please select or enter the cancellation reason. This will be automatically sent to the patient via WhatsApp & Email.
              </p>
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Preset Reasons:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Doctor Unavailable",
                  "Emergency Clinical Case",
                  "Slot Capacity Exceeded",
                  "Patient Requested Cancellation",
                  "Clinic Closed / Maintenance",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      rejectionReason === preset
                        ? "bg-red-500 text-white border-red-500 shadow-sm"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-300"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom Reason Textarea */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Reason communicated to patient:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection or cancellation..."
                  rows={2}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                />
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-red-700 dark:text-red-300 font-medium">
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span>Patient will immediately receive an automated rejection alert via Meta Cloud API & Email.</span>
              </div>
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
                Go Back
              </button>
              <button
                type="button"
                onClick={handleRejectionConfirmed}
                className="flex-grow bg-red-600 hover:bg-red-500 text-white rounded-full py-2.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Confirm & Dispatch Alert
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation & Automated Approval Modal */}
      {mounted && notificationModalOpen && pendingNotificationApp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 text-center animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-2xl bg-brand-green/15 dark:bg-teal-500/20 text-brand-green dark:text-teal-400 flex items-center justify-center shadow-sm">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Approve Appointment Request</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                Confirm slot for <strong>{pendingNotificationApp.patientName}</strong> on <strong>{pendingNotificationApp.date}</strong> at <strong>{pendingNotificationApp.slot}</strong>?
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

            {/* Preview box */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left text-xs space-y-1.5 max-h-40 overflow-y-auto overscroll-contain">
              <p className="font-bold text-slate-400 text-[10px] uppercase">Message Preview:</p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 break-all whitespace-pre-line text-[11px]">
                Hi {pendingNotificationApp.patientName}, your appointment for *{pendingNotificationApp.serviceId}* on *{pendingNotificationApp.date}* at *{pendingNotificationApp.slot}* is APPROVED!{"\n\n"}
                Calendar link: {generateGoogleCalendarUrl(pendingNotificationApp)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNotificationModalOpen(false);
                  setPendingNotificationApp(null);
                }}
                className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const appId = pendingNotificationApp.id!;
                  setNotificationModalOpen(false);
                  await handleStatusChange(appId, "approved", false);
                  setPendingNotificationApp(null);
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

      {/* Reschedule Slot Modal */}
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
          onSuccess={() => {
            fetchAppointments();
          }}
        />
      )}

      {/* Visual Delivery Confirmation Modal for Therapists & Staff (Uncropped & Fully Responsive) */}
      {mounted && deliveryModalData && deliveryModalData.isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeliveryModalData(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 animate-scale-in text-left font-['Inter',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top header with delivery status icon & close button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    deliveryModalData.status === "success"
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {deliveryModalData.status === "success" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    {deliveryModalData.status === "success" ? "Confirmation Sent!" : "Dispatch Notice"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    Live delivery report for clinic staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeliveryModalData(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Appointment Snapshot Card */}
            <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {deliveryModalData.patientName}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 shrink-0">
                  Confirmed
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-[11px]">
                  <Calendar className="h-3 w-3 text-brand-green" />
                  {deliveryModalData.date}
                </span>
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock className="h-3 w-3 text-brand-green" />
                  {deliveryModalData.slot}
                </span>
                {deliveryModalData.therapistName && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <User className="h-3 w-3 text-brand-green" />
                    {deliveryModalData.therapistName}
                  </span>
                )}
              </div>
            </div>

            {/* Delivery Channels Breakdown */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Delivery Channels &amp; Status
              </label>

              {/* WhatsApp Channel Card */}
              <div className="p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      WhatsApp Cloud API
                    </span>
                  </div>
                  {deliveryModalData.whatsappStatus === "sent" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Delivered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/50 px-2.5 py-0.5 rounded-full">
                      <X className="h-3 w-3 stroke-[3]" />
                      Failed
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                  <p className="flex items-center gap-1.5 text-[11px]">
                    <Phone className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {deliveryModalData.patientPhone}
                    </span>
                  </p>
                  {deliveryModalData.whatsappMessageId && (
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      Meta Msg ID: {deliveryModalData.whatsappMessageId}
                    </p>
                  )}
                  {deliveryModalData.whatsappError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                      {deliveryModalData.whatsappError}
                    </p>
                  )}
                </div>

                {/* Attached Interactive Features */}
                <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40 flex flex-wrap gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-200">
                  <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                    📅 "Add to Calendar" button
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/90 dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs">
                    📍 "Get Location" button
                  </span>
                </div>
              </div>

              {/* Email Channel Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Email Confirmation (Brevo)
                    </span>
                  </div>
                  {deliveryModalData.emailStatus === "sent" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-sky-700 dark:text-sky-300 bg-sky-100/90 dark:bg-sky-900/50 px-2.5 py-0.5 rounded-full">
                      <Check className="h-3 w-3 stroke-[3]" />
                      Delivered
                    </span>
                  ) : deliveryModalData.emailStatus === "skipped" ? (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-150 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      Skipped (No email)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-300 bg-rose-100/90 dark:bg-rose-900/50 px-2.5 py-0.5 rounded-full">
                      <X className="h-3 w-3 stroke-[3]" />
                      Failed
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 font-medium">
                  {deliveryModalData.patientEmail ? (
                    <p className="flex items-center gap-1.5 text-[11px] truncate">
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {deliveryModalData.patientEmail}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">
                      No email address is linked to this patient.
                    </p>
                  )}
                  {deliveryModalData.emailError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                      {deliveryModalData.emailError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons (Mobile-first responsive row) */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              {deliveryModalData.fallbackWhatsAppUrl && (
                <a
                  href={deliveryModalData.fallbackWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open WhatsApp Web</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => setDeliveryModalData(null)}
                className="flex-1 px-5 py-2.5 rounded-2xl bg-brand-charcoal dark:bg-white text-white dark:text-slate-900 text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition-all text-center cursor-pointer"
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
