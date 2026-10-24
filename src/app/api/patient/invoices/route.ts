import { NextRequest, NextResponse } from "next/server";
import { queryFirestoreCollectionRest } from "@/lib/firebaseRestAdmin";
import type { Invoice } from "@/lib/invoicesDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Universal Patient Invoices Resolver Route
 * Fetches all official invoices belonging to a specific patient by patientId, phone, or email.
 * Bypasses client-side Firestore security rule limitations for seamless Patient Hub access.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId") || searchParams.get("customId") || "";
    const phone = searchParams.get("phone") || "";
    const email = searchParams.get("email") || "";
    const name = searchParams.get("name") || "";
    const excludeVoided = searchParams.get("excludeVoided") !== "false";

    const invoices = await resolvePatientInvoices({
      patientId,
      phone,
      email,
      name,
      excludeVoided,
    });

    return NextResponse.json({ success: true, invoices });
  } catch (err: any) {
    console.error("[API Patient Invoices GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch patient invoices." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      patientId = "",
      customId = "",
      phone = "",
      email = "",
      name = "",
      excludeVoided = true,
    } = body;

    const invoices = await resolvePatientInvoices({
      patientId: patientId || customId,
      phone,
      email,
      name,
      excludeVoided,
    });

    return NextResponse.json({ success: true, invoices });
  } catch (err: any) {
    console.error("[API Patient Invoices POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch patient invoices." },
      { status: 500 }
    );
  }
}

async function resolvePatientInvoices({
  patientId,
  phone,
  email,
  name,
  excludeVoided,
}: {
  patientId?: string;
  phone?: string;
  email?: string;
  name?: string;
  excludeVoided?: boolean;
}): Promise<Invoice[]> {
  const targetPid = (patientId || "").trim().toUpperCase();
  const targetEmail = (email || "").trim().toLowerCase();
  const rawDigits = (phone || "").replace(/\D/g, "");
  const targetPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : "";
  const targetName = (name || "").trim().toLowerCase();

  if (!targetPid && !targetEmail && !targetPhone) {
    return [];
  }

  // 1. Fetch all invoices via pure REST engine
  const allInvoices: any[] = await queryFirestoreCollectionRest("invoices");

  // 2. Strict Zero-Leak Filter
  const matched = allInvoices.filter((inv) => {
    // Exclude voided/cancelled if requested (e.g. for patient view)
    if (excludeVoided && (inv.status === "voided" || inv.status === "cancelled")) {
      return false;
    }

    const invPid = (inv.patientId || "").trim().toUpperCase();
    const invEmail = (inv.patientEmail || "").trim().toLowerCase();
    const invRawPhone = (inv.patientPhone || "").replace(/\D/g, "");
    const invPhone = invRawPhone.length >= 10 ? invRawPhone.slice(-10) : "";
    const invName = (inv.patientName || "").trim().toLowerCase();

    // Rule 1: Exact Patient ID match (UHID) - 100% Primary SSOT Truth
    if (targetPid && invPid) {
      if (invPid === targetPid) return true;
    }

    // Rule 2: If invoice has a valid non-guest patientId and doesn't match targetPid, reject
    if (invPid && targetPid && invPid !== targetPid) {
      const isGuestOrMalformed = invPid.startsWith("GPC-GPC-") || invPid === "GPC-GUEST";
      if (!isGuestOrMalformed) {
        return false;
      }
    }

    // Rule 3: Exact Email match
    if (targetEmail && invEmail && invEmail === targetEmail) {
      return true;
    }

    // Rule 4: Exact last 10 digits Phone + Name match
    if (targetPhone && invPhone && targetPhone === invPhone) {
      if (targetName && invName && targetName === invName) {
        return true;
      }
      if (!targetPid) {
        return true;
      }
    }

    return false;
  });

  // 3. Sort descending by serviceDate or createdAt
  matched.sort((a, b) => {
    const getInvTime = (inv: any) => {
      if (inv.serviceDate) {
        const t = new Date(inv.serviceDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (inv.createdAt) {
        if (typeof inv.createdAt === "string") {
          const t = new Date(inv.createdAt).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
        if (inv.createdAt.seconds) {
          return inv.createdAt.seconds * 1000;
        }
      }
      return 0;
    };
    return getInvTime(b) - getInvTime(a);
  });

  return matched as Invoice[];
}
