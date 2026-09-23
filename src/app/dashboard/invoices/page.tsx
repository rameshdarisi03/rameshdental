"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  subscribeInvoices, 
  updateInvoiceStatus, 
  voidInvoice,
  deleteInvoice, 
  Invoice 
} from "@/lib/invoicesDb";
import { getPatients, Patient } from "@/lib/patientsDb";
import { FEATURES } from "@/lib/features";
import jsPDF from "jspdf";
import { buildUnifiedInvoicePdf } from "@/lib/prescriptionPdf";
import CreateEditInvoiceModal from "@/components/dashboard/invoices/CreateEditInvoiceModal";
import ViewInvoiceModal from "@/components/dashboard/invoices/ViewInvoiceModal";
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Download, 
  CreditCard, 
  Loader2, 
  MessageSquare,
  HelpCircle,
  Edit2,
  Ban,
  Check,
  FileText,
  X,
  MoreVertical
} from "lucide-react";

export default function ClinicalBillingPage() {
  const router = useRouter();

  // Redirect if feature is disabled
  useEffect(() => {
    if (!FEATURES.enableModularInvoicing) {
      router.push("/dashboard");
    }
  }, [router]);

  // Firestore & Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue" | "voided">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [mobileActionInvoice, setMobileActionInvoice] = useState<Invoice | null>(null);

  // Quick Payment Menu State
  const [activePaymentMenuId, setActivePaymentMenuId] = useState<string | null>(null);

  // Global Action Feedback
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Outside click listener for payment menu
  useEffect(() => {
    if (!activePaymentMenuId) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-payment-menu]")) {
        setActivePaymentMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [activePaymentMenuId]);

  // Subscribe to real-time invoices & load patients
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });

    async function loadPatientsList() {
      try {
        const pList = await getPatients();
        setPatients(pList);
      } catch (err) {
        console.error("Error loading patients list for invoicing:", err);
      }
    }
    loadPatientsList();

    return () => unsubscribe();
  }, []);

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Status Filter
      if (statusFilter === "paid" && inv.status !== "paid") return false;
      if (statusFilter === "pending" && inv.status !== "pending") return false;
      if (statusFilter === "overdue" && inv.status !== "overdue") return false;
      if (statusFilter === "voided" && (inv.status !== "voided" && inv.status !== "cancelled")) return false;

      // 2. Search Query (matches invoice number, patient name, PID, or phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = (inv.invoiceNumber || "").toLowerCase().includes(q);
        const nameMatch = (inv.patientName || "").toLowerCase().includes(q);
        const pidMatch = (inv.patientId || "").toLowerCase().includes(q);
        const phoneMatch = (inv.patientPhone || "").toLowerCase().includes(q);
        const therapistMatch = (inv.therapistName || "").toLowerCase().includes(q);
        return numMatch || nameMatch || pidMatch || phoneMatch || therapistMatch;
      }

      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  // Executive KPI Calculations
  const stats = useMemo(() => {
    let unpaidTotal = 0;
    let unpaidCount = 0;
    let revenueMtd = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let voidedCount = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    invoices.forEach((inv) => {
      const invTotal = inv.totalAmount || 0;
      const invDate = new Date(inv.serviceDate || Date.now());

      if (inv.status === "voided" || inv.status === "cancelled") {
        voidedCount++;
        return; // Don't count voided in revenue
      }

      if (inv.status === "paid") {
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          revenueMtd += invTotal;
        }
      } else if (inv.status === "pending") {
        pendingCount++;
        unpaidCount++;
        unpaidTotal += invTotal;
      } else if (inv.status === "overdue") {
        overdueCount++;
        unpaidCount++;
        unpaidTotal += invTotal;
      }
    });

    return { unpaidTotal, unpaidCount, revenueMtd, pendingCount, overdueCount, voidedCount };
  }, [invoices]);

  // Handle Quick Status Change
  const handleQuickPaymentChange = async (
    inv: Invoice, 
    newStatus: Invoice["status"], 
    newMethod?: Invoice["paymentMethod"]
  ) => {
    try {
      await updateInvoiceStatus(inv.id, newStatus, newMethod);
      setActivePaymentMenuId(null);
      setActionSuccess(`Invoice ${inv.invoiceNumber} updated to ${newStatus.toUpperCase()}!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error updating invoice status:", err);
      setActionError("Failed to update status.");
      setTimeout(() => setActionError(""), 3000);
    }
  };

  // Handle Void Confirmation
  const handleConfirmVoid = async () => {
    if (!voidingInvoice) return;
    try {
      await voidInvoice(voidingInvoice.id, voidReason || "Voided by clinic administrator");
      setVoidingInvoice(null);
      setVoidReason("");
      setActionSuccess(`Invoice ${voidingInvoice.invoiceNumber} marked as VOIDED.`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error voiding invoice:", err);
      setActionError("Failed to void invoice.");
      setTimeout(() => setActionError(""), 3000);
    }
  };

  // Build Vector PDF Document via SSOT Unified Invoice PDF Generator
  const buildInvoicePdf = (inv: Invoice): jsPDF => {
    return buildUnifiedInvoicePdf({
      invoiceNumber: inv.invoiceNumber,
      patientName: inv.patientName,
      patientId: inv.patientId,
      patientEmail: inv.patientEmail,
      patientPhone: inv.patientPhone,
      therapistName: inv.therapistName,
      serviceDate: inv.serviceDate,
      dueDate: inv.dueDate,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      items: inv.items,
      subtotal: inv.subtotal,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      discount: inv.discount,
      totalAmount: inv.totalAmount,
      currency: inv.currency || "INR",
      notes: inv.notes,
    });
  };

  // Download PDF Action
  const handleDownloadPdf = (inv: Invoice) => {
    try {
      const pdf = buildInvoicePdf(inv);
      pdf.save(`${inv.invoiceNumber}_GaitPhysio.pdf`);
      setActionSuccess(`Downloaded ${inv.invoiceNumber} PDF!`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setActionError("Failed to generate PDF.");
      setTimeout(() => setActionError(""), 3000);
    }
  };

  // WhatsApp Pre-filled URL Generator
  const getWhatsAppShareUrl = (inv: Invoice) => {
    if (!inv.patientPhone) return "#";
    const cleanDigits = inv.patientPhone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.startsWith("91") && cleanDigits.length === 12
      ? cleanDigits
      : cleanDigits.length === 10
      ? `91${cleanDigits}`
      : cleanDigits;

    const message = `Hello ${inv.patientName || "Valued Patient"},

Your official treatment invoice from Gait Physio Clinic is ready:

📄 *Invoice #*: ${inv.invoiceNumber}
📅 *Date*: ${inv.serviceDate}
👨‍⚕️ *Therapist*: ${inv.therapistName || "Dr. Kinnera"}
💳 *Total Amount*: ₹${(inv.totalAmount || 0).toLocaleString("en-IN")} (${(inv.status || "PAID").toUpperCase()})

Thank you for choosing Gait Physio Clinic! You can also view your complete billing and prescription history anytime in your Patient Hub.

Warm regards,
*Gait Physio Clinic, Bengaluru*
📞 +91 89044 56243`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-['Inter',sans-serif]">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-md shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Clinical Billing Center
                </h1>
                <span className="bg-brand-green/10 text-brand-green px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider hidden sm:inline-flex">
                  ₹ INR
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Generate itemized treatment bills, track clinic revenue, & sync real-time receipts to Patient Hub.
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions: Search + Create Button */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice, patient, or phone..."
              className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-brand-green transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingInvoice(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-102 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            title="Create a new clinical invoice"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Invoice</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* Global Alerts Feedback */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Executive KPI Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Revenue MTD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand-green/10 text-brand-green rounded-2xl shrink-0">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Collected (MTD)</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Total revenue collected from paid invoices in the current month.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-brand-green truncate">
              ₹{stats.revenueMtd.toLocaleString("en-IN")}
            </h3>
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Unpaid Invoices</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Total outstanding balance across all pending and overdue bills.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">
              {stats.unpaidCount} <span className="text-xs font-bold text-slate-400">(₹{stats.unpaidTotal.toLocaleString("en-IN")})</span>
            </h3>
          </div>
        </div>

        {/* Pending Statements */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Pending Claims</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Invoices awaiting patient payment or insurance claim settlement.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{stats.pendingCount}</h3>
          </div>
        </div>

        {/* Voided / Cancelled Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <Ban className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Voided / Corrected</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Bills that were voided due to typos or duplicate entries.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{stats.voidedCount}</h3>
          </div>
        </div>

      </div>

      {/* Full-Width Invoices Ledger Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        
        {/* Table Header & Filter Strip */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-green" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Clinical Invoices Ledger ({filteredInvoices.length})
            </h3>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-2xl overflow-x-auto self-start sm:self-auto">
            {(["all", "paid", "pending", "overdue", "voided"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-white dark:bg-slate-900 text-brand-green shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs font-bold space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            <span>Loading live invoice records...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 space-y-2">
            <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p>No invoices match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-5 py-3.5">Service Date</th>
                  <th className="px-5 py-3.5">Therapist</th>
                  <th className="px-5 py-3.5">Payment Method</th>
                  <th className="px-5 py-3.5">Total (₹)</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredInvoices.map((inv) => {
                  const isVoided = inv.status === "voided" || inv.status === "cancelled";
                  const isPaid = inv.status === "paid";

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors ${
                        isVoided ? "opacity-60 bg-rose-50/10" : ""
                      }`}
                    >
                      {/* Invoice ID */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </span>
                        {inv.revision && inv.revision > 1 && (
                          <span className="ml-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            v{inv.revision}
                          </span>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {inv.patientName}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <span>{inv.patientId || "PID: ----"}</span>
                          {inv.patientPhone && (
                            <>
                              <span>•</span>
                              <span>{inv.patientPhone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Service Date */}
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {inv.serviceDate || "----"}
                      </td>

                      {/* Therapist */}
                      <td className="px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {inv.therapistName || "Dr. Kinnera"}
                      </td>

                      {/* Payment Method */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {inv.paymentMethod || "UPI"}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="px-5 py-4">
                        <span className={`text-xs font-black ${isVoided ? "line-through text-slate-400" : "text-brand-green"}`}>
                          ₹{(inv.totalAmount || 0).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Paid
                          </span>
                        ) : isVoided ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 text-[10px] font-black uppercase" title={inv.voidReason || "Voided"}>
                            <Ban className="w-2.5 h-2.5" />
                            Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 text-[10px] font-black uppercase">
                            <Clock className="w-2.5 h-2.5" />
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Action Buttons with Contextual Help Tooltips */}
                      <td className="px-5 py-4 text-right">
                        {/* Desktop Action Toolbar (hidden on mobile) */}
                        <div className="hidden md:flex items-center gap-1.5 justify-end">
                          {/* 1. Edit Button (FIRST) */}
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors group relative cursor-pointer shadow-2xs"
                              title="Edit / Correct Invoice"
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                Edit or correct items & discounts
                              </span>
                            </button>
                          )}

                          {/* 2. WhatsApp Button */}
                          {(inv.patientPhone) && !isVoided && (
                            <a
                              href={getWhatsAppShareUrl(inv)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors group relative cursor-pointer shadow-2xs"
                              title="Send WhatsApp bill to patient"
                            >
                              <MessageSquare className="h-4 w-4" />
                              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-44 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                Send WhatsApp bill & receipt directly to patient
                              </span>
                            </a>
                          )}

                          {/* 3. Download PDF Button */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors group relative cursor-pointer shadow-2xs"
                            title="Download official PDF receipt"
                          >
                            <Download className="h-4 w-4" />
                            <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                              Download official A4 PDF tax receipt (₹)
                            </span>
                          </button>

                          {/* 4. View Details Button */}
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors group relative cursor-pointer shadow-2xs"
                            title="View itemized breakdown"
                          >
                            <FileText className="h-4 w-4" />
                            <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                              View full itemized invoice details
                            </span>
                          </button>

                          {/* 5. Payment Quick-Toggle (With Click-Outside Protection) */}
                          {!isVoided && (
                            <div className="relative" data-payment-menu>
                              <button
                                type="button"
                                onClick={() => setActivePaymentMenuId(activePaymentMenuId === inv.id ? null : inv.id)}
                                className={`p-2 rounded-xl transition-colors group relative cursor-pointer shadow-2xs ${
                                  activePaymentMenuId === inv.id
                                    ? "bg-brand-green text-white"
                                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                                title="Update Payment Status"
                              >
                                <CreditCard className="h-4 w-4" />
                                <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                  Mark as Paid or change payment method
                                </span>
                              </button>

                              {/* Payment Dropdown Menu */}
                              {activePaymentMenuId === inv.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-left animate-slide-down">
                                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800/80">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Set Payment Status</p>
                                    <span className="text-[9px] text-slate-400 font-bold">Tap outside to close</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickPaymentChange(inv, "paid", "UPI")}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span>Paid via UPI</span>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickPaymentChange(inv, "paid", "Cash")}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span>Paid via Cash</span>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickPaymentChange(inv, "paid", "Card")}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span>Paid via Card</span>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickPaymentChange(inv, "pending")}
                                    className="w-full px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl flex items-center justify-between transition-colors cursor-pointer"
                                  >
                                    <span>Mark as Pending</span>
                                    <Clock className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 6. Cancel Bill (Void) Button */}
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidingInvoice(inv);
                                setVoidReason("");
                              }}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors group relative cursor-pointer shadow-2xs"
                              title="Cancel / Void this bill"
                            >
                              <Ban className="h-4 w-4" />
                              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-36 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                Cancel / Void bill safely with audit reason
                              </span>
                            </button>
                          )}
                        </div>

                        {/* Mobile Action Controls (Visible on mobile only) */}
                        <div className="flex md:hidden items-center gap-1.5 justify-end">
                          {/* 1. Quick Edit */}
                          {!isVoided && (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* 2. Quick WhatsApp */}
                          {inv.patientPhone && !isVoided && (
                            <a
                              href={getWhatsAppShareUrl(inv)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          )}

                          {/* 3. Mobile Action Drawer Trigger */}
                          <button
                            type="button"
                            onClick={() => setMobileActionInvoice(inv)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="More Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>

                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* CREATE & EDIT INVOICE MODAL                                               */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateEditInvoiceModal
          isOpen={isCreateModalOpen}
          initialInvoice={editingInvoice}
          patients={patients}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingInvoice(null);
          }}
          onSuccess={(msg) => {
            setIsCreateModalOpen(false);
            setEditingInvoice(null);
            setActionSuccess(msg);
            setTimeout(() => setActionSuccess(""), 4000);
          }}
          buildInvoicePdf={buildInvoicePdf}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW INVOICE MODAL                                                        */}
      {/* ========================================================================= */}
      {viewingInvoice && (
        <ViewInvoiceModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onDownload={() => handleDownloadPdf(viewingInvoice)}
          whatsappUrl={getWhatsAppShareUrl(viewingInvoice)}
        />
      )}

      {/* ========================================================================= */}
      {/* VOID CONFIRMATION MODAL                                                   */}
      {/* ========================================================================= */}
      {voidingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <Ban className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Cancel / Void Invoice</h3>
                <p className="text-xs text-slate-500 font-semibold">{voidingInvoice.invoiceNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Voiding this bill preserves your accounting audit trail while zeroing out revenue stats for <strong>{voidingInvoice.patientName}</strong> (₹{(voidingInvoice.totalAmount || 0).toLocaleString("en-IN")}).
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reason for Cancellation</label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="e.g., Wrong treatment billed, duplicate entry..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidingInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MOBILE ACTION SHEET MODAL                                                 */}
      {/* ========================================================================= */}
      {mobileActionInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setMobileActionInvoice(null)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Invoice #{mobileActionInvoice.invoiceNumber}
                </h4>
                <p className="text-xs text-slate-400 font-bold">
                  {mobileActionInvoice.patientName} • ₹{(mobileActionInvoice.totalAmount || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileActionInvoice(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions List */}
            <div className="space-y-1.5">
              {/* 1. Edit */}
              {mobileActionInvoice.status !== "voided" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingInvoice(mobileActionInvoice);
                    setMobileActionInvoice(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-slate-800 dark:text-white transition-colors"
                >
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                    <Edit2 className="h-4 w-4" />
                  </div>
                  <span>Edit / Correct Invoice</span>
                </button>
              )}

              {/* 2. WhatsApp */}
              {mobileActionInvoice.status !== "voided" && (
                <a
                  href={getWhatsAppShareUrl(mobileActionInvoice)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileActionInvoice(null)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-emerald-700 dark:text-emerald-400 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span>Send Bill on WhatsApp</span>
                </a>
              )}

              {/* 3. Download PDF */}
              <button
                type="button"
                onClick={() => {
                  handleDownloadPdf(mobileActionInvoice);
                  setMobileActionInvoice(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-slate-800 dark:text-white transition-colors"
              >
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                  <Download className="h-4 w-4" />
                </div>
                <span>Download PDF Tax Receipt</span>
              </button>

              {/* 4. View Breakdown */}
              <button
                type="button"
                onClick={() => {
                  setViewingInvoice(mobileActionInvoice);
                  setMobileActionInvoice(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-black text-slate-800 dark:text-white transition-colors"
              >
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                  <FileText className="h-4 w-4" />
                </div>
                <span>View Full Itemized Voucher</span>
              </button>

              {/* 5. Set Payment Status Options */}
              {mobileActionInvoice.status !== "voided" && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 px-1">Quick Payment Mode</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickPaymentChange(mobileActionInvoice, "paid", "UPI");
                        setMobileActionInvoice(null);
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Paid (UPI)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickPaymentChange(mobileActionInvoice, "paid", "Cash");
                        setMobileActionInvoice(null);
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Paid (Cash)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickPaymentChange(mobileActionInvoice, "paid", "Card");
                        setMobileActionInvoice(null);
                      }}
                      className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Paid (Card)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleQuickPaymentChange(mobileActionInvoice, "pending");
                        setMobileActionInvoice(null);
                      }}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Pending</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. Void / Cancel */}
              {mobileActionInvoice.status !== "voided" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoidingInvoice(mobileActionInvoice);
                      setVoidReason("");
                      setMobileActionInvoice(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-black"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Void / Cancel This Bill</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
