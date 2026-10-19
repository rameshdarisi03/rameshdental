import { NextResponse } from "next/server";
import {
  getPatientEmailOtpRest,
  deletePatientEmailOtpRest,
  updatePatientEmailOtpAttemptsRest,
  getFirebaseAuthUserByEmail,
  updateUserPassword,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, newPassword } = body;

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 10) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 10 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim().replace(/\s+/g, "");

    // 1. Verify OTP record exists
    const record = await getPatientEmailOtpRest(cleanEmail);
    if (!record || !record.otp) {
      return NextResponse.json(
        { success: false, error: "Reset verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      await deletePatientEmailOtpRest(cleanEmail);
      return NextResponse.json(
        { success: false, error: "Reset verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Check attempt lockout (max 5 failed attempts)
    const attempts = Number(record.attempts || 0);
    if (attempts >= 5) {
      await deletePatientEmailOtpRest(cleanEmail);
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. This code has been invalidated for security. Please request a fresh code.",
        },
        { status: 429 }
      );
    }

    // Compare OTP
    if (record.otp !== cleanOtp) {
      await updatePatientEmailOtpAttemptsRest(cleanEmail, attempts + 1);
      const remaining = 5 - (attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: remaining > 0
            ? `Invalid verification code. ${remaining} attempt(s) remaining.`
            : "Too many failed attempts. This code has been invalidated for security. Please request a fresh code.",
        },
        { status: 400 }
      );
    }

    // 2. Locate Firebase Auth user
    const authUser = await getFirebaseAuthUserByEmail(cleanEmail);
    if (!authUser || !authUser.uid) {
      return NextResponse.json(
        {
          success: false,
          error: "Account not found. Please contact clinic reception or sign up first.",
        },
        { status: 404 }
      );
    }

    // 3. Update Password in Firebase Auth via Identity Toolkit REST
    await updateUserPassword(authUser.uid, newPassword);

    // 4. Delete used OTP
    await deletePatientEmailOtpRest(cleanEmail);

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password.",
    });
  } catch (err: any) {
    console.error("[API Email Reset Password Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update password." },
      { status: 500 }
    );
  }
}
