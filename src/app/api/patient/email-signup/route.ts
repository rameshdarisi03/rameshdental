import { NextResponse } from "next/server";
import {
  getPatientEmailOtpRest,
  deletePatientEmailOtpRest,
  updatePatientEmailOtpAttemptsRest,
  getAllPatientsRest,
  updatePatientRecord,
  getFirebaseAuthUserByEmail,
  updateUserPassword,
  createFirebaseAuthUser,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, otp, password } = body;

    if (!email || !otp || !password) {
      return NextResponse.json(
        { success: false, error: "Email, OTP, and password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 10) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 10 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim().replace(/\s+/g, "");

    // 1. Verify OTP
    const record = await getPatientEmailOtpRest(cleanEmail);
    if (!record || !record.otp) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Rate Limiting Attempts (Max 5 attempts)
    const attempts = Number(record.attempts || 0);
    if (attempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many failed attempts. Please request a fresh verification code.",
        },
        { status: 429 }
      );
    }

    if (record.otp !== cleanOtp) {
      await updatePatientEmailOtpAttemptsRest(cleanEmail, attempts + 1);
      return NextResponse.json(
        { success: false, error: `Invalid verification code. ${4 - attempts} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    // 2. Locate patient in clinic database
    const allPatients = await getAllPatientsRest();
    const matchedPatients = allPatients.filter((p: any) => {
      const pEmail = (p.email || "").trim().toLowerCase();
      const linked = Array.isArray(p.linkedEmails)
        ? p.linkedEmails.map((e: string) => (e || "").trim().toLowerCase())
        : [];
      return pEmail === cleanEmail || linked.includes(cleanEmail);
    });

    if (matchedPatients.length === 0) {
      return NextResponse.json(
        { success: false, error: "Patient record not found." },
        { status: 404 }
      );
    }

    const primaryPatient = matchedPatients[0];

    // 3. Create or update Firebase Auth user
    let finalAuthUid = "";
    const existingUser = await getFirebaseAuthUserByEmail(cleanEmail);
    if (existingUser && existingUser.uid) {
      await updateUserPassword(existingUser.uid, password);
      finalAuthUid = existingUser.uid;
    } else {
      try {
        const newUser = await createFirebaseAuthUser(cleanEmail, password);
        finalAuthUid = newUser.uid;
      } catch (createErr: any) {
        console.warn("[Email Signup] createFirebaseAuthUser fallback:", createErr);
      }
    }

    // 4. Auto-link and activate patient record
    const emailsSet = new Set<string>();
    if (primaryPatient.email) emailsSet.add(primaryPatient.email.trim().toLowerCase());
    (primaryPatient.linkedEmails || []).forEach((e: string) => emailsSet.add((e || "").trim().toLowerCase()));
    emailsSet.add(cleanEmail);

    const updateFields: any = {
      activated: true,
      activationCode: "",
      linkedEmails: Array.from(emailsSet),
    };
    if (finalAuthUid) {
      updateFields.authUid = finalAuthUid;
    }

    await updatePatientRecord(primaryPatient.id, updateFields);

    // 5. Delete consumed OTP
    await deletePatientEmailOtpRest(cleanEmail);

    return NextResponse.json({
      success: true,
      patientId: primaryPatient.id,
      patientName: primaryPatient.name || "Patient",
      message: "Patient account successfully activated.",
    });
  } catch (err: any) {
    console.error("[API Email Signup Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process signup." },
      { status: 500 }
    );
  }
}
