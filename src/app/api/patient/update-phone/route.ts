import { NextRequest, NextResponse } from "next/server";
import {
  getFirestoreDocRest,
  patchFirestoreDocRest,
  getAllPatientsRest,
  deletePatientOtpRest,
  verifyFirebaseIdTokenRest,
  queryFirestoreCollectionRest,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Checks whether the request is made by authenticated clinic staff.
 */
async function isAuthorizedStaff(req: NextRequest): Promise<boolean> {
  // 1. Staff session cookie from dashboard
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "doctor", "staff"].includes(sessionCookie)) {
    return true;
  }

  // 2. Bearer Firebase ID token
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (bearerToken) {
    try {
      const decoded = await verifyFirebaseIdTokenRest(bearerToken);
      if (decoded?.uid) {
        const userDoc = await getFirestoreDocRest("users", decoded.uid);
        if (userDoc && ["admin", "receptionist", "doctor", "staff"].includes(userDoc.role)) {
          return true;
        }
      }
    } catch {
      // Token verification failed
    }
  }

  return false;
}

/**
 * API Route: /api/patient/update-phone
 * 
 * Safely updates a patient's primary contact number:
 * 1. Validates staff authorization.
 * 2. Checks Indian 10-digit mobile number rules (starts with 6, 7, 8, 9).
 * 3. Enforces uniqueness across clinic patients to prevent identity collision.
 * 4. Updates patient record in Firestore.
 * 5. Purges any cached OTP / pending verification sessions for the old number.
 * 6. Synchronizes active appointments to ensure future reminders reach the new phone.
 * 7. Immediately enables Patient Hub login on the new number; old number is completely delinked and blocked.
 */
export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientId, newPhone } = body;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { success: false, error: "Patient ID is required." },
        { status: 400 }
      );
    }

    if (!newPhone || typeof newPhone !== "string") {
      return NextResponse.json(
        { success: false, error: "Please enter a valid mobile number." },
        { status: 400 }
      );
    }

    // 1. Clean and validate phone digits
    const cleanNewDigits = newPhone.replace(/\D/g, "").slice(-10);
    if (cleanNewDigits.length !== 10) {
      return NextResponse.json(
        { success: false, error: "Indian mobile number must be exactly 10 digits." },
        { status: 400 }
      );
    }

    if (!/^[6-9]/.test(cleanNewDigits)) {
      return NextResponse.json(
        { success: false, error: "Indian mobile numbers must begin with 6, 7, 8, or 9." },
        { status: 400 }
      );
    }

    // 2. Fetch target patient record
    const patientDoc = await getFirestoreDocRest("patients", patientId);
    if (!patientDoc) {
      return NextResponse.json(
        { success: false, error: "Patient not found in clinic records." },
        { status: 404 }
      );
    }

    const oldPhone = patientDoc.phone || "";
    const cleanOldDigits = oldPhone.replace(/\D/g, "").slice(-10);

    // If identical, no change needed
    if (cleanNewDigits === cleanOldDigits) {
      return NextResponse.json({
        success: true,
        phone: oldPhone,
        message: "Contact number is already up to date.",
      });
    }

    // 3. Collision check: Ensure no other patient has this phone registered
    const allPatients = await getAllPatientsRest();
    const conflictingPatient = allPatients.find(
      (p: any) =>
        p.id !== patientId &&
        (p.phone || "").replace(/\D/g, "").slice(-10) === cleanNewDigits
    );

    if (conflictingPatient) {
      return NextResponse.json(
        {
          success: false,
          error: `Mobile number +91 ${cleanNewDigits} is already registered to ${conflictingPatient.name || "another patient"} (ID: ${conflictingPatient.id}). Each patient account requires a unique mobile number.`,
        },
        { status: 409 }
      );
    }

    const formattedPhone = `+91 ${cleanNewDigits}`;

    // 4. Update patient document in Firestore via pure REST
    await patchFirestoreDocRest("patients", patientId, {
      phone: formattedPhone,
      updatedAt: new Date().toISOString(),
    });

    // 5. Purge old OTP cache so old number cannot be verified or used
    if (cleanOldDigits) {
      try {
        await deletePatientOtpRest(cleanOldDigits);
      } catch (otpErr) {
        console.warn("[update-phone] Error clearing old OTP cache:", otpErr);
      }
    }

    // 6. Cascade update appointments for this patient so notifications go to the new phone
    try {
      const appointments = await queryFirestoreCollectionRest("appointments", []);
      for (const app of appointments) {
        if (!app.id) continue;
        const appPhoneDigits = (app.patientPhone || app.phone || "").replace(/\D/g, "").slice(-10);
        const nameMatches = patientDoc.name && app.patientName && 
          patientDoc.name.trim().toLowerCase() === app.patientName.trim().toLowerCase();
        const idMatches = app.patientId === patientId;
        const phoneMatches = cleanOldDigits && appPhoneDigits === cleanOldDigits;

        if (idMatches || (nameMatches && (phoneMatches || !app.patientId))) {
          await patchFirestoreDocRest("appointments", app.id, {
            phone: formattedPhone,
            patientPhone: formattedPhone,
            patientId: patientId,
          });
        }
      }
    } catch (appErr) {
      console.warn("[update-phone] Appointments cascade update notice:", appErr);
    }

    // 7. Cascade update invoices for this patient so billing records reflect the new phone
    try {
      const invoices = await queryFirestoreCollectionRest("invoices", []);
      for (const inv of invoices) {
        if (!inv.id) continue;
        const invPhoneDigits = (inv.patientPhone || "").replace(/\D/g, "").slice(-10);
        const nameMatches = patientDoc.name && inv.patientName && 
          patientDoc.name.trim().toLowerCase() === inv.patientName.trim().toLowerCase();
        const idMatches = inv.patientId === patientId;
        const phoneMatches = cleanOldDigits && invPhoneDigits === cleanOldDigits;

        if (idMatches || (nameMatches && (phoneMatches || !inv.patientId))) {
          await patchFirestoreDocRest("invoices", inv.id, {
            patientPhone: formattedPhone,
            patientId: patientId,
          });
        }
      }
    } catch (invErr) {
      console.warn("[update-phone] Invoices cascade update notice:", invErr);
    }

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      oldPhone: oldPhone || null,
      message: `Contact number updated to ${formattedPhone}. Old number (${oldPhone || "N/A"}) has been delinked from Patient Hub and can no longer log in.`,
    });
  } catch (error: any) {
    console.error("[update-phone] Error updating patient phone:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update patient contact number." },
      { status: 500 }
    );
  }
}
