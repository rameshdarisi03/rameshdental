"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Invoice, 
  InvoiceItem, 
  CLINICAL_SERVICES_PRESETS,
  generateInvoiceNumber,
  createInvoice,
  updateInvoice,
  findLatestUnreplacedVoidedInvoice
} from "@/lib/invoicesDb";
import { Patient } from "@/lib/patientsDb";
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeText } from "@/lib/sanitizer";
import jsPDF from "jspdf";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Search, 
  X, 
  Loader2, 
  HelpCircle,
  Maximize2,
  Minimize2
} from "lucide-react";

export interface CreateEditInvoiceModalProps {
  isOpen: boolean;
  initialInvoice?: Invoice | null;
  initialPatient?: Patient | null;
  patients: Patient[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  buildInvoicePdf: (inv: Invoice) => jsPDF;
}

export default function CreateEditInvoiceModal({
  isOpen,
  initialInvoice,
  initialPatient,
  patients,
  onClose,
  onSuccess,
  buildInvoicePdf
}: CreateEditInvoiceModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const isEditMode = !!initialInvoice;

  const [currentInvNumber, setCurrentInvNumber] = useState(
    initialInvoice?.invoiceNumber || generateInvoiceNumber()
  );
  
  const [selectedPatientId, setSelectedPatientId] = useState(
    initialInvoice?.patientId || initialPatient?.id || ""
  );
  const [patientSearchText, setPatientSearchText] = useState(
    initialInvoice?.patientName || initialPatient?.name || ""
  );
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  
  const [patientName, setPatientName] = useState(
    initialInvoice?.patientName || initialPatient?.name || ""
  );
  const [patientPid, setPatientPid] = useState(
    initialInvoice?.patientId || initialPatient?.id || initialPatient?.customId || ""
  );
  const [patientEmail, setPatientEmail] = useState(
    initialInvoice?.patientEmail || initialPatient?.email || ""
  );
  const [patientPhone, setPatientPhone] = useState(
    initialInvoice?.patientPhone || initialPatient?.phone || ""
  );
  const [therapistName, setTherapistName] = useState(
    initialInvoice?.therapistName || initialPatient?.therapistName || "Dr. Kinnera"
  );

  const [serviceDate, setServiceDate] = useState(
    initialInvoice?.serviceDate || new Date().toISOString().split("T")[0]
  );
  
  const [items, setItems] = useState<InvoiceItem[]>(
    initialInvoice?.items || [
      { id: "1", description: "Initial Physiotherapy Assessment", quantity: 1, unitPrice: 600, amount: 600 }
    ]
  );

  const [taxRate, setTaxRate] = useState(initialInvoice?.taxRate || 0);
  const [discount, setDiscount] = useState(initialInvoice?.discount || 0);
  const [paymentMethod, setPaymentMethod] = useState<Invoice["paymentMethod"]>(
    initialInvoice?.paymentMethod || "UPI"
  );
  const [notes, setNotes] = useState(initialInvoice?.notes || "");
  const [emailPdfToPatient, setEmailPdfToPatient] = useState(true);
  const [replacesInvoiceNumber, setReplacesInvoiceNumber] = useState<string>(
    initialInvoice?.replacesInvoiceNumber || ""
  );
  const [detectedVoidedBill, setDetectedVoidedBill] = useState<Invoice | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update fields if initialPatient changes
  useEffect(() => {
    if (initialPatient && !initialInvoice) {
      const cleanPid = initialPatient.id || initialPatient.customId || "";
      setSelectedPatientId(cleanPid);
      setPatientName(initialPatient.name);
      setPatientSearchText(initialPatient.name);
      setPatientPid(cleanPid);
      setPatientEmail(initialPatient.email || "");
      setPatientPhone(initialPatient.phone || "");
      if (initialPatient.therapistName) {
        setTherapistName(initialPatient.therapistName);
      }
    }
  }, [initialPatient, initialInvoice]);

  // Auto-detect if patient has a recently voided bill requiring replacement
  useEffect(() => {
    if (isEditMode) return;
    const cleanPid = (patientPid || selectedPatientId || "").trim();
    const cleanEmail = (patientEmail || "").trim();
    const cleanPhone = (patientPhone || "").trim();

    if (!cleanPid && !cleanEmail && !cleanPhone) {
      setReplacesInvoiceNumber("");
      setDetectedVoidedBill(null);
      return;
    }

    let isMounted = true;
    findLatestUnreplacedVoidedInvoice({
      patientId: cleanPid,
      customId: cleanPid,
      email: cleanEmail,
      phone: cleanPhone,
    }).then((voided) => {
      if (!isMounted) return;
      if (voided) {
        setDetectedVoidedBill(voided);
        setReplacesInvoiceNumber(voided.invoiceNumber);
      } else {
        setDetectedVoidedBill(null);
        setReplacesInvoiceNumber("");
      }
    }).catch((err) => {
      console.warn("Error auto-detecting voided bill:", err);
    });

    return () => {
      isMounted = false;
    };
  }, [patientPid, selectedPatientId, patientEmail, patientPhone, isEditMode]);

  // Smartphone native back-button interception
  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || !document?.body) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    window.history.pushState({ modalOpen: "invoiceModal" }, "");
    const handlePopState = () => onClose();
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (typeof document !== "undefined" && document.body) {
        document.body.style.overflow = originalStyle;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("popstate", handlePopState);
        if (window.history.state?.modalOpen === "invoiceModal") {
          window.history.back();
        }
      }
    };
  }, [isOpen, onClose]);

  // Autocomplete patient filter
  const filteredPatients = useMemo(() => {
    if (!patients || !Array.isArray(patients)) return [];
    if (!patientSearchText || !patientSearchText.trim()) return patients;
    const q = (patientSearchText || "").toLowerCase().trim();
    return patients.filter((p) => {
      if (!p) return false;
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      const customIdMatch = p.customId && p.customId.toLowerCase().includes(q);
      const phoneMatch = p.phone && p.phone.toLowerCase().includes(q);
      return Boolean(nameMatch || customIdMatch || phoneMatch);
    });
  }, [patients, patientSearchText]);

  const handleSelectPatient = (p: Patient) => {
    const cleanPid = p.id || p.customId || "";
    setSelectedPatientId(cleanPid);
    setPatientName(p.name);
    setPatientPid(cleanPid);
    setPatientEmail(p.email || "");
    setPatientPhone(p.phone || "");
    setPatientSearchText(p.name);
    if (p.therapistName) {
      setTherapistName(p.therapistName);
    }
    setPatientDropdownOpen(false);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return (subtotal * (Number(taxRate) || 0)) / 100;
  }, [subtotal, taxRate]);

  const totalAmount = useMemo(() => {
    const total = subtotal + taxAmount - (Number(discount) || 0);
    return Math.max(total, 0);
  }, [subtotal, taxAmount, discount]);

  // Item handlers
  const handleAddItem = (preset?: { description: string; price: number }) => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: preset ? preset.description : "",
      quantity: 1,
      unitPrice: preset ? preset.price : 0,
      amount: preset ? preset.price : 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === "quantity" || field === "unitPrice") {
          updated.amount = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Save / Confirm Action
  const handleSaveInvoice = async (targetStatus: "paid" | "pending") => {
    if (!patientName.trim()) {
      setModalError("Please enter or select a patient name.");
      return;
    }
    if (items.length === 0 || subtotal <= 0) {
      setModalError("Please add at least one valid treatment line item.");
      return;
    }

    setSubmitting(true);
    setModalError("");

    try {
      const sanitizedItems = items.map((item) => ({
        ...item,
        description: sanitizeText(item.description, 200),
        amount: Math.max(0, Number(item.amount) || 0),
        quantity: Math.max(1, Number(item.quantity) || 1),
        rate: Math.max(0, Number(item.rate) || 0)
      }));

      const cleanFinalPid = (patientPid || selectedPatientId || "GPC-GUEST").trim().toUpperCase();
      const invoicePayload = {
        invoiceNumber: currentInvNumber,
        patientId: cleanFinalPid,
        patientName: sanitizeName(patientName),
        patientEmail: sanitizeEmail(patientEmail),
        patientPhone: sanitizePhone(patientPhone),
        therapistName: therapistName,
        serviceDate: serviceDate || new Date().toISOString().split("T")[0],
        dueDate: serviceDate || new Date().toISOString().split("T")[0],
        items: sanitizedItems,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        discount: discount,
        totalAmount: totalAmount,
        currency: "INR",
        status: "paid" as const,
        paymentMethod: paymentMethod,
        notes: sanitizeText(notes, 2000),
        replacesInvoiceNumber: replacesInvoiceNumber || undefined,
        revision: isEditMode ? ((initialInvoice?.revision || 1) + 1) : 1
      };

      if (isEditMode && initialInvoice) {
        await updateInvoice(initialInvoice.id, invoicePayload);
      } else {
        await createInvoice(invoicePayload);
      }

      // Auto-archive PDF to Patient Google Drive if folder exists
      const selectedP = patients.find(
        (p) => 
          (selectedPatientId && p.id === selectedPatientId) || 
          (cleanFinalPid && p.id === cleanFinalPid) || 
          (patientName && p.name && p.name.toLowerCase() === patientName.toLowerCase())
      );
      const driveFolderId = selectedP?.googleDriveFolderId || process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID;

      if (driveFolderId) {
        try {
          const pdf = buildInvoicePdf({ ...invoicePayload, replacesInvoiceNumber: replacesInvoiceNumber || undefined, id: "temp" });
          const pdfBlob = pdf.output("blob");
          const pdfFile = new File([pdfBlob], `${currentInvNumber}_Invoice.pdf`, {
            type: "application/pdf",
          });

          // Format serviceDate to DD-MM-YYYY for consistent Drive subfolder organization
          let formattedServiceDate = serviceDate;
          if (serviceDate && serviceDate.includes("-")) {
            const parts = serviceDate.split("-");
            if (parts.length === 3 && parts[0].length === 4) {
              formattedServiceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
          }

          const driveFormData = new FormData();
          driveFormData.append("file", pdfFile);
          driveFormData.append("parentFolderId", driveFolderId);
          driveFormData.append("date", formattedServiceDate);
          driveFormData.append("category", "Invoices");

          await fetch("/api/drive/upload", {
            method: "POST",
            body: driveFormData,
          });
        } catch (driveErr) {
          console.warn("Google Drive invoice archiving warning:", driveErr);
        }
      }

      // Auto-send Tax Invoice PDF to Patient Email if requested
      if (emailPdfToPatient && patientEmail && patientEmail.includes("@")) {
        try {
          const pdf = buildInvoicePdf({ ...invoicePayload, replacesInvoiceNumber: replacesInvoiceNumber || undefined, id: "temp" });
          const dataUri = pdf.output("datauristring");
          const pdfBase64 = dataUri.split(",")[1];

          fetch("/api/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_DELIVERY",
              payload: {
                patientName: sanitizeName(patientName),
                patientEmail: sanitizeEmail(patientEmail),
                invoiceNumber: currentInvNumber,
                amount: totalAmount,
                serviceDate,
                dueDate: serviceDate,
                paymentMethod,
                status: "paid",
                replacesInvoiceNumber: replacesInvoiceNumber || undefined,
                pdfBase64,
              },
            }),
          }).catch((emailErr) => {
            console.warn("[Invoice Email] Background dispatch error:", emailErr);
          });
        } catch (emailGenErr) {
          console.warn("[Invoice Email] PDF generation for email error:", emailGenErr);
        }
      }

      // Auto-send Tax Invoice PDF to Patient WhatsApp
      if (patientPhone) {
        try {
          const pdf = buildInvoicePdf({ ...invoicePayload, replacesInvoiceNumber: replacesInvoiceNumber || undefined, id: "temp" });
          const dataUri = pdf.output("datauristring");
          const pdfBase64 = dataUri.split(",")[1];

          fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "INVOICE_DELIVERY",
              payload: {
                patientName: sanitizeName(patientName),
                patientPhone,
                invoiceNumber: currentInvNumber,
                amount: totalAmount,
                date: serviceDate,
                serviceName: items.map((i) => i.description).join(", "),
                pdfBase64,
              },
            }),
          }).catch((waErr) => {
            console.warn("[Invoice WhatsApp] Background dispatch error:", waErr);
          });
        } catch (waGenErr) {
          console.warn("[Invoice WhatsApp] PDF generation for WhatsApp error:", waGenErr);
        }
      }

      onSuccess(`Invoice ${currentInvNumber} generated & synced to Patient Hub!`);
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      setModalError(err.message || "Failed to save invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !isOpen || typeof window === "undefined" || !document?.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in font-['Inter',sans-serif]">
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isMaximized ? "max-w-full h-full rounded-none" : "max-w-4xl max-h-[92vh]"
        }`}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                  Generate Clinical Invoice
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green text-[10px] font-black tracking-wider shrink-0">
                  {currentInvNumber}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Itemized treatment billing with instant Patient Hub & Drive synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer hidden sm:block"
              title={isMaximized ? "Restore Size" : "Maximize Screen"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
              aria-label="Close modal"
              title="Close"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          
          {modalError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-bold text-rose-600 dark:text-rose-400">
              {modalError}
            </div>
          )}

          {/* Auto-Linked Replacement Invoice Banner */}
          {replacesInvoiceNumber && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 text-sm font-bold">
                  🔄
                </span>
                <div>
                  <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                    Auto-Linked Replacement: Replaces Cancelled Bill #{replacesInvoiceNumber}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    This updated bill replaces voided invoice #{replacesInvoiceNumber}. The patient will receive a clear replacement receipt reassuring them that they have NOT been charged twice.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplacesInvoiceNumber("");
                  setDetectedVoidedBill(null);
                }}
                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300 bg-amber-200/60 hover:bg-amber-200 dark:bg-amber-900/60 rounded-lg transition-colors cursor-pointer shrink-0"
                title="Unlink this replacement"
              >
                Unlink
              </button>
            </div>
          )}

          {/* Row 1: Patient Autocomplete Search & Attending Therapist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Patient Search */}
            <div className="space-y-1 relative">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Patient Name / PID *
                </label>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                    Search registered patients by name, PID, or mobile number.
                  </span>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearchText}
                  onChange={(e) => {
                    setPatientSearchText(e.target.value);
                    setPatientName(e.target.value);
                    setPatientDropdownOpen(true);
                  }}
                  onFocus={() => setPatientDropdownOpen(true)}
                  placeholder="Type patient name or mobile..."
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 pl-4 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
                />
                <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>

              {patientPid && (
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-brand-green">
                    <CheckCircle2 className="w-3 h-3" />
                    UHID Linked: {patientPid}
                  </span>
                </div>
              )}

              {/* Autocomplete Dropdown List */}
              {patientDropdownOpen && filteredPatients.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="px-4 py-2.5 hover:bg-brand-green/10 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[9px] font-bold text-slate-400">{p.phone || "No phone"} • {p.email || "No email"}</p>
                      </div>
                      <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                        {p.id || p.customId || "GPC-PATIENT"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attending Therapist */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Attending Physiotherapist
                </label>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-48 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                    The consulting doctor or physical therapist assigned to this session.
                  </span>
                </span>
              </div>
              <select
                value={therapistName}
                onChange={(e) => setTherapistName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
              >
                <option value="Dr. Kinnera">Dr. Kinnera</option>
                <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                <option value="Dr. Rohan Das">Dr. Rohan Das</option>
              </select>
            </div>
          </div>

          {/* Row 2: Service Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service Date</label>
              <input
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-brand-green"
              />
            </div>
          </div>

          {/* Itemized Billing Breakdown Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Treatment Breakdown (₹ INR)
                </h4>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-52 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                    Add clinical services or pick standard clinic presets.
                  </span>
                </span>
              </div>

              {/* Preset Items Quick Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (!isNaN(idx) && CLINICAL_SERVICES_PRESETS[idx]) {
                      handleAddItem(CLINICAL_SERVICES_PRESETS[idx]);
                      e.target.value = "";
                    }
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-[10px] font-bold text-slate-700 dark:text-slate-300 px-3 py-1 outline-none"
                >
                  <option value="">+ Add Preset Treatment...</option>
                  {CLINICAL_SERVICES_PRESETS.map((preset, idx) => (
                    <option key={idx} value={idx}>
                      {preset.description} (₹{preset.price})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => handleAddItem()}
                  className="p-1 text-brand-green hover:bg-brand-green/10 rounded-lg transition-colors cursor-pointer"
                  title="Add custom line item"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="col-span-8">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                      placeholder="Treatment or Service Description..."
                      className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                      placeholder="Rate (₹)"
                      className="w-full text-right rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Tax, Discount & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">GST / Tax (%)</label>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-44 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                    Healthcare services are 0% GST exempt by default. Set 18% if taxable items are included.
                  </span>
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Discount (₹)</label>
                <span className="group relative cursor-help">
                  <HelpCircle className="h-3 w-3 text-slate-400" />
                  <span className="absolute right-0 bottom-full mb-1 hidden group-hover:block w-44 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                    Direct flat discount in Rupees to be subtracted from the bill.
                  </span>
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash at Front Desk</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Net Banking">Net Banking / NEFT</option>
                <option value="Insurance Claim">Insurance Claim / TPA</option>
              </select>
            </div>
          </div>

          {/* Notes / Diagnosis Codes */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Clinical Notes / Diagnosis Codes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., M54.5 Low Back Pain Protocol, Gait Biomechanical Assessment completed..."
              className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none resize-none"
            />
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>Subtotal: <strong>₹{subtotal.toLocaleString("en-IN")}</strong></span>
              {taxRate > 0 && <span>GST: <strong>₹{taxAmount.toLocaleString("en-IN")}</strong></span>}
              {discount > 0 && <span className="text-rose-600">Discount: <strong>-₹{discount.toLocaleString("en-IN")}</strong></span>}
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Total Payable:</span>
              <span className="text-base text-brand-green dark:text-emerald-400 font-black">
                ₹{totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Email PDF Option */}
          {patientEmail && patientEmail.includes("@") && (
            <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                <input
                  type="checkbox"
                  checked={emailPdfToPatient}
                  onChange={(e) => setEmailPdfToPatient(e.target.checked)}
                  className="rounded border-slate-300 text-brand-green focus:ring-brand-green h-4 w-4 accent-emerald-600 cursor-pointer"
                />
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>✉️ Email Tax Invoice PDF directly to</span>
                  <span className="text-brand-green dark:text-emerald-400 font-black">{patientEmail}</span>
                </span>
              </label>
              <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider hidden sm:inline-block">
                Auto-Attachment
              </span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer self-start sm:self-auto"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveInvoice("paid")}
              className="px-6 py-2.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 group relative"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Confirm & Issue Invoice</span>
              <span className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-48 p-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg shadow-xl z-30 text-center">
                Generate official paid invoice, sync to Drive & send receipt
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
