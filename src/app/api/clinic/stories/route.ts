import { NextRequest, NextResponse } from "next/server";
import {
  setFirestoreDocRest,
  deleteFirestoreDocRest,
  queryFirestoreCollectionRest,
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedAdminOrStaff(req: NextRequest): boolean {
  const origin = req.headers.get("origin") || "";
  const host = req.headers.get("host") || "";
  const referer = req.headers.get("referer") || "";
  const secFetchSite = req.headers.get("sec-fetch-site") || "";

  // 1. Same-Origin & Referer Domain Verification
  const isSameDomain =
    secFetchSite === "same-origin" ||
    origin.includes("rameshdental") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1") ||
    host.includes("rameshdental") ||
    host.includes("localhost") ||
    referer.includes("rameshdental") ||
    referer.includes("/dashboard");

  // 2. Session cookie check from staff dashboard (admins, receptionists, doctors)
  const sessionCookie = req.cookies.get("gpc_session")?.value;
  if (sessionCookie && ["admin", "receptionist", "staff", "doctor"].includes(sessionCookie)) {
    return true;
  }

  // 3. Raw Cookie header check
  const rawCookie = req.headers.get("cookie") || "";
  if (
    rawCookie.includes("gpc_session=admin") ||
    rawCookie.includes("gpc_session=receptionist") ||
    rawCookie.includes("gpc_session=staff") ||
    rawCookie.includes("gpc_session=doctor")
  ) {
    return true;
  }

  // 4. Custom Staff Headers passed from dashboard client
  const staffRole = req.headers.get("x-staff-role")?.toLowerCase();
  if (staffRole && ["admin", "receptionist", "staff", "doctor"].includes(staffRole)) {
    return true;
  }

  // 5. Allow if request is same-domain dashboard mutation
  if (isSameDomain && referer.includes("/dashboard")) {
    return true;
  }

  return false;
}

// GET /api/clinic/stories
export async function GET() {
  try {
    const stories = await queryFirestoreCollectionRest("recovery_stories");
    return NextResponse.json({ success: true, stories });
  } catch (err: any) {
    console.error("GET /api/clinic/stories error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

// POST /api/clinic/stories (Create or Update story)
export async function POST(req: NextRequest) {
  if (!isAuthorizedAdminOrStaff(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Staff permission required" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    if (!body || !body.title) {
      return NextResponse.json(
        { error: "Missing required story fields" },
        { status: 400 }
      );
    }

    const storyId = body.id || `story-${Date.now()}`;
    const cleanStory = {
      ...body,
      id: storyId,
      updatedAt: new Date().toISOString(),
    };

    // Save with root service account authority in Firestore
    await setFirestoreDocRest("recovery_stories", storyId, cleanStory);

    return NextResponse.json({
      success: true,
      id: storyId,
      message: "Story successfully saved to Firestore",
    });
  } catch (err: any) {
    console.error("POST /api/clinic/stories error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save story" },
      { status: 500 }
    );
  }
}

// DELETE /api/clinic/stories?id=xyz
export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdminOrStaff(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Staff permission required" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const storyId = searchParams.get("id");

    if (!storyId) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    await deleteFirestoreDocRest("recovery_stories", storyId);

    return NextResponse.json({
      success: true,
      message: "Story successfully deleted from Firestore",
    });
  } catch (err: any) {
    console.error("DELETE /api/clinic/stories error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete story" },
      { status: 500 }
    );
  }
}
