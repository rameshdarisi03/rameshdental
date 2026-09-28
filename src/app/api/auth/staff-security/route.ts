import { NextRequest, NextResponse } from "next/server";
import {
  generateTOTPSecret,
  getOtpAuthUrl,
  generateQRCodeDataUrl,
  formatSecretForDisplay,
  verifyTOTP,
} from "@/lib/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, secret: incomingSecret, token } = body;

    // ------------------------------------------------------------------------
    // ACTION 1: GENERATE / VIEW QR CODE FOR A STAFF MEMBER
    // ------------------------------------------------------------------------
    if (action === "GENERATE_QR") {
      const emailClean = (email || "staff@gaitphysio.com").trim().toLowerCase();
      const secret = incomingSecret || generateTOTPSecret();
      const otpauthUrl = getOtpAuthUrl(emailClean, secret, "Gait Physio Clinic");
      const qrDataUrl = await generateQRCodeDataUrl(otpauthUrl);
      const formattedKey = formatSecretForDisplay(secret);

      return NextResponse.json({
        success: true,
        secret,
        formattedKey,
        otpauthUrl,
        qrDataUrl,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: CONFIRM / TEST CODE AND ACTIVATE TOTP
    // ------------------------------------------------------------------------
    if (action === "CONFIRM_TOTP") {
      const rawSecret = incomingSecret || body.secret || body.totpSecret;
      const cleanSecret = (rawSecret || "").replace(/[\s-]/g, "").toUpperCase();

      if (!cleanSecret || !token) {
        return NextResponse.json(
          { success: false, error: "Secret key and 6-digit code are required." },
          { status: 400 }
        );
      }

      const isValid = verifyTOTP(token, cleanSecret, 1);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid 6-digit code. Please verify the code in your Authenticator app." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Google Authenticator successfully verified!",
      });
    }

    return NextResponse.json(
      { success: false, error: `Action ${action} not supported.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API staff-security error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
