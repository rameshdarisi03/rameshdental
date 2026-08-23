import jsPDF from "jspdf";
import { PrescribedExercise } from "./exercisesDb";

export interface UnifiedPrescriptionParams {
  patientName: string;
  pid?: string;
  dateStr?: string; // DD-MM-YYYY or formatted string
  therapistName?: string;
  durationDays?: number;
  generalNotes?: string;
  consultationSummary?: string;
  modalitiesAdministered?: string;
  exercises?: PrescribedExercise[];
}

export function formatToDDMMYYYY(dateInput?: any): string {
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

export function getPrescriptionFileName(patientName: string, dateInput?: any): string {
  const cleanName = (patientName || "Patient").trim().replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = formatToDDMMYYYY(dateInput);
  return `prescription_${cleanName}_${dateStr}.pdf`;
}

export function buildUnifiedPrescriptionPdf(params: UnifiedPrescriptionParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 35;

  const now = new Date();
  const displayDate = params.dateStr || `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  const duration = params.durationDays || 14;

  // 1. Header Banner
  doc.setFillColor(6, 46, 54); // Deep Midnight Teal #062e36
  doc.roundedRect(30, y, pageWidth - 60, 68, 8, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GAIT PHYSIO CLINIC", 45, y + 26);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(249, 171, 85); // Honey Gold #f9ab55
  doc.text("CLINICAL CONSULTATION & REHABILITATION PRESCRIPTION", 45, y + 43);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 230, 235);
  doc.text("Whitefield, Bengaluru • Tel: +91 92066 51295 • www.gaitphysioclinic.com", 45, y + 56);

  y += 82;

  // 2. Patient & Consultation Metadata Card
  doc.setFillColor(249, 249, 247); // Cream Surface #F9F9F7
  doc.setDrawColor(220, 225, 225);
  doc.roundedRect(30, y, pageWidth - 60, 52, 6, 6, "FD");

  doc.setFontSize(8);
  doc.setTextColor(100, 110, 115);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT NAME:", 42, y + 18);
  doc.text("PATIENT ID (PID):", 200, y + 18);
  doc.text("DATE OF ISSUE:", 330, y + 18);
  doc.text("PROGRAM DURATION:", 440, y + 18);

  doc.setFontSize(9.5);
  doc.setTextColor(6, 46, 54);
  doc.setFont("helvetica", "bold");
  doc.text(params.patientName || "Patient", 42, y + 36);
  doc.text(params.pid || "PID-1001", 200, y + 36);
  doc.text(displayDate, 330, y + 36);
  doc.text(`${duration} Days Protocol`, 440, y + 36);

  y += 66;

  // 3. SECTION 1: Clinical Findings, Diagnosis & Doctor's Advice
  const notesParts: string[] = [];
  if (params.consultationSummary && params.consultationSummary.trim()) {
    notesParts.push(`Clinical Findings / Diagnosis: ${params.consultationSummary.trim()}`);
  }
  if (params.generalNotes && params.generalNotes.trim()) {
    notesParts.push(`Therapist Instructions & Precautions: ${params.generalNotes.trim()}`);
  }
  if (params.modalitiesAdministered && params.modalitiesAdministered.trim()) {
    notesParts.push(`Modalities Administered: ${params.modalitiesAdministered.trim()}`);
  }

  const clinicalNotes = notesParts.join("\n\n") || "Patient underwent clinical evaluation and was prescribed the customized physiotherapy rehabilitation protocol detailed below.";

  doc.setFillColor(6, 46, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(6, 46, 54);
  doc.text("1. CLINICAL ASSESSMENT, DIAGNOSIS & GUIDANCE", 35, y);
  y += 12;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(225, 230, 230);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 45, 50);

  const lines = doc.splitTextToSize(clinicalNotes, pageWidth - 80);
  const boxHeight = lines.length * 12 + 16;
  doc.roundedRect(30, y, pageWidth - 60, boxHeight, 4, 4, "FD");
  doc.text(lines, 42, y + 14);
  y += boxHeight + 16;

  // 4. SECTION 2: Prescribed Exercises & Regimen Table
  doc.setFillColor(6, 46, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(6, 46, 54);
  doc.text("2. PRESCRIBED REHABILITATION EXERCISES & PROTOCOLS", 35, y);
  y += 12;

  // Table Header
  doc.setFillColor(6, 46, 54);
  doc.roundedRect(30, y, pageWidth - 60, 24, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("#", 42, y + 16);
  doc.text("EXERCISE PROTOCOL", 68, y + 16);
  doc.text("TARGET REGION", 260, y + 16);
  doc.text("SETS × REPS / HOLD", 380, y + 16);
  doc.text("DAILY FREQUENCY", 480, y + 16);

  y += 24;

  const exercises = params.exercises || [];
  if (exercises.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(235, 240, 240);
    doc.roundedRect(30, y, pageWidth - 60, 26, 0, 0, "FD");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 110, 115);
    doc.setFont("helvetica", "normal");
    doc.text("Perform active mobility and gentle stretching as instructed by therapist.", 42, y + 17);
    y += 26;
  } else {
    exercises.forEach((ex, idx) => {
      if (y > pageHeight - 90) {
        doc.addPage();
        y = 40;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(235, 240, 240);
      doc.roundedRect(30, y, pageWidth - 60, 28, 0, 0, "FD");

      doc.setFontSize(8.5);
      doc.setTextColor(6, 46, 54);
      doc.setFont("helvetica", "bold");
      doc.text(String(idx + 1), 42, y + 18);

      doc.setFont("helvetica", "bold");
      doc.text(ex.title || "Exercise", 68, y + 18);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 115);
      doc.text(ex.category || "General", 260, y + 18);

      doc.setTextColor(6, 46, 54);
      doc.setFont("helvetica", "bold");
      doc.text(`${ex.sets || 3} sets × ${ex.repsOrHold || "10 reps"}`, 380, y + 18);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 115);
      doc.text("Twice Daily", 480, y + 18);

      y += 28;
    });
  }

  // 5. SECTION 3: Review Target & Digital Verification
  if (y > pageHeight - 90) {
    doc.addPage();
    y = 40;
  }
  y += 14;

  doc.setFillColor(249, 171, 85); // Honey Gold
  doc.roundedRect(30, y, pageWidth - 60, 32, 6, 6, "F");
  doc.setTextColor(6, 46, 54);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TARGET REVIEW RE-ASSESSMENT:", 42, y + 20);
  doc.setFont("helvetica", "normal");
  doc.text(`Follow the prescribed ${duration}-day routine daily. Attending: ${params.therapistName || "Dr. Kinnera"}.`, 220, y + 20);

  // Footer
  doc.setTextColor(140, 150, 155);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Transcribed & Digitally Certified via GaitPhysio EMR Hub • Gait Physio Clinic, Whitefield, Bengaluru", 35, pageHeight - 22);

  return doc;
}
