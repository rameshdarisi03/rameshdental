"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";
import { Appointment } from "@/lib/db";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Plus, 
  ChevronRight, 
  CalendarCheck2, 
  AlertCircle 
} from "lucide-react";

const SERVICES = [
  "Cervical Posture Correction",
  "Knee Joint Stability Rehab",
  "Orthopedic Assessment",
  "General Physiotherapy Consultation"
];

const STANDARD_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM"
];

export default function AppointmentsPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState(STANDARD_SLOTS[0]);
  const [bookingService, setBookingService] = useState(SERVICES[0]);
  const [bookingNotes, setBookingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Set default tomorrow's date in selector
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setBookingDate(`${yyyy}-${mm}-${dd}`);

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      setPatient(JSON.parse(localData));
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // 1. Sync patient details
          const qPatient = query(collection(db, "patients"), where("email", "==", user.email));
          const snapPatient = await getDocs(qPatient);
          let currentPatient: Patient | null = null;
          
          if (!snapPatient.empty) {
            currentPatient = { id: snapPatient.docs[0].id, ...snapPatient.docs[0].data() } as Patient;
            setPatient(currentPatient);
            localStorage.setItem("gpc_patient", JSON.stringify(currentPatient));
          }

          if (currentPatient) {
            // 2. Fetch history of appointments for this patient phone or email
            const qApps = query(
              collection(db, "appointments"),
              where("patientEmail", "==", currentPatient.email)
            );
            const snapApps = await getDocs(qApps);
            const list: Appointment[] = [];
            snapApps.forEach((doc) => {
              list.push({ id: doc.id, ...doc.data() } as Appointment);
            });
            
            // Sort by date (descending)
            list.sort((a, b) => b.date.localeCompare(a.date));
            setAppointments(list);
          }
        } catch (err) {
          console.error("Failed to load patient appointments:", err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    if (!patient) {
      setErrorMsg("Failed to authenticate session. Please re-login.");
      setSubmitting(false);
      return;
    }

    if (!bookingDate) {
      setErrorMsg("Please select a valid booking date.");
      setSubmitting(false);
      return;
    }

    try {
      // 1. Parse date input into DD-MM-YYYY format for uniformity
      const [y, m, d] = bookingDate.split("-");
      const formattedDate = `${d}-${m}-${y}`; // DD-MM-YYYY format

      // 2. Save appointment in Firestore
      const newApp = {
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        serviceId: bookingService,
        date: formattedDate,
        slot: bookingSlot,
        status: "pending",
        type: "online",
        notes: bookingNotes,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "appointments"), newApp);
      
      // 3. Trigger WhatsApp Confirmation alert request link
      let cleanPhone = patient.phone.replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.replace(/^0+/, "");
      if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
      
      const whatsappMsg = encodeURIComponent(
        `Hi GPC Front Desk, I would like to book a follow-up session on *${formattedDate}* at *${bookingSlot}* for *${bookingService}* via Patient Hub.`
      );
      
      setSuccessMsg("Session request submitted successfully! Your booking is pending approval.");
      setBookingNotes("");
      
      // Update history list locally
      setAppointments((prev) => [
        { id: "temp", ...newApp } as Appointment,
        ...prev
      ]);

      // Open WhatsApp to notify desk
      window.open(`https://wa.me/919206651295?text=${whatsappMsg}`, "_blank");

    } catch (err: any) {
      console.error("Booking submission failed:", err);
      setErrorMsg(err.message || "Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12 select-none font-['Inter',sans-serif]">
      
      {/* Left Column: Booking Form Container (2 cols wide) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-6 sm:p-8 rounded-[28px] shadow-sm space-y-6">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#8a5100] dark:text-[#f9ab55]">
              Session Scheduling
            </span>
            <h1 className="text-2xl font-bold text-[#062e36] dark:text-white leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
              Request Therapy Appointment
            </h1>
            <p className="text-xs text-[#41484A] dark:text-slate-400 font-medium mt-1">
              Select your preferred date & time slot. Our clinic desk will confirm immediately.
            </p>
          </div>

          {errorMsg && (
            <div className="flex gap-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-3.5 rounded-2xl text-xs text-red-700 dark:text-red-300 font-medium">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3.5 rounded-2xl text-xs text-emerald-700 dark:text-emerald-300 font-medium">
              <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleBookSession} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Preferred Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] text-[#1A1C1B] dark:text-slate-100 font-bold transition-colors"
                  />
                </div>
              </div>

              {/* Slot Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Time Slot</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] text-[#1A1C1B] dark:text-slate-100 font-bold cursor-pointer transition-colors"
                  >
                    {STANDARD_SLOTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Service Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Therapy Program</label>
              <select
                value={bookingService}
                onChange={(e) => setBookingService(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 px-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] text-[#1A1C1B] dark:text-slate-100 font-bold cursor-pointer transition-colors"
              >
                {SERVICES.map((ser) => (
                  <option key={ser} value={ser}>{ser}</option>
                ))}
              </select>
            </div>

            {/* Notes Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-300">Notes / Symptoms for Doctor (Optional)</label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Mention any new discomfort, mobility changes, or requests..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAF9F9] dark:bg-slate-900 px-4 py-3 text-xs outline-none focus:border-[#062e36] dark:focus:border-[#f9ab55] text-[#1A1C1B] dark:text-slate-100 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] py-3.5 rounded-full text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Send Booking Request via WhatsApp"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Appointment History List (1 col wide) */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#41484A] dark:text-slate-400 flex items-center gap-1.5 px-1">
          <CalendarCheck2 className="h-4 w-4 text-[#8a5100] dark:text-[#f9ab55]" />
          <span>My Booking History</span>
        </h3>

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 p-6 rounded-[24px] shadow-xs text-center text-xs text-slate-400 italic">
            No past appointment requests found.
          </div>
        ) : (
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {appointments.map((app, idx) => {
              const isApproved = app.status === "approved";
              const isPending = app.status === "pending";
              
              return (
                <div
                  key={app.id || idx}
                  className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3 hover:border-[#f9ab55]/60 transition-all"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-bold text-[#062e36] dark:text-white truncate">
                      {app.serviceId}
                    </p>
                    <div className="flex gap-2 items-center text-[10px] font-medium text-slate-400">
                      <span>{app.date}</span>
                      <span>•</span>
                      <span>{app.slot}</span>
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
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
