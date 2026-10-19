import { NextRequest, NextResponse } from "next/server";
import { getAllPatientsRest } from "@/lib/firebaseRestAdmin";
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

export async function GET(request: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(request);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid staff credentials required.", patients: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get("q")?.toLowerCase().trim() || "";

    let patients = await getAllPatientsRest();

    // Client-side / In-memory sorting by creation date descending
    patients.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (queryParam) {
      const queryDigits = queryParam.replace(/\D/g, "");
      patients = patients.filter((p: any) => {
        const name = (p.name || "").toLowerCase();
        const id = (p.id || "").toLowerCase();
        const email = (p.email || "").toLowerCase();
        const phone = (p.phone || "");
        const phoneDigits = phone.replace(/\D/g, "");
        const plan = (p.treatmentPlan || "").toLowerCase();

        if (name.includes(queryParam)) return true;
        if (id.includes(queryParam)) return true;
        if (email.includes(queryParam)) return true;
        if (plan.includes(queryParam)) return true;
        if (phone.toLowerCase().includes(queryParam)) return true;
        if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits)) return true;
        return false;
      });
    }

    return NextResponse.json({
      success: true,
      count: patients.length,
      patients,
    });
  } catch (error: any) {
    console.error("[API Patients GET] Error fetching patients list:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch patients list", patients: [] },
      { status: 500 }
    );
  }
}
