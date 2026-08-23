"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Patient, MedicalRecordFile } from "@/lib/patientsDb";
import { subscribePatientInvoices, Invoice } from "@/lib/invoicesDb";
import { 
  PatientPrescription, 
  getPatientPrescription, 
  getPatientPrescriptionsHistory,
  subscribePatientPrescription 
} from "@/lib/exercisesDb";
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
  ExternalLink,
  Pill,
  Dumbbell
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

function formatToDDMMYYYY(dateInput?: any): string {
  let d = new Date();
  if (dateInput) {
    if (typeof dateInput === "object" && typeof dateInput.toDate === "function") {
      d = dateInput.toDate();
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}_${month}_${year}`;
}

export default function RecordsPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<"invoices" | "prescriptions">("prescriptions");
  const [activePrescription, setActivePrescription] = useState<PatientPrescription | null>(null);
  const [prescriptionsHistory, setPrescriptionsHistory] = useState<PatientPrescription[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([]);
  const [medicalFiles, setMedicalFiles] = useState<MedicalRecordFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let invUnsub = () => {};
    let rxUnsub = () => {};

    const localData = localStorage.getItem("gpc_patient");
    if (localData) {
      const parsed = JSON.parse(localData);
      setPatient(parsed);
      loadPatientRecords(parsed.id);
      if (parsed.email) {
        invUnsub = subscribePatientInvoices(parsed.email, setInvoices);
      }
      rxUnsub = subscribePatientPrescription(parsed.id, (rx) => {
        setActivePrescription(rx);
      });
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
            loadPatientRecords(matched.id!);
            invUnsub = subscribePatientInvoices(matched.email, setInvoices);
            rxUnsub = subscribePatientPrescription(matched.id!, (rx) => {
              setActivePrescription(rx);
            });
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
      rxUnsub();
    };
  }, []);

  const loadPatientRecords = async (patientId: string) => {
    try {
      // 1. Fetch Prescriptions History & Active Prescription
      const [historyList, activeRx] = await Promise.all([
        getPatientPrescriptionsHistory(patientId),
        getPatientPrescription(patientId)
      ]);
      setPrescriptionsHistory(historyList);
      if (activeRx) setActivePrescription(activeRx);

      // 2. Fetch consultations
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

      // 3. Fetch medical files
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

  const handleDownloadPrescriptionPDF = (rx: PatientPrescription | any, customTitle: string = "Home Exercise Plan") => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // 1. Header Banner
      doc.setFillColor(6, 46, 54); // Deep Midnight Teal #062e36
      doc.roundedRect(30, y, pageWidth - 60, 65, 8, 8, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("GAIT PHYSIO CLINIC", 45, y + 26);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(249, 171, 85); // Honey Gold #f9ab55
      doc.text("PHYSIOTHERAPY & REHABILITATION PRESCRIPTION", 45, y + 42);

      doc.setFontSize(8);
      doc.setTextColor(220, 230, 235);
      doc.text("Whitefield, Bengaluru • Tel: +91 92066 51295 • www.gaitphysioclinic.com", 45, y + 54);

      y += 85;

      // 2. Patient & Prescription Meta Table
      doc.setFillColor(249, 249, 247); // Cream Surface #F9F9F7
      doc.setDrawColor(220, 225, 225);
      doc.roundedRect(30, y, pageWidth - 60, 48, 6, 6, "FD");

      doc.setFontSize(8);
      doc.setTextColor(100, 110, 115);
      doc.setFont("helvetica", "bold");
      doc.text("PATIENT NAME:", 42, y + 18);
      doc.text("PRESCRIBED DATE:", 220, y + 18);
      doc.text("PROGRAM DURATION:", 380, y + 18);

      doc.setFontSize(9);
      doc.setTextColor(6, 46, 54);
      doc.setFont("helvetica", "bold");
      doc.text(patient?.name || "Patient", 42, y + 34);
      doc.text(rx.prescribedDateFormatted || rx.startDate || "Active Plan", 220, y + 34);
      doc.text(`${rx.durationDays || 14} Days Recovery Plan`, 380, y + 34);

      y += 65;

      // 3. Therapist Guidance Notes (if any)
      if (rx.generalNotes && rx.generalNotes.trim() !== "") {
        doc.setFillColor(6, 46, 54);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(6, 46, 54);
        doc.text("CLINICAL INSTRUCTIONS & PRECAUTIONS", 35, y);
        y += 12;

        doc.setFillColor(255, 248, 240);
        doc.setDrawColor(249, 171, 85);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 40, 30);

        const lines = doc.splitTextToSize(rx.generalNotes, pageWidth - 80);
        const boxHeight = lines.length * 12 + 14;
        doc.roundedRect(30, y, pageWidth - 60, boxHeight, 4, 4, "FD");
        doc.text(lines, 40, y + 13);
        y += boxHeight + 16;
      }

      // 4. Prescribed Exercises Table Header
      doc.setFillColor(6, 46, 54);
      doc.roundedRect(30, y, pageWidth - 60, 24, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("#", 42, y + 16);
      doc.text("EXERCISE / PROTOCOL", 70, y + 16);
      doc.text("TARGET REGION", 280, y + 16);
      doc.text("SETS × REPS / HOLD", 420, y + 16);

      y += 24;

      // 5. Prescribed Exercise Items
      const exerciseList = rx.exercises || [];
      if (exerciseList.length === 0) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(235, 240, 240);
        doc.roundedRect(30, y, pageWidth - 60, 26, 0, 0, "FD");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 110, 115);
        doc.setFont("helvetica", "normal");
        doc.text("No specific exercise list attached. Follow general clinic instructions.", 42, y + 17);
        y += 26;
      } else {
        exerciseList.forEach((ex: any, idx: number) => {
          doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 255 : 252);
          doc.setDrawColor(235, 240, 240);
          doc.roundedRect(30, y, pageWidth - 60, 28, 0, 0, "FD");

          doc.setFontSize(8.5);
          doc.setTextColor(6, 46, 54);
          doc.setFont("helvetica", "bold");
          doc.text(String(idx + 1), 42, y + 18);

          doc.setFont("helvetica", "bold");
          doc.text(ex.title || "Exercise", 70, y + 18);

          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 110, 115);
          doc.text(ex.category || "General", 280, y + 18);

          doc.setTextColor(6, 46, 54);
          doc.setFont("helvetica", "bold");
          doc.text(`${ex.sets || 3} sets × ${ex.repsOrHold || "10 reps"}`, 420, y + 18);

          y += 28;
        });
      }

      // 6. Review Date Callout
      y += 15;
      doc.setFillColor(249, 171, 85); // Honey Gold
      doc.roundedRect(30, y, pageWidth - 60, 32, 6, 6, "F");
      doc.setTextColor(6, 46, 54);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text("CLINICAL REVIEW TARGET:", 42, y + 20);
      doc.setFont("helvetica", "normal");
      doc.text(`Complete ${rx.durationDays || 14} days of prescribed routine before target re-assessment with therapist.`, 190, y + 20);

      // 7. Footer
      doc.setTextColor(140, 150, 155);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.text("Transcribed & Digitally Certified via GaitPhysio EMR • Gait Physio Clinic, Whitefield, Bengaluru", 35, doc.internal.pageSize.getHeight() - 25);

      const dateVal = rx.startDate || rx.prescribedAt || rx.date || new Date();
      const dateStr = formatToDDMMYYYY(dateVal);
      const fileName = `prescription_${dateStr}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error("Prescription PDF generation failed:", err);
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
      doc.text("CLINICAL CONSULTATION & PRESCRIPTION SHEET", 45, y + 42);

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

      const dateStr = formatToDDMMYYYY(record.visitDate || new Date());
      const fileName = `prescription_${dateStr}.pdf`;
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

  // Aggregate all prescription items
  const allPrescriptionItems: Array<{
    id: string;
    type: "exercise" | "consultation" | "file";
    title: string;
    subtitle: string;
    date: string;
    raw: any;
  }> = [];

  // 1. Active / Historical Exercise Prescriptions
  if (activePrescription && activePrescription.exercises && activePrescription.exercises.length > 0) {
    allPrescriptionItems.push({
      id: "active-rx",
      type: "exercise",
      title: `Home Exercise Plan (${activePrescription.durationDays || 14} Days)`,
      subtitle: `${patient?.therapistName || "Dr. Kinnera"} • ${activePrescription.prescribedDateFormatted || activePrescription.startDate || "Active Plan"}`,
      date: activePrescription.startDate || "2026-08-23",
      raw: activePrescription
    });
  }

  prescriptionsHistory.forEach((hist, idx) => {
    if (hist.prescribedDateFormatted !== activePrescription?.prescribedDateFormatted) {
      allPrescriptionItems.push({
        id: `hist-rx-${idx}`,
        type: "exercise",
        title: `Home Exercise Plan v${prescriptionsHistory.length - idx} (${hist.durationDays || 14} Days)`,
        subtitle: `${patient?.therapistName || "Dr. Kinnera"} • ${hist.prescribedDateFormatted || hist.startDate || "Past Plan"}`,
        date: hist.startDate || "2026-08-23",
        raw: hist
      });
    }
  });

  // 2. Clinical Consultations & Case Sheet Prescriptions
  consultations.forEach((c) => {
    allPrescriptionItems.push({
      id: c.id,
      type: "consultation",
      title: c.exercisePrescriptions || c.modalitiesAdministered ? "Clinical Prescription & Case Sheet" : "Consultation Case Sheet",
      subtitle: `${c.therapistName || "Dr. Kinnera"} • ${c.visitDate || "Recorded"}`,
      date: c.visitDate || "2026-08-23",
      raw: c
    });
  });

  // 3. Uploaded Medical Files / Doctor Referrals
  medicalFiles.forEach((f) => {
    allPrescriptionItems.push({
      id: f.id || Math.random().toString(),
      type: "file",
      title: f.fileName,
      subtitle: `Doctor Referral / Medical Doc • ${f.dateUploaded}`,
      date: f.dateUploaded,
      raw: f
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
                Your prescribed home exercise routines, clinical medications, and doctor case sheets will appear here with instant PDF download.
              </p>
            </div>
          ) : (
            allPrescriptionItems.map((item) => {
              const isExercise = item.type === "exercise";
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
                      {isExercise ? (
                        <FileText className="h-5 w-5 stroke-[2.2]" />
                      ) : isConsultation ? (
                        <Stethoscope className="h-5 w-5 stroke-[2.2]" />
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
                        href={item.raw.downloadLink || item.raw.webViewLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="h-4.5 w-4.5 stroke-[2.5]" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isExercise) {
                            handleDownloadPrescriptionPDF(item.raw, item.title);
                          } else {
                            handleDownloadConsultationPDF(item.raw);
                          }
                        }}
                        className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                        title="Download PDF"
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
