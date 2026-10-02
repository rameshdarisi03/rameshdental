import { NextRequest, NextResponse } from "next/server";
import { updatePatientRecord } from "@/lib/firebaseRestAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, authUid, email, activationCode, linkedEmails } = body;

    if (!patientId || typeof patientId !== "string") {
      return NextResponse.json(
        { success: false, error: "Patient ID is required." },
        { status: 400 }
      );
    }

    const updates: {
      authUid?: string;
      activated?: boolean;
      activationCode?: string;
      linkedEmails?: string[];
    } = {
      activated: true,
    };

    if (authUid && typeof authUid === "string") {
      updates.authUid = authUid;
    }

    if (activationCode !== undefined) {
      updates.activationCode = "";
    }

    if (Array.isArray(linkedEmails) && linkedEmails.length > 0) {
      updates.linkedEmails = linkedEmails;
    } else if (email && typeof email === "string") {
      updates.linkedEmails = [email.trim().toLowerCase()];
    }

    await updatePatientRecord(patientId.trim(), updates);

    return NextResponse.json({
      success: true,
      message: "Patient activated successfully.",
    });
  } catch (err: any) {
    console.error("[API patient activate error]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to activate patient." },
      { status: 500 }
    );
  }
}
