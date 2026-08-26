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

export const dynamic = "force-dynamic";

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
    const body: AiScanRequest = await req.json();
    const { images = [], rawText = "", enrolledTherapists = ["Dr. Kinnera", "Dr. Sarah Jenkins", "Dr. Rohan Das"] } = body;

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
You are Gait Physio Clinic's Specialist Clinical Document & Register Ingestion AI.
Analyze the provided handwritten OPD registers, clinic appointment books, reception sheets, Excel printouts, or patient intake forms and extract EVERY SINGLE patient entry into a structured JSON list.

==================================================================
1. DOMAIN VOCABULARY & CLINICAL ENTITY MAPPING
==================================================================
- Patient Names: Handwritten or printed full names (e.g. "Rahul Sharma", "Smt. Kamala", "Ananya D"). Strip serial numbers like "1. Rahul" -> "Rahul".
- Age terms: "Age", "Yrs", "Y", "34 Yrs", "28 F", "52/M", "45". Extract plain integer (e.g. 34).
- Gender terms: "M", "F", "Male", "Female", "Woman", "Man", "Boy", "Girl".
- Phone terms: "Phone", "Mobile", "Contact", "Ph", "Mob", "Tel", "WhatsApp", 10-digit Indian numbers starting with 6/7/8/9.
- Email: Patient email address if written.
- Chief Complaints / Diagnosis: "Diagnosis", "Complaint", "Condition", "Problem", "Rx", "Treatment", e.g. "Cervical Spondylosis", "ACL Rehab", "Frozen Shoulder", "Knee OA", "Lumbar Disc Herniation", "Sciatica", "Stroke Rehab", "Post-op Fracture".
- Therapist / Doctor terms: "Dr. Kinnera", "Dr. Sarah Jenkins", "Dr. Rohan", "Consultant", "Therapist", "Attending". Match closest clinic therapist: [${enrolledTherapists.join(", ")}].
- Status terms: "Active", "Completed", "Pending", "Discharged", "New", "Follow-up".

==================================================================
2. SEMANTIC REASONING & SYNONYM FLEXIBILITY RULE
==================================================================
- If headers are missing, deduce field meanings from the data values:
  * 10 digits starting with 6/7/8/9 -> Phone Number
  * 1-3 digits following name or under age column -> Age
  * Medical phrases (Neck pain, Knee pain, ACL, Physio) -> Treatment Plan
  * Indian names -> Full Name

==================================================================
3. FIELD-BY-FIELD EXTRACTION SPECIFICATIONS
==================================================================
1. "name" (string): Full name in Title Case (e.g. "Rahul Sharma"). Strip stray prefix numbers.
2. "age" (string): Plain integer string (e.g. "34"). If missing, default "35".
3. "gender" (string): "Male" | "Female" | "Other".
4. "phone" (string): Clean 10-digit Indian mobile number (e.g. "9876543210"). Strip "+91", "0", spaces, hyphens.
5. "email" (string): Email if written, else "".
6. "treatmentPlan" (string): Chief complaint or treatment protocol (e.g. "Cervical Spondylosis", "Post-op ACL Recovery").
7. "therapistName" (string): Matched clinic therapist or "${defaultTherapist}".
8. "status" (string): "active" | "completed" | "pending".

==================================================================
4. STRICT ROW INTEGRITY
==================================================================
- Extract ONLY rows with actual handwritten or printed patient entries.
- Do NOT generate fake or placeholder records.

==================================================================
5. OUTPUT JSON SCHEMA ONLY (NO MARKDOWN WRAPPERS)
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

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            }
          );

          const result = await response.json();
          const textResponse = result?.candidates?.[0]?.content?.parts?.[0]?.text;

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
