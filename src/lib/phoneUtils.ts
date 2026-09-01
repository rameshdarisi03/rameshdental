/**
 * Sanitizes phone numbers for WhatsApp wa.me links.
 * Handles:
 * - 10-digit numbers: '8904456243' -> '918904456243'
 * - Already 12-digit with 91: '+91 8904456243' or '918904456243' -> '918904456243' (avoids double 91)
 * - 11-digit numbers with leading 0: '08904456243' -> '918904456243'
 * - Fallback default: '919206651295'
 */
export function getCleanWhatsAppNumber(rawPhone?: string | null): string {
  if (!rawPhone) return "919206651295";
  
  const digits = rawPhone.replace(/\D/g, "");
  
  // If empty after stripping non-digits
  if (!digits) return "919206651295";

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
