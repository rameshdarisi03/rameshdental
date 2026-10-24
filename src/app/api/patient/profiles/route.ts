import { NextRequest, NextResponse } from "next/server";
import {
  getAllPatientsRest,
  updatePatientRecord,
  getFirestoreDocRest,
} from "@/lib/firebaseRestAdmin";
import type { Patient } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Universal Patient Profiles Resolver Route
 * Looks up all patient profiles in a patient's Family Circle by Phone, UID, or Email.
 * Bypasses client-side Firestore security rule limitations.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";
    const uid = searchParams.get("uid") || "";
    const email = searchParams.get("email") || "";

    const profiles = await resolveProfiles({ phone, uid, email });
    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    console.error("[API Patient Profiles GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve patient profiles." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone = "", uid = "", email = "" } = body;

    const profiles = await resolveProfiles({ phone, uid, email });
    return NextResponse.json({ success: true, profiles });
  } catch (err: any) {
    console.error("[API Patient Profiles POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to resolve patient profiles." },
      { status: 500 }
    );
  }
}

async function resolveProfiles({
  phone,
  uid,
  email,
}: {
  phone?: string;
  uid?: string;
  email?: string;
}): Promise<Patient[]> {
  const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanUid = (uid || "").trim();

  if (!cleanPhone && !cleanEmail && !cleanUid) {
    return [];
  }

  // 1. Direct single doc fetch if UID looks like a patient doc ID
  let directDoc: any = null;
  if (cleanUid) {
    directDoc = await getFirestoreDocRest("patients", cleanUid);
  }

  // 2. Fetch all patients via pure REST engine
  const allPatients: any[] = await getAllPatientsRest();
  if (directDoc && !allPatients.some((p) => p.id === directDoc.id)) {
    allPatients.push(directDoc);
  }

  // 3. Find all direct matches
  const directMatches = allPatients.filter((p) => {
    const pPhoneDigits = (p.phone || "").replace(/\D/g, "").slice(-10);
    const pEmail = (p.email || "").trim().toLowerCase();
    const pLinked = (p.linkedEmails || []).map((e: string) => e.trim().toLowerCase());
    const pUid = (p.authUid || "").trim();
    const pUserId = (p.userId || "").trim();
    const pId = (p.id || "").trim();

    if (cleanPhone && pPhoneDigits === cleanPhone) return true;
    if (cleanUid && (pId === cleanUid || pUid === cleanUid || pUserId === cleanUid)) return true;
    if (cleanEmail && (pEmail === cleanEmail || pLinked.includes(cleanEmail))) return true;

    return false;
  });

  if (directMatches.length === 0) {
    return [];
  }

  // 4. Expand to full Family Circle
  const familyGroupIds = new Set<string>();
  const patientIds = new Set<string>();

  directMatches.forEach((p) => {
    if (p.id) patientIds.add(p.id);
    if (p.familyGroupId) familyGroupIds.add(p.familyGroupId);
    if (p.primaryPatientId) patientIds.add(p.primaryPatientId);
  });

  const fullFamilyCircle = allPatients.filter((p) => {
    if (p.id && patientIds.has(p.id)) return true;
    if (p.familyGroupId && familyGroupIds.has(p.familyGroupId)) return true;
    if (p.primaryPatientId && patientIds.has(p.primaryPatientId)) return true;
    return false;
  });

  // 5. Deduplicate
  const uniqueMap = new Map<string, Patient>();
  fullFamilyCircle.forEach((p) => {
    if (p.id) uniqueMap.set(p.id, p as Patient);
  });
  const list = Array.from(uniqueMap.values());

  // 6. Activation inheritance & Auth UID auto-linking
  const isAnyActivated = list.some((p) => p.activated === true);
  const targetUid = cleanUid || list[0]?.id;

  for (const p of list) {
    if (isAnyActivated && !p.activated) {
      p.activated = true;
    }
    // Ensure authUid is linked so subsequent direct reads succeed
    if (targetUid && p.authUid !== targetUid && p.id) {
      p.authUid = targetUid;
      updatePatientRecord(p.id, { authUid: targetUid, activated: true }).catch(() => {});
    }
  }

  return list;
}
