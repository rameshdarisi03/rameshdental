"use client";

import { useEffect, useState } from "react";
import { getClinicConfig, saveClinicConfig, ClinicConfig } from "@/lib/db";
import { Loader2, Save, CheckCircle, ShieldAlert, Lock, Clock, Calendar, Users, Trash2, Plus, MapPin, Mail, Phone } from "lucide-react";

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
    eveningEnd: "07:00 PM",
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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

  if (loadingConfig) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading configurations...</span>
      </div>
    );
  }

  // Access Denied for receptionists
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Admin Settings Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
          The Clinic Configuration Panel is restricted to administrators only. Receptionist accounts do not have permission to change hours or holidays.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Clinic Configuration</h1>
        <p className="text-xs text-slate-500 mt-1 font-semibold">Configure appointment slots duration, shift timings, and weekly closed days.</p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-[#f0f4f2] border border-brand-green/20 text-slate-700 text-xs font-bold rounded-2xl flex items-center gap-2">
          <CheckCircle className="h-4.5 w-4.5 text-brand-green" />
          Settings updated successfully! Changes reflect instantly on the booking calendar.
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: General and Shift settings */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Shift hours card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-6">
            <h3 className="font-black text-brand-charcoal dark:text-white text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-green" />
              Operational Shifts & Durations
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Duration option */}
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-2">
                  Time Slot Duration *
                </label>
                <select
                  name="slotDuration"
                  value={config.slotDuration}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes (1 Hour)</option>
                </select>
              </div>

              {/* Hours text preview */}
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-2">
                  Operating Hours Banner Info
                </label>
                <input
                  type="text"
                  name="operationalHoursText"
                  value={config.operationalHoursText}
                  onChange={handleInputChange}
                  placeholder="Mon-Sat: 09:00 AM - 07:00 PM"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-brand-charcoal dark:text-slate-350">Shift Start & End Hours</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#fbfcfb] dark:bg-slate-950 p-4 rounded-2xl border border-slate-100">
                {/* Morning shifts */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-brand-green tracking-wider block uppercase">Morning Session</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-slate-450 block mb-1 font-semibold">Start Hour</label>
                      <select
                        name="morningStart"
                        value={config.morningStart}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none font-bold"
                      >
                        {hourOptions.morningStart.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-455 block mb-1 font-semibold">End Hour</label>
                      <select
                        name="morningEnd"
                        value={config.morningEnd}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none font-bold"
                      >
                        {hourOptions.morningEnd.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Evening shifts */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black text-brand-green tracking-wider block uppercase">Evening Session</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-slate-450 block mb-1 font-semibold">Start Hour</label>
                      <select
                        name="eveningStart"
                        value={config.eveningStart}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none font-bold"
                      >
                        {hourOptions.eveningStart.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-455 block mb-1 font-semibold">End Hour</label>
                      <select
                        name="eveningEnd"
                        value={config.eveningEnd}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none font-bold"
                      >
                        {hourOptions.eveningEnd.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Clinic Location & Contact Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-6">
            <h3 className="font-black text-brand-charcoal dark:text-white text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-green" />
              Clinic Location & Contact Info
            </h3>

            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Clinic Location Address *
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={config.address || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. 123 Clinical Wellness Way, Bangalore"
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Landmark
                </label>
                <input
                  type="text"
                  name="landmark"
                  value={config.landmark || ""}
                  onChange={handleInputChange}
                  placeholder="e.g. Next to Central Bank..."
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Contact Phone Number *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    required
                    value={config.phone || ""}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 92066 51295"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Contact Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={config.email || ""}
                    onChange={handleInputChange}
                    placeholder="e.g. info@gaitphysioclinic.com"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              {/* Google Maps Link & Embed */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-850">
                <h4 className="text-xs font-bold text-brand-charcoal dark:text-slate-350">Google Maps Integration</h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Google Maps Navigation Link *
                  </label>
                  <input
                    type="text"
                    name="googleMapsLink"
                    required
                    value={config.googleMapsLink || ""}
                    onChange={handleInputChange}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Google Maps Embed URL (Iframe src) *
                  </label>
                  <input
                    type="text"
                    name="googleMapsEmbed"
                    required
                    value={config.googleMapsEmbed || ""}
                    onChange={handleInputChange}
                    placeholder="https://www.google.com/maps/embed?pb=..."
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                    To get the embed URL: Open Google Maps &gt; Search for your clinic &gt; Click Share &gt; Choose Embed a map &gt; copy only the `src` URL string inside the double quotes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Settings...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Clinic Config
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Weekly Holidays & Therapist Management */}
        <div className="md:col-span-4 space-y-6">
          {/* Weekly Holidays Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-5">
            <h3 className="font-black text-brand-charcoal dark:text-white text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-green" />
              Weekly Holidays
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Select the days of the week that the clinic is closed. These days will automatically be disabled on the patient booking calendar.
            </p>

            <div className="space-y-3 pt-2">
              {(Object.keys(config.weeklyHolidays) as Array<keyof ClinicConfig["weeklyHolidays"]>).map((day) => {
                const isChecked = config.weeklyHolidays[day];
                return (
                  <label
                    key={day}
                    className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer select-none transition-all ${
                      isChecked
                        ? "bg-red-50/45 border-red-200 text-red-650 dark:bg-rose-955/20 dark:border-rose-900/50"
                        : "bg-white hover:bg-brand-bg border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold capitalize">{day}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleHolidayToggle(day)}
                      className="h-4 w-4 accent-brand-green rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Therapist Management Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 p-6 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] space-y-5">
            <h3 className="font-black text-brand-charcoal dark:text-white text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-green" />
              Enrolled Therapists
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Add or remove physiotherapists for this clinic. These names populate the patient assignment dropdowns.
            </p>

            <div className="space-y-2.5 pt-2 max-h-[300px] overflow-y-auto pr-1">
              {config.therapists && config.therapists.map((therapist) => (
                <div
                  key={therapist}
                  className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-[#fbfcfb] dark:bg-slate-950"
                >
                  <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{therapist}</span>
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
                    className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(!config.therapists || config.therapists.length === 0) && (
                <div className="text-center py-4 text-xs font-semibold text-slate-450 italic">
                  No therapists enrolled.
                </div>
              )}
            </div>

            {/* Add Therapist Row */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Dr. Vikram Seth"
                  value={newTherapistName}
                  onChange={(e) => setNewTherapistName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-955 px-3 py-2 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
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
                  className="inline-flex items-center justify-center p-2.5 rounded-xl bg-brand-green text-white hover:bg-brand-green-hover transition-colors shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
}
