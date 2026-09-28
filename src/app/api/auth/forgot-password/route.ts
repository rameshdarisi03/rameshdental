import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTOTP } from "@/lib/totp";
import { Timestamp } from "firebase-admin/firestore";

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
    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    // 1. Locate staff record in Firestore
    const userQuery = await adminDb
      .collection("users")
      .where("email", "==", emailClean)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: "Staff account not found. Please verify your email or contact the Clinic Admin.",
        },
        { status: 404 }
      );
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();
    const uid = userDoc.id;

    // 2. Verify Authenticator Secret exists
    if (!userData.totpSecret) {
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
    const isCodeValid = verifyTOTP(totpCode, userData.totpSecret, 1);
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

    // 4. Update Password in Firebase Auth
    await adminAuth.updateUser(uid, {
      password: newPassword,
    });

    // 5. Update Audit Trail in Firestore
    await adminDb.collection("users").doc(uid).update({
      lastPasswordResetAt: Timestamp.now(),
    });

    // Log to audit collection
    await adminDb.collection("audit_logs").add({
      action: "STAFF_PASSWORD_RESET_TOTP",
      targetUid: uid,
      targetEmail: emailClean,
      timestamp: Timestamp.now(),
      ip: req.headers.get("x-forwarded-for") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
    });

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
