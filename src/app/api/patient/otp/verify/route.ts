import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

/**
 * Patient Hub - OTP Verification & Authentication Route
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

    const { db, auth } = getFirebaseAdmin();

    // 1. Fetch OTP record
    const otpDocRef = db.collection("patient_otps").doc(cleanDigits);
    const otpSnap = await otpDocRef.get();

    if (!otpSnap.exists) {
      return NextResponse.json(
        { success: false, error: "No active verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    const otpData = otpSnap.data() || {};

    // 2. Check Expiry
    if (Date.now() > otpData.expiresAt) {
      await otpDocRef.delete();
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 3. Check Attempts
    if ((otpData.attempts || 0) >= 4) {
      await otpDocRef.delete();
      return NextResponse.json(
        { success: false, error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // 4. Verify Code
    if (otpData.otp !== cleanOtp) {
      await otpDocRef.update({
        attempts: (otpData.attempts || 0) + 1,
      });
      return NextResponse.json(
        { success: false, error: "Incorrect verification code. Please check your WhatsApp and try again." },
        { status: 400 }
      );
    }

    // Code is valid! Delete it immediately to prevent replay
    await otpDocRef.delete();

    // 5. Look up patient profile(s)
    const patientsSnap = await db.collection("patients").get();
    const matchedPatients: any[] = [];

    patientsSnap.forEach((doc) => {
      const data = doc.data();
      const pPhoneDigits = (data.phone || "").replace(/\D/g, "").slice(-10);
      if (pPhoneDigits === cleanDigits) {
        matchedPatients.push({ id: doc.id, ...data });
      }
    });

    if (matchedPatients.length === 0) {
      return NextResponse.json(
        { success: false, error: "No patient record found for this mobile number." },
        { status: 404 }
      );
    }

    // 6. If signup, activate the matched patient(s)
    if (purpose === "signup" || !matchedPatients.some((p) => p.activated)) {
      await Promise.all(
        matchedPatients.map((p) =>
          db.collection("patients").doc(p.id).update({
            activated: true,
          })
        )
      );
    }

    // Choose primary patient for auth session
    const primaryPatient = matchedPatients.find((p) => p.isPrimaryAccount || !p.primaryPatientId) || matchedPatients[0];

    // 7. Mint Firebase Custom Auth Token
    const customToken = await auth.createCustomToken(primaryPatient.id, {
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
