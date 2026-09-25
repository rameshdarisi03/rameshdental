import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParam = searchParams.get("q")?.toLowerCase().trim() || "";

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("patients").get();

    let patients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      };
    });

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
