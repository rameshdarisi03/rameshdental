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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 select-none">
      
      {/* Left Column: Booking Form Container (2 cols wide) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Request Follow-up Session</h1>
            <p className="text-xs text-slate-450 font-bold mt-1 uppercase tracking-wider">Schedule your recovery appointments online</p>
          </div>

          {errorMsg && (
            <div className="flex gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-4 rounded-2xl text-xs text-red-600 dark:text-red-400 font-semibold">
              <AlertCircle className="h-5.5 w-5.5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 p-4 rounded-2xl text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle className="h-5.5 w-5.5 text-emerald-500 shrink-0 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleBookSession} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 font-bold"
                  />
                </div>
              </div>

              {/* Slot Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preferred Slot</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 pl-11 pr-4 py-3.5 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
                  >
                    {STANDARD_SLOTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Service Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Treatment Plan / Service</label>
              <select
                value={bookingService}
                onChange={(e) => setBookingService(e.target.value)}
                className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3.5 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100 font-bold cursor-pointer"
              >
                {SERVICES.map((ser) => (
                  <option key={ser} value={ser}>{ser}</option>
                ))}
              </select>
            </div>

            {/* Notes Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Symptoms / Notes (Optional)</label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Briefly describe any ankle/knee/neck pain developments..."
                rows={3}
                className="w-full rounded-2xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs outline-none focus:border-brand-green dark:focus:border-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black tracking-wide uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin mr-2" />
              ) : (
                "Request Session via WhatsApp"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Appointment History List (1 col wide) */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <CalendarCheck2 className="h-4 w-4 text-brand-green" />
          <span>My Sessions History</span>
        </h3>

        {appointments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm text-center text-xs text-slate-400 italic">
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
                  className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                      {app.serviceId}
                    </p>
                    <div className="flex gap-2 items-center text-[10px] font-bold text-slate-400">
                      <span>{app.date}</span>
                      <span>•</span>
                      <span>{app.slot}</span>
                    </div>
                  </div>

                  {/* Status Pills */}
                  {isApproved ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
                      Approved
                    </span>
                  ) : isPending ? (
                    <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-955/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-amber-600 dark:text-amber-450 shrink-0">
                      Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-955/20 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-red-500 shrink-0">
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
