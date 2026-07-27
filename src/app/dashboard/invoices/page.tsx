"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  subscribeInvoices, 
  createInvoice, 
  updateInvoiceStatus, 
  deleteInvoice, 
  generateInvoiceNumber, 
  CLINICAL_SERVICES_PRESETS, 
  Invoice, 
  InvoiceItem 
} from "@/lib/invoicesDb";
import { getPatients, Patient } from "@/lib/patientsDb";
import { FEATURES } from "@/lib/features";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Printer, 
  Download, 
  Share2, 
  Send, 
  MoreVertical, 
  CreditCard, 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  DollarSign, 
  Sparkles, 
  Loader2, 
  ArrowLeft,
  MessageSquare
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
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Invoice Form Builder States
  const [currentInvNumber, setCurrentInvNumber] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  
  const [patientName, setPatientName] = useState("");
  const [patientPid, setPatientPid] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [therapistName, setTherapistName] = useState("Dr. Kinnera");

  const [serviceDate, setServiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "Initial Physiotherapy Assessment", quantity: 1, unitPrice: 120, amount: 120 }
  ]);

  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<Invoice["paymentMethod"]>("UPI");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Initialize dates and invoice number
  useEffect(() => {
    setCurrentInvNumber(generateInvoiceNumber());
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setServiceDate(todayStr);

    const due = new Date();
    due.setDate(due.getDate() + 14);
    setDueDate(due.toISOString().split("T")[0]);
  }, []);

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

  // Filtered patients for autocomplete
  const filteredPatients = useMemo(() => {
    if (!patientSearchText.trim()) return patients;
    const q = patientSearchText.toLowerCase();
    return patients.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.customId && p.customId.toLowerCase().includes(q))
    );
  }, [patients, patientSearchText]);

  // Handle selecting patient from dropdown
  const handleSelectPatient = (p: Patient) => {
    setSelectedPatientId(p.id);
    setPatientName(p.name);
    setPatientPid(p.customId || `GPC-${p.id.slice(0, 5).toUpperCase()}`);
    setPatientEmail(p.email || "");
    setPatientPhone(p.phone || "");
    setPatientSearchText(p.name);
    setPatientDropdownOpen(false);
  };

  // Line item helpers
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
          const qty = field === "quantity" ? Number(val) : item.quantity;
          const price = field === "unitPrice" ? Number(val) : item.unitPrice;
          updated.amount = qty * price;
        }
        return updated;
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.amount || 0), 0);
  }, [items]);

  const taxAmount = useMemo(() => {
    return Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  }, [subtotal, taxRate]);

  const totalAmount = useMemo(() => {
    const total = subtotal + taxAmount - (discount || 0);
    return total > 0 ? Math.round(total * 100) / 100 : 0;
  }, [subtotal, taxAmount, discount]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    let unpaidCount = 0;
    let unpaidTotal = 0;
    let revenueMtd = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    invoices.forEach((inv) => {
      if (inv.status === "pending" || inv.status === "overdue") {
        unpaidCount++;
        unpaidTotal += inv.totalAmount || 0;
      }
      if (inv.status === "pending") {
        pendingCount++;
      }
      if (inv.status === "overdue") {
        overdueCount++;
      }

      if (inv.status === "paid") {
        const invDate = new Date(inv.serviceDate || inv.createdAt?.toDate?.() || Date.now());
        if (invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
          revenueMtd += inv.totalAmount || 0;
        }
      }
    });

    return { unpaidCount, unpaidTotal, revenueMtd, pendingCount, overdueCount };
  }, [invoices]);

  // Filtered invoices table list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesInv = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesPatient = inv.patientName.toLowerCase().includes(q);
        const matchesPid = inv.patientId.toLowerCase().includes(q);
        return matchesInv || matchesPatient || matchesPid;
      }
      return true;
    });
  }, [invoices, statusFilter, searchQuery]);

  // Reset form
  const handleResetForm = () => {
    setCurrentInvNumber(generateInvoiceNumber());
    setSelectedPatientId("");
    setPatientSearchText("");
    setPatientName("");
    setPatientPid("");
    setPatientEmail("");
    setPatientPhone("");
    setItems([{ id: Date.now().toString(), description: "Initial Physiotherapy Assessment", quantity: 1, unitPrice: 120, amount: 120 }]);
    setTaxRate(0);
    setDiscount(0);
    setNotes("");
    setActionSuccess("");
    setActionError("");
  };

  // Submit & Save Invoice
  const handleSaveInvoice = async (targetStatus: "paid" | "pending") => {
    if (!patientName.trim()) {
      setActionError("Please enter or select a patient name.");
      return;
    }
    if (items.length === 0 || subtotal <= 0) {
      setActionError("Please add at least one valid billing line item.");
      return;
    }

    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      await createInvoice({
        invoiceNumber: currentInvNumber,
        patientId: patientPid || "GPC-GUEST",
        patientName: patientName.trim(),
        patientEmail: patientEmail.trim(),
        patientPhone: patientPhone.trim(),
        therapistName: therapistName,
        serviceDate: serviceDate || new Date().toISOString().split("T")[0],
        dueDate: dueDate || new Date().toISOString().split("T")[0],
        items: items,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        discount: discount,
        totalAmount: totalAmount,
        currency: "USD",
        status: targetStatus,
        paymentMethod: paymentMethod,
        notes: notes.trim(),
      });

      setActionSuccess(`Invoice ${currentInvNumber} saved successfully as ${targetStatus.toUpperCase()}!`);
      handleResetForm();
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      setActionError(err.message || "Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status toggle handler
  const handleStatusChange = async (id: string, newStatus: Invoice["status"]) => {
    try {
      await updateInvoiceStatus(id, newStatus);
      setActiveMenuId(null);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      setActiveMenuId(null);
    } catch (err) {
      console.error("Failed to delete invoice:", err);
    }
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp pre-formatted share link
  const getWhatsAppShareUrl = (inv: { patientPhone: string; patientName: string; invoiceNumber: string; totalAmount: number; serviceDate: string }) => {
    const rawPhone = inv.patientPhone.replace(/\D/g, "");
    const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const msg = `Hello ${inv.patientName}, your invoice ${inv.invoiceNumber} for Gait Physio Clinic on ${inv.serviceDate} has been generated. Total Amount: $${inv.totalAmount.toFixed(2)}. View or download your receipt directly inside your Patient Hub portal: https://gait-physio-clinic-v1.vercel.app/patienthub/login`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 select-none animate-fade-in">
      
      {/* Printable Area Styling */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          #invoice-preview {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5 no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#2d5a4c] text-white flex items-center justify-center shadow-md">
              <Receipt className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Clinical Billing Center
            </h1>
            <span className="bg-[#2d5a4c]/10 text-[#2d5a4c] dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              MODULAR_INVOICING
            </span>
          </div>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Generate itemized billing statements, track clinic revenue, & sync real-time receipts to Patient Hub.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice # or patient..."
            className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#2d5a4c] transition-colors"
          />
        </div>
      </div>

      {/* Executive KPI Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Unpaid Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unpaid Invoices</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{stats.unpaidCount} <span className="text-xs font-bold text-slate-400">(${stats.unpaidTotal.toFixed(2)})</span></h3>
          </div>
        </div>

        {/* Total Revenue MTD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#2d5a4c]/10 text-[#2d5a4c] dark:text-emerald-400 rounded-2xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue (MTD)</p>
            <h3 className="text-xl font-black text-[#2d5a4c] dark:text-emerald-400">${stats.revenueMtd.toFixed(2)}</h3>
          </div>
        </div>

        {/* Pending Claims */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Statements</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{stats.pendingCount}</h3>
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue Statements</p>
            <h3 className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.overdueCount}</h3>
          </div>
        </div>
      </div>

      {/* Main Bento Grid: Form Builder (Left) + Interactive Live Paper Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start no-print">
        
        {/* Left 7 Columns: Invoice Form Builder */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#2d5a4c]" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">Create New Clinical Invoice</h3>
              </div>
              <span className="text-xs font-black bg-[#2d5a4c]/10 text-[#2d5a4c] dark:text-emerald-400 px-3 py-1 rounded-full border border-[#2d5a4c]/20">
                {currentInvNumber}
              </span>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-5">
              
              {/* Alert Feedback */}
              {actionError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs font-bold text-rose-600 dark:text-rose-400">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {actionSuccess}
                </div>
              )}

              {/* Row 1: Patient Autocomplete Search & Therapist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Searchable Patient Autocomplete */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient Search / Name *</label>
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
                      placeholder="Type patient name or PID..."
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 pl-4 pr-10 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#2d5a4c]"
                    />
                    <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {patientDropdownOpen && filteredPatients.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl z-30 max-h-48 overflow-y-auto">
                      {filteredPatients.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectPatient(p)}
                          className="px-4 py-2.5 hover:bg-[#2d5a4c]/10 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white">{p.name}</p>
                            <p className="text-[9px] font-bold text-slate-400">{p.phone || "No phone"} • {p.email || "No email"}</p>
                          </div>
                          <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                            {p.customId || `GPC-${p.id.slice(0,4)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Therapist Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attending Therapist</label>
                  <select
                    value={therapistName}
                    onChange={(e) => setTherapistName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#2d5a4c]"
                  >
                    <option value="Dr. Kinnera">Dr. Kinnera</option>
                    <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                    <option value="Dr. Rohan Das">Dr. Rohan Das</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Service Date & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Date</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#2d5a4c]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-[#2d5a4c]"
                  />
                </div>
              </div>

              {/* Itemized Billing Breakdown Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Billing Items Breakdown
                  </h4>

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
                          {preset.description} (${preset.price})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleAddItem()}
                      className="p-1 text-[#2d5a4c] hover:bg-[#2d5a4c]/10 rounded-lg transition-colors"
                      title="Add Custom Item"
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
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(item.id, "unitPrice", e.target.value)}
                          placeholder="Amount ($)"
                          className="w-full text-right rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Tax, Discount & Payment Method */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tax Rate (%)</label>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    <option value="UPI">UPI Payment</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Credit/Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Insurance Claim">Insurance Claim</option>
                  </select>
                </div>
              </div>

              {/* Notes / Diagnosis Codes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinical Notes / ICD-10 Diagnosis Codes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. M54.5 Low Back Pain, GPC Posture Protocol applied..."
                  className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none resize-none"
                />
              </div>

            </div>

            {/* Form Footer Action Bar */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs font-black text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer"
              >
                Clear Form
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveInvoice("pending")}
                  className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white hover:bg-slate-100 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  Save as Pending
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSaveInvoice("paid")}
                  className="px-6 py-2.5 rounded-2xl bg-[#2d5a4c] hover:bg-[#23473c] text-white text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Finalize & Mark Paid
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right 5 Columns: Live Interactive Paper Preview (Sticky Window) */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[580px] relative">
            
            {/* Window Top Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between select-none">
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-emerald-400">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                PREVIEW
              </span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
            </div>

            {/* Invoice Paper Document Content */}
            <div id="invoice-preview" className="flex-1 p-6 flex flex-col justify-between bg-white text-slate-900 relative">
              
              {/* Background Watermark Stamp */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.06] -rotate-12">
                <span className="border-8 border-[#2d5a4c] text-[#2d5a4c] font-black text-6xl px-8 py-4 rounded-3xl uppercase tracking-widest">
                  GAIT PHYSIO
                </span>
              </div>

              <div>
                {/* Clinic Header & Invoice ID */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-5 mb-5 relative z-10">
                  <div>
                    <div className="h-10 w-10 bg-[#2d5a4c] text-white rounded-xl flex items-center justify-center font-black text-lg mb-2">
                      GPC
                    </div>
                    <h4 className="font-black text-[#2d5a4c] text-base leading-tight">Gait Physio Clinic</h4>
                    <p className="text-[10px] font-bold text-slate-500 leading-normal mt-0.5">
                      123 Clinical Wellness Way, Sector 4<br />
                      Bangalore, KA 560001 • +91 92066 51295
                    </p>
                  </div>

                  <div className="text-right">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">INVOICE</h2>
                    <p className="text-xs font-black text-[#2d5a4c] mt-0.5">#{currentInvNumber}</p>
                    <p className="text-[10px] font-bold text-slate-500">Date: {serviceDate || "--/--/----"}</p>
                  </div>
                </div>

                {/* Bill To & Status Section */}
                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4 mb-4 relative z-10">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bill To Patient:</p>
                    <p className="text-xs font-black text-[#2d5a4c] mt-0.5">{patientName || "Waiting for patient..."}</p>
                    <p className="text-[10px] font-extrabold text-slate-500">{patientPid || "PID: ----"}</p>
                    {patientPhone && <p className="text-[10px] font-bold text-slate-500">{patientPhone}</p>}
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Status:</p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      UNPAID / DRAFT
                    </span>
                  </div>
                </div>

                {/* Line Items Table Preview */}
                <div className="relative z-10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-[#2d5a4c] text-[10px] font-black uppercase tracking-wider text-slate-700">
                        <th className="py-2">Service Description</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5">
                            <p className="text-xs font-bold text-slate-800">{item.description || "Service Item"}</p>
                          </td>
                          <td className="py-2.5 text-right text-xs font-black text-slate-900">${(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Calculations & Footer */}
              <div className="mt-6 pt-4 border-t border-slate-200 relative z-10 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Tax ({taxRate}%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {discount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-rose-600">
                    <span>Discount</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-[#2d5a4c] mt-2 font-black text-slate-900 text-sm">
                  <span>Total Amount Due</span>
                  <span className="text-[#2d5a4c] text-base">${totalAmount.toFixed(2)}</span>
                </div>

                <p className="text-[9px] text-center font-extrabold text-slate-400 italic pt-3">
                  Please include Invoice ID #{currentInvNumber} in all payments. Thank you for choosing Gait Physio Clinic!
                </p>
              </div>

            </div>

            {/* Document Toolbar Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex justify-center items-center gap-3 no-print">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Printer className="h-4 w-4 text-[#2d5a4c]" />
                Print / PDF
              </button>

              {patientPhone && (
                <a
                  href={getWhatsAppShareUrl({
                    patientPhone,
                    patientName,
                    invoiceNumber: currentInvNumber,
                    totalAmount,
                    serviceDate
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Data-Dense Recent Invoices Table (Full Width Bottom Card) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden no-print">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#2d5a4c]" />
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Clinical Invoices Database ({filteredInvoices.length})
            </h3>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-2xl">
            {(["all", "paid", "pending", "overdue"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-white dark:bg-slate-900 text-[#2d5a4c] dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs font-bold space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#2d5a4c]" />
            <span>Loading live invoice records...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400">
            No invoices match the current search filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Invoice ID</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Service Date</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="px-5 py-3.5 font-black text-xs text-[#2d5a4c] dark:text-emerald-400">
                      #{inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{inv.patientName}</p>
                      <p className="text-[10px] font-bold text-slate-400">{inv.patientId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-350">
                      {inv.serviceDate}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-500">
                      {inv.paymentMethod}
                    </td>
                    <td className="px-5 py-3.5 font-black text-xs text-slate-900 dark:text-white">
                      ${(inv.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {inv.status === "paid" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Paid
                        </span>
                      )}
                      {inv.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-black uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Pending
                        </span>
                      )}
                      {inv.status === "overdue" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-black uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right relative">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status !== "paid" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(inv.id, "paid")}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                          >
                            Mark Paid
                          </button>
                        )}
                        {inv.patientPhone && (
                          <a
                            href={getWhatsAppShareUrl(inv)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Share on WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(inv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
