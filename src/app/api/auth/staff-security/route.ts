import {
  updateUserPassword,
  recordPasswordResetAudit,
  verifyFirebaseIdTokenRest,
  getFirestoreDocRest,
  patchFirestoreDocRest
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, secret: incomingSecret, token, uid, newPassword } = body;

    // ------------------------------------------------------------------------
    // ACTION 1: GENERATE / VIEW QR CODE FOR A STAFF MEMBER
    // ------------------------------------------------------------------------
    if (action === "GENERATE_QR") {
      const emailClean = (email || "staff@rameshdental.com").trim().toLowerCase();
      const secret = incomingSecret || generateTOTPSecret();
      const otpauthUrl = getOtpAuthUrl(emailClean, secret, "Ramesh Dental Clinic");
      const qrDataUrl = await generateQRCodeDataUrl(otpauthUrl);
      const formattedKey = formatSecretForDisplay(secret);

      return NextResponse.json({
        success: true,
        secret,
        formattedKey,
        otpauthUrl,
        qrDataUrl,
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 2: CONFIRM / TEST CODE AND ACTIVATE TOTP
    // ------------------------------------------------------------------------
    if (action === "CONFIRM_TOTP") {
      const rawSecret = incomingSecret || body.secret || body.totpSecret;
      const cleanSecret = (rawSecret || "").replace(/[\s-]/g, "").toUpperCase();

      if (!cleanSecret || !token) {
        return NextResponse.json(
          { success: false, error: "Secret key and 6-digit code are required." },
          { status: 400 }
        );
      }

      const isValid = verifyTOTP(token, cleanSecret, 1);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid 6-digit code. Please verify the code in your Authenticator app." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Google Authenticator successfully verified!",
      });
    }

    // ------------------------------------------------------------------------
    // ACTION 3: ADMIN DIRECT PASSWORD RESET (OVERRIDE - ADMIN ONLY)
    // ------------------------------------------------------------------------
    if (action === "ADMIN_DIRECT_RESET_PASSWORD") {
      // Security check: Verify caller is an authenticated clinic Administrator
      const authHeader = req.headers.get("authorization") || "";
      const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

      let isVerifiedAdmin = false;
      if (bearerToken) {
        try {
          const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
          const decoded = await adminAuth.verifyIdToken(bearerToken);
          const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
          if (callerDoc.exists && callerDoc.data()?.role === "admin") {
            isVerifiedAdmin = true;
          }
        } catch (authErr) {
          console.warn("[staff-security] Admin token verification rejected:", authErr);
        }
      }

      if (!isVerifiedAdmin) {
        return NextResponse.json(
          { success: false, error: "Access denied. Only clinic administrators can reset staff passwords." },
          { status: 403 }
        );
      }

      const targetUid = uid || body.userId;
      const targetPassword = newPassword || body.password;

      if (!targetUid || typeof targetUid !== "string") {
        return NextResponse.json(
          { success: false, error: "Staff User ID (uid) is required." },
          { status: 400 }
        );
      }

      if (!targetPassword || typeof targetPassword !== "string" || targetPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      await updateUserPassword(targetUid, targetPassword);

      const ip = req.headers.get("x-forwarded-for") || "unknown";
      const userAgent = req.headers.get("user-agent") || "unknown";
      const staffEmail = email || body.targetEmail || "staff-account";

      await recordPasswordResetAudit(
        targetUid,
        staffEmail,
        ip,
        userAgent,
        "ADMIN_DIRECT_PASSWORD_RESET"
      );

      return NextResponse.json({
        success: true,
        message: "Staff password successfully updated!",
      });
    }

    return NextResponse.json(
      { success: false, error: `Action ${action} not supported.` },
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
