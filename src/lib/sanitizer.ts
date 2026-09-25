/**
 * Security & Input Sanitization Engine for Gait Physio Clinic
 * Compliant with OWASP Top 10 Application Security Standards.
 * Defends against XSS, NoSQL/Firestore Injection, HTML tag exploits, and malformed telecom inputs.
 */

// 1. Mobile Phone Sanitizer & Validator (Indian Standard)
export function sanitizePhone(input: string | undefined | null): string {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  
  // Remove leading zeros (e.g., "09206651295" -> "9206651295")
  digits = digits.replace(/^0+/, "");
  
  // Strip country code if prefixed with 91 (e.g. 919206651295 -> 9206651295)
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }
  
  // Cap at 10 digits
  return digits.slice(0, 10);
}

export function isValidIndianPhone(phone: string): boolean {
  const clean = sanitizePhone(phone);
  // Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(clean);
}

export function formatIndianPhoneDisplay(phone: string): string {
  const clean = sanitizePhone(phone);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean ? `+91 ${clean}` : "";
}

// 2. Patient & Staff Name Sanitizer
export function sanitizeName(input: string | undefined | null): string {
  if (!input) return "";
  
  // Strip dangerous script/HTML chars, brackets, quotes, and punctuation symbols
  let cleaned = String(input)
    .replace(/[<>{}[\]\\\/;:"`~=^$*+?|@!#%&_0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // Convert to Title Case (e.g., "ramesh kumar" -> "Ramesh Kumar")
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// 3. Clinical & Free Text Sanitizer (SOAP notes, diagnoses, descriptions)
export function sanitizeText(input: string | undefined | null, maxLength = 5000): string {
  if (!input) return "";
  
  let cleaned = String(input)
    // Strip HTML tags
    .replace(/<[^>]*>?/gm, "")
    // Strip javascript: pseudo-protocols
    .replace(/javascript\s*:/gi, "")
    // Strip data: pseudo-protocols
    .replace(/data\s*:\s*text\/html/gi, "")
    // Strip null bytes and control chars
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize newlines
    .replace(/\r\n/g, "\n");

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned.trim();
}

// 4. Email Address Sanitizer & Validator
export function sanitizeEmail(input: string | undefined | null): string {
  if (!input) return "";
  const cleaned = String(input)
    .toLowerCase()
    .replace(/[<>{}[\]\\\/;:"`~=^$*+?|!#%&'\s]/g, "")
    .trim();
  return cleaned;
}

export function isValidEmail(email: string): boolean {
  const clean = sanitizeEmail(email);
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(clean);
}

// 5. Numerical & Currency Amount Sanitizer
export function sanitizeAmount(input: any): number {
  if (typeof input === "number") {
    return isNaN(input) || !isFinite(input) ? 0 : Math.max(0, input);
  }
  if (!input) return 0;
  
  const str = String(input).replace(/[^0-9.]/g, "");
  const num = parseFloat(str);
  return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
}

// 6. Generic Object Sanitizer for Firestore Payloads
export function sanitizePatientPayload<T extends Record<string, any>>(payload: T): T {
  const sanitized: Record<string, any> = { ...payload };
  
  if ("name" in sanitized && typeof sanitized.name === "string") {
    sanitized.name = sanitizeName(sanitized.name);
  }
  if ("phone" in sanitized && typeof sanitized.phone === "string") {
    sanitized.phone = sanitizePhone(sanitized.phone);
  }
  if ("email" in sanitized && typeof sanitized.email === "string") {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  if ("treatmentPlan" in sanitized && typeof sanitized.treatmentPlan === "string") {
    sanitized.treatmentPlan = sanitizeText(sanitized.treatmentPlan, 1000);
  }
  if ("medicalHistory" in sanitized && typeof sanitized.medicalHistory === "string") {
    sanitized.medicalHistory = sanitizeText(sanitized.medicalHistory, 2000);
  }
  if ("notes" in sanitized && typeof sanitized.notes === "string") {
    sanitized.notes = sanitizeText(sanitized.notes, 3000);
  }
  if ("reminders" in sanitized && Array.isArray(sanitized.reminders)) {
    sanitized.reminders = sanitized.reminders.map(r => sanitizeText(r, 200)).filter(Boolean);
  }
  if ("joinedDate" in sanitized && typeof sanitized.joinedDate === "string") {
    sanitized.joinedDate = sanitizeText(sanitized.joinedDate, 50);
  }

  return sanitized as T;
}
