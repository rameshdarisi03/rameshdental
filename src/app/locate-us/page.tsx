"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { MapPin, Phone, Mail, Clock, Navigation, Calendar, MessageSquare, CheckCircle2, Sparkles } from "lucide-react";
import { getClinicConfig, DEFAULT_DAY_SCHEDULES, DaySchedule, WeekdayKey } from "@/lib/db";

const WEEKDAY_ORDER: Array<{ key: WeekdayKey; label: string; short: string }> = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export default function LocateUsPage() {
  const [daySchedules, setDaySchedules] = useState<Record<WeekdayKey, DaySchedule>>(DEFAULT_DAY_SCHEDULES);
  const [currentDayKey, setCurrentDayKey] = useState<WeekdayKey>("monday");
  const [statusInfo, setStatusInfo] = useState<{ isOpenNow: boolean; label: string; subtext: string }>({
    isOpenNow: true,
    label: "Open Now",
    subtext: "Closes at 08:00 PM",
  });

  useEffect(() => {
    // 1. Fetch live clinic configuration from Firestore
    async function loadConfig() {
      try {
        const config = await getClinicConfig();
        if (config.daySchedules) {
          setDaySchedules(config.daySchedules);
          computeStatus(config.daySchedules);
        }
      } catch (err) {
        console.error("Failed to load clinic timings:", err);
      }
    }

    // 2. Compute current day and open/close status
    function computeStatus(schedules: Record<WeekdayKey, DaySchedule>) {
      const now = new Date();
      const days: WeekdayKey[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayKey = days[now.getDay()];
      setCurrentDayKey(todayKey);

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todaySched = schedules[todayKey] || DEFAULT_DAY_SCHEDULES[todayKey];

      if (!todaySched.isOpen) {
        setStatusInfo({
          isOpenNow: false,
          label: "Closed Today",
          subtext: "Reopens on next working day",
        });
        return;
      }

      const openMins = parseTimeToMinutes(todaySched.openTime);
      const closeMins = parseTimeToMinutes(todaySched.closeTime);

      if (currentMinutes >= openMins && currentMinutes < closeMins) {
        setStatusInfo({
          isOpenNow: true,
          label: "Open Now",
          subtext: `Closes at ${todaySched.closeTime}`,
        });
      } else if (currentMinutes < openMins) {
        setStatusInfo({
          isOpenNow: false,
          label: "Closed Now",
          subtext: `Opens today at ${todaySched.openTime}`,
        });
      } else {
        setStatusInfo({
          isOpenNow: false,
          label: "Closed Now",
          subtext: "Reopens tomorrow morning",
        });
      }
    }

    loadConfig();
    computeStatus(DEFAULT_DAY_SCHEDULES);

    // Refresh status every 60 seconds
    const interval = setInterval(() => {
      computeStatus(daySchedules);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Locate Ramesh Dental Clinic"
        subtitle="Conveniently situated on ITPL Main Road at Metro Pillar 142 in Whitefield, Bengaluru with dedicated patient parking and lift access."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Clinic Contact & Landmark Cards */}
          <div className="space-y-6">
            {/* Primary Address */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Clinic Address</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Whitefield, Bengaluru</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">Ramesh Dental Clinic</p>
                <p>Metro Pillar 142, ITPL Main Road</p>
                <p>Whitefield, Bengaluru</p>
                <p>Karnataka - 560066</p>
              </div>

              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=Ramesh+Dental+Clinic+Whitefield+Bangalore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-transform active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Live Directions</span>
                </a>
              </div>
            </div>

            {/* Operating Hours (Day-by-Day Google Business Schedule) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Operating Hours</h3>
                    <p className="text-[11px] text-slate-400 font-semibold">Weekly Schedule</p>
                  </div>
                </div>

                {/* Live Open / Closed Badge */}
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      statusInfo.isOpenNow
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusInfo.isOpenNow ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                      }`}
                    />
                    {statusInfo.label}
                  </span>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{statusInfo.subtext}</p>
                </div>
              </div>

              {/* Day-by-Day Timings List */}
              <div className="space-y-1.5 text-xs pt-1">
                {WEEKDAY_ORDER.map(({ key, label }) => {
                  const sched = daySchedules[key] || DEFAULT_DAY_SCHEDULES[key];
                  const isToday = currentDayKey === key;

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between py-2 px-3 rounded-xl transition-colors ${
                        isToday
                          ? "bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 font-bold"
                          : "border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            sched.isOpen ? (isToday ? "bg-teal-600 dark:text-teal-400" : "bg-slate-400") : "bg-rose-400"
                          }`}
                        />
                        <span className={isToday ? "text-teal-900 dark:text-teal-200" : "text-slate-600 dark:text-slate-300"}>
                          {label}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-teal-600 text-white">
                            Today
                          </span>
                        )}
                      </div>

                      <div>
                        {sched.isOpen ? (
                          <span className={`text-[11px] font-bold ${isToday ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-200"}`}>
                            {sched.openTime} – {sched.closeTime}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">
                            Closed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Contact Desk */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Direct Clinical Desk</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Call or WhatsApp</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <a
                  href="tel:+918904456243"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-slate-900 dark:text-white"
                >
                  <span>Reception Phone</span>
                  <span className="text-brand-green">+91 89044 56243</span>
                </a>
                <a
                  href="https://wa.me/918904456243"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors font-bold text-emerald-800 dark:text-emerald-300"
                >
                  <span>WhatsApp Direct</span>
                  <span>Chat Now</span>
                </a>
              </div>
            </div>
          </div>

          {/* Map & Landmark Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Map Embed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Interactive Clinical Location Map
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green uppercase tracking-wider">
                  Hope Farm Junction
                </span>
              </div>
              <div className="w-full h-[380px] sm:h-[440px] bg-slate-100 dark:bg-slate-800 relative">
                <iframe
                  title="Ramesh Dental Clinic Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.8967814402685!2d77.75011131482205!3d12.984700090847253!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae0fb5b6574f2b%3A0xbcf2a8ee0322b75f!2sGait%20Physio%20Clinic!5e0!3m2!1sen!2sin!4v1691234567890!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Accessibility & Transit Highlights */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Transit & Accessibility Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Namma Metro Connectivity</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Short 5-minute walk from Hope Farm Channasandra Metro Station (Purple Line).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Lift & Wheelchair Access</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Modern passenger lift directly servicing the 2nd and 3rd floor treatment bays.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Dedicated Vehicle Parking</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Designated two-wheeler and four-wheeler patient parking slots in the building basement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Prominent Landmark</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Located opposite Prasanth Extension, right before the Hope Farm traffic signal on ITPL Main Rd.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">Ready for your diagnostic session?</p>
                <Link
                  href="/book"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-transform active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Consultation Online</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
