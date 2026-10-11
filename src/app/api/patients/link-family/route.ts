import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

/**
 * Server-side Family Circle Linking / Unlinking Route
 * Runs with Firebase Admin SDK privileges to prevent client permission denied errors.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { primaryPatientId, memberPatientId, relationship } = body;

    if (!primaryPatientId || !memberPatientId) {
      return NextResponse.json(
        { success: false, error: "Both primaryPatientId and memberPatientId are required." },
        { status: 400 }
      );
    }

    const { db } = getFirebaseAdmin();
    const primaryRef = db.collection("patients").doc(primaryPatientId);
    const memberRef = db.collection("patients").doc(memberPatientId);

    const [primarySnap, memberSnap] = await Promise.all([
      primaryRef.get(),
      memberRef.get(),
    ]);

    if (!primarySnap.exists) {
      return NextResponse.json(
        { success: false, error: `Primary patient "${primaryPatientId}" not found.` },
        { status: 404 }
      );
    }

    if (!memberSnap.exists) {
      return NextResponse.json(
        { success: false, error: `Member patient "${memberPatientId}" not found.` },
        { status: 404 }
      );
    }

    const primaryData = primarySnap.data() || {};
    const memberData = memberSnap.data() || {};

    const familyHeadId = primaryData.primaryPatientId || primarySnap.id;
    const familyHeadName = primaryData.primaryPatientId
      ? (primaryData.familyHeadName || primaryData.name)
      : primaryData.name;
    const familyGroupId = primaryData.familyGroupId || memberData.familyGroupId || `FAM-${familyHeadId}`;

    const emailsSet = new Set<string>();
    if (primaryData.email) emailsSet.add(primaryData.email.trim().toLowerCase());
    if (memberData.email) emailsSet.add(memberData.email.trim().toLowerCase());
    (primaryData.linkedEmails || []).forEach((e: string) => emailsSet.add(e.trim().toLowerCase()));
    (memberData.linkedEmails || []).forEach((e: string) => emailsSet.add(e.trim().toLowerCase()));
    const linkedEmails = Array.from(emailsSet);

    // Update primary patient
    await primaryRef.update({
      familyGroupId,
      isPrimaryAccount: !primaryData.primaryPatientId,
      linkedEmails,
    });

    // Update member patient
    await memberRef.update({
      familyGroupId,
      primaryPatientId: familyHeadId,
      familyHeadName: familyHeadName,
      relationship: relationship || "Family Member",
      linkedEmails,
      activated: Boolean(primaryData.activated || memberData.activated),
    });

    return NextResponse.json({
      success: true,
      message: `Successfully linked ${memberData.name || memberPatientId} to family circle.`,
      familyGroupId,
    });
  } catch (error: any) {
    console.error("[API Link Family POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to link family member." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId parameter is required." },
        { status: 400 }
      );
    }

    const { db, admin } = getFirebaseAdmin();
    const docRef = db.collection("patients").doc(patientId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: `Patient "${patientId}" not found.` },
        { status: 404 }
      );
    }

    await docRef.update({
      primaryPatientId: admin.firestore.FieldValue.delete(),
      familyGroupId: admin.firestore.FieldValue.delete(),
      familyHeadName: admin.firestore.FieldValue.delete(),
      relationship: "Self",
      isPrimaryAccount: true,
      linkedEmails: [],
    });

    return NextResponse.json({
      success: true,
      message: `Successfully unlinked patient "${patientId}" from family circle.`,
    });
  } catch (error: any) {
    console.error("[API Link Family DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to unlink family member." },
      { status: 500 }
    );
  }
}
