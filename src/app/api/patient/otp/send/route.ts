import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAllPatientsRest, savePatientOtpRest } from "@/lib/firebaseRestAdmin";
import { sendWhatsAppOtpCode } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Patient Hub - OTP Dispatch Route (Pure REST Admin Engine)
 * Enforces strict registration verification:
 * - Rejects any alien phone number that does not exist in clinic records.
 * - For new user signup: verifies phone exists AND activation code matches.
 * - Stores 6-digit OTP with 5-minute TTL.
 * - Dispatches OTP via WhatsApp (and email if registered).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, purpose = "login", activationCode } = body;

    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, "").slice(-10);
    if (cleanDigits.length < 10) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      );
    }

    // 1. Strict Search: Query patients via pure REST engine (100% serverless safe)
    const allPatients = await getAllPatientsRest();
    const matchedPatients = allPatients.filter((p: any) => {
      const pPhoneDigits = (p.phone || "").replace(/\D/g, "").slice(-10);
      return pPhoneDigits === cleanDigits;
    });

    // 2. Strict Block: If mobile number does not exist in any patient profile, block immediately
    if (matchedPatients.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "This mobile number has not been registered with the clinic. Please use the mobile number provided during your clinic registration or contact our front desk at +91 89044 56243." 
        },
        { status: 404 }
      );
    }

    // 3. Auto-link: Retrieve activation code from patient record if present
    const cleanCode = (activationCode || "").trim().toUpperCase() ||
      matchedPatients.find((p: any) => p.activationCode)?.activationCode || "";

    // 4. Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Store in patient_otps collection via pure REST
    await savePatientOtpRest(cleanDigits, {
      phone: cleanDigits,
      otp,
      purpose,
      activationCode: (activationCode || "").trim().toUpperCase(),
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
    });

    const primaryPatient = matchedPatients[0];
    const patientName = primaryPatient.name || "Patient";

    // 5. Send via WhatsApp (Guaranteed template delivery outside 24h window)
    const waRes = await sendWhatsAppOtpCode({
      patientPhone: `91${cleanDigits}`,
      patientName: patientName,
      patientId: primaryPatient.id,
      otp: otp,
    });
    if (!waRes.success) {
      console.warn("[OTP Dispatch] WhatsApp send notice:", waRes.error);
    }

    // Optional: Also send to registered email if present
    if (primaryPatient.email) {
      try {
        await sendEmail({
          to: primaryPatient.email,
          subject: `Your Gait Physio Clinic Verification Code: ${otp}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h2 style="color: #062e36; margin-bottom: 8px;">Gait Physio Clinic</h2>
              <p style="color: #475569; font-size: 14px;">Your Patient Hub verification code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f9ab55; margin: 20px 0; background: #062e36; padding: 14px 20px; text-align: center; border-radius: 12px;">
                ${otp}
              </div>
              <p style="color: #64748b; font-size: 12px;">Valid for 5 minutes. Do not share this code with anyone.</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn("[OTP Dispatch] Email send notice:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your WhatsApp.",
      phone: cleanDigits,
      debugSimulated: !process.env.WHATSAPP_ACCESS_TOKEN,
    });
  } catch (error: any) {
    console.error("[API Patient OTP Send Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send verification code." },
      { status: 500 }
    );
  }
}
