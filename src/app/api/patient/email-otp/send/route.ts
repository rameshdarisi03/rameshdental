import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAllPatientsRest, savePatientEmailOtpRest } from "@/lib/firebaseRestAdmin";
import { sendEmail } from "@/lib/email";
import { patientAuthOtpEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, purpose = "signup" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Strict Search: Must exist in clinic records
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
            "This email address has not been registered with the clinic. Please contact our reception desk at +91 89044 56243.",
        },
        { status: 404 }
      );
    }

    const primaryPatient = matchedPatients[0];
    const patientName = primaryPatient.name || primaryPatient.patientName || "Valued Patient";

    // 2. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const now = Date.now();
    const expiresAt = now + 5 * 60 * 1000; // 5 minutes TTL

    // 3. Store OTP in Firestore REST
    await savePatientEmailOtpRest(cleanEmail, {
      email: cleanEmail,
      otp,
      purpose,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      attempts: 0,
      patientId: primaryPatient.id,
      patientName,
    });

    // 4. Send Email via Brevo
    const emailData = patientAuthOtpEmail({
      patientName,
      otp,
      purpose: purpose === "reset" ? "reset" : "signup",
    });

    const emailResult = await sendEmail({
      to: { email: cleanEmail, name: patientName },
      subject: emailData.subject,
      htmlContent: emailData.html,
      tags: ["patient-portal", purpose === "reset" ? "password-reset" : "portal-signup"],
    });

    if (!emailResult.success) {
      console.warn("[Email OTP] Brevo dispatch warning:", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}.`,
    });
  } catch (err: any) {
    console.error("[API Email OTP Send Error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to dispatch verification email." },
      { status: 500 }
    );
  }
}
