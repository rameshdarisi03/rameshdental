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
import { buildUnifiedPrescriptionPdf, getPrescriptionFileName, formatToDDMMYYYY } from "@/lib/prescriptionPdf";
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
  const [activeTab, setActiveTab] = useState<"invoices" | "prescriptions">("prescriptions");
  const [activePrescription, setActivePrescription] = useState<PatientPrescription | null>(null);
  const [prescriptionsHistory, setPrescriptionsHistory] = useState<PatientPrescription[]>([]);
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
    if (patient.email) {
      invUnsub = subscribePatientInvoices(patient.email, setInvoices);
    }
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
      // 1. Fetch Prescriptions History & Active Prescription
      const [historyList, activeRx, consultsList, filesList] = await Promise.all([
        getPatientPrescriptionsHistory(patientId),
        getPatientPrescription(patientId),
        getConsultations(patientId),
        getMedicalRecordFiles(patientId),
      ]);

      setPrescriptionsHistory(historyList);
      if (activeRx) setActivePrescription(activeRx);
      setConsultations(consultsList);
      setMedicalFiles(filesList);
    } catch (err) {
      console.error("Error loading patient records:", err);
    }
  };

  const handleDownloadUnifiedPrescription = (rxItem: any) => {
    try {
      const doc = buildUnifiedPrescriptionPdf({
        patientName: patient?.name || "Patient",
        pid: patient?.id || "PID-1001",
        dateStr: rxItem.displayDate || rxItem.date || "23-08-2026",
        therapistName: rxItem.therapistName || patient?.therapistName || "Dr. Kinnera",
        durationDays: rxItem.durationDays || 14,
        generalNotes: rxItem.generalNotes,
        consultationSummary: rxItem.consultationSummary,
        modalitiesAdministered: rxItem.modalitiesAdministered,
        exercises: rxItem.exercises || [],
      });

      const fileName = getPrescriptionFileName(patient?.name || "Patient", rxItem.rawDate || rxItem.date || new Date());
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate unified prescription PDF:", err);
    }
  };

  const handleDownloadInvoicePDF = (inv: Invoice) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header Banner
      doc.setFillColor(6, 46, 54);
      doc.roundedRect(30, y, pageWidth - 60, 65, 8, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("GAIT PHYSIO CLINIC", 45, y + 26);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(249, 171, 85);
      doc.text(`INVOICE & RECEIPT #${inv.invoiceNumber}`, 45, y + 42);

      doc.setFontSize(8);
      doc.setTextColor(220, 230, 235);
      doc.text("Whitefield, Bengaluru • GST / Clinical Billing Dept", 45, y + 54);

      y += 85;

      // Invoice Meta
      doc.setFillColor(249, 249, 247);
      doc.setDrawColor(220, 225, 225);
      doc.roundedRect(30, y, pageWidth - 60, 48, 6, 6, "FD");

      doc.setFontSize(8);
      doc.setTextColor(100, 110, 115);
      doc.setFont("helvetica", "bold");
      doc.text("BILLED TO:", 42, y + 18);
      doc.text("SERVICE DATE:", 240, y + 18);
      doc.text("PAYMENT STATUS:", 400, y + 18);

      doc.setFontSize(9);
      doc.setTextColor(6, 46, 54);
      doc.setFont("helvetica", "bold");
      doc.text(inv.patientName || patient?.name || "Patient", 42, y + 34);
      doc.text(inv.serviceDate || "Date", 240, y + 34);
      doc.text((inv.status || "PAID").toUpperCase(), 400, y + 34);

      y += 70;

      // Line Items Table Header
      doc.setFillColor(6, 46, 54);
      doc.roundedRect(30, y, pageWidth - 60, 24, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("SERVICE DESCRIPTION", 42, y + 16);
      doc.text("QTY", 360, y + 16);
      doc.text("AMOUNT", 460, y + 16);

      y += 24;

      // Line Items
      const items = inv.items && inv.items.length > 0 ? inv.items : [
        { description: inv.notes || "Physiotherapy Consultation & Rehab Session", quantity: 1, rate: inv.totalAmount || 0, amount: inv.totalAmount || 0 }
      ];

      items.forEach((item) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(235, 240, 240);
        doc.roundedRect(30, y, pageWidth - 60, 26, 0, 0, "FD");

        doc.setFontSize(8.5);
        doc.setTextColor(40, 45, 50);
        doc.setFont("helvetica", "normal");
        doc.text(item.description || "Physiotherapy Service", 42, y + 17);
        doc.text(String(item.quantity || 1), 365, y + 17);
        doc.setFont("helvetica", "bold");
        doc.text(`₹${(item.amount || 0).toFixed(2)}`, 460, y + 17);

        y += 26;
      });

      // Total Box
      y += 10;
      doc.setFillColor(249, 171, 85); // Honey Gold
      doc.roundedRect(pageWidth - 220, y, 190, 32, 6, 6, "F");
      doc.setTextColor(6, 46, 54);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL PAID:", pageWidth - 205, y + 20);
      doc.setFontSize(12);
      doc.text(`₹${(inv.totalAmount || 0).toFixed(2)}`, pageWidth - 90, y + 20);

      const fileName = `Invoice_${inv.invoiceNumber || "Receipt"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Invoice PDF generation failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#062e36] dark:text-[#f9ab55]" />
      </div>
    );
  }

  // Aggregate all prescription items (Unified Single-Sheet Architecture)
  const allPrescriptionItems: Array<{
    id: string;
    type: "unified" | "file";
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

  const latestConsult = consultations.length > 0 ? consultations[0] : null;

  // 1. Unified Active Plan (combines active exercise prescription + clinical consultation notes)
  if (activePrescription && activePrescription.exercises && activePrescription.exercises.length > 0) {
    allPrescriptionItems.push({
      id: "active-unified-prescription",
      type: "unified",
      title: `Home Exercise Plan & Clinical Prescription (${activePrescription.durationDays || 14} Days)`,
      subtitle: `${patient?.therapistName || latestConsult?.therapistName || "Dr. Kinnera"} • ${activePrescription.prescribedDateFormatted || activePrescription.startDate || "Active Plan"}`,
      date: activePrescription.startDate || "2026-08-23",
      rawDate: activePrescription.startDate || new Date(),
      displayDate: activePrescription.prescribedDateFormatted || activePrescription.startDate || "23-08-2026",
      therapistName: patient?.therapistName || latestConsult?.therapistName || "Dr. Kinnera",
      durationDays: activePrescription.durationDays || 14,
      generalNotes: activePrescription.generalNotes,
      consultationSummary: latestConsult?.summary || (latestConsult as any)?.soapNote || (latestConsult as any)?.subjectiveComplaints,
      modalitiesAdministered: (latestConsult as any)?.modalitiesAdministered,
      exercises: activePrescription.exercises,
      raw: activePrescription,
    });
  } else if (latestConsult) {
    // If only consultation notes exist without active exercise tray
    allPrescriptionItems.push({
      id: latestConsult.id || "consult-1",
      type: "unified",
      title: "Clinical Consultation & Rehabilitation Prescription",
      subtitle: `${latestConsult.therapistName || "Dr. Kinnera"} • ${latestConsult.date || (latestConsult as any).visitDate || "Recorded"}`,
      date: latestConsult.date || (latestConsult as any).visitDate || "2026-08-23",
      rawDate: latestConsult.date || (latestConsult as any).visitDate || new Date(),
      displayDate: latestConsult.date || (latestConsult as any).visitDate || "23-08-2026",
      therapistName: latestConsult.therapistName || "Dr. Kinnera",
      durationDays: 14,
      consultationSummary: latestConsult.summary || (latestConsult as any).soapNote || (latestConsult as any).subjectiveComplaints,
      modalitiesAdministered: (latestConsult as any).modalitiesAdministered,
      exercises: [],
      raw: latestConsult,
    });
  }

  // 2. Historical Prescriptions (if any other previous versions exist)
  prescriptionsHistory.forEach((hist, idx) => {
    if (hist.prescribedDateFormatted !== activePrescription?.prescribedDateFormatted) {
      allPrescriptionItems.push({
        id: `hist-rx-${idx}`,
        type: "unified",
        title: `Past Exercise Plan & Prescription v${prescriptionsHistory.length - idx} (${hist.durationDays || 14} Days)`,
        subtitle: `${patient?.therapistName || "Dr. Kinnera"} • ${hist.prescribedDateFormatted || hist.startDate || "Past Plan"}`,
        date: hist.startDate || "2026-08-23",
        rawDate: hist.startDate || new Date(),
        displayDate: hist.prescribedDateFormatted || hist.startDate || "23-08-2026",
        therapistName: patient?.therapistName || "Dr. Kinnera",
        durationDays: hist.durationDays || 14,
        generalNotes: hist.generalNotes,
        exercises: hist.exercises || [],
        raw: hist,
      });
    }
  });

  // 3. Uploaded Medical Files / Verified Referrals (Scans, external PDFs, etc.)
  medicalFiles.forEach((f) => {
    allPrescriptionItems.push({
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

      {/* 2. Segmented Pill Tabs (Invoices | Prescriptions) */}
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
          onClick={() => setActiveTab("prescriptions")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
            activeTab === "prescriptions"
              ? "bg-[#062e36] text-white shadow-sm font-black"
              : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white font-semibold"
          }`}
        >
          Prescriptions
        </button>
      </div>

      {/* 3. TAB CONTENT: Prescriptions */}
      {activeTab === "prescriptions" && (
        <div className="space-y-3.5 pt-1">
          {allPrescriptionItems.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3 shadow-xs">
              <Folder className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#062e36] dark:text-white">No Prescriptions Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your prescribed home exercise routines, clinical notes, and doctor case sheets will appear here with instant PDF download.
              </p>
            </div>
          ) : (
            allPrescriptionItems.map((item) => {
              const isUnified = item.type === "unified";
              const isFile = item.type === "file";

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#121a1d] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-4.5 shadow-xs flex items-center justify-between gap-3.5 hover:border-[#f9ab55]/60 transition-all group"
                >
                  <div className="flex items-center gap-3.5 overflow-hidden">
                    {/* Left Circular Icon Badge */}
                    <div className="h-12 w-12 rounded-full bg-[#fdeedc] dark:bg-amber-950/40 text-[#8a5100] dark:text-[#f9ab55] flex items-center justify-center shrink-0">
                      {isUnified ? (
                        <FileText className="h-5 w-5 stroke-[2.2]" />
                      ) : (
                        <Pill className="h-5 w-5 stroke-[2.2]" />
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
                        title="Download Prescription PDF"
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
