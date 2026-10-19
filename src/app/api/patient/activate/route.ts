import { NextRequest, NextResponse } from "next/server";
import { updatePatientRecord, getFirebaseAuthUserByEmail, updateUserPassword } from "@/lib/firebaseRestAdmin";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const { auth, db } = getFirebaseAdmin();
      const decoded = await auth.verifyIdToken(bearerToken);
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (["admin", "receptionist", "doctor", "staff"].includes(role)) {
          return true;
        }
      }
    } catch {}
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, authUid, email, password, activationCode, linkedEmails } = body;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { success: false, error: "Patient ID is required." },
        { status: 400 }
      );
    }

    const { db } = getFirebaseAdmin();
    const cleanPatientId = patientId.trim();
    const patientSnap = await db.collection("patients").doc(cleanPatientId).get();

    if (!patientSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Patient record not found." },
        { status: 404 }
      );
    }

    const patientData = patientSnap.data() || {};
    let finalAuthUid = authUid;

    // If a password was provided, verify caller holds the legitimate activationCode or is authenticated staff
    if (password && typeof password === "string") {
      const cleanEmail = (email || "").trim().toLowerCase();
      if (!cleanEmail) {
        return NextResponse.json(
          { success: false, error: "Email is required to set account password." },
          { status: 400 }
        );
      }

      const cleanActivationCode = (activationCode || "").trim().toUpperCase();
      const dbActivationCode = (patientData.activationCode || "").trim().toUpperCase();

      const isStaff = await isAuthorizedStaff(req);
      const isCodeValid = Boolean(dbActivationCode && cleanActivationCode && dbActivationCode === cleanActivationCode);

      if (!isStaff && !isCodeValid) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired activation code. Cannot set account credentials." },
          { status: 403 }
        );
      }

      // Look up user by email in Firebase Auth
      let targetUid = finalAuthUid;
      if (!targetUid) {
        const existingUser = await getFirebaseAuthUserByEmail(cleanEmail);
        if (existingUser) {
          targetUid = existingUser.uid;
        }
      }

      if (targetUid) {
        await updateUserPassword(targetUid, password);
        finalAuthUid = targetUid;
      }
    }

    const updates: {
      authUid?: string;
      activated?: boolean;
      activationCode?: string;
      linkedEmails?: string[];
    } = {
      activated: true,
    };

    if (finalAuthUid && typeof finalAuthUid === "string") {
      updates.authUid = finalAuthUid;
    }

    if (activationCode !== undefined) {
      updates.activationCode = "";
    }

    if (Array.isArray(linkedEmails) && linkedEmails.length > 0) {
      updates.linkedEmails = linkedEmails;
    } else if (email && typeof email === "string") {
      updates.linkedEmails = [email.trim().toLowerCase()];
    }

    await updatePatientRecord(patientId.trim(), updates);

    return NextResponse.json({
      success: true,
      message: "Patient activated and credentials updated successfully.",
      authUid: finalAuthUid,
    });
  } catch (err: any) {
    console.error("[API patient activate error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to activate patient." },
      { status: 500 }
    );
  }
}
