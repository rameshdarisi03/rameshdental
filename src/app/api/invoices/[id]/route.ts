import { NextRequest, NextResponse } from "next/server";
import { 
  getFirestoreDocRest, 
  patchFirestoreDocRest, 
  deleteFirestoreDocRest 
} from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Individual Invoice REST Endpoint
 * Path: /api/invoices/[id]
 * Supports GET, PATCH (update/void/payment status), and DELETE via Server Admin REST.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: "Missing invoice ID." }, { status: 400 });
    }

    const doc = await getFirestoreDocRest("invoices", cleanId);
    if (!doc) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice: { id: cleanId, ...doc } });
  } catch (err: any) {
    console.error("[API Invoices [id] GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch invoice." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: "Missing invoice ID." }, { status: 400 });
    }

    const body = await req.json();
    const nowIso = new Date().toISOString();

    const patchPayload: Record<string, any> = {
      ...body,
      updatedAt: nowIso,
    };

    // Remove undefined values
    for (const key of Object.keys(patchPayload)) {
      if (patchPayload[key] === undefined) {
        delete patchPayload[key];
      }
    }

    await patchFirestoreDocRest("invoices", cleanId, patchPayload);

    return NextResponse.json({ success: true, updatedFields: patchPayload });
  } catch (err: any) {
    console.error("[API Invoices [id] PATCH] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update invoice." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || "").trim();

    if (!cleanId) {
      return NextResponse.json({ success: false, error: "Missing invoice ID." }, { status: 400 });
    }

    await deleteFirestoreDocRest("invoices", cleanId);

    return NextResponse.json({ success: true, deletedId: cleanId });
  } catch (err: any) {
    console.error("[API Invoices [id] DELETE] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to delete invoice." },
      { status: 500 }
    );
  }
}
