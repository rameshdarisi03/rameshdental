export interface RecoveryStory {
  id: string;
  title: string;
  subtitle: string;
  category: "Orthopedic Rehab" | "Hand & Upper Limb" | "Geriatric Mobility" | "Spine & Posture" | "Neuro & Gait";
  orientation: "portrait" | "landscape";
  videoUrl: string;
  condition: string;
  therapist: string;
  duration?: string;
  highlights: string[];
  clinicalNotes: string;
  featured: boolean;
  order: number;
}

export const recoveryStories: RecoveryStory[] = [
  {
    id: "tibia-fracture-recovery",
    title: "Comminuted Tibia Fracture & Skin Grafting Rehab",
    subtitle: "Complex lower limb crush trauma restoring progressive weight-bearing post-ORIF internal fixation.",
    category: "Orthopedic Rehab",
    orientation: "portrait",
    videoUrl: "/videos/stories/tibia-fracture-recovery.mp4",
    condition: "Complex Tibia Fracture & Grafting",
    therapist: "Dr. Kinnera (Lead Physiotherapist)",
    duration: "0:45",
    highlights: ["Post-ORIF Internal Fixation", "Soft Tissue Desensitization", "Progressive Kinetic Loading"],
    clinicalNotes: "Patient presented post-high-energy crush trauma with comminuted tibia fracture and surgical skin graft. Treatment focused on gentle scar tissue release, ankle dorsiflexion mobilization, and progressive closed-chain kinetic loading to restore independent ambulation without compensatory limp.",
    featured: true,
    order: 1,
  },
  {
    id: "elbow-fracture-wax-therapy",
    title: "Elbow Fracture & Hand Mobilization (Non-Surgical)",
    subtitle: "Conservative therapeutic wax therapy, joint distraction, and full functional grip recovery.",
    category: "Hand & Upper Limb",
    orientation: "portrait",
    videoUrl: "/videos/stories/elbow-fracture-wax-therapy.mp4",
    condition: "Elbow Fracture & Wrist Stiffness",
    therapist: "Dr. Kinnera (Lead Physiotherapist)",
    duration: "0:30",
    highlights: ["Paraffin Wax Thermal Therapy", "Myofascial Trigger Release", "End-Range Supination & Grip"],
    clinicalNotes: "Managed conservatively without surgical intervention. Utilized deep paraffin wax bath therapy to warm periarticular collagen fibers, followed by Maitland joint mobilization grades III & IV to break stubborn adhesions and restore full elbow extension and functional wrist grasping.",
    featured: true,
    order: 2,
  },
  {
    id: "paraplegia-stair-climbing",
    title: "Left-Sided Neurological Weakness & Stair Climbing",
    subtitle: "Paraplegia recovery journey achieving independent reciprocal stair ascent and descent.",
    category: "Neuro & Gait",
    orientation: "portrait",
    videoUrl: "/videos/stories/paraplegia-stair-climbing.mp4",
    condition: "Hemiplegia / Neuro Gait Re-education",
    therapist: "Dr. Kinnera (Lead Physiotherapist)",
    duration: "0:38",
    highlights: ["Neuro-Facilitation (PNF)", "Quadriceps Eccentric Control", "Independent Stair Ambulation"],
    clinicalNotes: "Patient suffered severe unilateral lower motor weakness. Rehabilitation integrated Proprioceptive Neuromuscular Facilitation (PNF), dynamic pelvic stability training, and progressive step-up drills, advancing from parallel rail support to autonomous alternating stair climbing.",
    featured: true,
    order: 3,
  },
  {
    id: "spine-rehab-decompression",
    title: "Spinal Decompression & Postural Alignment",
    subtitle: "Targeted lumbar decompression, core stabilization, and acute radiculopathy resolution.",
    category: "Spine & Posture",
    orientation: "portrait",
    videoUrl: "/videos/stories/spine-rehab-decompression.mp4",
    condition: "Lumbar Disc Herniation & Sciatica",
    therapist: "Dr. Kinnera (Lead Physiotherapist)",
    duration: "0:42",
    highlights: ["Manual Spinal Decompression", "McKenzie Extension Protocol", "Deep Multifidus Stabilization"],
    clinicalNotes: "Intense nerve root impingement and mechanical low back stiffness. Employed manual disc unloading techniques combined with progressive transversus abdominis engagement to centralize symptoms and prevent surgical microdiscectomy.",
    featured: true,
    order: 4,
  },
  {
    id: "geriatric-home-rehab",
    title: "Geriatric Mobility & Fall Prevention Protocol",
    subtitle: "Restoring balance, joint confidence, and independent sit-to-stand transitions for seniors.",
    category: "Geriatric Mobility",
    orientation: "portrait",
    videoUrl: "/videos/stories/geriatric-home-rehab.mp4",
    condition: "Senior Balance & Functional Sarcopenia",
    therapist: "Dr. Kinnera (Lead Physiotherapist)",
    duration: "0:50",
    highlights: ["Vestibular & Proprioception Drills", "Closed-Chain Sit-to-Stand", "Gait Symmetry Restoration"],
    clinicalNotes: "Tailored active senior rehabilitation focusing on quadriceps and gluteal neuromuscular firing. Utilized supported balance pads and gradual stride lengthening to eliminate fear of falling and restore everyday home autonomy.",
    featured: true,
    order: 5,
  },
];
