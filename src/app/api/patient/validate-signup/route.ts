import { NextRequest, NextResponse } from "next/server";
import { getAllPatientsRest } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validates whether an email address and activation code exist in clinic registration records.
 * Strictly blocks un-registered emails or mismatched activation codes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, activationCode } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (activationCode || "").trim().toUpperCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid registered email address." },
        { status: 400 }
      );
    }

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: "Please enter the activation code provided by the clinic." },
        { status: 400 }
      );
    }

    // 1. Fetch all patient records from pure REST admin
    const allPatients = await getAllPatientsRest();

    // 2. Check if this email exists anywhere in clinic registration data
    const emailMatchedPatients = allPatients.filter((p: any) => {
      const pEmail = (p.email || "").trim().toLowerCase();
      const pLinked = (p.linkedEmails || []).map((e: string) => (e || "").trim().toLowerCase());
      return pEmail === cleanEmail || pLinked.includes(cleanEmail);
    });

    // 3. Strictly block if email is not found in clinic records
    if (emailMatchedPatients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "This email address has not been registered with the clinic. Please use the email provided during your clinic registration or contact our front desk at +91 98765 43210.",
        },
        { status: 404 }
      );
    }

    // 4. Verify that the activation code matches the registered patient profile
    const codeMatchedPatient = emailMatchedPatients.find((p: any) => {
      const pCode = (p.activationCode || "").trim().toUpperCase();
      return Boolean(pCode && pCode === cleanCode);
    });

    if (!codeMatchedPatient) {
      return NextResponse.json(
        {
          success: false,
          error: "The activation code does not match the clinic registration records for this email address. Please check your details or contact clinic reception at +91 98765 43210.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      patientId: codeMatchedPatient.id,
      patientName: codeMatchedPatient.name || "Patient",
      patient: codeMatchedPatient,
    });
  } catch (err: any) {
    console.error("[API patient validate-signup error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to validate registration details." },
      { status: 500 }
    );
  }
}
