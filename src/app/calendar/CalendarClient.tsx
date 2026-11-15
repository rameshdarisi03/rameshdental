"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  Share2,
  Download,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import {
  CalendarEventData,
  generateGoogleCalendarUrl,
  generateIcsCalendarData,
  parseAppointmentDateTime,
} from "@/lib/calendarUtils";

interface CalendarClientProps {
  initialData: CalendarEventData | null;
  slug?: string;
}

export default function CalendarClient({ initialData, slug }: CalendarClientProps) {
  const [copied, setCopied] = useState(false);
  const data = initialData || {
    patientName: "Patient",
    date: "2026-11-20",
    slot: "10:30 AM",
    therapistName: "Dr. Ramesh Darisi",
    serviceName: "Dental Consultation",
    clinicAddress: "Ramesh Dental Clinic, Near Hope Farm Signal, Whitefield, Bengaluru",
  };

  const cleanDoctor = (data.therapistName || "Dr. Ramesh Darisi").replace(/^Dr\.?\s*/i, "");
  const googleCalendarUrl = generateGoogleCalendarUrl({
    date: data.date,
    slot: data.slot,
    serviceName: data.serviceName,
    patientName: data.patientName,
    therapistName: cleanDoctor,
  });

  const mapsUrl = "https://maps.google.com/?q=Ramesh+Dental+Clinic+Whitefield+Bengaluru";

  const handleDownloadIcs = () => {
    try {
      const parsed = parseAppointmentDateTime(data.date, data.slot);
      const start = parsed ? parsed.start : new Date();
      const end = parsed ? parsed.end : new Date(Date.now() + 45 * 60 * 1000);

      const icsString = generateIcsCalendarData({
        title: `Dental Consultation - Dr. ${cleanDoctor} (Ramesh Dental Clinic)`,
        description: `Appointment for ${data.patientName} at Ramesh Dental Clinic, Whitefield, Bengaluru.\nService: ${data.serviceName || "Dental"}\nDesk: +91 89714 62949`,
        location: data.clinicAddress || "Ramesh Dental Clinic, Near Hope Farm Signal, Whitefield, Bengaluru",
        start,
        end,
      });

      const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ramesh_dental_appointment_${data.date.replace(/\D/g, "")}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate ICS file:", e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dental Appointment - Ramesh Dental Clinic`,
          text: `My appointment with Dr. ${cleanDoctor} at Ramesh Dental Clinic on ${data.date} at ${data.slot}.`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-xl w-full mx-auto my-auto space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block group">
            <h1 className="text-2xl font-black tracking-tight text-brand-charcoal dark:text-white flex items-center justify-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green text-sm font-black border border-brand-green/20">
                RD
              </span>
              <span>Ramesh Dental Clinic</span>
            </h1>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Appointment Confirmed</span>
          </div>
        </div>

        {/* Main Appointment Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
          
          {/* Patient & Doctor Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-850">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Patient</p>
              <h2 className="text-lg font-black text-brand-charcoal dark:text-white mt-0.5">
                {data.patientName}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Doctor</p>
              <p className="text-sm font-black text-brand-green mt-0.5">
                Dr. {cleanDoctor}
              </p>
            </div>
          </div>

          {/* Time & Date Highlight */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                <p className="text-sm font-black text-brand-charcoal dark:text-white mt-0.5">
                  {data.date}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Time Slot</p>
                <p className="text-sm font-black text-brand-charcoal dark:text-white mt-0.5">
                  {data.slot}
                </p>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="flex items-start gap-3 text-xs">
            <MapPin className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-brand-charcoal dark:text-slate-200">
                Ramesh Dental Clinic - Whitefield
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                Near Hope Farm Signal, Whitefield, Bengaluru, Karnataka 560066
              </p>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-3 pt-2">
            
            {/* Google Calendar 1-Click Button */}
            {googleCalendarUrl && (
              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-[#062e36] hover:bg-[#083c47] text-white text-xs font-black transition-all shadow-md hover:shadow-lg active:scale-[0.99] cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-[#f9ab55]" />
                <span>Add to Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-auto" />
              </a>
            )}

            {/* Apple / Outlook Calendar (.ics) Button */}
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white text-xs font-black border border-slate-200 dark:border-slate-700 transition-all shadow-xs active:scale-[0.99] cursor-pointer"
            >
              <Download className="w-4 h-4 text-brand-green" />
              <span>Add to Apple Calendar / Outlook (.ics)</span>
            </button>

            {/* Open Google Maps Direction Button */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800/60 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Get Clinic Location (Google Maps)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-auto" />
            </a>
          </div>

          {/* Quick Help & Share Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850 text-[11px] text-slate-500">
            <a
              href="https://wa.me/918904456243"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-brand-green hover:underline"
            >
              <Phone className="w-3 h-3" />
              <span>Clinic Front Desk</span>
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <Share2 className="w-3 h-3" />
              <span>{copied ? "Link Copied!" : "Share Details"}</span>
            </button>
          </div>
        </div>

        {/* Bottom Note */}
        <p className="text-center text-[10px] text-slate-400 font-medium">
          Please arrive 5–10 minutes before your scheduled appointment time.
        </p>
      </div>
    </div>
  );
}
