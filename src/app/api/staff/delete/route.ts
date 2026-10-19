import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { uid, email } = body;

    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

    const { auth, db } = getFirebaseAdmin();

    let isAuthorizedAdmin = false;
    let callerUid = "";
    if (bearerToken) {
      try {
        const decoded = await auth.verifyIdToken(bearerToken);
        callerUid = decoded.uid;
        const callerDoc = await db.collection("users").doc(callerUid).get();
        if (callerDoc.exists && callerDoc.data()?.role === "admin") {
          isAuthorizedAdmin = true;
        }
      } catch (authErr) {
        console.warn("[API Staff Delete] Admin token verification rejected:", authErr);
      }
    }

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { success: false, error: "Access denied. Only authenticated clinic administrators can delete staff accounts." },
        { status: 403 }
      );
    }

    if (callerUid === uid) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your own active administrator account." },
        { status: 400 }
      );
    }

    console.log(`[API Staff Delete] Initiating complete purge for staff UID: ${uid} (${email || "no-email"})...`);

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
