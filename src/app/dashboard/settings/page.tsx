"use client";

import { useEffect, useState } from "react";
import { getClinicConfig, saveClinicConfig, ClinicConfig, generateSlotsFromHours, getSlotCapacity } from "@/lib/db";
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
  Map,
  Layers,
  Sparkles,
  HelpCircle,
  Power,
  AlertTriangle,
  RotateCcw,
  Palette,
  Check
} from "lucide-react";
import Link from "next/link";
import { THEME_OPTIONS, ThemeKey } from "@/components/public/ThemeSwitcher";
import { syncMetaThemeColor } from "@/lib/themeHelper";

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
  const [isDirty, setIsDirty] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("teal");

  // Expandable Hourly Overrides & Help Tooltip state
  const [showHourlyOverrides, setShowHourlyOverrides] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // Settings State
  const [config, setConfig] = useState<ClinicConfig>({
    enablePublicBooking: true,
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
    defaultCapacityPerSlot: 3,
    hourlyCapacityOverrides: {},
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
    adminWalkInGraceType: "end_of_slot",
    publicBookingCutoffMinutes: 0,
    googleMapsEmbed: "",
  });

  const [newTherapistName, setNewTherapistName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
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
        
        if (fetched.hourlyCapacityOverrides && Object.keys(fetched.hourlyCapacityOverrides).length > 0) {
          setShowHourlyOverrides(true);
        }

        // Dynamically show last saved if available in localStorage
        const savedTime = localStorage.getItem("gpc_config_saved_at");
        if (savedTime) {
          setLastSavedTime(savedTime);
        }

        // Load active website theme
        const savedTheme = (localStorage.getItem("gpc_public_theme") as ThemeKey) || "teal";
        setCurrentTheme(savedTheme);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadData();
  }, []);

  const handleSelectTheme = (themeId: ThemeKey) => {
    setCurrentTheme(themeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gpc_public_theme", themeId);
      document.documentElement.setAttribute("data-theme", themeId);
      syncMetaThemeColor(themeId);
    }
    setIsDirty(true);
    setSavedSuccess(false);
  };

  // Unsaved changes browser beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleHolidayToggle = (day: keyof ClinicConfig["weeklyHolidays"]) => {
    setConfig((prev) => ({
      ...prev,
      weeklyHolidays: {
        ...prev.weeklyHolidays,
        [day]: !prev.weeklyHolidays[day],
      },
    }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === "slotDuration" || name === "defaultCapacityPerSlot" ? Number(value) : value,
    }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleSlotCapacityChange = (slot: string, newCapacity: number) => {
    setConfig((prev) => {
      const overrides = { ...(prev.hourlyCapacityOverrides || {}) };
      if (newCapacity === (prev.defaultCapacityPerSlot || 3)) {
        delete overrides[slot];
      } else {
        overrides[slot] = newCapacity;
      }
      return { ...prev, hourlyCapacityOverrides: overrides };
    });
    setIsDirty(true);
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
        setIsDirty(false);
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
      <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-8 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-brand-green" />
          <span className="text-xs sm:text-sm font-black text-brand-charcoal dark:text-white select-none">Clinic Configuration</span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-slate-500 hover:text-brand-green dark:text-slate-400 transition-colors"
          >
            <Globe className="h-4 w-4" />
            View Website
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/40 text-[9px] font-black uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            
            {/* Header Quick-Save Button */}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                isDirty
                  ? "bg-brand-green text-white hover:bg-brand-green-hover ring-4 ring-brand-green/20 scale-105"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isDirty ? "Save Changes *" : "Save"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body Grid */}
      <div className="flex-grow p-6 sm:p-8 space-y-6 pb-36">
        
        {/* Title and Intro */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal dark:text-white tracking-tight">Configuration Center</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Refine your clinic's operational heart. Adjust shift patterns, holiday schedules, and manage your team of world-class therapists.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-brand-sand/60 dark:bg-slate-900 border border-brand-green/20 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl flex items-center gap-2 max-w-4xl animate-fade-in-up">
            <CheckCircle className="h-4.5 w-4.5 text-brand-green shrink-0" />
            Clinic configurations successfully saved and live on the patient scheduler!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl">
          
          {/* Left Column (Span 8) */}
          <div className="lg:col-span-8 space-y-8">

            {/* Master Public Online Booking Toggle Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    config.enablePublicBooking !== false
                      ? "bg-emerald-500/10 text-brand-green"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Public Online Appointment Booking
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control direct customer booking access on the website
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  config.enablePublicBooking !== false
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${config.enablePublicBooking !== false ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {config.enablePublicBooking !== false ? "Online Booking: Enabled" : "Online Booking: Disabled"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed max-w-md">
                  {config.enablePublicBooking !== false
                    ? "Enabled: Website visitors can view real-time time slots and schedule appointments directly."
                    : "Disabled: Online booking slots are hidden from visitors. Website shows direct Call and WhatsApp booking buttons."}
                </p>
                
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, enablePublicBooking: prev.enablePublicBooking === false ? true : false }));
                    setIsDirty(true);
                    setSavedSuccess(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    config.enablePublicBooking !== false
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                      : "bg-brand-green text-white hover:bg-brand-green-hover shadow-sm"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{config.enablePublicBooking !== false ? "Disable Online Booking" : "Enable Online Booking"}</span>
                </button>
              </div>
            </div>

            {/* Website Brand Theme Palette Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Website Color Theme & Branding
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Select the primary color palette displayed across the public clinic website
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Active: {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name || "Medical Teal"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = theme.id === currentTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-brand-green bg-brand-green/5 dark:bg-brand-green/10 shadow-sm ring-2 ring-brand-green/20"
                          : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white shadow-2xs">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-black text-brand-charcoal dark:text-white">
                          {theme.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {theme.badge} Palette
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
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
                <div className="md:col-span-7 bg-brand-sand/50 dark:bg-brand-green/5 border border-brand-green/10 p-4 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-brand-green shrink-0 mt-0.5 shadow-sm">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-brand-green tracking-wider uppercase block">
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
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
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

            {/* Multi-Therapist Slot Capacity & Flexible Hourly Controls Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-brand-green flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Multi-Therapist Slot Capacity & Hourly Controls
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control how many patients can book concurrently per hour based on on-duty therapists
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Flexible Capacity
                </span>
              </div>

              {/* Default Slot Capacity Input */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-brand-sand/50 dark:bg-brand-green/5 border border-brand-green/15 p-5 rounded-2xl">
                <div className="md:col-span-6 space-y-1">
                  <label className="block text-xs font-black text-brand-charcoal dark:text-white">
                    Default Concurrent Capacity (Therapists on Duty)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Set the base number of patients that can book each slot (e.g., 3 therapists = 3 slots).
                  </p>
                </div>

                <div className="md:col-span-6 flex items-center gap-3 justify-start md:justify-end">
                  {[1, 2, 3, 4, 5].map((count) => {
                    const isSelected = (config.defaultCapacityPerSlot || 3) === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, defaultCapacityPerSlot: count }));
                          setSavedSuccess(false);
                        }}
                        className={`h-11 w-11 rounded-2xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-brand-green text-white shadow-md shadow-brand-green/20 scale-105"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-green"
                        }`}
                      >
                        <span className="text-sm leading-none">{count}</span>
                        <span className="text-[8px] font-bold opacity-75">slots</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Hourly Overrides Toggle with Help Tooltip */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showHourlyOverrides}
                      onChange={(e) => setShowHourlyOverrides(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer"
                    />
                    <span className="text-xs font-black text-brand-charcoal dark:text-white">
                      Enable Custom Hourly Overrides
                    </span>
                    {Object.keys(config.hourlyCapacityOverrides || {}).length > 0 && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                        {Object.keys(config.hourlyCapacityOverrides || {}).length} custom
                      </span>
                    )}
                  </label>

                  {/* Help Tooltip Icon */}
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowHelpTooltip(true)}
                      onMouseLeave={() => setShowHelpTooltip(false)}
                      onClick={() => setShowHelpTooltip((prev) => !prev)}
                      className="p-1 rounded-full text-slate-400 hover:text-brand-green hover:bg-brand-green/10 transition-colors cursor-pointer"
                      title="Learn what hourly overrides do"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>

                    {/* Hover Tooltip Card */}
                    {showHelpTooltip && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 p-3.5 bg-brand-charcoal text-white text-[11px] rounded-2xl shadow-xl z-50 animate-fade-in pointer-events-none border border-slate-700 leading-relaxed font-medium">
                        <p className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          What are Hourly Overrides?
                        </p>
                        Set specific capacities for individual peak or lunch hours when fewer or more therapists are on duty (e.g. 1 therapist at 1:00 PM lunch, or 4 therapists during 5:00 PM peak).
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Hourly Matrix */}
                {showHourlyOverrides && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Select capacity for each hour. Hours matching default capacity ({config.defaultCapacityPerSlot || 3}) are automatically streamlined.
                      </p>
                      {Object.keys(config.hourlyCapacityOverrides || {}).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, hourlyCapacityOverrides: {} }));
                            setIsDirty(true);
                            setSavedSuccess(false);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Reset all to default
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {generateSlotsFromHours(
                        config.morningStart,
                        config.morningEnd,
                        config.eveningStart,
                        config.eveningEnd,
                        config.slotDuration
                      ).map((time) => {
                        const currentCapacity = getSlotCapacity(config, time);
                        const isCustom = config.hourlyCapacityOverrides && typeof config.hourlyCapacityOverrides[time] === "number";

                        return (
                          <div
                            key={time}
                            className={`p-3 rounded-2xl border transition-all ${
                              isCustom
                                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80"
                                : "bg-slate-50/60 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-brand-charcoal dark:text-white">
                                {time}
                              </span>
                              {isCustom && (
                                <span className="text-[8px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>

                            {/* Capacity Selector */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((cap) => (
                                <button
                                  key={cap}
                                  type="button"
                                  onClick={() => handleSlotCapacityChange(time, cap)}
                                  className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                    currentCapacity === cap
                                      ? "bg-brand-green text-white shadow-xs"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                  title={`${time}: ${cap} patient slots`}
                                >
                                  {cap}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Booking Window & Walk-in Flexibility Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Booking Window & Walk-in Flexibility
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control how late walk-ins can be accepted by staff and when public online bookings cut off
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Real-Time Rules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Admin Walk-in Grace Window */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-green" />
                    <label className="text-xs font-black text-slate-900 dark:text-white">
                      Walk-in Grace Window (Staff Portal)
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Allows therapists to assign arriving walk-in patients to an ongoing or just-started time slot.
                  </p>
                  <select
                    name="adminWalkInGraceType"
                    value={config.adminWalkInGraceType || "end_of_slot"}
                    onChange={(e) => {
                      setConfig((prev) => ({ 
                        ...prev, 
                        adminWalkInGraceType: e.target.value as ClinicConfig["adminWalkInGraceType"]
                      }));
                      setSavedSuccess(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="end_of_slot">Until End of Current Slot (Recommended)</option>
                    <option value="15_min">Slot Start + 15 Minutes</option>
                    <option value="30_min">Slot Start + 30 Minutes</option>
                    <option value="anytime_today">Anytime Today (Full retroactive flexibility)</option>
                  </select>
                </div>

                {/* Customer Public Booking Cutoff */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <label className="text-xs font-black text-slate-900 dark:text-white">
                      Online Booking Cutoff (Patient Hub & Website)
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    How far in advance an online patient must submit a booking before the slot starts.
                  </p>
                  <select
                    name="publicBookingCutoffMinutes"
                    value={config.publicBookingCutoffMinutes ?? 0}
                    onChange={(e) => {
                      setConfig((prev) => ({ 
                        ...prev, 
                        publicBookingCutoffMinutes: Number(e.target.value)
                      }));
                      setSavedSuccess(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value={0}>Up to Slot Start Time (0 min - e.g. 10:59 AM for 11 AM)</option>
                    <option value={15}>15 Minutes Before Slot</option>
                    <option value={30}>30 Minutes Before Slot</option>
                    <option value={60}>1 Hour Before Slot</option>
                  </select>
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
                {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as Array<keyof ClinicConfig["weeklyHolidays"]>).map((day) => {
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
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="h-7 w-7 rounded-full bg-brand-green text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-sm border-0"
                  title="Add Staff Therapist"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Therapist Cards List */}
              <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto pr-0.5">
                {/* Expandable Add Staff Form */}
                {showAddForm && (
                  <div className="p-3.5 border border-brand-green/20 bg-brand-bg/15 rounded-xl space-y-3 animate-fade-in-up">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      Staff Member Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rohan Sharma"
                      value={newTherapistName}
                      onChange={(e) => setNewTherapistName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-250 font-semibold"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 text-[10px] select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewTherapistName("");
                        }}
                        className="px-3 py-1 text-slate-450 hover:text-slate-600 dark:hover:text-slate-300 font-bold bg-transparent border-0 cursor-pointer"
                      >
                        Cancel
                      </button>
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
                          setShowAddForm(false);
                          setIsDirty(true);
                          setSavedSuccess(false);
                        }}
                        className="px-3.5 py-1 bg-brand-green text-white font-black rounded-lg cursor-pointer border-0 shadow-sm"
                      >
                        Add Therapist
                      </button>
                    </div>
                  </div>
                )}

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
                            setIsDirty(true);
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

            </div>

          </div>

        </div>

      </div>

      {/* Sticky Bottom Actions Bar (Mobile & Desktop) */}
      <footer className={`fixed bottom-0 left-0 md:left-64 right-0 min-h-20 border-t transition-all z-30 shadow-2xl px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDirty
          ? "bg-slate-900 text-white border-brand-green/40 ring-4 ring-brand-green/20"
          : "bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 backdrop-blur-md"
      }`}>
        <div className="flex items-center gap-2 select-none w-full sm:w-auto justify-between sm:justify-start">
          {isDirty ? (
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>You have unsaved changes pending</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold">
              <Clock className="h-4 w-4 text-brand-green shrink-0" />
              <span>Last saved on {lastSavedTime}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-black transition-colors cursor-pointer"
            >
              Discard
            </button>
          )}
          
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-brand-green text-white hover:bg-brand-green-hover px-6 py-2.5 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer"
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
