export const CLINIC_PRIMARY_WHATSAPP = "918904456243";
export const CLINIC_PRIMARY_DIAL = "+918971462949";

/**
 * Sanitizes phone numbers for WhatsApp wa.me links.
 * Handles:
 * - Single 10-digit numbers: '8904456243' -> '918904456243'
 * - Single 12-digit with 91: '+91 8904456243' or '918904456243' -> '918904456243' (avoids double 91)
 * - 11-digit numbers with leading 0: '08904456243' -> '918904456243'
 * - Multiple numbers in one string (e.g. '+91 8904456243 / +91 8971462949' or '8904456243, 8971462949')
 *   -> Extracts the primary (first) number and cleans it to '918904456243'.
 * - Fallback default: '918904456243'
 */
export function getCleanWhatsAppNumber(rawPhone?: string | null, fallbackToClinic: boolean = true): string {
  if (!rawPhone || !rawPhone.trim()) {
    return fallbackToClinic ? CLINIC_PRIMARY_WHATSAPP : "";
  }

  // 1. If string contains multiple numbers separated by slash, comma, semicolon, pipe, 'or', 'and':
  // Split and take the first token as the primary number.
  const segments = rawPhone.split(/[\/,;|\\&]|\s+(?:or|and)\s+/i);
  let firstSegment = (segments[0] || "").trim();

  // 2. Extract digits from the first segment
  let digits = firstSegment.replace(/\D/g, "");

  // If first segment had no digits, search through remaining segments
  if (!digits) {
    for (let i = 1; i < segments.length; i++) {
      const segDigits = segments[i].replace(/\D/g, "");
      if (segDigits) {
        digits = segDigits;
        break;
      }
    }
  }

  // 3. Fallback if no digits found anywhere
  if (!digits) {
    return fallbackToClinic ? CLINIC_PRIMARY_WHATSAPP : "";
  }

  // 4. Safety: If the input already contains the clinic's primary number '8904456243', ensure exact match
  if (digits.includes("8904456243")) {
    return CLINIC_PRIMARY_WHATSAPP;
  }

  // 5. If more than 15 digits (violating E.164 max length from accidentally concatenated numbers):
  if (digits.length > 15) {
    if (digits.startsWith("91") && digits.length >= 22) {
      digits = digits.slice(0, 12);
    } else if (digits.length >= 20) {
      digits = digits.slice(0, 10);
    } else {
      digits = digits.slice(0, 15);
    }
  }

  // 6. Formatting by length:
  // If already starts with 91 and has 12 digits (Indian mobile)
  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }

  // If starts with 0 and has 11 digits (e.g. 08904456243), strip 0 and prepend 91
  if (digits.startsWith("0") && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }

  // If standard 10 digit Indian number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // If between 11 and 15 digits (international with country code)
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  // Default fallback
  return digits.length > 0 ? `91${digits}` : (fallbackToClinic ? CLINIC_PRIMARY_WHATSAPP : "");
}

/**
 * Sanitizes phone numbers for tel: links (e.g. tel:+918904456243).
 * Extracts the first primary phone number and formats as RFC 3966 (+ followed by digits).
 */
export function getPrimaryDialNumber(rawPhone?: string | null, fallbackToClinic: boolean = true): string {
  if (!rawPhone || !rawPhone.trim()) {
    return fallbackToClinic ? CLINIC_PRIMARY_DIAL : "";
  }

  // Split on delimiters (/, ,, ;, |, or, and)
  const segments = rawPhone.split(/[\/,;|\\&]|\s+(?:or|and)\s+/i);
  let firstSegment = (segments[0] || "").trim();
  let digits = firstSegment.replace(/\D/g, "");

  if (!digits) {
    for (let i = 1; i < segments.length; i++) {
      const segDigits = segments[i].replace(/\D/g, "");
      if (segDigits) {
        digits = segDigits;
        break;
      }
    }
  }

  if (!digits) {
    return fallbackToClinic ? CLINIC_PRIMARY_DIAL : "";
  }

  if (digits.includes("8904456243")) {
    return CLINIC_PRIMARY_DIAL;
  }

  if (digits.length > 15) {
    if (digits.startsWith("91") && digits.length >= 22) {
      digits = digits.slice(0, 12);
    } else if (digits.length >= 20) {
      digits = digits.slice(0, 10);
    }
  }

  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `+91${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
}

/**
 * Parses multiple phone numbers from a combined string (e.g. '+91 8904456243 / +91 8971462949')
 */
export function splitPhoneNumbers(rawPhone?: string | null): Array<{ display: string; dial: string; whatsapp: string }> {
  if (!rawPhone || !rawPhone.trim()) {
    return [
      {
        display: "+91 89044 56243",
        dial: CLINIC_PRIMARY_DIAL,
        whatsapp: CLINIC_PRIMARY_WHATSAPP,
      },
    ];
  }

  const segments = rawPhone
    .split(/[\/,;|\\&]|\s+(?:or|and)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\D/g, "").length >= 7);

  if (segments.length === 0) {
    return [
      {
        display: rawPhone.trim() || "+91 89044 56243",
        dial: getPrimaryDialNumber(rawPhone),
        whatsapp: getCleanWhatsAppNumber(rawPhone),
      },
    ];
  }

  return segments.map((seg) => ({
    display: seg,
    dial: getPrimaryDialNumber(seg, false),
    whatsapp: getCleanWhatsAppNumber(seg, false),
  }));
}

/**
 * Sanitizes real-time user phone input:
 * - Strips any non-digit character (only 0-9 allowed)
 * - Restricts length: strictly 10 digits for India (+91), max 15 digits for international codes
 */
export function sanitizePhoneInput(val: string, dialCode: string = "+91"): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "");
  const isIndia = dialCode.trim() === "+91" || dialCode.trim() === "91";
  const maxLength = isIndia ? 10 : 15;
  return digits.slice(0, maxLength);
}

/**
 * Validates a mobile number according to dial code rules.
 */
export function validatePhoneNumber(phone: string, dialCode: string = "+91"): { isValid: boolean; error?: string } {
  const digits = (phone || "").replace(/\D/g, "");
  const isIndia = dialCode.trim() === "+91" || dialCode.trim() === "91";

  if (!digits) {
    return { isValid: false, error: "Phone number is required." };
  }

  if (isIndia) {
    if (digits.length !== 10) {
      return { isValid: false, error: `Indian mobile number must be exactly 10 digits (currently ${digits.length}).` };
    }
    if (!/^[6-9]/.test(digits)) {
      return { isValid: false, error: "Indian mobile numbers must begin with 6, 7, 8, or 9." };
    }
  } else {
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, error: "International phone number must be between 7 and 15 digits." };
    }
  }

  return { isValid: true };
}
