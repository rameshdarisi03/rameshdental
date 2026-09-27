import jsPDF from "jspdf";
import { PrescribedExercise } from "./exercisesDb";
import { CLINIC_BRAND } from "./clinicBranding";

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
  // Clinical referral & safety parameters
  referringDoctor?: string;
  hospitalOrClinic?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  precautionsAndRestrictions?: string;
  medicationsList?: string;
  providerAlerts?: string[];
  rawVerbatimTranscript?: string;
  soapNotes?: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
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

export function getPrescriptionFileName(patientName: string, dateInput?: any, _hasExercises: boolean = true): string {
  const cleanName = (patientName || "Patient").trim().replace(/[^a-zA-Z0-9]/g, "_");
  const dateStr = formatToDDMMYYYY(dateInput);
  return `consultation_prescription_${cleanName}_${dateStr}.pdf`;
}

export function buildUnifiedPrescriptionPdf(params: UnifiedPrescriptionParams): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 35;

  const now = new Date();
  const displayDate = params.dateStr || `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  const duration = params.durationDays || 14;
  const hasExercises = Boolean(params.exercises && params.exercises.length > 0);

  // 1. Header Banner
  const bannerHeight = 78;
  doc.setFillColor(6, 46, 54); // Deep Midnight Teal #062e36
  doc.roundedRect(30, y, pageWidth - 60, bannerHeight, 8, 8, "F");

  // Official Clinic Logo Emblem
  try {
    doc.addImage(CLINIC_BRAND.logoBase64, "PNG", 42, y + 11, 56, 56);
  } catch (e) {
    console.warn("Could not render logo in prescription PDF:", e);
  }

  // Left - Line 1: Clinic Brand Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(CLINIC_BRAND.nameUpper, 108, y + 24);

  // Left - Line 2: Core 3 Services Tagline (Title Case, Honey Gold)
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(249, 171, 85); // Honey Gold #f9ab55
  doc.text(CLINIC_BRAND.servicesTagline, 108, y + 38);

  // Left - Line 3: Clinic Location & Contact Info (Right below the 3 services)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(215, 228, 232);
  doc.text(`${CLINIC_BRAND.addressLine} • Tel: ${CLINIC_BRAND.phone}`, 108, y + 53);

  // Top-Right: Clean Document Title (CONSULTATION / PRESCRIPTION)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("CONSULTATION / PRESCRIPTION", pageWidth - 45, y + 33, { align: "right" });

  y += bannerHeight + 14;

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
  doc.text(hasExercises ? "PROGRAM DURATION:" : "CLINICAL STATUS:", 440, y + 18);

  doc.setFontSize(9.5);
  doc.setTextColor(6, 46, 54);
  doc.setFont("helvetica", "bold");
  doc.text(params.patientName || "Patient", 42, y + 36);
  doc.text(params.pid || "PID-1001", 200, y + 36);
  doc.text(displayDate, 330, y + 36);
  doc.text(hasExercises ? `${duration} Days Protocol` : "Consultation Recorded", 440, y + 36);

  y += 66;

  // 3. Extract Verbatim Doctor's Writings & Structured SOAP Notes
  const rawNotes = (params.consultationSummary || "").trim();
  let verbatimText = (params.rawVerbatimTranscript || "").trim();
  let soapBody = rawNotes;

  if (rawNotes.includes("=== EXACT DOCTOR'S WRITING (VERBATIM) ===")) {
    const parts = rawNotes.split(/===\s*STRUCTURED SOAP CLINICAL NOTE\s*===/i);
    if (parts.length > 1) {
      verbatimText = parts[0].replace(/===\s*EXACT DOCTOR'S WRITING \(VERBATIM\)\s*===/i, "").trim();
      soapBody = parts[1].trim();
    } else {
      const sIndex = rawNotes.search(/SUBJECTIVE:/i);
      if (sIndex > 0) {
        verbatimText = rawNotes.substring(0, sIndex).replace(/===\s*EXACT DOCTOR'S WRITING \(VERBATIM\)\s*===/i, "").trim();
        soapBody = rawNotes.substring(sIndex).trim();
      }
    }
  } else if (/SUBJECTIVE:/i.test(rawNotes)) {
    const sIndex = rawNotes.search(/SUBJECTIVE:/i);
    if (sIndex > 0) {
      const preText = rawNotes.substring(0, sIndex).trim();
      if (preText) {
        verbatimText = preText;
        soapBody = rawNotes.substring(sIndex).trim();
      }
    }
  }

  // Auto-detect referring doctor & clinic if not provided
  let referringDoctor = params.referringDoctor;
  let hospitalOrClinic = params.hospitalOrClinic;
  let prescriptionDate = params.prescriptionDate;

  if (!referringDoctor && verbatimText) {
    const docMatch = verbatimText.match(/(?:Doctor|Dr\.?|Physician):\s*([^\n\r]+)/i);
    if (docMatch) referringDoctor = docMatch[1].trim();
  }
  if (!hospitalOrClinic && verbatimText) {
    const hospMatch = verbatimText.match(/(?:Hospital|Clinic|Center|Centre):\s*([^\n\r]+)/i);
    if (hospMatch) hospitalOrClinic = hospMatch[1].trim();
  }
  if (!prescriptionDate && verbatimText) {
    const dateMatch = verbatimText.match(/(?:Date|Dated):\s*([^\n\r]+)/i);
    if (dateMatch) prescriptionDate = dateMatch[1].trim();
  }

  // 4. Optional: Referring Doctor & External Hospital Source
  if (referringDoctor || hospitalOrClinic) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(30, y, pageWidth - 60, 20, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("REFERRING PHYSICIAN & MEDICAL SOURCE", 42, y + 14);
    y += 28;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Referring Doctor:", 42, y);
    doc.setFont("helvetica", "normal");
    doc.text(referringDoctor || "External Consultant", 145, y);

    if (hospitalOrClinic) {
      doc.setFont("helvetica", "bold");
      doc.text("Hospital / Clinic:", 320, y);
      doc.setFont("helvetica", "normal");
      doc.text(hospitalOrClinic, 410, y);
    }
    y += 16;

    if (prescriptionDate) {
      doc.setFont("helvetica", "bold");
      doc.text("Prescription Date:", 42, y);
      doc.setFont("helvetica", "normal");
      doc.text(prescriptionDate, 145, y);
      y += 16;
    }
    y += 6;
  }

  // 5. Clinical Assessment & Case Record Section Header
  doc.setFillColor(6, 46, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(6, 46, 54);
  doc.text("1. CLINICAL ASSESSMENT & CASE RECORD", 35, y);
  y += 12;

  // 5A. Render Original Doctor's Case Sheet & Referral Notes (Verbatim)
  if (verbatimText) {
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 40;
    }

    const vLines = doc.splitTextToSize(verbatimText, pageWidth - 90);
    const neededHeight = vLines.length * 11 + 24;

    if (y + neededHeight > pageHeight - 50) {
      if (neededHeight <= pageHeight - 80) {
        doc.addPage();
        y = 40;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(30, y, pageWidth - 60, neededHeight, 4, 4, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(6, 46, 54);
        doc.text("ORIGINAL CASE SHEET / DOCTOR'S WRITINGS (VERBATIM):", 40, y + 13);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(vLines, 40, y + 25);
        y += neededHeight + 10;
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(6, 46, 54);
        doc.text("ORIGINAL CASE SHEET / DOCTOR'S WRITINGS (VERBATIM):", 35, y);
        y += 14;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        for (let i = 0; i < vLines.length; i++) {
          if (y > pageHeight - 50) {
            doc.addPage();
            y = 40;
          }
          doc.text(vLines[i], 40, y);
          y += 11;
        }
        y += 10;
      }
    } else {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(30, y, pageWidth - 60, neededHeight, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 46, 54);
      doc.text("ORIGINAL CASE SHEET / DOCTOR'S WRITINGS (VERBATIM):", 40, y + 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(vLines, 40, y + 25);
      y += neededHeight + 10;
    }
  }

  // 5B. Render Structured SOAP Notes (if present)
  const hasStructuredSoap =
    params.soapNotes ||
    /SUBJECTIVE:|OBJECTIVE:|ASSESSMENT:|PLAN:/i.test(soapBody);

  if (hasStructuredSoap) {
    let subj = params.soapNotes?.subjective || "";
    let obj = params.soapNotes?.objective || "";
    let assess = params.soapNotes?.assessment || "";
    let plan = params.soapNotes?.plan || "";

    if (!subj && !obj && !assess && !plan && soapBody) {
      const sMatch = soapBody.match(/SUBJECTIVE:\s*([\s\S]*?)(?=(OBJECTIVE:|ASSESSMENT:|PLAN:|$))/i);
      const oMatch = soapBody.match(/OBJECTIVE:\s*([\s\S]*?)(?=(ASSESSMENT:|PLAN:|$))/i);
      const aMatch = soapBody.match(/ASSESSMENT:\s*([\s\S]*?)(?=(PLAN:|$))/i);
      const pMatch = soapBody.match(/PLAN:\s*([\s\S]*?)$/i);

      subj = sMatch ? sMatch[1].trim() : "";
      obj = oMatch ? oMatch[1].trim() : "";
      assess = aMatch ? aMatch[1].trim() : "";
      plan = pMatch ? pMatch[1].trim() : "";
    }

    if (verbatimText && (subj || obj || assess || plan)) {
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 40;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(6, 46, 54);
      doc.text("STRUCTURED SOAP CLINICAL RECOVERY NOTES:", 35, y);
      y += 12;
    }

    const soapSections = [
      { label: "S — SUBJECTIVE COMPLAINTS & HISTORY:", text: subj, color: [248, 250, 252] },
      { label: "O — OBJECTIVE CLINICAL EXAMINATION & ROM:", text: obj, color: [255, 255, 255] },
      { label: "A — CLINICAL ASSESSMENT & DIAGNOSIS:", text: assess || params.diagnosis || "", color: [248, 250, 252] },
      { label: "P — PLAN OF CARE & MODALITIES:", text: plan || params.modalitiesAdministered || "", color: [255, 255, 255] },
    ];

    soapSections.forEach((sec) => {
      if (!sec.text) return;

      if (y > pageHeight - 80) {
        doc.addPage();
        y = 40;
      }

      const textLines = doc.splitTextToSize(sec.text, pageWidth - 90);
      const secHeight = textLines.length * 11 + 22;

      doc.setFillColor(sec.color[0], sec.color[1], sec.color[2]);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(30, y, pageWidth - 60, secHeight, 4, 4, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(6, 46, 54);
      doc.text(sec.label, 40, y + 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(textLines, 40, y + 26);

      y += secHeight + 8;
    });
  } else if (!verbatimText) {
    // Standard Notes rendering (only if no verbatim was printed)
    const notesParts: string[] = [];
    if (params.diagnosis) notesParts.push(`Diagnosis: ${params.diagnosis}`);
    if (rawNotes) notesParts.push(rawNotes);
    if (params.modalitiesAdministered) notesParts.push(`Modalities Administered: ${params.modalitiesAdministered}`);
    if (params.generalNotes) notesParts.push(`Therapist Guidance: ${params.generalNotes}`);

    const bodyText = notesParts.join("\n\n") || "Patient underwent clinical evaluation and comprehensive physiotherapy assessment.";
    const lines = doc.splitTextToSize(bodyText, pageWidth - 80);
    const boxHeight = lines.length * 12 + 16;

    if (y + boxHeight > pageHeight - 80) {
      doc.addPage();
      y = 40;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(225, 230, 230);
    doc.roundedRect(30, y, pageWidth - 60, boxHeight, 4, 4, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(40, 45, 50);
    doc.text(lines, 42, y + 14);
    y += boxHeight + 14;
  }

  // 5. Precautions & Identified Clinical Safety Alerts (if any)
  const alerts = params.providerAlerts || [];
  const precautions = params.precautionsAndRestrictions || "";

  if (precautions || alerts.length > 0) {
    if (y > pageHeight - 90) {
      doc.addPage();
      y = 40;
    }

    doc.setFillColor(254, 242, 242); // Soft Rose/Red
    doc.setDrawColor(254, 202, 202);

    const alertLines: string[] = [];
    if (precautions) alertLines.push(`Precautions: ${precautions}`);
    alerts.forEach((alt) => alertLines.push(`• ${alt}`));

    const alertTextSplit = doc.splitTextToSize(alertLines.join("\n"), pageWidth - 90);
    const alertBoxHeight = alertTextSplit.length * 11 + 22;

    doc.roundedRect(30, y, pageWidth - 60, alertBoxHeight, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("IDENTIFIED SAFETY ALERTS & PRECAUTIONS:", 40, y + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(153, 27, 27);
    doc.text(alertTextSplit, 40, y + 25);

    y += alertBoxHeight + 14;
  }

  // 6. Prescribed Exercises & Regimen Table (ONLY IF PRESCRIBED!)
  if (hasExercises) {
    if (y > pageHeight - 140) {
      doc.addPage();
      y = 40;
    }

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

    y += 8;
  }

  // 7. Review Target & Digital Verification
  if (y > pageHeight - 90) {
    doc.addPage();
    y = 40;
  }
  y += 10;

  doc.setFillColor(249, 171, 85); // Honey Gold
  doc.roundedRect(30, y, pageWidth - 60, 32, 6, 6, "F");
  doc.setTextColor(6, 46, 54);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  if (hasExercises) {
    doc.text("TARGET REVIEW RE-ASSESSMENT:", 42, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Follow the prescribed ${duration}-day routine daily. Attending: ${params.therapistName || "Dr. Kinnera"}.`,
      225,
      y + 20
    );
  } else {
    doc.text("ATTENDING PHYSIOTHERAPIST:", 42, y + 20);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Clinical evaluation recorded by ${params.therapistName || "Dr. Kinnera"}. Next review as scheduled.`,
      210,
      y + 20
    );
  }

  // Footer
  doc.setTextColor(140, 150, 155);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text(
    "Transcribed & Digitally Certified via GaitPhysio EMR Hub • Gait Physio Clinic, Whitefield, Bengaluru",
    35,
    pageHeight - 22
  );

  return doc;
}

export interface UnifiedInvoiceParams {
  invoiceNumber: string;
  patientName: string;
  patientId?: string;
  patientEmail?: string;
  patientPhone?: string;
  clinicAddress?: string;
  clinicPhone?: string;
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
  replacesInvoiceNumber?: string;
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
  const bannerHeight = 78;
  doc.setFillColor(brandForest[0], brandForest[1], brandForest[2]);
  doc.roundedRect(30, y, pageWidth - 60, bannerHeight, 8, 8, "F");

  // Official Clinic Logo Emblem
  try {
    doc.addImage(CLINIC_BRAND.logoBase64, "PNG", 42, y + 11, 56, 56);
  } catch (e) {
    console.warn("Could not render logo in invoice PDF:", e);
  }

  // Left - Line 1: Clinic Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(CLINIC_BRAND.nameUpper, 108, y + 24);

  // Left - Line 2: Core 3 Services Tagline (Title Case, Honey Gold)
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
  doc.text(CLINIC_BRAND.servicesTagline, 108, y + 38);

  // Left - Line 3: Clinic Location & Contact (Right below the 3 services - concise SSOT branding)
  const addressText = CLINIC_BRAND.addressLine;
  const phoneText = CLINIC_BRAND.phone;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(215, 228, 232);
  doc.text(`${addressText} • Tel: ${phoneText}`, 108, y + 53);

  // Top-Right: Clean Invoice Reference (Without # and without secondary label)
  const cleanInv = (params.invoiceNumber || "GPC-INV-001").replace(/^#+/, "");
  const cleanReplaces = (params.replacesInvoiceNumber || "").replace(/^#+/, "");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  if (cleanReplaces) {
    doc.text(`INVOICE: ${cleanInv}`, pageWidth - 45, y + 26, { align: "right" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(brandGold[0], brandGold[1], brandGold[2]);
    doc.text(`Replaces: ${cleanReplaces}`, pageWidth - 45, y + 40, { align: "right" });
  } else {
    doc.text(`INVOICE: ${cleanInv}`, pageWidth - 45, y + 33, { align: "right" });
  }

  y += bannerHeight + 14;

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

  // Left: Clinical Notes / Diagnoses & Replacement Notice
  const notesText = [
    params.notes?.trim(),
    params.replacesInvoiceNumber ? `Notice: Replaces cancelled bill ${(params.replacesInvoiceNumber).replace(/^#+/, "")}.` : ""
  ].filter(Boolean).join("\n\n");

  if (notesText) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, summaryBoxY, 260, 75, 6, 6, "FD");

    doc.setFontSize(7.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.setFont("helvetica", "bold");
    doc.text("CLINICAL NOTES & DETAILS:", 40, summaryBoxY + 16);

    doc.setFontSize(8);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(notesText, 240);
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
    `This is an official computer-generated invoice for Gait Physio Clinic. Please quote ${(params.invoiceNumber || "GPC-INV-001").replace(/^#+/, "")} for insurance claims & tax filing.`,
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  return doc;
}
