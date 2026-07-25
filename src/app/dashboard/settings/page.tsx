"use client";

import { useEffect, useState } from "react";
import { getClinicConfig, saveClinicConfig, ClinicConfig } from "@/lib/db";
import { 
  Loader2, 
  Save, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Users, 
  Trash2, 
  Plus, 
  MapPin, 
  Mail, 
  Phone,
  Settings,
  Globe,
  Bell,
  Info,
  User,
  UserMinus,
  Map
} from "lucide-react";
import Link from "next/link";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DashboardSettings() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings State
  const [config, setConfig] = useState<ClinicConfig>({
    weeklyHolidays: {
      sunday: true,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
    slotDuration: 30,
    morningStart: "09:00 AM",
    morningEnd: "01:00 PM",
    eveningStart: "02:00 PM",
    eveningEnd: "07:30 PM",
    operationalHoursText: "",
    therapists: [],
    address: "",
    landmark: "",
    phone: "",
    email: "",
    googleMapsLink: "",
    googleMapsEmbed: "",
  });

  const [newTherapistName, setNewTherapistName] = useState("");
  const [lastSavedTime, setLastSavedTime] = useState("Oct 12, 2023, 10:45 AM");

  const hourOptions = {
    morningStart: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM"],
    morningEnd: ["12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM"],
    eveningStart: ["01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"],
    eveningEnd: ["05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"],
  };

  useEffect(() => {
    // 1. Check user permission
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      const user = JSON.parse(userJson) as UserProfile;
      if (user.role === "admin") {
        setIsAdmin(true);
      }
    }

    // 2. Fetch current config
    async function loadData() {
      try {
        const fetched = await getClinicConfig();
        setConfig(fetched);
        
        // Dynamically show last saved if available in localStorage
        const savedTime = localStorage.getItem("gpc_config_saved_at");
        if (savedTime) {
          setLastSavedTime(savedTime);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadData();
  }, []);

  const handleHolidayToggle = (day: keyof ClinicConfig["weeklyHolidays"]) => {
    setConfig((prev) => ({
      ...prev,
      weeklyHolidays: {
        ...prev.weeklyHolidays,
        [day]: !prev.weeklyHolidays[day],
      },
    }));
    setSavedSuccess(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === "slotDuration" ? Number(value) : value,
    }));
    setSavedSuccess(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    
    // Automatically assemble operational hours text if left blank
    const hoursText = config.operationalHoursText.trim()
      ? config.operationalHoursText
      : `Morning: ${config.morningStart} - ${config.morningEnd} | Evening: ${config.eveningStart} - ${config.eveningEnd}`;

    const updatedConfig = {
      ...config,
      operationalHoursText: hoursText,
    };

    try {
      const success = await saveClinicConfig(updatedConfig);
      if (success) {
        setSavedSuccess(true);
        setConfig(updatedConfig);
        
        // Update saving timestamp
        const now = new Date();
        const formatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
          ", " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        setLastSavedTime(formatted);
        localStorage.setItem("gpc_config_saved_at", formatted);
      } else {
        alert("Failed to save settings. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (confirm("Are you sure you want to discard all unsaved changes?")) {
      window.location.reload();
    }
  };

  // Helper to extract clean iframe source for maps preview
  const getEmbedUrl = (embed: string) => {
    if (!embed) return "";
    if (embed.includes("src=")) {
      const match = embed.match(/src="([^"]+)"/);
      return match ? match[1] : embed;
    }
    return embed;
  };

  // Helper to display specialized icons and styles for Mockup Therapists
  const getTherapistMeta = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("kinnera")) {
      return {
        role: "Senior Physiotherapist",
        bgColor: "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/35",
        iconColor: "text-emerald-600 dark:text-emerald-450 bg-emerald-100/50 dark:bg-emerald-900/30",
        roleColor: "text-emerald-650 dark:text-emerald-450",
        isLeave: false,
        icon: User
      };
    }
    if (nameLower.includes("vikram")) {
      return {
        role: "Lead Consultant",
        bgColor: "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/35",
        iconColor: "text-blue-600 dark:text-blue-450 bg-blue-100/50 dark:bg-blue-900/30",
        roleColor: "text-blue-650 dark:text-blue-450",
        isLeave: false,
        icon: User
      };
    }
    if (nameLower.includes("sarah")) {
      return {
        role: "On Leave",
        bgColor: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 opacity-60",
        iconColor: "text-slate-400 bg-slate-100 dark:bg-slate-800",
        roleColor: "text-slate-405",
        isLeave: true,
        icon: UserMinus
      };
    }
    return {
      role: "Consultant Physiotherapist",
      bgColor: "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800",
      iconColor: "text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
      roleColor: "text-slate-500",
      isLeave: false,
      icon: User
    };
  };

  if (loadingConfig) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading Configuration Center...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Settings className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Admin Settings Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
          The Clinic Configuration Panel is restricted to administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen -m-4 sm:-m-6 md:-m-8 bg-[#f8fafc] dark:bg-slate-955">
      
      {/* Top Configuration Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-8 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-[#1b3d2f] dark:text-emerald-450" />
          <span className="text-xs sm:text-sm font-black text-brand-charcoal dark:text-white select-none">Clinic Configuration</span>
        </div>
        
        <div className="flex items-center gap-6">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-slate-500 hover:text-brand-green dark:text-slate-400 transition-colors"
          >
            <Globe className="h-4 w-4" />
            View Website
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/40 text-[9px] font-black uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Connection
            </div>
            
            <button type="button" className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body Grid */}
      <div className="flex-grow p-6 sm:p-8 space-y-6 pb-28">
        
        {/* Title and Intro */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-[#1b3d2f] dark:text-white tracking-tight">Configuration Center</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Refine your clinic's operational heart. Adjust shift patterns, holiday schedules, and manage your team of world-class therapists.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-[#f0f4f2] border border-brand-green/20 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-2 max-w-4xl animate-fade-in-up">
            <CheckCircle className="h-4.5 w-4.5 text-brand-green shrink-0" />
            Clinic configurations successfully saved and live on the patient scheduler!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl">
          
          {/* Left Column (Span 8) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Operational Shifts and Durations Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Operational Shifts & Durations
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Configure timing slots and clinical session hours
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-brand-green dark:text-teal-400 tracking-wider uppercase border-b border-brand-green/30 pb-0.5 cursor-pointer">
                  Templates
                </span>
              </div>

              {/* Duration and operational status */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Duration dropdown */}
                <div className="md:col-span-5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Time Slot Duration
                  </label>
                  <select
                    name="slotDuration"
                    value={config.slotDuration}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-bold"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                {/* Operating status card */}
                <div className="md:col-span-7 bg-[#f0f4f2]/40 dark:bg-brand-green/5 border border-brand-green/10 p-4 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-brand-green shrink-0 mt-0.5 shadow-sm">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-[#1b3d2f] dark:text-emerald-450 tracking-wider uppercase block">
                      Operating Status
                    </span>
                    <p className="text-[11px] text-slate-655 dark:text-slate-355 leading-relaxed font-semibold">
                      Morning: {config.morningStart} - {config.morningEnd} | Evening: {config.eveningStart} - {config.eveningEnd}
                    </p>
                  </div>
                </div>

              </div>

              {/* Sessions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850">
                
                {/* Morning Session */}
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                    <span className="text-[10px] font-black text-brand-charcoal dark:text-slate-300 tracking-wider uppercase">
                      Morning Session
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Start Hour</label>
                      <div className="relative">
                        <select
                          name="morningStart"
                          value={config.morningStart}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.morningStart.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">End Hour</label>
                      <div className="relative">
                        <select
                          name="morningEnd"
                          value={config.morningEnd}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.morningEnd.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evening Session */}
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1b3d2f]" />
                    <span className="text-[10px] font-black text-brand-charcoal dark:text-slate-300 tracking-wider uppercase">
                      Evening Session
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Start Hour</label>
                      <div className="relative">
                        <select
                          name="eveningStart"
                          value={config.eveningStart}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.eveningStart.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">End Hour</label>
                      <div className="relative">
                        <select
                          name="eveningEnd"
                          value={config.eveningEnd}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.eveningEnd.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Clinic Location & Contact Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                    Clinic Location & Contact Info
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Public facing details for patient discovery
                  </p>
                </div>
              </div>

              {/* Two Column details split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
                
                {/* Inputs Left Column */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Address */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Clinic Location Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={config.address || ""}
                      onChange={handleInputChange}
                      placeholder="Shop No:26, 2nd Floor, Arya Hub Mall..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Landmark
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={config.landmark || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Near Phoenix Marketcity"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  {/* Contact Info (Phone / Email side-by-side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        required
                        value={config.phone || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={config.email || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                </div>

                {/* Map Preview Right Column */}
                <div className="md:col-span-5 space-y-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Map Preview
                  </label>
                  
                  {/* Styled Map frame */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 h-36">
                    <iframe
                      src={getEmbedUrl(config.googleMapsEmbed) || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.012301980838!2d77.7479703!3d12.9711227!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzE2LjAiTiA3N8KwNDQnNTIuNyJFCg!5e0!3m2!1sen!2sin!4v1700000000000"}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen={false}
                      loading="lazy"
                    />
                  </div>

                  {/* Navigation share link field */}
                  <div className="relative">
                    <input
                      type="text"
                      name="googleMapsLink"
                      required
                      value={config.googleMapsLink || ""}
                      onChange={handleInputChange}
                      placeholder="https://maps.google.com/..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-[10px] outline-none focus:border-brand-green text-slate-500 dark:text-slate-400 font-normal pr-8 truncate"
                      title={config.googleMapsLink}
                    />
                    <Map className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Right Column (Span 4) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Weekly Holidays Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-5">
              
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                    Weekly Holidays
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Select days the clinic remains closed
                  </p>
                </div>
              </div>

              {/* Day Selection List */}
              <div className="space-y-2 pt-2">
                {(Object.keys(config.weeklyHolidays) as Array<keyof ClinicConfig["weeklyHolidays"]>).map((day) => {
                  const isChecked = config.weeklyHolidays[day];
                  return (
                    <label
                      key={day}
                      className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer select-none transition-all ${
                        isChecked
                          ? "bg-red-50/45 border-red-200 text-red-750 dark:bg-rose-955/20 dark:border-rose-900/50"
                          : "bg-white border-slate-200/70 hover:bg-slate-50/50 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${day === 'sunday' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        <span className={`text-xs capitalize font-bold ${isChecked ? "text-red-700 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {day}
                        </span>
                      </div>
                      
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleHolidayToggle(day)}
                        className={`h-4.5 w-4.5 rounded cursor-pointer transition-all border ${
                          isChecked 
                            ? "accent-red-650 bg-red-650 text-white" 
                            : "accent-brand-green border-slate-300 bg-white"
                        }`}
                      />
                    </label>
                  );
                })}
              </div>

            </div>

            {/* Therapists Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-5">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm leading-none">
                      Therapists
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Manage active clinical staff
                    </p>
                  </div>
                </div>

                {/* White Plus on Dark Green Button */}
                <button
                  type="button"
                  onClick={() => document.getElementById("add-therapist-input")?.focus()}
                  className="h-7 w-7 rounded-full bg-[#1b3d2f] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm border-0"
                  title="Focus Add Therapist"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Therapist Cards List */}
              <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto pr-0.5">
                {config.therapists && config.therapists.map((therapist) => {
                  const meta = getTherapistMeta(therapist);
                  const IconComp = meta.icon;
                  return (
                    <div
                      key={therapist}
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all ${meta.bgColor}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${meta.iconColor}`}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-brand-charcoal dark:text-white leading-tight">
                            {therapist}
                          </h4>
                          <span className={`text-[9px] uppercase tracking-wider font-extrabold block mt-0.5 ${meta.roleColor}`}>
                            {meta.role}
                          </span>
                        </div>
                      </div>

                      {/* Remove Therapist Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (config.therapists.length <= 1) {
                            alert("At least one therapist must remain enrolled.");
                            return;
                          }
                          if (confirm(`Are you sure you want to remove ${therapist}?`)) {
                            setConfig((prev) => ({
                              ...prev,
                              therapists: prev.therapists.filter((t) => t !== therapist),
                            }));
                            setSavedSuccess(false);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer border-0 bg-transparent"
                        title="Remove therapist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Therapist Row */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-850">
                <div className="flex gap-2">
                  <input
                    id="add-therapist-input"
                    type="text"
                    placeholder="Add new therapist name..."
                    value={newTherapistName}
                    onChange={(e) => setNewTherapistName(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 px-3 py-2 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newTherapistName.trim();
                      if (!trimmed) return;
                      if (config.therapists && config.therapists.includes(trimmed)) {
                        alert("This therapist is already enrolled.");
                        return;
                      }
                      setConfig((prev) => ({
                        ...prev,
                        therapists: prev.therapists ? [...prev.therapists, trimmed] : [trimmed],
                      }));
                      setNewTherapistName("");
                      setSavedSuccess(false);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-slate-200 dark:border-slate-800 text-brand-charcoal dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-805 text-xs font-black shadow-sm transition-all"
                  >
                    Invited
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Sticky Bottom Actions Bar */}
      <footer className="fixed bottom-0 left-0 md:left-64 right-0 h-20 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between z-30 shadow-lg">
        <div className="flex items-center gap-2 text-slate-400 select-none">
          <Clock className="h-4 w-4" />
          <span className="text-[10px] sm:text-xs font-bold">
            Last configured by <strong className="text-slate-600 dark:text-slate-300">Admin</strong> on {lastSavedTime}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-black transition-colors"
          >
            Discard Changes
          </button>
          
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#1b3d2f] text-white hover:bg-brand-green-hover px-6 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all border-0"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Config...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Clinic Config</span>
              </>
            )}
          </button>
        </div>
      </footer>

    </div>
  );
}
