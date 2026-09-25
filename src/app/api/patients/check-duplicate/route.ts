import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { sanitizePhone, sanitizeName } from "@/lib/sanitizer";

export async function POST(request: Request) {
  try {
    const { phone, name, email } = await request.json();
    const cleanPhone = sanitizePhone(phone);
    const cleanName = sanitizeName(name).trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanPhone && !cleanName && !cleanEmail) {
      return NextResponse.json({ isDuplicate: false });
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("patients").get();

    let phoneMatchPatient: any = null;
    let emailMatchPatient: any = null;
    let nameMatchPatient: any = null;

    for (const d of snapshot.docs) {
      const data = d.data();
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
            existingPatient: { id: d.id, ...data },
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
            existingPatient: { id: d.id, ...data },
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
        existingPatient: emailMatchPatient,
        message: `Email is already linked to family member "${emailMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      });
    }

    // Family Member Scenario: Phone match
    if (phoneMatchPatient) {
      return NextResponse.json({
        isDuplicate: false,
        matchType: "family_member",
        matchField: "phone",
        existingPatient: phoneMatchPatient,
        message: `Phone number is shared with family member "${phoneMatchPatient.name}". A separate individual profile will be created in this Family Circle.`,
      });
    }

    // Name collision
    if (nameMatchPatient) {
      return NextResponse.json({
        isDuplicate: false,
        matchType: "name_collision",
        existingPatient: nameMatchPatient,
        message: `Another patient is named "${nameMatchPatient.name}" with different contact details.`,
      });
    }

    return NextResponse.json({ isDuplicate: false });
  } catch (error: any) {
    console.error("[API Check Duplicate] Error:", error);
    return NextResponse.json({ isDuplicate: false, error: error.message }, { status: 500 });
  }
}
