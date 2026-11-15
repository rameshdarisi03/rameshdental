"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Patient, MedicalRecordFile, getConsultations, getMedicalRecordFiles, Consultation } from "@/lib/patientsDb";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";
import { 
  PatientPrescription, 
  getPatientPrescription, 
  getPatientPrescriptionsHistory,
  subscribePatientPrescription 
} from "@/lib/exercisesDb";
import { 
  buildUnifiedPrescriptionPdf, 
  getPrescriptionFileName, 
  buildUnifiedInvoicePdf,
  getInvoiceFileName,
  formatToDDMMYYYY 
} from "@/lib/prescriptionPdf";
import { jsPDF } from "jspdf";
import { 
  Receipt, 
  FileText, 
  Download, 
  Folder,
  Loader2,
  Stethoscope, 
  Pill,
  CheckCircle2
} from "lucide-react";
import { usePatientAuth } from "@/providers/PatientAuthProvider";

export default function RecordsPage() {
  const { patient, loading: authLoading } = usePatientAuth();
  const [activeTab, setActiveTab] = useState<"invoices" | "consultations">("consultations");
  const [activePrescription, setActivePrescription] = useState<PatientPrescription | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [medicalFiles, setMedicalFiles] = useState<MedicalRecordFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient || !patient.id) {
      if (!authLoading) setLoading(false);
      return;
    }

    let invUnsub = () => {};
    let rxUnsub = () => {};

    loadPatientRecords(patient.id);
    invUnsub = subscribePatientInvoices({
      patientId: patient.id,
      email: patient.email,
      phone: patient.phone,
      name: patient.name,
      customId: patient.activationCode,
      excludeVoided: true
    }, setInvoices);
    rxUnsub = subscribePatientPrescription(patient.id, (rx) => {
      setActivePrescription(rx);
    });

    setLoading(false);

    return () => {
      invUnsub();
      rxUnsub();
    };
  }, [patient, authLoading]);

  const loadPatientRecords = async (patientId: string) => {
    try {
      const [activeRx, consultsList, filesList] = await Promise.all([
        getPatientPrescription(patientId),
        getConsultations(patientId),
        getMedicalRecordFiles(patientId),
      ]);

      if (activeRx) setActivePrescription(activeRx);
      setConsultations(consultsList);
      setMedicalFiles(filesList);
    } catch (err) {
      console.error("Error loading patient records:", err);
    }
  };

  const handleDownloadUnifiedPrescription = (rxItem: any) => {
    try {
      const hasExercises = Boolean(rxItem.exercises && rxItem.exercises.length > 0);
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: rxItem.displayDate || rxItem.date || "23-08-2026",
        therapistName: rxItem.therapistName || patient?.therapistName || "Dr. Ramesh Darisi",
        durationDays: rxItem.durationDays || 14,
        generalNotes: rxItem.generalNotes,
        consultationSummary: rxItem.consultationSummary,
        modalitiesAdministered: rxItem.modalitiesAdministered,
        exercises: rxItem.exercises || [],
        diagnosis: patient?.treatmentPlan,
        providerAlerts: patient?.reminders || [],
      });

      const fileName = getPrescriptionFileName(patient?.name || "Patient", rxItem.rawDate || rxItem.date || new Date(), hasExercises);
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate consultation PDF:", err);
    }
  };

  const handleDownloadInvoicePDF = (inv: Invoice) => {
    try {
      const doc = buildUnifiedInvoicePdf({
        invoiceNumber: inv.invoiceNumber,
        patientName: inv.patientName || patient?.name || "Patient",
        patientId: inv.patientId || patient?.id,
        patientEmail: inv.patientEmail || patient?.email,
        patientPhone: inv.patientPhone || patient?.phone,
        therapistName: inv.therapistName || patient?.therapistName,
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
        replacesInvoiceNumber: inv.replacesInvoiceNumber,
      });

      const fileName = getInvoiceFileName(inv.patientName || patient?.name || "Patient", inv.serviceDate || new Date());
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate unified invoice PDF:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#062e36] dark:text-[#f9ab55]" />
      </div>
    );
  }

  // Aggregate all consultation records & medical documents (Single Unified Consultation Architecture)
  const hasActiveExercises = Boolean(activePrescription && activePrescription.exercises && activePrescription.exercises.length > 0);

  const allConsultationItems: Array<{
    id: string;
    type: "consultation" | "file";
    title: string;
    subtitle: string;
    date: string;
    rawDate?: any;
    displayDate?: string;
    therapistName?: string;
    durationDays?: number;
    generalNotes?: string;
    consultationSummary?: string;
    modalitiesAdministered?: string;
    exercises?: any[];
    raw: any;
  }> = [];

  // 1. Clinical Consultations & Case Sheets (Exercises are clubbed directly inside if prescribed)
  consultations.forEach((consult, idx) => {
    allConsultationItems.push({
      id: consult.id || `consult-${idx}`,
      type: "consultation",
      title: "Clinical Consultation & Case Sheet",
      subtitle: `${consult.therapistName || patient?.therapistName || "Dr. Ramesh Darisi"} • ${consult.date || "Consultation Recorded"}${hasActiveExercises ? ` • Includes Prescribed Routine` : ""}`,
      date: consult.date || "23-08-2026",
      rawDate: consult.date || new Date(),
      displayDate: consult.date || "23-08-2026",
      therapistName: consult.therapistName || patient?.therapistName || "Dr. Ramesh Darisi",
      durationDays: activePrescription?.durationDays || 14,
      generalNotes: hasActiveExercises ? activePrescription?.generalNotes : undefined,
      consultationSummary: consult.summary || (consult as any).soapNote || (consult as any).subjectiveComplaints,
      modalitiesAdministered: (consult as any).modalitiesAdministered,
      exercises: hasActiveExercises ? (activePrescription?.exercises || []) : [],
      raw: consult,
    });
  });

  // 2. Uploaded Medical Files / Verified Scans (Excludes private doctor reference files & auto-generated consultation PDFs to prevent duplicates)
  medicalFiles
    .filter((f) => {
      if (f.isDoctorOnly || (f as any).category === "DOCTOR_REFERENCE") return false;
      const lower = (f.fileName || "").toLowerCase();
      if (lower.startsWith("consultation_") || lower.startsWith("prescription_")) return false;
      return true;
    })
    .forEach((f) => {
      allConsultationItems.push({
        id: f.id || Math.random().toString(),
        type: "file",
        title: f.fileName,
        subtitle: `Verified Medical Document • ${f.dateUploaded}`,
        date: f.dateUploaded,
        rawDate: f.dateUploaded,
        raw: f,
      });
    });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12 animate-fade-in font-['Inter',sans-serif]">
      
      {/* 1. Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
          My Records
        </h1>
      </div>

      {/* 2. Segmented Pill Tabs (Invoices | Consultations) */}
      <div className="flex bg-[#f1f5f5] dark:bg-[#121a1d] p-1.5 rounded-2xl border border-[#21444D]/10 dark:border-slate-800 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            activeTab === "invoices"
              ? "bg-[#062e36] text-white shadow-sm font-black"
              : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white font-semibold"
          }`}
        >
          Invoices
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("consultations")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            activeTab === "consultations"
              ? "bg-[#062e36] text-white shadow-sm font-black"
              : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white font-semibold"
          }`}
        >
          Consultations
        </button>
      </div>

      {/* 3. TAB CONTENT: Consultations */}
      {activeTab === "consultations" && (
        <div className="space-y-3.5 pt-1">
          {allConsultationItems.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-xs">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#062e36] dark:text-white">No Consultations Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your clinical consultation notes, doctor case sheets, and treatment records will appear here with instant PDF download.
              </p>
            </div>
          ) : (
            allConsultationItems.map((item) => {
              const isConsultation = item.type === "consultation";
              const isFile = item.type === "file";

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#121a1d] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between gap-3.5 hover:border-[#f9ab55]/60 transition-all group"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Left Circular Icon Badge */}
                    <div className="h-12 w-12 rounded-full bg-[#fdeedc] dark:bg-amber-950/40 text-[#8a5100] dark:text-[#f9ab55] flex items-center justify-center shrink-0">
                      {isConsultation ? (
                        <FileText className="h-5 w-5 stroke-[2.2]" />
                      ) : (
                        <Folder className="h-5 w-5 stroke-[2.2]" />
                      )}
                    </div>

                    {/* Middle Info */}
                    <div className="overflow-hidden space-y-0.5">
                      <h3 className="text-xs sm:text-sm font-bold text-[#062e36] dark:text-white truncate">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Right Circular Download Button */}
                  <div className="shrink-0">
                    {isFile ? (
                      <a
                        href={item.raw.downloadLink || item.raw.webViewLink || (item.raw.googleDriveFileId ? `https://drive.google.com/file/d/${item.raw.googleDriveFileId}/view` : "#")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="Download Document PDF"
                      >
                        <Download className="h-4.5 w-4.5 stroke-[2.5]" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDownloadUnifiedPrescription(item)}
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="Download Consultation PDF"
                      >
                        <Download className="h-4.5 w-4.5 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 4. TAB CONTENT: Invoices */}
      {activeTab === "invoices" && (
        <div className="space-y-3.5 pt-1">
          {invoices.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-xs">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#062e36] dark:text-white">No Invoices on Record</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When treatment invoices are generated by the clinic, you can download your official PDF tax receipts here.
              </p>
            </div>
          ) : (
            invoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white dark:bg-[#121a1d] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between gap-3.5 hover:border-[#f9ab55]/60 transition-all"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  <div className="h-12 w-12 rounded-full bg-[#062e36]/10 dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5" />
                  </div>
                  <div className="overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-[#062e36] dark:text-white truncate">
                        Invoice #{inv.invoiceNumber}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {(inv.status || "PAID").toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      {inv.serviceDate} • ₹{(inv.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadInvoicePDF(inv)}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                    title="Download Invoice PDF"
                  >
                    <Download className="h-4.5 w-4.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}
