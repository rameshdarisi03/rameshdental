import { verifyFirebaseIdTokenRest, getFirestoreDocRest, patchFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import {
  FastTrackPatientRow,
  normalizeIndianPhoneNumber,
  formatProperCaseName,
  extractAgeNumber,
  detectGender,
  detectStatus
} from "@/lib/fastTrackPatientParser";

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
      const decoded = await verifyFirebaseIdTokenRest(bearerToken);
      if (decoded?.uid) {
        const userDoc = await getFirestoreDocRest("users", decoded.uid);
        if (userDoc && ["admin", "receptionist", "doctor", "staff"].includes(userDoc.role)) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

interface AiScanRequest {
  images?: { data: string; mimeType: string; name?: string }[];
  rawText?: string;
  enrolledTherapists?: string[];
}

// 📄 Helper: Split large multi-page PDFs into parallel 5-page sub-documents
async function expandMultiPagePdfs(
  rawImages: { data: string; mimeType: string; name?: string }[]
): Promise<{ data: string; mimeType: string }[]> {
  const expanded: { data: string; mimeType: string }[] = [];

  for (const item of rawImages) {
    const isPdf =
      item.mimeType === "application/pdf" ||
      item.data.startsWith("data:application/pdf") ||
      (typeof item.name === "string" && item.name.toLowerCase().endsWith(".pdf"));

    if (isPdf) {
      try {
        const base64Data = item.data.replace(/^data:[a-z0-9\/\-\+\.]+;base64,/i, "");
        const buffer = Buffer.from(base64Data, "base64");
        const srcDoc = await PDFDocument.load(buffer);
        const pageCount = srcDoc.getPageCount();

        if (pageCount > 5) {
          const SUB_CHUNK_PAGES = 5;
          for (let start = 0; start < pageCount; start += SUB_CHUNK_PAGES) {
            const end = Math.min(start + SUB_CHUNK_PAGES, pageCount);
            const subDoc = await PDFDocument.create();
            const pageIndices = Array.from({ length: end - start }, (_, k) => start + k);
            const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
            copiedPages.forEach((p) => subDoc.addPage(p));
            const subPdfBytes = await subDoc.save();
            const subBase64 = Buffer.from(subPdfBytes).toString("base64");
            expanded.push({
              data: `data:application/pdf;base64,${subBase64}`,
              mimeType: "application/pdf",
            });
          }
          continue;
        }
      } catch (err) {
        console.warn("Could not split multi-page PDF into sub-documents, processing full PDF:", err);
      }
    }

    expanded.push(item);
  }

  return expanded;
}

export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(req);
    if (!authorized) {
      return NextResponse.json(
        { success: false, error: "Access denied. Valid clinic staff credentials required to use fasttrack AI ingestion." },
        { status: 401 }
      );
    }

    const body: AiScanRequest = await req.json();
    const { images = [], rawText = "", enrolledTherapists = ["Dr.Kinnera", "Dr.Ridha", "Dr.Ammulu John", "Dr.Rakshitha"] } = body;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Gemini API key is not configured on server." },
        { status: 500 }
      );
    }

    const defaultTherapist = enrolledTherapists[0] || "Dr. Kinnera";

    // If images or PDFs are provided, invoke Gemini AI Vision
    if (images.length > 0) {
      const expandedImages = await expandMultiPagePdfs(images);

      const prompt = `
You are Ramesh Dental Clinic's Specialist Clinical Document, Prescription & Register Ingestion AI.
The provided documents may be:
1. Individual Dental Prescription Slips / Referral Letters (one per photo/page).
2. Handwritten OPD Registers, Appointment Books, or Reception Ledger Sheets (multiple entries per page).
3. Patient Clinical Intake Forms, Dental Charting Sheets, or Treatment Plans.

Analyze the documents and extract EVERY patient into a structured JSON list for clinic registration.

==================================================================
1. PRESCRIPTION SLIP RECOGNITION RULES
==================================================================
- If the document is an individual DOCTOR PRESCRIPTION / REFERRAL SLIP:
  * Look at the top/header section for Patient Demographics: "Patient Name / Name: [Name]", "Age: [Age]", "Sex/Gender: [M/F]", "Date", "Phone/Mobile: [Number]".
  * Look at the clinical body / diagnosis section for: "Diagnosis:", "Impression:", "C/O (Complaints):", "Adv: ...", "Rx: ...", e.g., "Root Canal Treatment #36", "Dental Implants Upper Arch", "Deep Caries #16", "Full Mouth Scaling", "Zirconia Crown #21", "Impacted Third Molar #48", "Clear Aligners".
  * Look at the letterhead or signature for the Prescribing / Attending Doctor or Department.
  * Extract this as 1 complete patient entry.

==================================================================
2. MULTI-ROW REGISTER RECOGNITION RULES
==================================================================
- If the document is an OPD REGISTER / LEDGER TABLE:
  * Extract EVERY handwritten or printed patient row on the page.

==================================================================
3. DOMAIN VOCABULARY & ENTITY MAPPING
==================================================================
- Patient Names: Title Case (e.g. "Rahul Sharma", "Smt. Kamala", "Ananya D"). Strip prefixes like "1. Rahul", "Pt: Rahul" -> "Rahul".
- Age terms: "Age", "Yrs", "Y", "34 Yrs", "28 F", "52/M", "45". Extract plain integer string (e.g. "34"). If missing, default "35".
- Gender terms: "M", "F", "Male", "Female", "Woman", "Man". Extract "Male", "Female", or "Other".
- Phone terms: "Phone", "Mobile", "Contact", "Ph", "Mob", "Tel", "WhatsApp", 10-digit Indian numbers starting with 6/7/8/9. If omitted, return "".
- Email: Email if written, else "".
- Chief Complaints / Diagnosis / Treatment Plan: Extract clinical dental diagnosis, tooth complaints, or advised dental procedure (e.g. "Root Canal Therapy #36", "Dental Implants", "Zirconia Crown #16", "Clear Aligners").
- Therapist / Doctor terms: Match closest clinic therapist: [${enrolledTherapists.join(", ")}] or default to "${defaultTherapist}".
- Status terms: "active" (default), "completed", "pending".

==================================================================
4. OUTPUT JSON SCHEMA ONLY (NO MARKDOWN WRAPPERS)
==================================================================
{
  "patients": [
    {
      "name": string,
      "age": string,
      "gender": "Male" | "Female" | "Other",
      "phone": string,
      "email": string,
      "treatmentPlan": string,
      "therapistName": string,
      "status": "active" | "completed" | "pending"
    }
  ]
}
`;

      const allExtractedPatients: FastTrackPatientRow[] = [];

      // Process each image chunk with Gemini
      for (let i = 0; i < expandedImages.length; i++) {
        const item = expandedImages[i];
        const base64Data = item.data.replace(/^data:[a-z0-9\/\-\+\.]+;base64,/i, "");
        const mimeType = item.mimeType || "image/jpeg";

        try {
          const payload = {
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json"
            }
          };

          const modelsToAttempt = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.5-flash"];
          let textResponse = "";

          for (const modelName of modelsToAttempt) {
            try {
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                }
              );

              if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                console.warn(`Model ${modelName} returned status ${response.status}:`, errJson?.error?.message || errJson);
                continue;
              }

              const result = await response.json();
              textResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (textResponse) {
                break; // Found working model!
              }
            } catch (fetchErr) {
              console.warn(`Model ${modelName} fetch attempt failed:`, fetchErr);
            }
          }

          if (textResponse) {
            const cleanJson = textResponse.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
            const parsedJson = JSON.parse(cleanJson);
            const rawPatients = parsedJson.patients || parsedJson.items || parsedJson.occupants || [];

            rawPatients.forEach((p: any, idx: number) => {
              const name = formatProperCaseName(p.name || p.fullName || "");
              const age = extractAgeNumber(p.age) || "35";
              const gender = detectGender(p.gender);
              const phone = normalizeIndianPhoneNumber(p.phone || p.mobile);
              const email = (p.email || "").trim().toLowerCase();
              const treatmentPlan = (p.treatmentPlan || p.chiefComplaint || p.condition || "General Physiotherapy Consultation").trim();
              const therapistName = p.therapistName || defaultTherapist;
              const status = detectStatus(p.status);

              const digits = phone.replace(/\D/g, "");
              const isValid = !!name && digits.length >= 10;
              const warnings: string[] = [];
              if (!name) warnings.push("Name missing");
              if (digits.length < 10) warnings.push("Invalid phone");

              allExtractedPatients.push({
                id: `ai-${i}-${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: name || `Patient #${allExtractedPatients.length + 1}`,
                age,
                gender,
                phone: phone || "+91 ",
                email,
                treatmentPlan,
                therapistName,
                status,
                isValid,
                warnings,
                rawSource: JSON.stringify(p)
              });
            });
          }
        } catch (itemErr) {
          console.error(`Gemini Vision scan failed for item ${i}:`, itemErr);
        }
      }

      return NextResponse.json({
        success: allExtractedPatients.length > 0,
        source: "AI_VISION",
        rows: allExtractedPatients,
        totalDetected: allExtractedPatients.length,
        validCount: allExtractedPatients.filter((r) => r.isValid).length
      });
    }

    return NextResponse.json(
      { success: false, error: "No images or documents were provided for AI scan." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("FastTrack AI Scan Route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process documents with AI." },
      { status: 500 }
    );
  }
}
