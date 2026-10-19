import { NextRequest, NextResponse } from "next/server";
import { getFirestoreDocRest, patchFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

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

/**
 * Server-side Family Circle Linking / Unlinking Route
 * Uses pure Firestore REST engine to ensure zero serverless crashes.
 */
export async function POST(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required to link family members." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { primaryPatientId, memberPatientId, relationship } = body;

    if (!primaryPatientId || !memberPatientId) {
      return NextResponse.json(
        { success: false, error: "Both primaryPatientId and memberPatientId are required." },
        { status: 400 }
      );
    }

    const [primaryData, memberData] = await Promise.all([
      getFirestoreDocRest("patients", primaryPatientId),
      getFirestoreDocRest("patients", memberPatientId),
    ]);

    if (!primaryData) {
      return NextResponse.json(
        { success: false, error: `Primary patient "${primaryPatientId}" not found.` },
        { status: 404 }
      );
    }

    if (!memberData) {
      return NextResponse.json(
        { success: false, error: `Member patient "${memberPatientId}" not found.` },
        { status: 404 }
      );
    }

    const familyHeadId = primaryData.primaryPatientId || primaryPatientId;
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
    await patchFirestoreDocRest("patients", primaryPatientId, {
      familyGroupId,
      isPrimaryAccount: !primaryData.primaryPatientId,
      linkedEmails,
    });

    // Update member patient
    await patchFirestoreDocRest("patients", memberPatientId, {
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

export async function DELETE(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required to unlink family members." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "patientId parameter is required." },
        { status: 400 }
      );
    }

    const patient = await getFirestoreDocRest("patients", patientId);
    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient "${patientId}" not found.` },
        { status: 404 }
      );
    }

    await patchFirestoreDocRest("patients", patientId, {
      primaryPatientId: "",
      familyGroupId: "",
      familyHeadName: "",
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
