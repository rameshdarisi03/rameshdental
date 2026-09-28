import crypto from "crypto";
import QRCode from "qrcode";

/**
 * RFC 4648 Base32 Alphabet
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Decodes a Base32 string to Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.replace(/[\s=-]/g, "").toUpperCase();
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) {
      throw new Error(`Invalid Base32 character encountered: ${clean[i]}`);
    }
    bits += val.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Encodes a Buffer to Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }
  let base32 = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    base32 += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return base32;
}

/**
 * Generates a cryptographically secure Base32 secret for TOTP (20 bytes = 160-bit key)
 */
export function generateTOTPSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Formats a secret key into chunks of 4 characters for easy manual entry
 * e.g. "JBSW Y3DP EHPK 3PXP"
 */
export function formatSecretForDisplay(secret: string): string {
  const clean = secret.replace(/[\s=-]/g, "").toUpperCase();
  const chunks = clean.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : clean;
}

/**
 * Builds the standard otpauth:// URI recognized by Google Authenticator,
 * Microsoft Authenticator, 1Password, and Apple Passwords.
 */
export function getOtpAuthUrl(
  email: string,
  secret: string,
  issuer: string = "Gait Physio Clinic"
): string {
  const cleanSecret = secret.replace(/[\s=-]/g, "").toUpperCase();
  const encodedIssuer = encodeURIComponent(issuer);
  const label = `${encodedIssuer}:${encodeURIComponent(email.trim().toLowerCase())}`;
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a high-contrast, high-resolution QR Code Data URL (PNG base64)
 * from an otpauth:// URI for scanning with camera apps.
 */
export async function generateQRCodeDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 280,
    margin: 2,
    color: {
      dark: "#062e36", // Clinic deep teal
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates the current 6-digit TOTP code for a given secret at a specific time-step offset.
 */
export function generateTOTP(secretBase32: string, timeStepOffset: number = 0): string {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / 30) + timeStepOffset;

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac("sha1", key).update(timeBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * Verifies a 6-digit TOTP code against a secret key with configurable drift tolerance.
 * Window = 1 allows 30 seconds before and 30 seconds after (tolerates slight clock drift).
 */
export function verifyTOTP(
  token: string,
  secretBase32: string,
  window: number = 1
): boolean {
  if (!token || !secretBase32) return false;
  const cleanToken = token.replace(/[\s-]/g, "").trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false;
  }

  for (let offset = -window; offset <= window; offset++) {
    try {
      const expectedCode = generateTOTP(secretBase32, offset);
      if (expectedCode === cleanToken) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
