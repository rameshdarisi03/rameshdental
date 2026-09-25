import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email } = body;

    if (!uid) {
      return NextResponse.json(
        { success: false, error: "Missing required staff UID." },
        { status: 400 }
      );
    }

    console.log(`[API Staff Delete] Initiating complete purge for staff UID: ${uid} (${email || "no-email"})...`);

    const { auth, db } = getFirebaseAdmin();

    // 1. Permanently delete from Firebase Authentication (wipes email, credentials, tokens)
    let authDeleted = false;
    try {
      await auth.deleteUser(uid);
      authDeleted = true;
      console.log(`[API Staff Delete] ✓ Vaporized user from Firebase Auth: ${uid}`);
    } catch (authErr: any) {
      if (authErr.code === "auth/user-not-found") {
        console.log(`[API Staff Delete] User ${uid} was already absent from Firebase Auth.`);
        authDeleted = true;
      } else {
        console.warn(`[API Staff Delete] Auth deletion note:`, authErr.message);
      }
    }

    // 2. Permanently delete from Firestore Database (/users/{uid})
    await db.collection("users").doc(uid).delete();
    console.log(`[API Staff Delete] ✓ Wiped user document from Firestore: ${uid}`);

    return NextResponse.json({
      success: true,
      authDeleted,
      message: `Staff member ${email || uid} completely wiped from database and authentication registry.`,
    });
  } catch (error: any) {
    console.error("[API Staff Delete] Fatal error during staff deletion:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to purge staff member." },
      { status: 500 }
    );
  }
}
