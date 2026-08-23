"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Patient, MedicalRecordFile } from "@/lib/patientsDb";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";
import { jsPDF } from "jspdf";
import { 
  Receipt, 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  Stethoscope, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Folder,
  Loader2,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface ConsultationRecord {
  id: string;
  visitDate: string;
  therapistName?: string;
  subjectiveComplaints?: string;
  objectiveFindings?: {
    specialTests?: string;
    postureGait?: string;
  };
  modalitiesAdministered?: string;
  exercisePrescriptions?: string;
  soapNote?: string;
  createdAt?: any;
}

export default function RecordsPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"consultations" | "invoices">("consultations");
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [medicalFiles, setMedicalFiles] = useState<MedicalRecordFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let invUnsub = () => {};

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      const parsed = JSON.parse(localData);
      setPatient(parsed);
      loadPatientRecords(parsed.id);
      if (parsed.email) {
        invUnsub = subscribePatientInvoices(parsed.email, setInvoices);
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        try {
          const q = query(collection(db, "patients"), where("email", "==", user.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const matched = { id: snap.docs[0].id, ...snap.docs[0].data() } as Patient;
            setPatient(matched);
            localStorage.setItem("gpc_patient", JSON.stringify(matched));
            loadPatientRecords(matched.id);
            invUnsub = subscribePatientInvoices(matched.email, setInvoices);
          }
        } catch (err) {
          console.error("Failed to sync records:", err);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      invUnsub();
    };
  }, []);

  const loadPatientRecords = async (patientId: string) => {
    try {
      // 1. Fetch consultations
      const consultsRef = collection(db, "patients", patientId, "consultations");
      const consultsSnap = await getDocs(consultsRef);
      const consultsList: ConsultationRecord[] = consultsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ConsultationRecord[];

      // Sort by date descending
      consultsList.sort((a, b) => {
        const dateA = new Date(a.visitDate || 0).getTime();
        const dateB = new Date(b.visitDate || 0).getTime();
        return dateB - dateA;
      });
      setConsultations(consultsList);

      // 2. Fetch medical files
      const filesRef = collection(db, "patients", patientId, "medicalFiles");
      const filesSnap = await getDocs(filesRef);
      const filesList: MedicalRecordFile[] = filesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MedicalRecordFile[];
      setMedicalFiles(filesList);
    } catch (err) {
      console.error("Error loading patient records:", err);
    }
  };

  const handleDownloadConsultationPDF = (record: ConsultationRecord) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header Banner
      doc.setFillColor(6, 46, 54); // Deep Midnight Teal #062e36
      doc.roundedRect(30, y, pageWidth - 60, 65, 8, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("GAIT PHYSIO CLINIC", 45, y + 26);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(249, 171, 85); // Honey Gold #f9ab55
      doc.text("CLINICAL CONSULTATION & CASE SHEET", 45, y + 42);

      doc.setFontSize(8);
      doc.setTextColor(220, 230, 235);
      doc.text("Whitefield, Bengaluru • Tel: +91 92066 51295 • www.gaitphysioclinic.com", 45, y + 54);

      y += 85;

      // Patient & Visit Meta Table
      doc.setFillColor(249, 249, 247); // Cream Surface #F9F9F7
      doc.setDrawColor(220, 225, 225);
      doc.roundedRect(30, y, pageWidth - 60, 48, 6, 6, "FD");

      doc.setFontSize(8);
      doc.setTextColor(100, 110, 115);
      doc.setFont("helvetica", "bold");
      doc.text("PATIENT NAME:", 42, y + 18);
      doc.text("VISIT DATE:", 240, y + 18);
      doc.text("ATTENDING THERAPIST:", 400, y + 18);

      doc.setFontSize(9);
      doc.setTextColor(6, 46, 54);
      doc.setFont("helvetica", "bold");
      doc.text(patient?.name || "Patient", 42, y + 34);
      doc.text(record.visitDate || "Recorded", 240, y + 34);
      doc.text(record.therapistName || "Dr. Kinnera", 400, y + 34);

      y += 65;

      // Clinical Sections
      const renderSection = (title: string, content?: string) => {
        if (!content || content.trim() === "") return;
        
        doc.setFillColor(6, 46, 54);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(6, 46, 54);
        doc.text(title.toUpperCase(), 35, y);
        y += 12;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 235, 235);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(40, 45, 50);

        const lines = doc.splitTextToSize(content, pageWidth - 80);
        const boxHeight = lines.length * 12 + 14;
        doc.roundedRect(30, y, pageWidth - 60, boxHeight, 4, 4, "FD");
        doc.text(lines, 40, y + 13);
        y += boxHeight + 14;
      };

      renderSection("Subjective Presentation & Symptoms", record.subjectiveComplaints);
      renderSection("Physical & ROM Examination Findings", record.objectiveFindings?.specialTests || record.objectiveFindings?.postureGait);
      renderSection("Prescribed Physical Therapy Modalities", record.modalitiesAdministered);
      renderSection("Prescribed Home Exercise Protocol", record.exercisePrescriptions);
      renderSection("Clinical SOAP Session Notes", record.soapNote);

      // Footer
      doc.setTextColor(140, 150, 155);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text("Transcribed & Digitally Certified via GaitPhysio EMR • Gait Physio Clinic, Bengaluru", 35, doc.internal.pageSize.getHeight() - 25);

      const fileName = `Consultation_${(patient?.name || "Patient").replace(/[^a-zA-Z0-9]/g, "_")}_${record.visitDate || "Date"}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("PDF generation failed:", err);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in font-['Inter',sans-serif]">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#062e36] dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            My Health Records
          </h1>
          <p className="text-xs sm:text-sm text-[#41484A] dark:text-slate-300 font-medium mt-1">
            Access your verified clinical case sheets, referral papers, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#062e36]/10 dark:bg-white/10 text-[#062e36] dark:text-[#f9ab55] text-xs font-bold border border-[#062e36]/15 dark:border-white/10">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Encrypted EMR Archive</span>
          </span>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex bg-white dark:bg-[#121a1d] p-1.5 rounded-full border border-[#21444D]/10 dark:border-slate-800 shadow-xs max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("consultations")}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "consultations"
              ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
              : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Consultations & Referrals</span>
          <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/20 dark:bg-black/20 font-black">
            {consultations.length + medicalFiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 py-2.5 px-4 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "invoices"
              ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-sm"
              : "text-[#41484A] dark:text-slate-300 hover:text-[#062e36] dark:hover:text-white"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoices & Billing</span>
          <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/20 dark:bg-black/20 font-black">
            {invoices.length}
          </span>
        </button>
      </div>

      {/* 3. TAB 1: Consultations & Medical Referrals */}
      {activeTab === "consultations" && (
        <div className="space-y-4">
          {consultations.length === 0 && medicalFiles.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
              <Folder className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#062e36] dark:text-white">No Consultations Recorded Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your consultation records and doctor prescriptions will appear here once your therapist updates your visit timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Prescriptions & Uploaded Medical Documents */}
              {medicalFiles.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a5100] dark:text-[#f9ab55] block px-1">
                    Doctor Referrals & Prescription Reports ({medicalFiles.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {medicalFiles.map((file) => {
                      const fObj = file as any;
                      const fId = file.googleDriveFileId || fObj.driveFileId;
                      const viewUrl = file.webViewLink || fObj.driveViewLink || (fId ? `https://drive.google.com/file/d/${fId}/view` : "");
                      const dlUrl = file.downloadLink || fObj.downloadLink || viewUrl;

                      return (
                        <div
                          key={file.id || fId || Math.random().toString()}
                          className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 hover:border-[#f9ab55]/60 transition-all"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-11 w-11 rounded-2xl bg-[#062e36]/10 dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-xs font-bold text-[#062e36] dark:text-white truncate">
                                {file.fileName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {file.dateUploaded} • Verified Referral
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {viewUrl && (
                              <a
                                href={viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-500 hover:text-[#062e36] dark:hover:text-[#f9ab55] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                                title="Open in Google Drive"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {dlUrl && (
                              <a
                                href={dlUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-[#062e36] dark:text-[#f9ab55] hover:bg-[#f9ab55]/15 rounded-xl transition-all"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Consultation Timeline Notes */}
              {consultations.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8a5100] dark:text-[#f9ab55] block px-1">
                    Clinical Session Case Sheets ({consultations.length})
                  </span>

                  <div className="space-y-3.5">
                    {consultations.map((consult) => (
                      <div
                        key={consult.id}
                        className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 rounded-[24px] p-5 shadow-xs space-y-3.5 hover:border-[#f9ab55]/50 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-[#f9ab55]/15 text-[#8a5100] dark:text-[#f9ab55] flex items-center justify-center font-bold text-xs shrink-0">
                              <Stethoscope className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-[#062e36] dark:text-white">
                                {consult.therapistName || "Dr. Kinnera (Consultant Physiotherapist)"}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                <span>{consult.visitDate || "Session Recorded"}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDownloadConsultationPDF(consult)}
                            className="inline-flex items-center gap-1.5 bg-[#062e36] hover:bg-[#21444D] text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-[#f9ab55]" />
                            <span>Download Case Sheet PDF</span>
                          </button>
                        </div>

                        {/* Subjective & Complaints */}
                        {consult.subjectiveComplaints && (
                          <div className="bg-[#FAF9F9] dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                              Subjective Complaints & Presentation
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {consult.subjectiveComplaints}
                            </p>
                          </div>
                        )}

                        {/* Prescribed Modalities & Exercises Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {consult.modalitiesAdministered && (
                            <div className="bg-[#FAF9F9] dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8a5100] dark:text-[#f9ab55] block mb-1">
                                Modalities Administered
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {consult.modalitiesAdministered}
                              </p>
                            </div>
                          )}

                          {consult.exercisePrescriptions && (
                            <div className="bg-[#FAF9F9] dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                                Prescribed Exercises
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {consult.exercisePrescriptions}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: Invoices & Receipts */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="bg-white dark:bg-[#121a1d] border border-slate-200 dark:border-slate-800 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-[#062e36] dark:text-white">No Invoices on Record</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When treatment invoices are generated by the clinic, you can download your official PDF tax receipts here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-[#121a1d] border border-[#21444D]/15 dark:border-slate-800 rounded-[24px] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#f9ab55]/60 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-[#062e36]/10 dark:bg-[#062e36] text-[#062e36] dark:text-[#f9ab55] flex items-center justify-center shrink-0">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#062e36] dark:text-white">
                          Invoice #{inv.invoiceNumber}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}>
                          {(inv.status || "PAID").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Date: {inv.serviceDate} • Attending: {inv.therapistName || "Clinical Team"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                    <span className="text-base font-bold text-[#062e36] dark:text-[#f9ab55] font-['Plus_Jakarta_Sans',sans-serif]">
                      ₹{(inv.totalAmount || 0).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleDownloadInvoicePDF(inv)}
                      className="inline-flex items-center gap-1.5 bg-[#f9ab55] hover:bg-[#e5971a] text-[#062e36] px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
