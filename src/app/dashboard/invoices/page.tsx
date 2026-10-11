"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  subscribeInvoices, 
  voidInvoice,
  Invoice 
} from "@/lib/invoicesDb";
import { getPatients, Patient } from "@/lib/patientsDb";
import { getClinicConfig, ClinicConfig } from "@/lib/db";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";
import { FEATURES } from "@/lib/features";
import jsPDF from "jspdf";
import { buildUnifiedInvoicePdf } from "@/lib/prescriptionPdf";
import CreateEditInvoiceModal from "@/components/dashboard/invoices/CreateEditInvoiceModal";
import ViewInvoiceModal from "@/components/dashboard/invoices/ViewInvoiceModal";
import { 
  Receipt, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Download, 
  Loader2, 
  MessageSquare, 
  HelpCircle, 
  Ban, 
  FileText, 
  X, 
  MoreVertical, 
  Mail,
  CreditCard,
  Clock,
  Lock,
  Send
} from "lucide-react";

export default function ClinicalBillingPage() {
  const router = useRouter();

  // Redirect if feature is disabled
  useEffect(() => {
    if (!FEATURES.enableModularInvoicing) {
      router.push("/dashboard");
    }
  }, [router]);

  // Role Access Control (Admin-Only for Master Financial Ledger)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleChecked, setIsRoleChecked] = useState(false);

  // Firestore & Data States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "voided">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [mobileActionInvoice, setMobileActionInvoice] = useState<Invoice | null>(null);
  const [emailingInvoiceId, setEmailingInvoiceId] = useState<string | null>(null);
  const [whatsAppingInvoiceId, setWhatsAppingInvoiceId] = useState<string | null>(null);

  // Visual Confirmation Popup Modal State (WhatsApp & Email)
  const [dispatchModal, setDispatchModal] = useState<{
    isOpen: boolean;
    channel: "whatsapp" | "email";
    status: "success" | "error";
    invoiceNumber: string;
    patientName: string;
    recipient: string;
    amount: number;
    message?: string;
    whatsappUrl?: string;
  } | null>(null);

  // Global Action Feedback
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check admin credentials
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user.role === "admin") {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error("Failed to parse user session:", err);
      }
    }
    setIsRoleChecked(true);
  }, []);

  // Subscribe to real-time invoices & load patients & clinic config
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeInvoices((data) => {
      setInvoices(data);
      setLoading(false);
    });

    async function loadInitialData() {
      try {
        const [pList, cfg] = await Promise.allSettled([
          getPatients(),
          getClinicConfig(),
        ]);
        if (pList.status === "fulfilled") setPatients(pList.value);
        if (cfg.status === "fulfilled") setClinicConfig(cfg.value);
      } catch (err) {
        console.error("Error loading initial data for invoicing:", err);
      }
    }
    loadInitialData();

    return () => unsubscribe();
  }, []);

  // Filter Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Status Filter
      if (statusFilter === "paid" && (inv.status === "voided" || inv.status === "cancelled")) return false;
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
    let revenueMtd = 0;
    let allTimeRevenue = 0;
    let paidCount = 0;
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

      // Outpatient clinic: all non-voided issued bills are paid
      paidCount++;
      allTimeRevenue += invTotal;
      if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
        revenueMtd += invTotal;
      }
    });

    return { revenueMtd, allTimeRevenue, paidCount, voidedCount };
  }, [invoices]);

  // Handle Void Confirmation
  const handleConfirmVoid = async () => {
    if (!voidingInvoice) return;
    const invToVoid = voidingInvoice;
    const reason = voidReason.trim() || "Clerical correction / bill updated";

    // 1. Instantly quit the modal window so therapist is never stuck
    setVoidingInvoice(null);
    setVoidReason("");
    setActionSuccess(`⚡ Marking invoice ${invToVoid.invoiceNumber} as VOIDED...`);

    try {
      // 2. Update Firestore SSOT
      await voidInvoice(invToVoid.id, reason);
      setActionSuccess(`⚡ Invoice ${invToVoid.invoiceNumber} marked as VOIDED.`);
      setTimeout(() => setActionSuccess(""), 4500);

      // 3. Dispatch automated notices & replace PDF in Google Drive in the background (non-blocking)
      (async () => {
        // Auto-dispatch cancellation notice to patient email
        if (invToVoid.patientEmail && invToVoid.patientEmail.includes("@")) {
          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_VOID_NOTICE",
              payload: {
                patientName: invToVoid.patientName,
                patientEmail: invToVoid.patientEmail,
                invoiceNumber: invToVoid.invoiceNumber,
                amount: invToVoid.totalAmount,
                serviceDate: invToVoid.serviceDate,
                voidReason: reason,
              },
            }),
          }).catch((err) => console.warn("[Invoice Void Email] Dispatch warning:", err));
        }

        // Auto-dispatch cancellation notice to patient WhatsApp
        if (invToVoid.patientPhone) {
          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_VOID_NOTICE",
              payload: {
                patientName: invToVoid.patientName,
                patientPhone: invToVoid.patientPhone,
                invoiceNumber: invToVoid.invoiceNumber,
                amount: invToVoid.totalAmount,
                serviceDate: invToVoid.serviceDate,
                voidReason: reason,
              },
            }),
          }).catch((err) => console.warn("[Invoice Void WhatsApp] Dispatch warning:", err));
        }
        try {
          const selectedP = patients.find(
            (p) =>
              (invToVoid.patientId && p.id === invToVoid.patientId) ||
              (invToVoid.patientName && p.name && p.name.toLowerCase() === invToVoid.patientName.toLowerCase())
          );
          const driveFolderId = selectedP?.googleDriveFolderId || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID;

          if (driveFolderId) {
            const voidedInvPayload: Invoice = {
              ...invToVoid,
              status: "voided",
              voidReason: reason,
            };
            const voidPdf = buildInvoicePdf(voidedInvPayload);
            const pdfBlob = voidPdf.output("blob");

            let formattedServiceDate = invToVoid.serviceDate || "";
            if (formattedServiceDate && formattedServiceDate.includes("-")) {
              const parts = formattedServiceDate.split("-");
              if (parts.length === 3 && parts[0].length === 4) {
                formattedServiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
              }
            }

            // 1. Upload stamped void PDF replacing the original file name
            const driveFormData = new FormData();
            const pdfFile = new File([pdfBlob], `${invToVoid.invoiceNumber}_Invoice.pdf`, {
              type: "application/pdf",
            });
            driveFormData.append("file", pdfFile);
            driveFormData.append("parentFolderId", driveFolderId);
            driveFormData.append("date", formattedServiceDate);
            driveFormData.append("category", "Invoices");
            driveFormData.append("replaceExisting", "true");

            await fetch("/api/drive/upload", {
              method: "POST",
              body: driveFormData,
            });

            // 2. Also save with clear _VOIDED suffix so it is immediately noticeable in Drive list
            const voidSuffixFormData = new FormData();
            const voidSuffixFile = new File([pdfBlob], `${invToVoid.invoiceNumber}_VOIDED_Invoice.pdf`, {
              type: "application/pdf",
            });
            voidSuffixFormData.append("file", voidSuffixFile);
            voidSuffixFormData.append("parentFolderId", driveFolderId);
            voidSuffixFormData.append("date", formattedServiceDate);
            voidSuffixFormData.append("category", "Invoices");
            voidSuffixFormData.append("replaceExisting", "true");

            await fetch("/api/drive/upload", {
              method: "POST",
              body: voidSuffixFormData,
            });
          }
        } catch (driveErr) {
          console.warn("Failed to replace voided invoice in Google Drive:", driveErr);
        }
      })();
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
      clinicAddress: clinicConfig?.address,
      clinicPhone: clinicConfig?.phone,
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
      voidReason: inv.voidReason,
      replacesInvoiceNumber: inv.replacesInvoiceNumber,
      replacedByInvoiceNumber: inv.replacedByInvoiceNumber,
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

  // Email PDF to Patient Action
  const handleEmailInvoicePdf = async (inv: Invoice) => {
    if (!inv.patientEmail || !inv.patientEmail.includes("@")) {
      setDispatchModal({
        isOpen: true,
        channel: "email",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: inv.patientEmail || "No email on file",
        amount: inv.totalAmount || 0,
        message: `Patient ${inv.patientName} does not have a valid email address on file. Please update their profile.`,
      });
      return;
    }

    setEmailingInvoiceId(inv.id);
    setActionSuccess("");
    setActionError("");

    try {
      const pdf = buildInvoicePdf(inv);
      const dataUri = pdf.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INVOICE_DELIVERY",
          payload: {
            patientName: inv.patientName,
            patientEmail: inv.patientEmail,
            invoiceNumber: inv.invoiceNumber,
            amount: inv.totalAmount,
            serviceDate: inv.serviceDate,
            dueDate: inv.dueDate,
            paymentMethod: inv.paymentMethod,
            status: inv.status,
            replacesInvoiceNumber: inv.replacesInvoiceNumber,
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch email via Brevo");
      }

      setActionSuccess(`✉️ Invoice ${inv.invoiceNumber} PDF emailed to ${inv.patientEmail}!`);
      setTimeout(() => setActionSuccess(""), 4000);

      // Open visual confirmation modal popup
      setDispatchModal({
        isOpen: true,
        channel: "email",
        status: "success",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: inv.patientEmail,
        amount: inv.totalAmount || 0,
        message: `Official A4 Tax Invoice PDF has been delivered to ${inv.patientEmail} with full itemized breakdown.`,
      });
    } catch (err: any) {
      console.error("Failed to email invoice PDF:", err);
      setActionError(err.message || "Failed to dispatch invoice email.");
      setTimeout(() => setActionError(""), 4000);

      setDispatchModal({
        isOpen: true,
        channel: "email",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: inv.patientEmail,
        amount: inv.totalAmount || 0,
        message: err.message || "Failed to dispatch invoice email. Please verify the email address.",
      });
    } finally {
      setEmailingInvoiceId(null);
    }
  };

  // Automated WhatsApp Dispatch with PDF via Meta WhatsApp Cloud API
  const handleWhatsAppInvoice = async (inv: Invoice) => {
    if (!inv.patientPhone) {
      setDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: "No phone number",
        amount: inv.totalAmount || 0,
        message: `Patient ${inv.patientName} does not have a phone number on file.`,
      });
      return;
    }

    setWhatsAppingInvoiceId(inv.id);
    setActionSuccess("");
    setActionError("");

    try {
      const pdf = buildInvoicePdf(inv);
      const dataUri = pdf.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "INVOICE_DELIVERY",
          payload: {
            patientName: inv.patientName,
            patientPhone: inv.patientPhone,
            invoiceNumber: inv.invoiceNumber,
            date: inv.serviceDate,
            amount: inv.totalAmount,
            serviceName: inv.items?.map((i) => i.description).join(", ") || "Physiotherapy Treatment",
            pdfBase64,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to dispatch WhatsApp message via Meta Cloud API");
      }

      setActionSuccess(`📱 Invoice ${inv.invoiceNumber} PDF sent to WhatsApp (${inv.patientPhone})!`);
      setTimeout(() => setActionSuccess(""), 4000);

      // Open visual confirmation modal popup
      setDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "success",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: inv.patientPhone,
        amount: inv.totalAmount || 0,
        message: `Official Tax Invoice PDF and payment receipt delivered directly to ${inv.patientName}'s WhatsApp.`,
      });
    } catch (err: any) {
      console.error("Failed to send WhatsApp invoice PDF:", err);
      setActionError(err.message || "WhatsApp delivery failed.");
      setTimeout(() => setActionError(""), 4000);

      setDispatchModal({
        isOpen: true,
        channel: "whatsapp",
        status: "error",
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName,
        recipient: inv.patientPhone,
        amount: inv.totalAmount || 0,
        message: err.message || "Automated WhatsApp delivery could not complete. You can still deliver it immediately via WhatsApp Web below.",
        whatsappUrl: getWhatsAppShareUrl(inv),
      });
    } finally {
      setWhatsAppingInvoiceId(null);
    }
  };

  // WhatsApp Pre-filled URL Generator
  const getWhatsAppShareUrl = (inv: Invoice) => {
    if (!inv.patientPhone) return "#";
    const formattedPhone = getCleanWhatsAppNumber(inv.patientPhone, false);
    if (!formattedPhone) return "#";

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

  if (isRoleChecked && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm my-8 font-['Inter',sans-serif]">
        <div className="h-16 w-16 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Admin Access Only</h2>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed font-semibold">
          The Clinical Billing Center &amp; Financial Ledger contain confidential clinic revenue data and are restricted strictly to administrators.
        </p>
        <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl text-left border border-slate-200/70 dark:border-slate-800 w-full space-y-1.5">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            💡 For Physiotherapists &amp; Staff:
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            You can create, review, and dispatch patient-specific treatment bills directly within each patient&apos;s chart under the <strong>&ldquo;Invoices &amp; Billing&rdquo;</strong> tab in the Patients Database.
          </p>
        </div>
        <Link
          href="/dashboard/patients"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold shadow-sm hover:bg-brand-green-hover transition-colors cursor-pointer"
        >
          <span>Open Patients Database</span>
        </Link>
      </div>
    );
  }

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

        {/* All-Time Realized Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl shrink-0">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Total Revenue (All-Time)</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Cumulative lifetime revenue realized from all non-voided patient invoices.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">
              ₹{stats.allTimeRevenue.toLocaleString("en-IN")}
            </h3>
          </div>
        </div>

        {/* Paid Invoices Issued */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Paid Invoices</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Total count of valid, non-voided official invoices issued to patients.
                </span>
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white truncate">{stats.paidCount}</h3>
          </div>
        </div>

        {/* Voided / Cancelled Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <Ban className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Voided / Cancelled</p>
              <span className="group relative cursor-help">
                <HelpCircle className="h-3 w-3 text-slate-400" />
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 text-center">
                  Bills that were cancelled with an audit trail and zeroed out from revenue.
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
            {(["all", "paid", "voided"] as const).map((st) => (
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
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Paid
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              ⚡ Bill Synced
                            </span>
                          </div>
                        ) : isVoided ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-400 text-[10px] font-black uppercase" title={inv.voidReason || "Voided"}>
                              <Ban className="w-2.5 h-2.5" />
                              Voided
                            </span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                              🔒 Voided & Audited
                            </span>
                          </div>
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
                          {/* 1. WhatsApp Button */}
                          {inv.patientPhone && !isVoided && (
                            <button
                              type="button"
                              disabled={whatsAppingInvoiceId === inv.id}
                              onClick={() => handleWhatsAppInvoice(inv)}
                              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors group relative cursor-pointer shadow-2xs disabled:opacity-50"
                              title={`Send WhatsApp bill to ${inv.patientPhone} via Meta Cloud API`}
                            >
                              {whatsAppingInvoiceId === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-44 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center pointer-events-none">
                                Send WhatsApp PDF bill directly to patient
                              </span>
                            </button>
                          )}

                          {/* 2. Download PDF Button */}
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

                          {/* 2b. Email PDF Button */}
                          {inv.patientEmail && !isVoided && (
                            <button
                              type="button"
                              disabled={emailingInvoiceId === inv.id}
                              onClick={() => handleEmailInvoicePdf(inv)}
                              className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 transition-colors group relative cursor-pointer shadow-2xs disabled:opacity-50"
                              title={`Email PDF invoice to ${inv.patientEmail}`}
                            >
                              {emailingInvoiceId === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-40 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                                Email PDF receipt to {inv.patientEmail}
                              </span>
                            </button>
                          )}

                          {/* 3. View Details Button */}
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

                          {/* 4. Cancel Bill (Void) Button */}
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
                          {/* 1. Quick WhatsApp */}
                          {inv.patientPhone && !isVoided && (
                            <button
                              type="button"
                              disabled={whatsAppingInvoiceId === inv.id}
                              onClick={() => handleWhatsAppInvoice(inv)}
                              className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 disabled:opacity-50 cursor-pointer"
                              title="Send WhatsApp bill"
                            >
                              {whatsAppingInvoiceId === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                              ) : (
                                <MessageSquare className="h-4 w-4" />
                              )}
                            </button>
                          )}

                          {/* 2. Mobile Action Drawer Trigger */}
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
      {/* CREATE INVOICE MODAL                                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateEditInvoiceModal
          isOpen={isCreateModalOpen}
          initialInvoice={null}
          patients={patients}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(msg) => {
            setIsCreateModalOpen(false);
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
          onEmail={() => handleEmailInvoicePdf(viewingInvoice)}
          isEmailing={emailingInvoiceId === viewingInvoice.id}
          onWhatsApp={() => handleWhatsAppInvoice(viewingInvoice)}
          isWhatsApping={whatsAppingInvoiceId === viewingInvoice.id}
          whatsappUrl={getWhatsAppShareUrl(viewingInvoice)}
        />
      )}

      {/* ========================================================================= */}
      {/* VOID CONFIRMATION MODAL (PORTALED TO ROOT BODY)                           */}
      {/* ========================================================================= */}
      {mounted && voidingInvoice && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-scale-in">
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

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
              <span>🔒 Internal accounting audit: Zeros out clinic revenue stats & stamps invoice as VOID.</span>
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
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MOBILE ACTION SHEET MODAL (PORTALED TO ROOT BODY)                         */}
      {/* ========================================================================= */}
      {mounted && mobileActionInvoice && createPortal(
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
              {/* 1. WhatsApp via Meta API */}
              {mobileActionInvoice.status !== "voided" && (
                <button
                  type="button"
                  disabled={whatsAppingInvoiceId === mobileActionInvoice.id}
                  onClick={() => {
                    handleWhatsAppInvoice(mobileActionInvoice);
                    setMobileActionInvoice(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/80 text-xs font-black text-emerald-700 dark:text-emerald-300 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 shrink-0">
                    {whatsAppingInvoiceId === mobileActionInvoice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div>Send Bill via WhatsApp</div>
                    <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-normal">
                      Delivers official PDF tax invoice directly to patient
                    </div>
                  </div>
                </button>
              )}

              {/* 2. Download PDF */}
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

              {/* 2b. Email PDF */}
              {mobileActionInvoice.patientEmail && mobileActionInvoice.status !== "voided" && (
                <button
                  type="button"
                  disabled={emailingInvoiceId === mobileActionInvoice.id}
                  onClick={() => {
                    handleEmailInvoicePdf(mobileActionInvoice);
                    setMobileActionInvoice(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100/70 text-xs font-black text-teal-700 dark:text-teal-300 transition-colors disabled:opacity-50 text-left"
                >
                  <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 shrink-0">
                    {emailingInvoiceId === mobileActionInvoice.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div>Email PDF Tax Receipt</div>
                    <div className="text-[10px] text-teal-600/70 dark:text-teal-400/70 font-normal">
                      {mobileActionInvoice.patientEmail}
                    </div>
                  </div>
                </button>
              )}

              {/* 3. View Breakdown */}
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

              {/* 4. Void / Cancel */}
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
        </div>,
        document.body
      )}

      {/* Visual Confirmation Popup Modal for WhatsApp & Email Dispatch */}
      {mounted && dispatchModal?.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDispatchModal(null)}
        >
          <div 
            className="w-[92vw] sm:w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with status badge */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  dispatchModal.status === "success"
                    ? dispatchModal.channel === "whatsapp"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
                      : "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                }`}>
                  {dispatchModal.status === "success" ? (
                    dispatchModal.channel === "whatsapp" ? (
                      <MessageSquare className="h-6 w-6" />
                    ) : (
                      <Mail className="h-6 w-6" />
                    )
                  ) : (
                    <AlertCircle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {dispatchModal.status === "success"
                      ? dispatchModal.channel === "whatsapp"
                        ? "WhatsApp Invoice Delivered!"
                        : "Invoice Emailed Successfully!"
                      : "Dispatch Notification"}
                  </h3>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mt-0.5 ${
                    dispatchModal.status === "success"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}>
                    {dispatchModal.status === "success"
                      ? dispatchModal.channel === "whatsapp"
                        ? "Delivered via WhatsApp with PDF"
                        : "Delivered via Email with PDF"
                      : "Action Required"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Invoice & Recipient Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Invoice Number</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  #{dispatchModal.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Patient Name</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {dispatchModal.patientName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">
                  {dispatchModal.channel === "whatsapp" ? "WhatsApp Number" : "Recipient Email"}
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {dispatchModal.recipient}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 font-semibold">Billed Amount</span>
                <span className="text-sm font-black text-brand-green dark:text-emerald-400">
                  ₹{dispatchModal.amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Context Message */}
            {dispatchModal.message && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                {dispatchModal.message}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {dispatchModal.status === "error" && dispatchModal.whatsappUrl ? (
                <>
                  <a
                    href={dispatchModal.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDispatchModal(null)}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Open WhatsApp Web</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setDispatchModal(null)}
                    className="py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setDispatchModal(null)}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-brand-green dark:hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Action Feedback Toast */}
      {actionSuccess && mounted && createPortal(
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-none">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center gap-3 max-w-md pointer-events-auto">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold leading-snug">{actionSuccess}</p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
