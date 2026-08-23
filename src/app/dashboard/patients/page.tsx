"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Loader2, 
  FileText, 
  Calendar, 
  Clock, 
  UserPlus, 
  Folder,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from "lucide-react";
import { getPatients, createPatient, updatePatient } from "@/lib/patientsDb";
import { getClinicConfig } from "@/lib/db";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob?: string;
  gender?: string;
  treatmentPlan: string;
  status: "active" | "completed" | "pending";
  googleDriveFolderId?: string;
  therapistName?: string;
  lastVisit?: string;
  upcoming?: string;
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [daysSortOrder, setDaysSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [enrolledTherapists, setEnrolledTherapists] = useState<string[]>([]);

  // Registration modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [dialCode, setDialCode] = useState("+91");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "Male",
    treatmentPlan: "",
    therapistName: "Dr. Sarah Jenkins", // Default matching mockup
    status: "active" as "active" | "completed" | "pending",
    upcoming: "",
  });

  // Action Menu dropdown state (stores patient ID of open menu)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Initial Fetch of Patients
  useEffect(() => {
    fetchPatientsList();
    fetchEnrolledTherapists();
  }, []);

  const fetchEnrolledTherapists = async () => {
    try {
      const config = await getClinicConfig();
      if (config && config.therapists && config.therapists.length > 0) {
        setEnrolledTherapists(config.therapists);
        // Default patient assigned therapist to the first one in the list
        setFormData((prev) => ({
          ...prev,
          therapistName: config.therapists[0]
        }));
      } else {
        setEnrolledTherapists(["Dr. Sarah Jenkins", "Dr. Rohan Das"]);
      }
    } catch (err) {
      console.error("Error loading enrolled therapists: ", err);
      setEnrolledTherapists(["Dr. Sarah Jenkins", "Dr. Rohan Das"]);
    }
  };

  // Helper to parse dates like "DD-MM-YYYY" or "YYYY-MM-DD" or "Month DD, YYYY"
  function parseDate(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (clean.toLowerCase().includes("pending") || clean.toLowerCase().includes("unscheduled") || clean === "—" || clean === "") {
      return null;
    }
    
    // Try standard JS Date parsing
    let parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) return parsed;
    
    // Try DD-MM-YYYY format
    const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
      const year = parseInt(dmyMatch[3], 10);
      parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    
    return null;
  }

  function getDaysLeft(dateStr?: string): number | null {
    const parsed = parseDate(dateStr);
    if (!parsed) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);
    
    const diffTime = parsed.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // Filter & Sort Patients Locally
  useEffect(() => {
    const search = searchQuery.toLowerCase().trim();
    let result = patients.filter((patient) => {
      // 1. Search Query filter (matches name, ID, phone, email)
      const matchesSearch = 
        search === "" ||
        patient.name.toLowerCase().includes(search) ||
        patient.id?.toLowerCase().includes(search) ||
        patient.phone.includes(search) ||
        patient.email.toLowerCase().includes(search);

      // 2. Status filter
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;

      // 3. Therapist filter
      const matchesTherapist = 
        therapistFilter === "all" || 
        patient.therapistName === therapistFilter;

      return matchesSearch && matchesStatus && matchesTherapist;
    });

    // Sort by Days Left if order is set
    if (daysSortOrder !== "none") {
      result = [...result].sort((a, b) => {
        const daysA = getDaysLeft(a.upcoming);
        const daysB = getDaysLeft(b.upcoming);
        
        if (daysA === null && daysB === null) return 0;
        if (daysA === null) return 1; // Unscheduled goes to bottom
        if (daysB === null) return -1;
        
        // Past slots go below future slots
        if (daysA < 0 && daysB >= 0) return 1;
        if (daysB < 0 && daysA >= 0) return -1;
        
        if (daysSortOrder === "asc") {
          return daysA - daysB;
        } else {
          return daysB - daysA;
        }
      });
    }

    setFilteredPatients(result);
    setCurrentPage(1); // Reset to page 1 on filter change
  }, [patients, searchQuery, statusFilter, therapistFilter, daysSortOrder]);

  const fetchPatientsList = async () => {
    setLoading(true);
    setError("");
    try {
      // Direct call to Client Firestore
      const list = await getPatients();
      setPatients(list as Patient[]);
    } catch (err: any) {
      console.error("Error fetching patients list:", err);
      setError("Failed to load patient records from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };



  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");

    try {
      // 1. Create Patient in Firestore Client-side (rules are satisfied because user is signed in)
      console.log("[Client Page] Creating patient profile in Firestore...", formData.name);
      const newPatient = await createPatient({
        name: formData.name,
        email: formData.email.trim().toLowerCase(),
        phone: `${dialCode} ${formData.phone.trim()}`,
        dob: formData.dob,
        gender: formData.gender,
        treatmentPlan: formData.treatmentPlan,
        status: formData.status,
        therapistName: formData.therapistName,
        upcoming: formData.upcoming || "Pending Schedule",
        lastVisit: "N/A"
      });

      console.log("[Client Page] Created Patient doc ID:", newPatient.id);

      // 2. Call secure API route to create folder on Google Drive
      try {
        console.log("[Client Page] Requesting Google Drive folder creation...");
        const driveResponse = await fetch("/api/drive/create-folder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: newPatient.id,
            patientName: newPatient.name
          }),
        });

        const driveResult = await driveResponse.json();
        if (driveResult.success && driveResult.folderId) {
          console.log("[Client Page] Google Drive Folder created:", driveResult.folderId);
          
          // 3. Update Patient Doc with Drive Folder ID (client-side)
          await updatePatient(newPatient.id!, { googleDriveFolderId: driveResult.folderId });
          console.log("[Client Page] Saved Drive Folder ID to patient profile!");
        } else {
          console.warn("[Client Page] Drive Folder ID was not returned by API:", driveResult.error);
        }
      } catch (driveErr) {
        console.error("[Client Page] Google Drive folder creation error (Non-blocking):", driveErr);
      }

      setModalOpen(false);
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Male",
        treatmentPlan: "",
        therapistName: enrolledTherapists[0] || "Dr. Sarah Jenkins",
        status: "active",
        upcoming: "",
      });
      
      // Refresh list
      fetchPatientsList();
    } catch (err: any) {
      console.error("Error registering patient:", err);
      setFormError(err.message || "Failed to save patient profile. Verify your internet connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close dropdown menu when clicking elsewhere
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // Filter lists internally
  const therapistList = Array.from(
    new Set([
      ...enrolledTherapists,
      ...patients.map((p) => p.therapistName).filter(Boolean)
    ])
  );

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPatientsList = filteredPatients.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;

  return (
    <div className="space-y-8 animate-page-fade relative">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
            Patients Database
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Manage patient records, recovery journeys, and treatment plans in one centralized clinical hub.
          </p>
        </div>
        
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <UserPlus className="h-4 w-4" />
          New Patient
        </button>
      </div>

      {/* Main Container: Search, Filter Tabs & Table Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] overflow-hidden">
        
        {/* Search, Status Tabs & Filters Bar */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Left Side: Status Filtering Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800 p-1.5 rounded-2xl w-full lg:w-auto">
            {["all", "active", "pending", "completed"].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                }}
                className={`px-4 py-2 text-xs font-bold capitalize rounded-xl transition-all ${
                  statusFilter === status
                    ? "bg-white dark:bg-slate-700 text-brand-charcoal dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-brand-green dark:hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Right Side: Search and Therapist Select Dropdown */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            
            {/* Search Input Box */}
            <div className="relative flex-grow sm:w-64">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, ID, phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
              />
            </div>

            {/* Therapist Filter Select */}
            <div className="relative">
              <select
                value={therapistFilter}
                onChange={(e) => {
                  setTherapistFilter(e.target.value);
                }}
                className="w-full sm:w-48 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green appearance-none cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <option value="all">Filter by Therapist</option>
                {therapistList.map((therapist) => (
                  <option key={therapist} value={therapist}>
                    {therapist}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Table Grid */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col h-64 items-center justify-center text-slate-500 text-xs font-semibold">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green mb-2" />
              <span>Loading patient database records...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col h-64 items-center justify-center text-red-500 text-xs font-semibold">
              <AlertCircle className="h-6 w-6 mb-2 text-red-400" />
              <span>{error}</span>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col h-64 items-center justify-center text-slate-400 text-xs font-semibold">
              <FileText className="h-6 w-6 mb-2 text-slate-300" />
              <span>No patient records found matching your filters.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Patient Name & ID</th>
                  <th className="px-6 py-4">Treatment Plan</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4">Upcoming</th>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:text-brand-green select-none transition-colors"
                    onClick={() => {
                      setDaysSortOrder((prev) => {
                        if (prev === "none") return "asc";
                        if (prev === "asc") return "desc";
                        return "none";
                      });
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Days Left</span>
                      <span className="text-[8px]">
                        {daysSortOrder === "asc" ? "▲" : daysSortOrder === "desc" ? "▼" : "⇅"}
                      </span>
                    </div>
                  </th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {currentPatientsList.map((patient) => {
                  const statusColors = {
                    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400",
                    completed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400",
                  };

                  return (
                    <tr 
                      key={patient.id}
                      className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      {/* Name & ID Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-2 ring-brand-sand/30 flex items-center justify-center text-brand-green font-black text-xs uppercase shrink-0">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <Link 
                              href={`/dashboard/patients/${patient.id}`}
                              className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green transition-colors"
                            >
                              {patient.name}
                            </Link>
                            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">
                              {patient.id}
                            </p>
                            <p className="text-[9px] font-black uppercase mt-1 leading-none">
                              {patient.activated ? (
                                <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
                                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                  Portal Active
                                </span>
                              ) : (
                                <span className="text-slate-450 dark:text-slate-450 inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full select-all font-mono">
                                  Code: {patient.activationCode || "N/A"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Treatment Plan Column */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-xl bg-brand-bg dark:bg-brand-green/10 border border-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                          {patient.treatmentPlan}
                        </span>
                      </td>

                      {/* Last Visit Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {patient.lastVisit || "N/A"}
                      </td>

                      {/* Upcoming Slot Date */}
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {patient.upcoming || "Pending Schedule"}
                      </td>

                      {/* Days Left Countdown */}
                      <td className="px-6 py-4">
                        {(() => {
                          const days = getDaysLeft(patient.upcoming);
                          if (days === null) {
                            return <span className="text-slate-400 font-semibold text-xs">—</span>;
                          }
                          if (days < 0) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 px-2 py-0.5 text-[10px] font-extrabold text-slate-500">
                                Past Slot
                              </span>
                            );
                          }
                          if (days === 0) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400 animate-pulse">
                                Today
                              </span>
                            );
                          }
                          if (days === 1) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                                Tomorrow
                              </span>
                            );
                          }
                          if (days <= 2) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-600 dark:text-red-400">
                                2 Days Left
                              </span>
                            );
                          }
                          if (days <= 7) {
                            return (
                              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                {days} Days Left
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {days} Days Left
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold capitalize ${statusColors[patient.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            patient.status === "active" 
                              ? "bg-emerald-500" 
                              : patient.status === "pending" 
                                ? "bg-amber-500" 
                                : "bg-slate-400"
                          }`} />
                          {patient.status}
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="px-6 py-4 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === patient.id ? null : patient.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-green hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block"
                        >
                          <MoreVertical className="w-4.5 h-4.5" />
                        </button>
                        
                        {/* Dropdown Menu Box */}
                        {activeMenuId === patient.id && (
                          <div 
                            className="absolute right-6 top-12 z-20 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl py-2 animate-fade-in text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                             <Link
                              href={`/dashboard/patients/${patient.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                            >
                              <FileText className="w-4 h-4 text-brand-green" />
                              Clinical Profile
                            </Link>
                            <Link
                              href={`/dashboard/walkin?patientId=${patient.id}`}
                              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                            >
                              <Calendar className="w-4 h-4 text-brand-green" />
                              Book Appointment
                            </Link>
                            {patient.googleDriveFolderId && (
                              <a
                                href={`https://drive.google.com/drive/folders/${patient.googleDriveFolderId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800"
                              >
                                <Folder className="w-4 h-4" />
                                Google Drive
                              </a>
                            )}
                            <button
                              onClick={() => {
                                let cleanPhone = patient.phone.replace(/\D/g, "");
                                if (cleanPhone.startsWith("0")) {
                                  cleanPhone = cleanPhone.replace(/^0+/, "");
                                }
                                if (cleanPhone.length === 10) {
                                  cleanPhone = "91" + cleanPhone;
                                }
                                if (!cleanPhone || cleanPhone.length < 10) {
                                  cleanPhone = "919206651295";
                                }
                                const waUrl = `https://wa.me/${cleanPhone}`;
                                window.open(waUrl, "_blank");
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-brand-bg/50 hover:text-brand-green dark:hover:bg-slate-800 text-left"
                            >
                              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              WhatsApp Chat
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Toolbar */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredPatients.length)} of {filteredPatients.length} entries
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-brand-green text-white rounded-xl">
              {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-850 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Weekly New Patients */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Weekly New Patients
            </span>
            <div className="h-8 w-8 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-xs">
              +12%
            </div>
          </div>
          <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
            32
          </h3>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-green rounded-full" style={{ width: "65%" }} />
          </div>
        </div>

        {/* Metric 2: Retention Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Retention Rate
            </span>
            <span className="text-emerald-500 font-bold text-xs">Stable</span>
          </div>
          <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
            94.2%
          </h3>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-green rounded-full" style={{ width: "94%" }} />
          </div>
        </div>

        {/* Metric 3: Average Recovery Time */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.06)] relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
              Average Recovery Time
            </span>
            <div className="h-8 w-8 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 font-bold text-xs">
              -4%
            </div>
          </div>
          <h3 className="text-3xl font-black text-brand-charcoal dark:text-white">
            6.4 <span className="text-slate-400 text-sm font-black uppercase">Weeks</span>
          </h3>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-green rounded-full" style={{ width: "45%" }} />
          </div>
        </div>

      </div>

      {/* New Patient Registration Overlay Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-charcoal/45 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-brand-bg dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-brand-green font-black">
                <UserPlus className="h-5 w-5" />
                <span className="text-lg text-brand-charcoal dark:text-white">Register New Patient</span>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Marcus Thorne"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-center">
                    {/* Country Code Selector (Combo Box) */}
                    <input
                      type="text"
                      list="dial-codes"
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      placeholder="+91"
                      className="w-24 rounded-l-2xl border border-r-0 border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-900 px-3 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-center text-slate-700 dark:text-slate-300"
                    />
                    <datalist id="dial-codes">
                      <option value="+91">India (+91)</option>
                      <option value="+1">US/Canada (+1)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+61">Australia (+61)</option>
                      <option value="+971">UAE (+971)</option>
                      <option value="+65">Singapore (+65)</option>
                      <option value="+966">Saudi Arabia (+966)</option>
                      <option value="+60">Malaysia (+60)</option>
                      <option value="+64">New Zealand (+64)</option>
                      <option value="+49">Germany (+49)</option>
                      <option value="+33">France (+33)</option>
                      <option value="+353">Ireland (+353)</option>
                      <option value="+27">South Africa (+27)</option>
                      <option value="+94">Sri Lanka (+94)</option>
                      <option value="+977">Nepal (+977)</option>
                      <option value="+880">Bangladesh (+880)</option>
                      <option value="+968">Oman (+968)</option>
                      <option value="+974">Qatar (+974)</option>
                      <option value="+965">Kuwait (+965)</option>
                      <option value="+973">Bahrain (+973)</option>
                    </datalist>
                    {/* Phone Digit input */}
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="98765 43210"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="flex-grow rounded-r-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="dob"
                      required
                      placeholder="DD/MM/YYYY"
                      pattern="\d{2}/\d{2}/\d{4}"
                      title="Please enter DOB in DD/MM/YYYY format (e.g., 15/05/1990)"
                      value={formData.dob}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 pl-4 pr-11 py-2.5 text-xs font-bold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                    />
                    
                    {/* Hidden Native Date Input for triggering picker */}
                    <input
                      type="date"
                      id="hidden-dob-picker"
                      min="1920-01-01"
                      max={getTodayDateString()}
                      onChange={(e) => {
                        const val = e.target.value; // YYYY-MM-DD
                        if (val) {
                          const [y, m, d] = val.split("-");
                          setFormData((prev) => ({ ...prev, dob: `${d}/${m}/${y}` }));
                        }
                      }}
                      className="absolute pointer-events-none opacity-0 w-0 h-0"
                      tabIndex={-1}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const picker = document.getElementById("hidden-dob-picker") as HTMLInputElement;
                        if (picker) {
                          // Try to pre-fill the picker if the current text is a valid DD/MM/YYYY
                          const currentText = formData.dob;
                          if (/^\d{2}\/\d{2}\/\d{4}$/.test(currentText)) {
                            const [d, m, y] = currentText.split("/");
                            picker.value = `${y}-${m}-${d}`;
                          } else {
                            picker.value = "";
                          }
                          try {
                            picker.showPicker();
                          } catch (e) {
                            picker.focus();
                          }
                        }
                      }}
                      className="absolute right-3.5 text-slate-400 hover:text-brand-green p-1 transition-colors"
                      title="Open Calendar"
                    >
                      <Calendar className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green cursor-pointer text-slate-700 dark:text-slate-350"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Treatment Plan */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Treatment Plan / Condition
                  </label>
                  <input
                    type="text"
                    name="treatmentPlan"
                    required
                    placeholder="e.g. Post-op ACL Recovery, Chronic Back Pain"
                    value={formData.treatmentPlan}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                {/* Assigned Therapist */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Assigned Therapist
                  </label>
                  <select
                    name="therapistName"
                    value={formData.therapistName}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-green cursor-pointer text-slate-700 dark:text-slate-350"
                  >
                    {enrolledTherapists.map((therapist) => (
                      <option key={therapist} value={therapist}>
                        {therapist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upcoming Schedule */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Initial Appointment Schedule
                  </label>
                  <input
                    type="text"
                    name="upcoming"
                    placeholder="e.g. Nov 02, 2026 14:00"
                    value={formData.upcoming}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-brand-green transition-colors text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-850">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-slate-200 dark:border-slate-800 text-slate-500 px-5 py-3 text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating folder...
                    </>
                  ) : (
                    "Save Patient Profile"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
