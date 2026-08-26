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

export interface UnifiedInvoiceParams {
  invoiceNumber: string;
  patientName: string;
  patientId?: string;
  patientEmail?: string;
  patientPhone?: string;
  therapistName?: string;
  serviceDate?: string;
  dueDate?: string;
  status?: string;
  paymentMethod?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice?: number;
    rate?: number;
    amount: number;
  }>;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  totalAmount?: number;
  currency?: string;
  notes?: string;
}

export function getInvoiceFileName(patientName: string, dateInput?: any): string {
  const cleanName = (patientName || "Patient").trim().replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = formatToDDMMYYYY(dateInput);
  return `invoice_${cleanName}_${dateStr}.pdf`;
}

export function buildUnifiedInvoicePdf(params: UnifiedInvoiceParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 35;

  const brandForest = [6, 46, 54]; // #062e36
  const brandGold = [249, 171, 85]; // #f9ab55
  const slateDark = [15, 23, 42]; // #0f172a
  const slateMuted = [100, 116, 139]; // #64748b

  // 1. Header Banner
  doc.setFillColor(brandForest[0], brandForest[1], brandForest[2]);
  doc.roundedRect(30, y, pageWidth - 60, 68, 8, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GAIT PHYSIO CLINIC", 48, y + 26);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.text(`TAX INVOICE & RECEIPT #${params.invoiceNumber || "INV-001"}`, 48, y + 42);

  doc.setFontSize(8);
  doc.setTextColor(220, 230, 235);
  doc.text("123 Clinical Wellness Way, Sector 4, Bengaluru • +91 92066 51295", 48, y + 56);

  y += 82;

  // 2. Invoice Meta & Patient Information Card
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(30, y, pageWidth - 60, 64, 6, 6, "FD");

  // Left: Bill To Patient
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFont("helvetica", "bold");
  doc.text("BILLED TO PATIENT:", 45, y + 16);

  doc.setFontSize(9.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(params.patientName || "Valued Patient", 45, y + 30);

  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFont("helvetica", "normal");
  const pIdLine = params.patientId ? `PID: ${params.patientId}` : "";
  const phoneLine = params.patientPhone ? ` • ${params.patientPhone}` : "";
  doc.text(`${pIdLine}${phoneLine}` || "Self-Pay Patient", 45, y + 44);

  // Middle: Dates & Attending Therapist
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE DATE:", 240, y + 16);
  doc.text("ATTENDING THERAPIST:", 240, y + 38);

  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.setFont("helvetica", "normal");
  doc.text(params.serviceDate || new Date().toISOString().split("T")[0], 240, y + 27);
  doc.text(params.therapistName || "Dr. Kinnera", 240, y + 49);

  // Right: Payment Status & Method
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT STATUS:", 410, y + 16);

  const isPaid = (params.status || "PAID").toLowerCase() === "paid";
  const isVoid = (params.status || "").toLowerCase() === "voided" || (params.status || "").toLowerCase() === "cancelled";

  doc.setFontSize(9);
  if (isPaid) {
    doc.setTextColor(45, 90, 76);
    doc.setFont("helvetica", "bold");
    doc.text(`PAID (${params.paymentMethod || "UPI"})`, 410, y + 28);
  } else if (isVoid) {
    doc.setTextColor(225, 29, 72);
    doc.setFont("helvetica", "bold");
    doc.text("CANCELLED / VOIDED", 410, y + 28);
  } else {
    doc.setTextColor(217, 119, 6);
    doc.setFont("helvetica", "bold");
    doc.text(`PENDING (${params.paymentMethod || "Due"})`, 410, y + 28);
  }

  if (params.dueDate) {
    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.setFont("helvetica", "normal");
    doc.text(`Due: ${params.dueDate}`, 410, y + 42);
  }

  y += 76;

  // 3. Line Items Table Header
  doc.setFillColor(brandForest[0], brandForest[1], brandForest[2]);
  doc.roundedRect(30, y, pageWidth - 60, 22, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SERVICE / TREATMENT DESCRIPTION", 45, y + 15);
  doc.text("QTY", 330, y + 15);
  doc.text("RATE (INR)", 390, y + 15);
  doc.text("AMOUNT (INR)", 535, y + 15, { align: "right" });

  y += 22;

  // 4. Line Items Rows
  const items = params.items && params.items.length > 0 ? params.items : [
    { description: params.notes || "Physiotherapy Consultation & Treatment", quantity: 1, unitPrice: params.totalAmount || 0, amount: params.totalAmount || 0 }
  ];

  let calculatedSubtotal = 0;

  items.forEach((item, idx) => {
    const rowBg = idx % 2 === 0 ? 255 : 250;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.setDrawColor(241, 245, 249);
    doc.rect(30, y, pageWidth - 60, 24, "FD");

    const qty = Number(item.quantity) || 1;
    const rate = Number(item.unitPrice || item.rate || (item.amount ? item.amount / qty : 0));
    const amt = Number(item.amount || (qty * rate));
    calculatedSubtotal += amt;

    doc.setFontSize(8.5);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont("helvetica", "normal");
    doc.text(item.description || "Clinical Physical Therapy Service", 45, y + 16);
    doc.text(String(qty), 335, y + 16);
    doc.text(`Rs. ${rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 390, y + 16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${amt.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 535, y + 16, { align: "right" });

    y += 24;
  });

  const subtotal = params.subtotal !== undefined ? Number(params.subtotal) : calculatedSubtotal;
  const taxRate = Number(params.taxRate) || 0;
  const taxAmount = params.taxAmount !== undefined ? Number(params.taxAmount) : (subtotal * taxRate) / 100;
  const discount = Number(params.discount) || 0;
  const finalTotal = params.totalAmount !== undefined ? Number(params.totalAmount) : Math.max(subtotal + taxAmount - discount, 0);

  y += 10;

  // 5. Notes Box (Left) + Detailed Financial Summary (Right)
  const summaryBoxY = y;

  // Left: Clinical Notes / Diagnoses
  if (params.notes && params.notes.trim()) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, summaryBoxY, 260, 75, 6, 6, "FD");

    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.setFont("helvetica", "bold");
    doc.text("CLINICAL NOTES & DIAGNOSIS:", 40, summaryBoxY + 16);

    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(params.notes, 240);
    doc.text(splitNotes, 40, summaryBoxY + 30);
  }

  // Right: Calculation Matrix (Subtotal, GST, Discount, Total)
  const calcX = 310;
  const calcWidth = pageWidth - 60 - 280;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(calcX, summaryBoxY, calcWidth, 75, 6, 6, "FD");

  let cY = summaryBoxY + 16;
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", calcX + 15, cY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Rs. ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 535, cY, { align: "right" });

  cY += 14;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  if (taxRate > 0) {
    doc.text(`GST / Tax (${taxRate}%):`, calcX + 15, cY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(`+Rs. ${taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 535, cY, { align: "right" });
  } else {
    doc.text("GST / Tax:", calcX + 15, cY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(45, 90, 76);
    doc.text("0% (Exempt)", 535, cY, { align: "right" });
  }

  if (discount > 0) {
    cY += 14;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text("Discount Applied:", calcX + 15, cY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(225, 29, 72);
    doc.text(`-Rs. ${discount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 535, cY, { align: "right" });
  }

  // Total Banner Box
  cY += 16;
  doc.setFillColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.roundedRect(calcX + 8, cY - 10, calcWidth - 16, 24, 4, 4, "F");

  doc.setTextColor(brandForest[0], brandForest[1], brandForest[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(isPaid ? "TOTAL PAID:" : "TOTAL DUE:", calcX + 16, cY + 6);
  doc.setFontSize(11);
  doc.text(`Rs. ${finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, 530, cY + 6, { align: "right" });

  // 6. Official Footer
  const footerY = Math.max(summaryBoxY + 95, 780);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text(
    `This is a computer-generated tax invoice for Gait Physio Clinic. Please quote #${params.invoiceNumber} for insurance claims.`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return doc;
}
