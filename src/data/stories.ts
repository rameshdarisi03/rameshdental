export interface RecoveryStory {
  id: string;
  title: string;
  subtitle: string;
  category: "Endodontic Care" | "Implantology" | "Orthodontics" | "Periodontics" | "Cosmetic Dentistry";
  orientation: "portrait" | "landscape";
  videoUrl: string;
  condition?: string;
  therapist: string;
  duration?: string;
  highlights: string[];
  clinicalNotes?: string;
  doctorAssessment?: string;
  featured: boolean;
  order: number;
}

export const recoveryStories: RecoveryStory[] = [
  {
    id: "single-sitting-rotary-rct",
    title: "Acute Pulpitis & Single-Sitting Rotary RCT",
    subtitle: "Severe throbbing molar pain permanently resolved with computerized local anesthesia and CAD/CAM zirconia crown.",
    category: "Endodontic Care",
    orientation: "portrait",
    videoUrl: "/videos/stories/tibia-fracture-recovery.mp4",
    condition: "Acute Irreversible Pulpitis",
    therapist: "Dr. Ramesh Darisi, BDS, MDS",
    duration: "0:45",
    highlights: ["Digital Apex Localization", "Motorized Rotary Debridement", "Monolithic Zirconia Crown"],
    clinicalNotes: "Patient presented with acute radiating nocturnal pain on lower right first molar. Diagnostic periapical radiograph revealed deep pulpal decay. Performed single-visit root canal therapy using flexible NiTi rotary files and bioceramic sealer, followed by immediate aesthetic zirconia crown placement.",
    doctorAssessment: "Complete resolution of apical tenderness within 24 hours. Natural tooth preserved with 100% restored chewing function.",
    featured: true,
    order: 1,
  },
  {
    id: "immediate-titanium-implant",
    title: "Missing Premolar & Immediate Titanium Implant",
    subtitle: "Permanent single-tooth replacement restoring 100% natural bite force without touching adjacent teeth.",
    category: "Implantology",
    orientation: "portrait",
    videoUrl: "/videos/stories/elbow-fracture-wax-therapy.mp4",
    condition: "Missing Tooth & Masticatory Loss",
    therapist: "Dr. Ramesh Darisi, BDS, MDS",
    duration: "0:30",
    highlights: ["3D Guided Surgical Stent", "Osseointegrated Titanium", "Custom Abutment Design"],
    clinicalNotes: "Patient had missing upper right first premolar resulting in dietary compromise and tipping of neighboring teeth. Placed medical-grade titanium fixture under local anesthesia. Following full osseointegration, delivered custom-milled screw-retained ceramic restoration.",
    doctorAssessment: "Excellent bone density maintenance, zero bone resorption, and flawless aesthetic color integration with neighboring natural enamel.",
    featured: true,
    order: 2,
  },
  {
    id: "clear-aligners-gap-crowding",
    title: "Adult Anterior Crowding & Clear Aligners",
    subtitle: "Discreet orthodontic transformation correcting lower incisor crowding and upper midline diastema without metal wires.",
    category: "Orthodontics",
    orientation: "portrait",
    videoUrl: "/videos/stories/paraplegia-stair-climbing.mp4",
    condition: "Class I Malocclusion & Anterior Crowding",
    therapist: "Dr. Sneha Reddy, BDS, MDS",
    duration: "0:38",
    highlights: ["Optical 3D Intraoral Scan", "Zero Metal Brackets", "8-Month Complete Alignment"],
    clinicalNotes: "32-year-old professional seeking aesthetic orthodontic correction without conspicuous brackets. Designed digital clear aligner staging over 18 custom tray pairs with gentle interproximal reduction (IPR).",
    doctorAssessment: "Patient maintained superior periodontal health throughout treatment. Delivered symmetrical dental arches and ideal canine guidance.",
    featured: true,
    order: 3,
  },
  {
    id: "laser-periodontal-gum-therapy",
    title: "Chronic Gingivitis & Laser Pocket Decontamination",
    subtitle: "Eliminating bleeding gums and deep periodontal bacterial pockets through gentle ultrasonic scaling and diode laser therapy.",
    category: "Periodontics",
    orientation: "portrait",
    videoUrl: "/videos/stories/spine-rehab-decompression.mp4",
    condition: "Chronic Periodontitis & Bleeding Gums",
    therapist: "Dr. Arvind Kumar, BDS, MDS",
    duration: "0:42",
    highlights: ["Painless Piezo Scaling", "Diode Laser Pocket Sterilization", "Zero Scalpel / No Stitches"],
    clinicalNotes: "Patient experienced spontaneous gingival bleeding during tooth brushing with 5mm periodontal pockets. Completed full-mouth ultrasonic calculus debridement accompanied by subgingival diode laser therapy.",
    doctorAssessment: "Pocket depths reduced to a healthy 2mm, bleeding on probing eliminated, and firm pink stippled gingiva fully restored.",
    featured: true,
    order: 4,
  },
  {
    id: "cosmetic-smile-makeover-whitening",
    title: "Enamel Staining & Laser Teeth Whitening",
    subtitle: "Transforming deep coffee and tea discoloration by 7 shades in a single comfortable 45-minute clinical appointment.",
    category: "Cosmetic Dentistry",
    orientation: "portrait",
    videoUrl: "/videos/stories/geriatric-home-rehab.mp4",
    condition: "Extrinsic Enamel Chromogen Staining",
    therapist: "Dr. Priya Nair, BDS",
    duration: "0:50",
    highlights: ["Cool Blue LED Accelerator", "Complete Gum Barrier Dam", "Desensitizing Fluoride Polish"],
    clinicalNotes: "Patient presented with stubborn yellow enamel discoloration prior to a public engagement. Applied gingival barrier dam followed by three 15-minute cycles of hydrogen peroxide activated by cool blue LED light.",
    doctorAssessment: "Shade improved from A3.5 to B1 with zero post-treatment hypersensitivity. High patient satisfaction with immediate radiant smile.",
    featured: true,
    order: 5,
  },
];
