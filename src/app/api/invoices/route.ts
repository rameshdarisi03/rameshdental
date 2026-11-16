import { NextRequest, NextResponse } from "next/server";
import { 
  queryFirestoreCollectionRest, 
  setFirestoreDocRest, 
  patchFirestoreDocRest 
} from "@/lib/firebaseRestAdmin";
import type { Invoice } from "@/lib/invoicesDb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Master Invoices REST Endpoint
 * Path: /api/invoices
 * Provides infallible server-side Admin REST operations for creating and reading invoices,
 * ensuring staff and doctors never encounter client-side Firestore permission blocks.
 */

export async function GET(req: NextRequest) {
  try {
    const allInvoices = await queryFirestoreCollectionRest("invoices");

    // Sort descending by createdAt or serviceDate
    allInvoices.sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ success: true, invoices: allInvoices });
  } catch (err: any) {
    console.error("[API Invoices GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch invoices." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      invoiceNumber,
      patientId,
      patientName,
      patientEmail,
      patientPhone,
      therapistName,
      serviceDate,
      dueDate,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      totalAmount,
      currency = "INR",
      status = "paid",
      paymentMethod = "UPI",
      notes = "",
      voidReason = "",
      replacesInvoiceNumber,
      revision = 1,
    } = body;

    if (!invoiceNumber || !patientName) {
      return NextResponse.json(
        { success: false, error: "Missing required invoiceNumber or patientName." },
        { status: 400 }
      );
    }

    const docId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nowIso = new Date().toISOString();

    const invoicePayload = {
      invoiceNumber: String(invoiceNumber),
      patientId: String(patientId || ""),
      patientName: String(patientName || ""),
      patientEmail: String(patientEmail || ""),
      patientPhone: String(patientPhone || ""),
      therapistName: String(therapistName || "Dr. Ramesh Darisi"),
      serviceDate: String(serviceDate || nowIso.split("T")[0]),
      dueDate: String(dueDate || nowIso.split("T")[0]),
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      discount: Number(discount) || 0,
      totalAmount: Number(totalAmount) || 0,
      currency: String(currency || "INR"),
      status: status || "paid",
      paymentMethod: paymentMethod || "UPI",
      notes: String(notes || ""),
      voidReason: String(voidReason || ""),
      replacesInvoiceNumber: replacesInvoiceNumber ? String(replacesInvoiceNumber) : undefined,
      revision: Number(revision) || 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Remove any undefined keys
    const cleanPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(invoicePayload)) {
      if (v !== undefined) {
        cleanPayload[k] = v;
      }
    }

    // 1. Write invoice to Firestore via Server Admin REST (bypasses all client rules)
    await setFirestoreDocRest("invoices", docId, cleanPayload);

    // 2. If replacing a previous voided invoice, mark old invoice
    if (replacesInvoiceNumber) {
      try {
        const allInvoices = await queryFirestoreCollectionRest("invoices");
        const oldInv = allInvoices.find((i: any) => i.invoiceNumber === replacesInvoiceNumber);
        if (oldInv && oldInv.id) {
          await patchFirestoreDocRest("invoices", oldInv.id, {
            replacedByInvoiceNumber: invoiceNumber,
            updatedAt: nowIso,
          });
        }
      } catch (linkErr) {
        console.warn("[API Invoices POST] Could not mark voided invoice as replaced:", linkErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: docId,
      invoice: {
        id: docId,
        ...cleanPayload,
      },
    });
  } catch (err: any) {
    console.error("[API Invoices POST] Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create invoice." },
      { status: 500 }
    );
  }
}
