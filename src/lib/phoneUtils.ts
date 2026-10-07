/**
 * Sanitizes phone numbers for WhatsApp wa.me links.
 * Handles:
 * - 10-digit numbers: '8904456243' -> '918904456243'
 * - Already 12-digit with 91: '+91 8904456243' or '918904456243' -> '918904456243' (avoids double 91)
 * - 11-digit numbers with leading 0: '08904456243' -> '918904456243'
 * - Fallback default: '918904456243'
 */
export function getCleanWhatsAppNumber(rawPhone?: string | null, fallbackToClinic: boolean = true): string {
  if (!rawPhone) return fallbackToClinic ? "918904456243" : "";
  
  const digits = rawPhone.replace(/\D/g, "");
  
  // If empty after stripping non-digits
  if (!digits) return fallbackToClinic ? "918904456243" : "";

  // If already starts with 91 and has 12 digits, return it directly
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

  // If longer than 10 digits and already has country code
  if (digits.length > 10) {
    return digits;
  }

  // Default fallback
  return `91${digits}`;
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
