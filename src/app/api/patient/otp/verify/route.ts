import { NextResponse } from "next/server";
import { 
  getPatientOtpRest, 
  deletePatientOtpRest, 
  updatePatientOtpAttemptsRest, 
  getAllPatientsRest, 
  activatePatientRest, 
  createFirebaseCustomToken 
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Patient Hub - OTP Verification & Authentication Route (Pure REST Admin Engine)
 * Verifies the 6-digit WhatsApp OTP, marks account active if signup,
 * and issues a genuine Firebase Custom Auth Token for seamless client sign-in.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, otp, purpose = "login" } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: "Mobile number and verification code are required." },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    const cleanOtp = otp.toString().trim();

    // 1. Fetch OTP record via pure REST engine
    const otpData = await getPatientOtpRest(cleanDigits);

    if (!otpData || !otpData.otp) {
      return NextResponse.json(
        { success: false, error: "No active verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // 2. Check Expiry
    if (Date.now() > (otpData.expiresAt || 0)) {
      await deletePatientOtpRest(cleanDigits);
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 3. Check Attempts
    const attempts = otpData.attempts || 0;
    if (attempts >= 4) {
      await deletePatientOtpRest(cleanDigits);
      return NextResponse.json(
        { success: false, error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // 4. Verify Code
    if (String(otpData.otp).trim() !== cleanOtp) {
      await updatePatientOtpAttemptsRest(cleanDigits, attempts + 1);
      return NextResponse.json(
        { success: false, error: "Incorrect verification code. Please check your WhatsApp and try again." },
        { status: 400 }
      );
    }

    // Code is valid! Delete it immediately to prevent replay
    await deletePatientOtpRest(cleanDigits);

    // 5. Look up patient profile(s) via pure REST engine
    const allPatients = await getAllPatientsRest();
    const matchedPatients = allPatients.filter((p: any) => {
      const pPhoneDigits = (p.phone || "").replace(/\D/g, "").slice(-10);
      return pPhoneDigits === cleanDigits;
    });

    if (matchedPatients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No patient record found for this mobile number." },
        { status: 404 }
      );
    }

    // 6. Auto-activate any matched patient profile that is not yet activated
    if (purpose === "signup" || purpose === "auth" || !matchedPatients.some((p: any) => p.activated)) {
      await Promise.all(
        matchedPatients.map((p: any) => activatePatientRest(p.id))
      );
    }

    // Choose primary patient for auth session
    const primaryPatient = matchedPatients.find((p: any) => p.isPrimaryAccount || !p.primaryPatientId) || matchedPatients[0];

    // 7. Mint genuine Firebase Custom Auth Token (signed with RS256)
    const customToken = createFirebaseCustomToken(primaryPatient.id, {
      role: "patient",
      phone: cleanDigits,
    });

    return NextResponse.json({
      success: true,
      customToken,
      primaryPatientId: primaryPatient.id,
      patientCount: matchedPatients.length,
      patientName: primaryPatient.name,
      message: "Phone verified successfully.",
    });
  } catch (error: any) {
    console.error("[API Patient OTP Verify Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify code." },
      { status: 500 }
    );
  }
}
