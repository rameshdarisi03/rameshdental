import { NextResponse } from "next/server";
import {
  getPatientEmailOtpRest,
  updatePatientEmailOtpAttemptsRest,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, purpose } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and 6-digit OTP are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim().replace(/\s+/g, "");

    // 1. Fetch OTP record from Firestore
    const record = await getPatientEmailOtpRest(cleanEmail);

    if (!record || !record.otp) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification code has expired or was not requested. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // 2. Check Expiration
    const expiresAt = new Date(record.expiresAt).getTime();
    if (Date.now() > expiresAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // 3. Check Purpose Match
    if (purpose && record.purpose && record.purpose !== purpose) {
      return NextResponse.json(
        { success: false, error: "Invalid verification purpose." },
        { status: 400 }
      );
    }

    // 4. Rate Limiting Attempts
    const attempts = Number(record.attempts || 0);
    if (attempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. Please request a fresh code.",
        },
        { status: 429 }
      );
    }

    // 5. Compare OTP
    if (record.otp !== cleanOtp) {
      await updatePatientEmailOtpAttemptsRest(cleanEmail, attempts + 1);
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect 6-digit code. ${4 - attempts} attempt(s) remaining.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      patientId: record.patientId,
      message: "Verification successful.",
    });
  } catch (err: any) {
    console.error("[API Email OTP Verify Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
