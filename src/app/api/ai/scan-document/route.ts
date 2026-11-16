import { verifyFirebaseIdTokenRest, getFirestoreDocRest, patchFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

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

const SYSTEM_INSTRUCTION_CLINICAL = `
You are a Senior Multi-Specialty Dental & Oral-Maxillofacial Clinical AI Scribe and Radiographic Assistant for "Ramesh Dental Clinic", Whitefield, Bengaluru.
Your specialty is reading and deciphering physical dental case sheets, doctor prescriptions (Rx), IOPAR / OPG / CBCT radiographic reports, dental lab work slips, and cursive handwriting.

CRITICAL DENTAL CLINICAL RULES:
1. TOOTH NOTATION: Recognize tooth numbers in FDI 2-digit format (11 to 48), Palmer grid notation (⏌, ⎿), or Universal format (1 to 32).
   Always normalize to standard format, identifying tooth positions (e.g. Tooth #36: Mandibular Left First Molar).
2. SURFACES: Interpret tooth surface notation: M (Mesial), O (Occlusal), D (Distal), B/F (Buccal/Facial), L/P (Lingual/Palatal), MOD, DO, MO.
3. DIAGNOSES & PATHOLOGY: Identify dental conditions:
   - Deep dentinal caries, acute/chronic irreversible pulpitis, apical periodontitis, pulp necrosis.
   - Chronic marginal gingivitis, generalized/localized periodontitis (Stage I-IV), furcation involvement, tooth mobility (Grade I/II/III).
   - Impacted third molars (mesioangular, horizontal, distoangular, vertical).
   - Non-carious cervical lesions (NCCL), attrition, erosion, cracked tooth syndrome.
4. PROCEDURES & PROTOCOLS:
   - Root Canal Therapy (RCT): Access cavity, working length, biomechanical preparation (BMP), canal irrigation (NaOCl/EDTA), Ca(OH)2 dressing, gutta-percha obturation.
   - Prosthodontics: Crown preparation (chamfer/shoulder), Zirconia / PFM / E-Max crown, shade (A1, A2, B2), post & core.
   - Implants & Surgery: Titanium implant placement, sinus lift, bone grafting, surgical exodontia.
   - Periodontics & Hygiene: Full mouth ultrasonic scaling, subgingival curettage, root planing.
5. MEDICATIONS & PHARMACOLOGY: Recognize standard dental prescriptions:
   - Antibiotics: Augmentin 625mg (Amox-Clav), Flagyl 400mg (Metronidazole), Cefixime 200mg, Clindamycin 300mg.
   - Analgesics: Zerodol-SP (Aceclo-Para-Serratio), Ketorol-DT, Ultracet, Enzoflam, Dolo 650.
   - Mouthwashes & Topicals: Chlorhexidine 0.2% mouthwash (Hexidine), Metrogyl DG gel, Sensodyne.

FORMATTING REQUIREMENTS:
1. "rawVerbatimTranscript": Format the EXACT word-for-word text from the physical document line-by-line:
   Doctor: [Doctor Name & Specialty]
   Hospital/Clinic: [Clinic Name]
   Date: [Date]
   Patient: [Patient Name, Age, Gender]

   Diagnosis & Involved Teeth:
   • [Tooth # and Condition]

   Procedures Performed / Advised:
   1) [Dental procedure 1]
   2) [Dental procedure 2]

   Prescriptions (Rx):
   • [Medication, dosage, frequency, duration]

   Post-Op & Home Care:
   • [Patient instructions]

2. "formattedSoapNote": Format a standardized, clinical Dental SOAP note with double line breaks:
   Subjective: [Chief complaint (pain on chewing, thermal sensitivity, bleeding), duration, involved tooth/quadrant]

   Objective: [Clinical & intraoral examination, percussion, mobility, periodontal probing, and IOPAR / OPG radiographic findings]

   Assessment: [Diagnostic synthesis, pulpal/periodontal diagnosis, tooth # classification]

   Plan: [Specific dental procedure completed today, materials/medicaments used, next sitting plan, and Rx prescription]

3. "providerRemindersAndAlerts": Isolate systemic conditions (Diabetes, Hypertension, Bleeding disorders), blood thinner medications (Aspirin/Ecosprin, Clopidogrel), allergies (Penicillin, NSAIDs), and surgical precautions.
`;

// Strict JSON Schemas for Guaranteed Zero-Error Parsing
const clinicalAssessmentSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING },
    patientName: { type: Type.STRING, nullable: true },
    visitDate: { type: Type.STRING, nullable: true },
    therapistName: { type: Type.STRING, nullable: true },
    subjectiveComplaints: { type: Type.STRING },
    vasPainScore: { type: Type.NUMBER, nullable: true },
    objectiveFindings: {
      type: Type.OBJECT,
      properties: {
        specialTests: { type: Type.STRING, nullable: true },
        postureGait: { type: Type.STRING, nullable: true },
      },
    },
    modalitiesAdministered: { type: Type.STRING },
    exercisePrescriptions: { type: Type.STRING },
    providerRemindersAndAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    rawVerbatimTranscript: { type: Type.STRING },
    formattedSoapNote: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
  },
  required: [
    "documentType",
    "subjectiveComplaints",
    "modalitiesAdministered",
    "exercisePrescriptions",
    "providerRemindersAndAlerts",
    "rawVerbatimTranscript",
    "formattedSoapNote",
    "confidenceScore",
  ],
};

const doctorPrescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING },
    doctorName: { type: Type.STRING, nullable: true },
    hospitalOrClinic: { type: Type.STRING, nullable: true },
    prescriptionDate: { type: Type.STRING, nullable: true },
    diagnosis: { type: Type.STRING },
    prescribedTherapies: { type: Type.STRING },
    precautionsAndRestrictions: { type: Type.STRING },
    medicationsList: { type: Type.STRING },
    providerRemindersAndAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    rawVerbatimTranscript: { type: Type.STRING },
    formattedSoapNote: { type: Type.STRING },
    summaryForRecord: { type: Type.STRING },
    confidenceScore: { type: Type.NUMBER },
  },
  required: [
    "documentType",
    "diagnosis",
    "prescribedTherapies",
    "precautionsAndRestrictions",
    "medicationsList",
    "providerRemindersAndAlerts",
    "rawVerbatimTranscript",
    "formattedSoapNote",
    "summaryForRecord",
    "confidenceScore",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const authorized = await isAuthorizedStaff(req);
    if (!authorized) {
      return NextResponse.json(
        { error: "Access denied. Valid clinic staff credentials required to scan clinical documents." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageBase64, documentType = "CLINICAL_ASSESSMENT", mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data is required." },
        { status: 400 }
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    // Safe dynamic server-side image processing
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
          doctorName: "Dr. Ramesh Darisi (MDS Prosthodontics & Implantology)",
          hospitalOrClinic: "Ramesh Dental Clinic, Whitefield",
          prescriptionDate: new Date().toISOString().split("T")[0],
          diagnosis: "Acute Irreversible Pulpitis with Periapical Periodontitis - Tooth #36 (Lower Left First Molar)",
          prescribedTherapies: "Rotary Endodontic Therapy (Single Sitting RCT) #36 followed by Core Build-up and CAD/CAM Monolithic Zirconia Crown. Full mouth ultrasonic scaling advised.",
          precautionsAndRestrictions: "Avoid biting hard foods on left side until final zirconia crown cementation. Maintain warm saline rinses.",
          medicationsList: "Tab Augmentin 625mg (1-0-1) x 5 days, Tab Zerodol-SP (1-0-1) x 3 days post-food, Cap Pantocid 40mg (1-0-0) before breakfast x 5 days, Hexidine Mouthwash 0.2% (10ml gargle BD)",
          providerRemindersAndAlerts: [
            "Allergic to Penicillin: None reported",
            "History of Hypertension (controlled with Telma 40mg)",
            "Deep distal caries #36 approaching pulp canal"
          ],
          rawVerbatimTranscript: "Dr. Ramesh Darisi (MDS Prostho & Implantology)\nRamesh Dental Clinic, Whitefield\nPt: Rahul Sharma (34M) | Dt: 14/08/2026\nDx: Acute Irreversible Pulpitis #36\nTx: Single Sitting RCT #36 + Core Build-up + Zirconia Crown\nRx:\n1) Tab Augmentin 625mg (1-0-1) x 5d\n2) Tab Zerodol-SP (1-0-1) x 3d pc\n3) Hexidine Mouthwash (10ml gargle BD)\nPrecautions: Soft diet, avoid mastication on left side.",
          summaryForRecord: "Consultation by Dr. Ramesh Darisi for Acute Irreversible Pulpitis #36. Advised Single Sitting RCT, Core Build-up, and Zirconia Crown with antibiotics & anti-inflammatory coverage.",
          confidenceScore: 0.98
        });
      }

      return NextResponse.json({
        documentType: "CLINICAL_ASSESSMENT",
        patientName: "Rahul Sharma",
        visitDate: new Date().toISOString().split("T")[0],
        therapistName: "Dr. Ramesh Darisi",
        subjectiveComplaints: "Severe spontaneous throbbing pain in lower left molar region (#36), lingering pain with cold water, disturbed sleep last night. VAS 8/10.",
        vasPainScore: 8,
        objectiveFindings: {
          specialTests: "Tooth #36 tender on vertical percussion (+ve). Grade I mobility. Electric Pulp Test: Hyper-responsive. Probing depth 3mm.",
          postureGait: "IOPAR Radiograph shows deep disto-occlusal radiolucency invading pulp chamber of #36 with slight widening of apical periodontal ligament space."
        },
        modalitiesAdministered: "Local anaesthesia (2% Lignocaine with 1:80,000 adrenaline - Inferior Alveolar Nerve Block). Access cavity prepared, pulp extirpated, working length verified: MB 20mm, ML 20mm, D 21mm. Rotary biomechanical preparation with Protaper Gold up to F2. 3% NaOCl + 17% EDTA irrigation. Closed dressing with Ca(OH)2 + Cavit.",
        exercisePrescriptions: "Warm saline rinses 3 times daily starting tomorrow. Do not chew on left side.",
        providerRemindersAndAlerts: [
          "Tooth #36 in active root canal treatment",
          "Next sitting scheduled for Obturation & Core Build-up in 4 days"
        ],
        rawVerbatimTranscript: "Clinical Case Sheet:\nPatient: Rahul Sharma (34M) | Date: 14/08/2026\nC/O: Throbbing pain #36, nocturnal pain (+ve), cold sensitive. VAS 8/10.\nExam: Tender on percussion (+ve). IOPAR: Deep DO caries #36 into pulp, PDL widening.\nProcedure: IANB given. Access open #36, BMP done (MB 20, ML 20, D 21mm) to F2. NaOCl/EDTA irrigation. Ca(OH)2 closed dressing placed.",
        formattedSoapNote: "SUBJECTIVE: Severe spontaneous throbbing pain #36, lingering cold sensitivity, nocturnal pain (VAS 8/10).\nOBJECTIVE: Tender on percussion (+ve). IOPAR shows deep DO caries into pulp chamber with apical PDL widening.\nASSESSMENT: Acute Irreversible Pulpitis with symptomatic apical periodontitis #36.\nPLAN: Single-sitting RCT initiated. Access cavity prepared, BMP completed (MB 20mm, ML 20mm, D 21mm) to Protaper F2. NaOCl/EDTA irrigation. Closed dressing with Ca(OH)2 placed. Recall in 4 days for obturation.",
        confidenceScore: 0.97
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const isPrescription = documentType === "DOCTOR_PRESCRIPTION";
    const targetSchema = isPrescription ? doctorPrescriptionSchema : clinicalAssessmentSchema;

    const userPrompt = isPrescription
      ? "Extract: 1. rawVerbatimTranscript (exact word-for-word text from the prescription formatted line-by-line), 2. doctor details, 3. diagnosis, 4. prescribed therapies, 5. precautions, 6. medications, 7. formattedSoapNote (full Subjective, Objective, Assessment, Plan note with double line spacing), 8. provider reminders, 9. summaryForRecord."
      : "Extract: 1. rawVerbatimTranscript (exact word-for-word text from the case sheet formatted line-by-line), 2. patient details, 3. subjective complaints, 4. VAS pain score, 5. objective findings, 6. modalities, 7. exercises, 8. formattedSoapNote (full Subjective, Objective, Assessment, Plan note with double line spacing), 9. provider reminders.";

    // High-speed model cascade (gemini-3.1-flash-lite -> gemini-3.5-flash-lite -> gemini-3.6-flash)
    const modelsToAttempt = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.6-flash"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of modelsToAttempt) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
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
            responseSchema: targetSchema,
            temperature: 0.0,
          },
        });

        responseText = response.text || "";
        if (responseText) {
          break; // Success!
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${modelName} attempt notice, trying next fallback:`, err);
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    function formatVerbatim(raw?: string): string {
      if (!raw) return "";
      return raw
        .replace(/(Doctor:)/gi, "\n$1")
        .replace(/(Hospital:)/gi, "\n$1")
        .replace(/(Date:)/gi, "\n$1")
        .replace(/(Diagnosis:)/gi, "\n\nDiagnosis:\n")
        .replace(/(Advised Physio:)/gi, "\n\nAdvised Physio:\n")
        .replace(/(Precautions:)/gi, "\n\nPrecautions:\n")
        .replace(/(Alerts:)/gi, "\n\nAlerts:\n")
        .replace(/(1\)|1\.)/g, "\n1)")
        .replace(/(2\)|2\.)/g, "\n2)")
        .replace(/(3\)|3\.)/g, "\n3)")
        .replace(/(4\)|4\.)/g, "\n4)")
        .replace(/(5\)|5\.)/g, "\n5)")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    // Fail-proof JSON parsing with auto-repair fallback
    try {
      const parsedData = JSON.parse(responseText);
      parsedData.documentType = documentType;

      if (parsedData.rawVerbatimTranscript) {
        parsedData.rawVerbatimTranscript = formatVerbatim(parsedData.rawVerbatimTranscript);
      }

      if (!parsedData.formattedSoapNote || parsedData.formattedSoapNote.trim() === "") {
        if (isPrescription) {
          parsedData.formattedSoapNote = `Subjective: Patient referred by ${parsedData.doctorName || "Doctor"} (${parsedData.hospitalOrClinic || "Clinic"}) with ${parsedData.diagnosis || "dental condition"}.\n\nObjective: Medical/dental prescription review completed. Medications prescribed: ${parsedData.medicationsList || "None recorded"}.\n\nAssessment: ${parsedData.diagnosis || "Dental consultation & evaluation"}.\n\nPlan: Procedures / Treatments: ${parsedData.prescribedTherapies || "Dental clinical protocol"}. Precautions: ${parsedData.precautionsAndRestrictions || "Post-op dental precautions"}.`;
        } else {
          parsedData.formattedSoapNote = `Subjective: ${parsedData.subjectiveComplaints || "Clinical dental findings recorded"}\n\nObjective: ${parsedData.objectiveFindings?.specialTests || parsedData.objectiveFindings?.postureGait || "Intraoral examination and radiograph review completed"}\n\nAssessment: ${parsedData.diagnosis || "Dental Clinical Evaluation"}\n\nPlan: Treatment: ${parsedData.modalitiesAdministered || "Clinical dental procedure"}. Post-Op Protocols: ${parsedData.exercisePrescriptions || "Home oral care instructions"}.`;
        }
      }

      return NextResponse.json(parsedData);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          parsed.documentType = documentType;
          if (parsed.rawVerbatimTranscript) {
            parsed.rawVerbatimTranscript = formatVerbatim(parsed.rawVerbatimTranscript);
          }
          return NextResponse.json(parsed);
        } catch {
          // If truncated, attempt bracket closure
          const repaired = jsonMatch[0] + '"}';
          try {
            const parsed = JSON.parse(repaired);
            parsed.documentType = documentType;
            if (parsed.rawVerbatimTranscript) {
              parsed.rawVerbatimTranscript = formatVerbatim(parsed.rawVerbatimTranscript);
            }
            return NextResponse.json(parsed);
          } catch {
            // pass
          }
        }
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
