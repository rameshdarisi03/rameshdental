import { NextRequest, NextResponse } from "next/server";
import { getAllPatientsRest } from "@/lib/firebaseRestAdmin";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { sanitizePhone, sanitizeName } from "@/lib/sanitizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      const { auth, db } = getFirebaseAdmin();
      const decoded = await auth.verifyIdToken(bearerToken);
      const userDoc = await db.collection("users").doc(decoded.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (["admin", "receptionist", "doctor", "staff"].includes(role)) {
          return true;
        }
      }
    } catch {
      // Invalid token
    }
  }

  return false;
}

function sanitizeDuplicatePatient(p: any) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name || "",
    phone: p.phone || "",
    email: p.email || "",
    address: p.address || "",
    therapistName: p.therapistName || "",
    familyGroupId: p.familyGroupId || "",
    isPrimaryAccount: Boolean(p.isPrimaryAccount),
    primaryPatientId: p.primaryPatientId || "",
  };
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { isDuplicate: false, error: "Access denied. Valid staff credentials required." },
        { status: 401 }
      );
    }

    const { phone, name, email } = await request.json();
    const cleanPhone = sanitizePhone(phone);
    const cleanName = sanitizeName(name).trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanPhone && !cleanName && !cleanEmail) {
      return NextResponse.json({ isDuplicate: false });
    }

    const allPatients = await getAllPatientsRest();

    let phoneMatchPatient: any = null;
    let emailMatchPatient: any = null;
    let nameMatchPatient: any = null;

    for (const d of allPatients) {
      const data = d;

      const pPhone = sanitizePhone(data.phone);
      const pName = (data.name || "").trim().toLowerCase();
      const pEmail = (data.email || "").trim().toLowerCase();
      const pLinkedEmails = (data.linkedEmails || []).map((e: string) => e.trim().toLowerCase());

      // Check email match
      if (cleanEmail && (pEmail === cleanEmail || pLinkedEmails.includes(cleanEmail))) {
        if (cleanName && pName === cleanName) {
          return NextResponse.json({
            isDuplicate: true,
            matchType: "exact",
            matchField: "email",
            existingPatient: sanitizeDuplicatePatient({ id: d.id, ...data }),
            message: `Patient "${data.name}" is already registered with this email (${cleanEmail}).`,
          });
        }
        emailMatchPatient = { id: d.id, ...data };
      }

      // Check phone match (10 digits)
      if (cleanPhone && cleanPhone.length === 10 && pPhone === cleanPhone) {
        if (cleanName && pName === cleanName) {
          return NextResponse.json({
            isDuplicate: true,
            matchType: "exact",
            matchField: "phone",
            existingPatient: sanitizeDuplicatePatient({ id: d.id, ...data }),
            message: `Patient "${data.name}" is already registered with this phone number (${pPhone}).`,
          });
        }
        phoneMatchPatient = { id: d.id, ...data };
      }

      // Check name match with different phone/email
      if (cleanName && cleanName.length > 2 && pName === cleanName) {
        nameMatchPatient = { id: d.id, ...data };
      }
    }

    // Family Member Scenario: Email match
    if (emailMatchPatient) {
      return NextResponse.json({
        isDuplicate: false,
        matchType: "family_member",
        matchField: "email",
        existingPatient: sanitizeDuplicatePatient(emailMatchPatient),
        message: `Email is already linked to family member "${emailMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      });
    }

    // Family Member Scenario: Phone match
    if (phoneMatchPatient) {
      return NextResponse.json({
        isDuplicate: false,
        matchType: "family_member",
        matchField: "phone",
        existingPatient: sanitizeDuplicatePatient(phoneMatchPatient),
        message: `Phone number is shared with family member "${phoneMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      });
    }

    // Name collision
    if (nameMatchPatient) {
      return NextResponse.json({
        isDuplicate: false,
        matchType: "name_collision",
        existingPatient: sanitizeDuplicatePatient(nameMatchPatient),
        message: `Another patient is named "${nameMatchPatient.name}" with different contact details.`,
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error: any) {
    console.error("[API Check Duplicate] Error:", error);
    return NextResponse.json({ isDuplicate: false, error: error.message }, { status: 500 });
  }
}
