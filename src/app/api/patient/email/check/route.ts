import { NextResponse } from "next/server";
import { getAllPatientsRest, getFirebaseAuthUserByEmail } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Validates whether an email belongs to a registered patient at Gait Physio Clinic
 * and determines if they already have an existing password or need first-time signup.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Fetch all patients via pure REST
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
        {
          success: false,
          error:
            "This email address has not been registered with the clinic. Please use the email provided during your clinic registration or contact our front desk at +91 89044 56243.",
        },
        { status: 404 }
      );
    }

    const primaryPatient = matchedPatients[0];

    // 2. Check Firebase Auth user status for this email
    const authUser = await getFirebaseAuthUserByEmail(cleanEmail);

    const hasPassword = Boolean(authUser?.hasPassword);
    const isActivated = Boolean(primaryPatient.activated);

    return NextResponse.json({
      success: true,
      patientName: primaryPatient.name || primaryPatient.patientName || "Valued Patient",
      hasPassword,
      isActivated,
      patientId: primaryPatient.id,
    });
  } catch (err: any) {
    console.error("[API patient email check error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to verify email address." },
      { status: 500 }
    );
  }
}
