import { NextRequest, NextResponse } from "next/server";
import { verifyTOTP } from "@/lib/totp";
import {
  getStaffUserByEmail,
  updateUserPassword,
  recordPasswordResetAudit,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, totpCode, newPassword } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email address is required." },
        { status: 400 }
      );
    }

    if (!totpCode || typeof totpCode !== "string") {
      return NextResponse.json(
        { success: false, error: "6-digit Authenticator code is required." },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const emailClean = email.trim().toLowerCase();

    // 1. Locate staff record in Firestore via REST API
    const user = await getStaffUserByEmail(emailClean);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff account not found. Please verify your email or contact the Clinic Admin.",
        },
        { status: 404 }
      );
    }

    // 2. Verify Authenticator Secret exists
    if (!user.totpSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Google Authenticator is not yet set up for this account. Please ask the Clinic Admin (Dr. Madem Kinnera) to reset your password or configure your Authenticator QR code from the staff panel.",
          notConfigured: true,
        },
        { status: 400 }
      );
    }

    // 3. Verify TOTP 6-digit code (checks +/- 30s window)
    const cleanToken = totpCode.trim().replace(/\s+/g, "");
    const cleanSecret = user.totpSecret.trim().replace(/\s+/g, "");

    const isCodeValid = verifyTOTP(cleanToken, cleanSecret, 1);
    if (!isCodeValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired 6-digit code. Please check Google / Microsoft Authenticator on your phone and try again.",
        },
        { status: 401 }
      );
    }

    // 4. Update Password in Firebase Auth via Identity Toolkit REST
    await updateUserPassword(user.uid, newPassword);

    // 5. Update Audit Trail & user document in Firestore asynchronously via REST
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    await recordPasswordResetAudit(user.uid, emailClean, ip, userAgent);

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err: any) {
    console.error("[API forgot-password error]:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to reset password. Please try again or contact the clinic admin.",
      },
      { status: 500 }
    );
  }
}
