import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION_CLINICAL = `
You are a Senior Multi-Specialty Clinical AI Medical Scribe for "Gait Physio Clinic", Whitefield, Bengaluru.
Transcribe and decode physical medical documents (Therapist Case Sheets & External Doctor Prescriptions) across ALL medical specialties (Neurology, Orthopedics, Gynecology, Psychiatry, Geriatrics, Pulmonology) including rushed/messy doctor handwriting.

KNOWLEDGE BASE & CLINICAL CONTEXT:
- Hospitals: Manipal Whitefield, Aster Whitefield, Sakra World, Vydehi VIMS, Apollo Clinic, Cloudnine, RxDx.
- Abbrevs: VAS, ROM, SLR, IFT, UST, TENS, DN, SWD, PIVD, OA, TKR, ACL, PNF, AFO, DRA, PFMT, LSCS, FMS, HTN, T2DM, CVA.
- Decode cursive/scribbles by synthesizing visible letters, doctor specialty, standard dosage syntax (1-0-1, OD, BD, SOS), and clinical protocols.
- CLINICAL SAFETY: Always isolate pre-existing trauma, surgeries, implants, systemic conditions (diabetes, HTN), contraindications, and active medications into "providerRemindersAndAlerts".
- Output valid JSON only.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, documentType = "CLINICAL_ASSESSMENT", mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data is required." },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Safe dynamic server-side image optimization
    let optimizedBase64 = cleanBase64;
    let finalMimeType = mimeType || "image/jpeg";

    try {
      const sharpModule = await import("sharp");
      const sharp = sharpModule.default || sharpModule;
      const inputBuffer = Buffer.from(cleanBase64, "base64");
      const processedBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .normalize()
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      optimizedBase64 = processedBuffer.toString("base64");
      finalMimeType = "image/jpeg";
    } catch {
      optimizedBase64 = cleanBase64;
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment, returning simulation mock.");
      if (documentType === "DOCTOR_PRESCRIPTION") {
        return NextResponse.json({
          documentType: "DOCTOR_PRESCRIPTION",
          doctorName: "Dr. Rajesh Kumar (MS Ortho)",
          hospitalOrClinic: "Manipal Hospital, Whitefield",
          prescriptionDate: new Date().toISOString().split("T")[0],
          diagnosis: "Post-op Right Knee Total Knee Replacement (TKR) - Day 14",
          prescribedTherapies: "Start Phase 2 rehabilitation: Active-assisted knee ROM (0°-90°), Quadriceps isometric sets, Cryotherapy post-session, Gait training with walker.",
          precautionsAndRestrictions: "Partial weight bearing only with walker. Avoid twisting.",
          medicationsList: "Tab Ecosprin 75mg (1-0-0) x 1 month, Tab Ultracet SOS for pain",
          providerRemindersAndAlerts: [
            "Post-op Right TKR (Day 14)",
            "Hypertension & Diabetes",
            "On Blood Thinners (Ecosprin 75mg) - Avoid deep tissue bruising"
          ],
          summaryForRecord: "Referred by Dr. Rajesh Kumar (Manipal Hospital, Whitefield) for Post-op Right TKR rehab. Focus on active-assisted ROM (0-90°) and isometric strengthening.",
          confidenceScore: 0.98
        });
      }

      return NextResponse.json({
        documentType: "CLINICAL_ASSESSMENT",
        patientName: "Rahul Sharma",
        visitDate: new Date().toISOString().split("T")[0],
        therapistName: "Dr. Kinnera",
        subjectiveComplaints: "Right knee stiffness & pain post-ACL reconstruction (Day 21). VAS 6/10.",
        vasPainScore: 6,
        objectiveFindings: {
          lumbarFlexion: null,
          specialTests: "Knee Flexion 85°, Extension -5° lag. Lachman test negative.",
          postureGait: "Antalgic gait with reduced cadence and limp on right stance phase."
        },
        modalitiesAdministered: "IFT (15 mins) on knee, Cryotherapy, Patellar mobilization Grade II, Passive ROM to 90°",
        exercisePrescriptions: "Quad sets (15x3), Heel slides, Straight Leg Raise (SLR) with brace",
        providerRemindersAndAlerts: [
          "Past sports injury (2024)",
          "Metal suture anchor in right tibia",
          "Post-op Right ACL Reconstruction (Day 21)"
        ],
        formattedSoapNote: "S: Right knee stiffness & pain post-ACL reconstruction Day 21 (VAS 6/10).\nO: Knee Flexion 85°, Extension -5° lag. Lachman negative. Antalgic gait.\nA: Post-op ACL reconstruction rehabilitation Phase 1.\nP: IFT (15m) + Cryotherapy + Patellar Grade II mobilization + Quad sets (15x3) & Heel slides.",
        confidenceScore: 0.96
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = documentType === "DOCTOR_PRESCRIPTION"
      ? `Analyze this doctor's handwritten referral/prescription. Extract into JSON:
{
  "documentType": "DOCTOR_PRESCRIPTION",
  "doctorName": string or null,
  "hospitalOrClinic": string or null,
  "prescriptionDate": string or null,
  "diagnosis": string,
  "prescribedTherapies": string,
  "precautionsAndRestrictions": string,
  "medicationsList": string,
  "providerRemindersAndAlerts": string[],
  "summaryForRecord": string,
  "confidenceScore": number
}`
      : `Analyze this physiotherapist's handwritten assessment/session note. Extract into JSON:
{
  "documentType": "CLINICAL_ASSESSMENT",
  "patientName": string or null,
  "visitDate": string or null,
  "therapistName": string or null,
  "subjectiveComplaints": string,
  "vasPainScore": number or null,
  "objectiveFindings": {
    "lumbarFlexion": string or null,
    "specialTests": string,
    "postureGait": string
  },
  "modalitiesAdministered": string,
  "exercisePrescriptions": string,
  "providerRemindersAndAlerts": string[],
  "formattedSoapNote": string,
  "confidenceScore": number
}`;

    // Fast inference with greedy decoding (temperature: 0.0)
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType: finalMimeType,
                data: optimizedBase64,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CLINICAL,
        responseMimeType: "application/json",
        temperature: 0.0,
        maxOutputTokens: 800,
      },
    });

    const responseText = response.text || "";

    try {
      const parsedData = JSON.parse(responseText);
      return NextResponse.json(parsedData);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return NextResponse.json(JSON.parse(jsonMatch[0]));
      }
      return NextResponse.json(
        { error: "Could not parse structured JSON from OCR response", raw: responseText },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Gemini Document OCR Error:", error);
    return NextResponse.json(
      { 
        error: error?.message || "Failed to process document with Gemini AI",
        details: String(error)
      },
      { status: 500 }
    );
  }
}
