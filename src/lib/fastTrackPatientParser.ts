/**
 * Gait Physio Clinic FastTrack Patient Parser
 * Highly optimized heuristic & pattern parser for clinic spreadsheets, CSVs, TSVs, WhatsApp lists, and clipboard paste.
 */

import Papa from "papaparse";

export interface FastTrackPatientRow {
  id: string;
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  treatmentPlan: string;
  therapistName: string;
  status: "active" | "completed" | "pending";
  upcoming?: string;
  isValid: boolean;
  warnings: string[];
  rawSource?: string;
}

export interface FastTrackPatientParseResult {
  success: boolean;
  source: "FAST_HEURISTIC" | "AI_VISION" | "MANUAL";
  rows: FastTrackPatientRow[];
  totalDetected: number;
  validCount: number;
  warningCount: number;
  confidenceScore: number; // 0 to 100
}

/**
 * Normalizes Indian Phone Number to standard "+91 9876543210" or "9876543210"
 */
export function normalizeIndianPhoneNumber(rawPhone: string | number | undefined): string {
  if (!rawPhone) return "";
  const str = String(rawPhone).trim();
  const digitsOnly = str.replace(/\D/g, "");

  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return `+91 ${digitsOnly}`;
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("0") && /^[6-9]/.test(digitsOnly.slice(1))) {
    return `+91 ${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91") && /^[6-9]/.test(digitsOnly.slice(2))) {
    return `+91 ${digitsOnly.slice(2)}`;
  }
  if (digitsOnly.length > 10 && /^[6-9]/.test(digitsOnly.slice(-10))) {
    return `+91 ${digitsOnly.slice(-10)}`;
  }
  return digitsOnly ? `+91 ${digitsOnly.slice(0, 10)}` : "";
}

/**
 * Converts "rahul sharma" -> "Rahul Sharma"
 */
export function formatProperCaseName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Normalizes age string to a numeric string (1-120)
 */
export function extractAgeNumber(rawAge: string | number | undefined): string {
  if (rawAge === undefined || rawAge === null) return "";
  const str = String(rawAge).trim();
  const match = str.match(/\b([1-9][0-9]?|1[01][0-9]|120)\b/);
  return match ? match[1] : "";
}

/**
 * Detects gender from text
 */
export function detectGender(rawGender: string | undefined): "Male" | "Female" | "Other" {
  if (!rawGender) return "Male";
  const g = rawGender.trim().toLowerCase();
  if (g.startsWith("f") || g === "woman" || g === "girl") return "Female";
  if (g.startsWith("m") || g === "man" || g === "boy") return "Male";
  if (g.startsWith("o") || g === "non-binary") return "Other";
  return "Male";
}

/**
 * Detects patient status
 */
export function detectStatus(rawStatus: string | undefined): "active" | "completed" | "pending" {
  if (!rawStatus) return "active";
  const s = rawStatus.trim().toLowerCase();
  if (s.includes("complete") || s.includes("discharged") || s.includes("done")) return "completed";
  if (s.includes("pend") || s.includes("new") || s.includes("inquir")) return "pending";
  return "active";
}

export const SAMPLE_PATIENT_CSV = `Patient Name,Age,Gender,Phone,Email,Chief Complaint / Treatment Plan,Assigned Therapist,Status
Rahul Sharma,34,Male,9876543210,rahul.s@example.com,Cervical Spondylosis & Posture Rehab,Dr. Kinnera,Active
Ananya Deshmukh,29,Female,9811223344,ananya.d@example.com,Post-op ACL Knee Rehabilitation,Dr. Sarah Jenkins,Active
Suresh Reddy,45,Male,9922334455,suresh.r@example.com,Frozen Shoulder (Adhesive Capsulitis),Dr. Rohan Das,Active
Priya Verma,38,Female,9833445566,priya.v@example.com,Lower Back Lumbar Strain,Dr. Kinnera,Active
Vikram Malhotra,52,Male,9744556677,,Total Knee Replacement Mobility Protocol,Dr. Sarah Jenkins,Active
Kiran Patel,24,Male,9855667788,kiran.p@example.com,Hamstring Pull & Sports Injury Rehab,Dr. Rohan Das,Pending
Meera Iyer,61,Female,9866778899,,Cervical Radiculopathy & Neck Traction,Dr. Kinnera,Completed`;

/**
 * Parses raw text, CSV, TSV, or spreadsheet clipboard data
 */
export function parsePatientSpreadsheetText(
  rawText: string,
  enrolledTherapists: string[] = ["Dr. Kinnera", "Dr. Sarah Jenkins", "Dr. Rohan Das"]
): FastTrackPatientParseResult {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      source: "FAST_HEURISTIC",
      rows: [],
      totalDetected: 0,
      validCount: 0,
      warningCount: 0,
      confidenceScore: 0
    };
  }

  const defaultTherapist = enrolledTherapists[0] || "Dr. Kinnera";

  // Use PapaParse to handle tricky quotes, commas, and tabs
  const parsed = Papa.parse<string[]>(rawText.trim(), {
    skipEmptyLines: "greedy",
    delimiter: "", // Auto-detect comma, tab, semicolon, pipe
  });

  const rawRows: string[][] = parsed.data || [];
  if (rawRows.length === 0) {
    return {
      success: false,
      source: "FAST_HEURISTIC",
      rows: [],
      totalDetected: 0,
      validCount: 0,
      warningCount: 0,
      confidenceScore: 0
    };
  }

  // Determine if row 0 is a header
  let startIndex = 0;
  const firstRow = rawRows[0].map((c) => String(c || "").toLowerCase().trim());
  const isHeaderRow = firstRow.some((c) =>
    c.includes("name") ||
    c.includes("patient") ||
    c.includes("phone") ||
    c.includes("mobile") ||
    c.includes("age") ||
    c.includes("gender") ||
    c.includes("complaint") ||
    c.includes("treatment") ||
    c.includes("therapist") ||
    c.includes("status")
  );

  let colMap = {
    name: -1,
    age: -1,
    gender: -1,
    phone: -1,
    email: -1,
    treatmentPlan: -1,
    therapist: -1,
    status: -1,
  };

  if (isHeaderRow) {
    startIndex = 1;
    firstRow.forEach((h, idx) => {
      if (colMap.name === -1 && (h.includes("name") || h.includes("patient"))) colMap.name = idx;
      else if (colMap.age === -1 && h.includes("age")) colMap.age = idx;
      else if (colMap.gender === -1 && (h.includes("gender") || h.includes("sex"))) colMap.gender = idx;
      else if (colMap.phone === -1 && (h.includes("phone") || h.includes("mobile") || h.includes("contact") || h.includes("tel"))) colMap.phone = idx;
      else if (colMap.email === -1 && (h.includes("email") || h.includes("mail"))) colMap.email = idx;
      else if (colMap.treatmentPlan === -1 && (h.includes("complaint") || h.includes("treatment") || h.includes("plan") || h.includes("condition") || h.includes("diagnosis"))) colMap.treatmentPlan = idx;
      else if (colMap.therapist === -1 && (h.includes("therapist") || h.includes("doctor") || h.includes("dr"))) colMap.therapist = idx;
      else if (colMap.status === -1 && h.includes("status")) colMap.status = idx;
    });
  }

  const parsedRows: FastTrackPatientRow[] = [];

  for (let i = startIndex; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || row.every((c) => !c || !String(c).trim())) {
      continue;
    }

    let name = "";
    let age = "";
    let gender: "Male" | "Female" | "Other" = "Male";
    let phone = "";
    let email = "";
    let treatmentPlan = "General Physiotherapy Consultation";
    let therapistName = defaultTherapist;
    let status: "active" | "completed" | "pending" = "active";
    const warnings: string[] = [];

    if (isHeaderRow && (colMap.name !== -1 || colMap.phone !== -1)) {
      if (colMap.name !== -1 && row[colMap.name]) name = formatProperCaseName(row[colMap.name]);
      if (colMap.age !== -1 && row[colMap.age]) age = extractAgeNumber(row[colMap.age]);
      if (colMap.gender !== -1 && row[colMap.gender]) gender = detectGender(row[colMap.gender]);
      if (colMap.phone !== -1 && row[colMap.phone]) phone = normalizeIndianPhoneNumber(row[colMap.phone]);
      if (colMap.email !== -1 && row[colMap.email]) email = String(row[colMap.email]).trim().toLowerCase();
      if (colMap.treatmentPlan !== -1 && row[colMap.treatmentPlan]) treatmentPlan = String(row[colMap.treatmentPlan]).trim();
      if (colMap.therapist !== -1 && row[colMap.therapist]) {
        const rawT = String(row[colMap.therapist]).trim();
        const matched = enrolledTherapists.find((t) => t.toLowerCase().includes(rawT.toLowerCase()) || rawT.toLowerCase().includes(t.toLowerCase()));
        therapistName = matched || rawT || defaultTherapist;
      }
      if (colMap.status !== -1 && row[colMap.status]) status = detectStatus(row[colMap.status]);
    } else {
      // Positional heuristic fallback: [Name, Age, Gender, Phone, Email, Plan, Therapist, Status]
      const cleanCells = row.map((c) => String(c || "").trim()).filter(Boolean);
      
      cleanCells.forEach((cell, cellIdx) => {
        const lower = cell.toLowerCase();
        
        // Check for phone
        if (!phone && (cell.replace(/\D/g, "").length >= 10 || cell.startsWith("+91") || cell.startsWith("91"))) {
          phone = normalizeIndianPhoneNumber(cell);
          return;
        }

        // Check for email
        if (!email && cell.includes("@") && cell.includes(".")) {
          email = cell.toLowerCase();
          return;
        }

        // Check for gender
        if (cellIdx > 0 && (lower === "male" || lower === "female" || lower === "other" || lower === "m" || lower === "f")) {
          gender = detectGender(cell);
          return;
        }

        // Check for age
        if (!age && /^\d{1,3}$/.test(cell)) {
          const num = parseInt(cell, 10);
          if (num > 0 && num <= 120) {
            age = String(num);
            return;
          }
        }

        // Check for therapist
        const matchedT = enrolledTherapists.find((t) => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase()));
        if (matchedT) {
          therapistName = matchedT;
          return;
        }

        // First non-numeric is usually name
        if (!name && !/^\d+$/.test(cell) && cell.length > 2) {
          name = formatProperCaseName(cell);
          return;
        }

        // Otherwise treatment plan
        if (name && cell.length > 3 && !treatmentPlan.includes(cell)) {
          if (treatmentPlan === "General Physiotherapy Consultation") {
            treatmentPlan = cell;
          } else {
            treatmentPlan += ` - ${cell}`;
          }
        }
      });
    }

    // Default age if missing
    if (!age) {
      age = "35";
      warnings.push("Age was not detected (defaulted to 35)");
    }

    // Validation
    if (!name) {
      warnings.push("Patient name is missing");
    }

    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone || digitsOnly.length < 10) {
      warnings.push("Phone number is missing or invalid");
    }

    const isValid = !!name && !!phone && digitsOnly.length >= 10;

    parsedRows.push({
      id: `fasttrack-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || `Patient #${i}`,
      age: age || "35",
      gender,
      phone: phone || "+91 ",
      email,
      treatmentPlan: treatmentPlan || "General Physiotherapy Consultation",
      therapistName,
      status,
      isValid,
      warnings,
      rawSource: row.join(" | ")
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const warningCount = parsedRows.filter((r) => r.warnings.length > 0).length;
  const confidenceScore = parsedRows.length > 0 ? Math.round((validCount / parsedRows.length) * 100) : 0;

  return {
    success: parsedRows.length > 0,
    source: "FAST_HEURISTIC",
    rows: parsedRows,
    totalDetected: parsedRows.length,
    validCount,
    warningCount,
    confidenceScore
  };
}
