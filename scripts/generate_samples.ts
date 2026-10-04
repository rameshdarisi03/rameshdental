import fs from "fs";
import path from "path";
import { buildUnifiedPrescriptionPdf, buildUnifiedInvoicePdf } from "../src/lib/prescriptionPdf";

const publicSamplesDir = path.join(process.cwd(), "public", "samples");
const artifactDir = "C:\\Users\\rameshdarisi\\.gemini\\antigravity\\brain\\82696a5b-7399-4c0c-bd7b-d252a71ce3aa";

if (!fs.existsSync(publicSamplesDir)) {
  fs.mkdirSync(publicSamplesDir, { recursive: true });
}

// 1. Generate Sample Prescription PDF
const prescriptionDoc = buildUnifiedPrescriptionPdf({
  patientName: "Ramesh Kumar",
  pid: "PID-GPC-1042",
  dateStr: "04-10-2026",
  therapistName: "Dr. Kinnera (PT, MPT Ortho)",
  durationDays: 14,
  consultationSummary: "Patient presents with persistent lumbar stiffness and mild radiating discomfort down the right lower extremity following prolonged desk posture. Palpation reveals mild paraspinal muscle hypertonicity (L4-L5). Neural tension test positive for hamstring tightness. Advised core activation, spinal decompression, and dynamic posture breaks.",
  diagnosis: "Mechanical Low Back Pain & Postural Lumbar Strain",
  modalitiesAdministered: "Targeted Moist Heat Therapy (15 mins), Interferential Therapy - IFT (10 mins), Manual Myofascial Release to Quadratus Lumborum.",
  referringDoctor: "Self-Referral / Direct Consultation",
  hospitalOrClinic: "Gait Physio Clinic, Whitefield",
  precautionsAndRestrictions: "Avoid heavy lumbar flexion lifting (>10kg). Take 5-minute movement breaks every 45 minutes of prolonged sitting.",
  exercises: [
    {
      id: "ex-1",
      exerciseId: "cat-camel",
      name: "Cat-Camel Spinal Mobilization",
      targetArea: "Spine / Lumbar Mobility",
      sets: 3,
      reps: 10,
      frequency: "2 times daily",
      holdTimeSeconds: 5,
      restPeriodSeconds: 30,
      specialInstructions: "Perform smoothly on quadruped hands-and-knees without forcing end-range arching.",
      prescribedAt: "2026-10-04",
      status: "active"
    },
    {
      id: "ex-2",
      exerciseId: "pelvic-bridging",
      name: "Supine Glute Bridges with Core Brace",
      targetArea: "Gluteal & Core Stability",
      sets: 3,
      reps: 12,
      frequency: "Once daily (Morning)",
      holdTimeSeconds: 3,
      restPeriodSeconds: 45,
      specialInstructions: "Engage transverse abdominis before lifting pelvis. Squeeze glutes at peak extension.",
      prescribedAt: "2026-10-04",
      status: "active"
    },
    {
      id: "ex-3",
      exerciseId: "bird-dog",
      name: "Bird-Dog Contralateral Reach",
      targetArea: "Posterior Chain Stability",
      sets: 3,
      reps: 8,
      frequency: "Once daily (Evening)",
      holdTimeSeconds: 5,
      restPeriodSeconds: 30,
      specialInstructions: "Keep lumbar spine neutral. Do not let hips tilt or rotate to the side.",
      prescribedAt: "2026-10-04",
      status: "active"
    }
  ],
  soapNotes: {
    subjective: "Reports dull achy discomfort around L4-L5 region after 3 hours of continuous laptop use. Morning stiffness lasts ~15 minutes.",
    objective: "Active lumbar flexion 70 degrees with end-range tightness. Straight Leg Raise 75 degrees bilaterally without radicular pain.",
    assessment: "Postural lumbar strain with reduced segmental mobility. Prognosis good with consistent home exercise therapy.",
    plan: "Review after 2 weeks of prescribed rehabilitation program. Ergonomic workstation audit recommended."
  }
});

const rxBuffer = Buffer.from(prescriptionDoc.output("arraybuffer"));
const rxPath1 = path.join(publicSamplesDir, "Sample_Consultation_Prescription.pdf");
const rxPath2 = path.join(artifactDir, "Sample_Consultation_Prescription.pdf");
fs.writeFileSync(rxPath1, rxBuffer);
fs.writeFileSync(rxPath2, rxBuffer);
console.log("Prescription PDF created at:", rxPath1);

// 2. Generate Sample Invoice PDF
const invoiceDoc = buildUnifiedInvoicePdf({
  invoiceNumber: "INV-2026-1042",
  patientName: "Ramesh Kumar",
  patientId: "PID-GPC-1042",
  patientEmail: "ramesh.kumar@example.com",
  patientPhone: "+91 89044 56243",
  clinicAddress: "Shop 4, Whitefield Main Road, Near Hopefarm Circle, Bengaluru 560066",
  clinicPhone: "+91 89044 56243",
  therapistName: "Dr. Kinnera (PT)",
  serviceDate: "04 Oct 2026",
  dueDate: "04 Oct 2026",
  status: "paid",
  paymentMethod: "UPI (Google Pay / PhonePe)",
  items: [
    {
      description: "Initial Clinical Assessment & Biomechanical Evaluation",
      quantity: 1,
      unitPrice: 800,
      rate: 800,
      amount: 800
    },
    {
      description: "Targeted Electrotherapy & IFT Modality Session",
      quantity: 1,
      unitPrice: 500,
      rate: 500,
      amount: 500
    },
    {
      description: "Therapeutic Exercise Prescription & Ergonomic Counseling",
      quantity: 1,
      unitPrice: 700,
      rate: 700,
      amount: 700
    }
  ],
  subtotal: 2000,
  taxRate: 0,
  taxAmount: 0,
  discount: 200,
  totalAmount: 1800,
  currency: "INR",
  notes: "Payment received in full via UPI transaction ref #GPC98234710. Next review scheduled for 18 Oct 2026."
});

const invBuffer = Buffer.from(invoiceDoc.output("arraybuffer"));
const invPath1 = path.join(publicSamplesDir, "Sample_Invoice_Receipt.pdf");
const invPath2 = path.join(artifactDir, "Sample_Invoice_Receipt.pdf");
fs.writeFileSync(invPath1, invBuffer);
fs.writeFileSync(invPath2, invBuffer);
console.log("Invoice PDF created at:", invPath1);
