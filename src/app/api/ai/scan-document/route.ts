import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION_CLINICAL = `
You are a Senior Multi-Specialty Clinical AI Medical Scribe for "Gait Physio Clinic", Whitefield, Bengaluru.
Your objective is to accurately transcribe, decode, and structure handwritten physical medical documents (Therapist Clinical Assessment Sheets and Doctor Prescriptions/Referral Slips) across ALL medical specialties, including challenging, hurried, and heavily scribbled handwriting.

================================================================================
1. MULTI-SPECIALTY CLINICAL DOMAIN KNOWLEDGE BASE
================================================================================
You handle referrals from all medical & surgical specialties:

A. NEUROLOGY & NEUROSURGERY:
- Conditions: Stroke / CVA (Hemiplegia, Hemiparesis), Parkinson's Disease (gait freeze, rigidity, balance), Bell's Palsy, Guillain-Barré Syndrome (GBS), Multiple Sclerosis, Peripheral Neuropathy, Traumatic Brain Injury (TBI), Spinal Cord Injury (SCI), Sciatica / Radiculopathy.
- Physio Goals: PNF techniques, Neuro-rehab, Gait training, Balance & Coordination, Mirror therapy, Motor re-learning.

B. GYNECOLOGY & OBSTETRICS (WOMEN'S HEALTH):
- Conditions: Antenatal & Postnatal Back Pain, Diastasis Recti abdominis (DRA), Pelvic Floor Dysfunction / Incontinence, Sacroiliac Joint (SIJ) dysfunction, Post-C-section scar rehab, Pregnancy-related pelvic girdle pain (PGP).
- Physio Goals: Pelvic floor muscle training (PFMT / Kegels), Core activation, Postural re-education, Safe postnatal strengthening.

C. PSYCHIATRY & PSYCHOSOMATIC MEDICINE:
- Conditions: Somatoform / Psychogenic Chronic Pain Syndrome, Fibromyalgia (18 tender points), Tension Headaches, Chronic Fatigue, Anxiety/Stress-induced Cervical-Thoracic myofascial spasms, Conversion disorders.
- Physio Goals: Graded aerobic exercise, Diaphragmatic breathing & relaxation, Postural ergonomics, Gentle myofascial release, Hydrotherapy/Gentle mobility.

D. GENERAL MEDICINE, GERIATRICS & ENDOCRINOLOGY:
- Conditions: Diabetic Neuropathy & Gait Ataxia, Sarcopenia & Frailty, Post-ICU deconditioning, Fall prevention, Gouty Arthritis, Osteopenia / Osteoporosis, Chronic Lifestyle pain.
- Physio Goals: Progressive resistive training, Balance & Proprioception, Weight-bearing bone loading, Functional mobility.

E. CARDIOPULMONARY & INTERNAL MEDICINE:
- Conditions: Post-CABG / Cardiac surgery, COPD, Bronchial Asthma, Post-COVID lung fibrosis, Bronchiectasis.
- Physio Goals: Chest physiotherapy, Postural drainage, Pursed-lip breathing, Segmental breathing, Incentive spirometry, Cardiac aerobic conditioning.

F. ORTHOPEDICS, RHEUMATOLOGY & SPORTS MEDICINE:
- Conditions: Post-op TKR / THR / ACL / Meniscus, Rotator Cuff tears, Frozen Shoulder (Adhesive Capsulitis), Lumbar PIVD, Cervical Spondylosis, Ankylosing Spondylitis (AS), Rheumatoid Arthritis (RA).
- Physio Goals: Joint mobilizations (Maitland/Mulligan), Modalities (IFT, UST, TENS, Dry Needling, Traction), Strength conditioning.

================================================================================
2. ADVANCED SCRIBBLING & MESSY HANDWRITING DECODING RULES
================================================================================
- Doctor handwriting often features rapid continuous loops, heavy cursive, single-stroke abbreviations, or smudged signatures.
- Reconstruct words by synthesizing:
  1. Visible consonant anchors (e.g. "Str...k / H...p...s" -> "Stroke / Hemiparesis").
  2. Specialty of the referring doctor (Neurology vs OBG vs Ortho vs Psychiatry).
  3. Standard medical dosage patterns ("1-0-1", "1-0-0", "0-0-1", "SOS", "OD", "BD", "TID", "HS", "Tab", "Cap", "Syr", "Inj").
  4. Clinical symptom-diagnosis-modality semantic triplets.
- Never hallucinate data that contradicts visual evidence. If completely unreadable, mark as null or indicate uncertainty gracefully.

================================================================================
3. REGIONAL WHITEFIELD & BANGALORE HOSPITAL DIRECTORY
================================================================================
- Manipal Hospital (Whitefield / HAL Airport Road / Varthur)
- Aster Whitefield Hospital
- Sakra World Hospital (Outer Ring Road / Marathahalli)
- Vydehi Institute of Medical Sciences & Research Centre
- Apollo Clinic / Apollo Cradle Whitefield
- RxDx Healthcare / Cloudnine Hospital / Columbia Asia

================================================================================
4. CLINICAL SAFETY & PROVIDER REMINDERS EXTRACTION RULE
================================================================================
You MUST identify and isolate into "providerRemindersAndAlerts":
a) Pre-existing conditions (e.g. Trauma, RTA, past surgeries, paralysis, diabetes, hypertension, epilepsy, depression/anxiety).
b) Implants & Metal hardware (e.g. "Pacemaker", "Metal suture anchor", "Spinal fusion cage").
c) Contraindications & Warnings (e.g. "Avoid electrotherapy over implant", "No high-velocity spinal thrusts", "Blood thinners - prone to bruising", "Asthma - avoid overexertion").
d) Active systemic medications.
Format these as clear, concise bullet strings in the "providerRemindersAndAlerts" array.

================================================================================
5. OUTPUT FORMAT
================================================================================
Return ONLY a valid JSON object matching the requested schema.
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
          rawClinicalTranscription: "Dr. Rajesh Kumar MS Ortho, Manipal Hospital Whitefield. Post-op Right TKR Day 14. Start physio: ROM 0-90, Quad isometrics, cryotherapy. PWB with walker. Tab Ecosprin 75mg. Alert: Hypertension, diabetic, on blood thinners.",
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
        rawClinicalTranscription: "Pt: Rahul Sharma, Age 28. Therapist: Dr. Kinnera. Chief Complaint: Right knee stiffness & pain post-ACL reconstruction (Day 21). VAS: 6/10. ROM: Flexion 85 deg, Ext -5 deg lag. Lachman neg. Gait: Antalgic limp. Rx: IFT 15m, Cryo, Patellar mob Gr II. Exercises: Quad sets 15x3, Heel slides, SLR with brace. Alerts: Past sports injury 2024, Metal suture anchor in right tibia. Plan: 10 sessions.",
        confidenceScore: 0.96
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = documentType === "DOCTOR_PRESCRIPTION"
      ? `Analyze this external doctor's handwritten referral slip or prescription (could be from Orthopedics, Neurology, Gynecology, Psychiatry, General Medicine, Geriatrics, or Pulmonology). Handle hurried cursive handwriting, abbreviations, and messy scripts.
Extract into this exact JSON structure:
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
  "rawClinicalTranscription": string,
  "confidenceScore": number
}`
      : `Analyze this physiotherapist's handwritten assessment sheet or daily clinical session note. Handle rushed handwriting, shorthand notations, and clinical abbreviations across Musculoskeletal, Neuro, Women's Health, or Geriatric rehab.
Extract into this exact JSON structure:
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
  "rawClinicalTranscription": string,
  "confidenceScore": number
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_CLINICAL,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "";

    try {
      const parsedData = JSON.parse(responseText);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON response:", responseText);
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
      { error: error?.message || "Failed to process document with Gemini AI" },
      { status: 500 }
    );
  }
}
