import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  generateTOTPSecret,
  getOtpAuthUrl,
  generateQRCodeDataUrl,
  formatSecretForDisplay,
  verifyTOTP,
} from "@/lib/totp";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, uid, email, token, newPassword } = body;

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    // ------------------------------------------------------------------------
    // ACTION 1: GENERATE / VIEW QR CODE FOR A STAFF MEMBER
    // ------------------------------------------------------------------------
    if (action === "GENERATE_QR") {
      if (!uid || !email) {
        return NextResponse.json(
          { success: false, error: "Staff UID and Email are required." },
          { status: 400 }
        );
      }

      const userDocRef = adminDb.collection("users").doc(uid);
      const userSnap = await userDocRef.get();
      const existingData = userSnap.data();

      // Reuse existing secret if already present, or generate a fresh one
      const secret = existingData?.totpSecret || generateTOTPSecret();
      const otpauthUrl = getOtpAuthUrl(email, secret, "Gait Physio Clinic");
      const qrDataUrl = await generateQRCodeDataUrl(otpauthUrl);
      const formattedKey = formatSecretForDisplay(secret);

      // Persist the secret if it was newly created
      if (!existingData?.totpSecret) {
        await userDocRef.set(
          {
            totpSecret: secret,
            totpEnabled: false, // not confirmed yet until tested
            totpUpdatedAt: Timestamp.now(),
          },
          { merge: true }
        );
      }

      return NextResponse.json({
        success: true,
        secret,
        formattedKey,
        otpauthUrl,
        qrDataUrl,
        totpEnabled: existingData?.totpEnabled ?? false,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: CONFIRM / TEST CODE AND ACTIVATE TOTP
    // ------------------------------------------------------------------------
    if (action === "CONFIRM_TOTP") {
      if (!uid || !token) {
        return NextResponse.json(
          { success: false, error: "Staff UID and 6-digit code are required." },
          { status: 400 }
        );
      }

      const userDocRef = adminDb.collection("users").doc(uid);
      const userSnap = await userDocRef.get();
      const data = userSnap.data();

      if (!data?.totpSecret) {
        return NextResponse.json(
          { success: false, error: "No Authenticator secret found for this staff member." },
          { status: 404 }
        );
      }

      const isValid = verifyTOTP(token, data.totpSecret, 1);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid 6-digit code. Please verify the code in your Authenticator app." },
          { status: 400 }
        );
      }

      // Mark confirmed and enabled
      await userDocRef.update({
        totpEnabled: true,
        totpActivatedAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        message: "Google Authenticator successfully linked and activated for this account!",
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: ADMIN DIRECT PASSWORD RESET (FAIL-SAFE / EMERGENCY OVERRIDE)
    // ------------------------------------------------------------------------
    if (action === "ADMIN_DIRECT_RESET_PASSWORD") {
      if (!uid || !newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // Update password in Firebase Auth directly
      await adminAuth.updateUser(uid, {
        password: newPassword,
      });

      // Update Firestore audit
      await adminDb.collection("users").doc(uid).update({
        lastAdminPasswordResetAt: Timestamp.now(),
      });

      // Log event
      await adminDb.collection("audit_logs").add({
        action: "ADMIN_OVERRIDE_PASSWORD_RESET",
        targetUid: uid,
        timestamp: Timestamp.now(),
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });

      return NextResponse.json({
        success: true,
        message: "Staff password successfully updated by Admin.",
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 4: RE-LINK / REGENERATE AUTHENTICATOR (E.G. LOST PHONE)
    // ------------------------------------------------------------------------
    if (action === "RESET_TOTP_SECRET") {
      if (!uid || !email) {
        return NextResponse.json(
          { success: false, error: "Staff UID and Email are required." },
          { status: 400 }
        );
      }

      const newSecret = generateTOTPSecret();
      const otpauthUrl = getOtpAuthUrl(email, newSecret, "Gait Physio Clinic");
      const qrDataUrl = await generateQRCodeDataUrl(otpauthUrl);
      const formattedKey = formatSecretForDisplay(newSecret);

      await adminDb.collection("users").doc(uid).update({
        totpSecret: newSecret,
        totpEnabled: false,
        totpResetAt: Timestamp.now(),
      });

      return NextResponse.json({
        success: true,
        secret: newSecret,
        formattedKey,
        otpauthUrl,
        qrDataUrl,
        message: "A new Authenticator key and QR code have been generated.",
      });
    }

    return NextResponse.json(
      { success: false, error: `Unrecognized action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[API staff-security error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
