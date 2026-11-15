import React, { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award
} from "lucide-react";

interface ServiceData {
  title: string;
  subtitle: string;
  image: string;
  overview: string;
  symptoms: string[];
  approach: { step: string; desc: string }[];
  goals: string[];
  recoveryTimeline: string;
  sessions: string;
  benefits: string[];
}

const serviceDictionary: Record<string, ServiceData> = {
  "root-canal-treatment": {
    title: "Root Canal Treatment (RCT)",
    subtitle: "Painless Single-Sitting Rotary Endodontics",
    image: "/images/services/root-canal.jpg",
    overview: "Root Canal Treatment is designed to save an infected or badly broken tooth that would otherwise need extraction. At Ramesh Dental Clinic, we utilize motorized rotary endodontic files, high-precision electronic apex locators, and computerized local anesthesia to ensure the procedure is completely painless, comfortable, and usually completed in a single visit.",
    symptoms: [
      "Severe, throbbing toothache that worsens while chewing or lying flat",
      "Prolonged sensitivity to hot or cold food and drinks (lasting > 30 seconds)",
      "Swelling or a small pimple (abscess) on the gums near the affected tooth",
      "Dark discoloration or greying of a traumatized tooth",
      "Deep cavity where decay has reached the inner dental pulp"
    ],
    approach: [
      { step: "Digital 3D Diagnosis", desc: "Digital periapical radiography to evaluate the exact root curvature and number of canals." },
      { step: "Painless Anesthesia", desc: "Targeted computer-assisted numbing to guarantee total comfort throughout the treatment." },
      { step: "Rotary Cleaning & Shaping", desc: "Flexible nickel-titanium motorized instruments thoroughly clean and disinfect the canals." },
      { step: "Biocompatible Hermetic Seal", desc: "Canals are sealed with gutta-percha and bioceramic sealer, followed by a protective crown." }
    ],
    goals: [
      "Permanently eliminate throbbing nerve pain and bacterial infection",
      "Preserve the natural tooth root and surrounding jawbone structure",
      "Prevent bacterial spread into facial tissues and the bloodstream",
      "Restore 100% normal biting and chewing capability"
    ],
    recoveryTimeline: "1 to 3 Days",
    sessions: "1 to 2 Sessions",
    benefits: [
      "Saves natural tooth",
      "Painless rotary procedure",
      "Digital apex locator accuracy",
      "Same-day emergency pain relief"
    ]
  },
  "dental-implants": {
    title: "Dental Implants & Fixed Teeth",
    subtitle: "Permanent Titanium Implants & Full-Mouth Restoration",
    image: "/images/services/dental-implants.jpg",
    overview: "Dental implants are the gold standard for replacing missing teeth. A biocompatible titanium fixture is surgically anchored into your jawbone, acting as a permanent artificial root. Once integrated with the bone, a custom-milled monolithic zirconia crown is placed on top, feeling, functioning, and looking exactly like your natural tooth.",
    symptoms: [
      "One or multiple missing teeth causing difficulty in chewing",
      "Loose, uncomfortable removable dentures that slip while speaking or eating",
      "Drifting or shifting of adjacent teeth into empty gaps",
      "Jawbone loss and facial sagging caused by missing tooth roots",
      "Cracked, non-restorable tooth requiring extraction and immediate replacement"
    ],
    approach: [
      { step: "Intraoral 3D Scan & CBCT", desc: "Detailed bone density mapping and 3D virtual implant position planning." },
      { step: "Minimally Invasive Placement", desc: "Guided surgical placement of medical-grade titanium fixture under local anesthesia." },
      { step: "Osseointegration Healing", desc: "Natural biological fusing of the titanium fixture with surrounding jawbone." },
      { step: "Precision Crown Placement", desc: "Custom CAD/CAM screw-retained zirconia crown secured for permanent function." }
    ],
    goals: [
      "Restore 100% natural bite force and unrestricted chewing",
      "Preserve adjacent natural teeth without grinding them down for a bridge",
      "Prevent progressive jawbone deterioration and premature facial aging",
      "Deliver a lifetime-lasting, radiant smile"
    ],
    recoveryTimeline: "2 to 3 Months (Osseointegration)",
    sessions: "2 to 3 Visits",
    benefits: [
      "25+ years to lifetime durability",
      "Adjacent teeth left 100% intact",
      "Prevents bone loss and facial collapse",
      "Flosses and cleans just like a natural tooth"
    ]
  },
  "invisible-aligners": {
    title: "Invisible Aligners & Braces",
    subtitle: "Clear Orthodontic Trays & Discreet Ceramic Systems",
    image: "/images/services/invisible-aligners.jpg",
    overview: "Clear aligners are a modern, virtually undetectable alternative to traditional metal braces. By wearing a custom series of transparent, medical-grade thermoplastic trays, your teeth are gently guided into perfect alignment. Eat whatever you like, brush and floss with ease, and watch your smile transform with 3D digital precision.",
    symptoms: [
      "Crowded, crooked, or overlapping teeth",
      "Unsightly gaps or spacing between front teeth",
      "Overbite, underbite, crossbite, or open bite alignment problems",
      "Difficulty cleaning between twisted teeth leading to plaque buildup",
      "Relapse after previous childhood orthodontic treatment"
    ],
    approach: [
      { step: "3D Digital Intraoral Scan", desc: "Zero messy putty impressions—fast, comfortable 3D optical scanning of your dental arch." },
      { step: "3D Treatment Simulation", desc: "Visualize the final smile result and step-by-step tooth movements before starting." },
      { step: "Custom Aligner Delivery", desc: "Receive sets of crystal-clear trays, changing to a fresh set every 10 to 14 days." },
      { step: "Periodic Progress Checks", desc: "Quick in-clinic checkups every 6 to 8 weeks to verify optimal alignment speed." }
    ],
    goals: [
      "Achieve an aesthetically harmonious, symmetrical dental arch",
      "Optimize biting contacts to prevent uneven enamel wear",
      "Make brushing and flossing effortless to prevent long-term decay",
      "Provide discreet, confidence-boosting treatment for adults and teens"
    ],
    recoveryTimeline: "6 to 14 Months",
    sessions: "Checkups Every 6-8 Weeks",
    benefits: [
      "Completely invisible in photos and meetings",
      "Removable for meals and oral hygiene",
      "No food restrictions or broken wires",
      "Digital outcome preview before treatment begins"
    ]
  },
  "teeth-whitening": {
    title: "Teeth Whitening & Smile Makeover",
    subtitle: "In-Office Laser Bleaching & Ultra-Thin Porcelain Veneers",
    image: "/images/services/teeth-whitening.jpg",
    overview: "Whether you have surface stains from coffee and tea or deep intrinsic discoloration, our cosmetic dentistry solutions brighten your smile safely and dramatically. Our in-office LED-accelerated whitening lifts stains up to 8 shades in just 45 minutes, while custom ceramic veneers correct minor chips, gaps, and shapes.",
    symptoms: [
      "Yellow, dull, or discolored teeth from tea, coffee, smoking, or aging",
      "Stained tooth enamel resistant to standard whitening toothpastes",
      "Minor chips, uneven tooth lengths, or small gaps between front teeth",
      "Fluorosis or tetracycline stains embedded in enamel",
      "Desire for an immaculate smile for weddings, interviews, or public speaking"
    ],
    approach: [
      { step: "Shade Analysis & Gum Barrier", desc: "Precise baseline shade recording and application of light-cured protective gingival dam." },
      { step: "Laser Bleaching Activation", desc: "Application of pH-balanced peroxide gel activated by cool blue wavelength LED light." },
      { step: "Desensitizing Enamel Polish", desc: "Fluoride and potassium nitrate remineralization to eliminate tooth sensitivity." },
      { step: "Custom Maintenance Protocol", desc: "Home care guidelines and optional touch-up kit for prolonged sparkle." }
    ],
    goals: [
      "Lighten tooth shade by up to 6 to 8 tones in one appointment",
      "Protect tooth enamel and sensitive gum margins with clinical barriers",
      "Eliminate stubborn lifestyle and dietary stains",
      "Deliver a dazzling, naturally luminous smile"
    ],
    recoveryTimeline: "Immediate (Zero Downtime)",
    sessions: "Single 45-Minute Session",
    benefits: [
      "Fast 45-minute chairside transformation",
      "Clinically supervised for zero gum burns",
      "Enamel-safe desensitizing formulation",
      "Dramatic boost in personal and professional confidence"
    ]
  },
  "pediatric-dentistry": {
    title: "Pediatric (Kids) Dentistry",
    subtitle: "Gentle Preventive Care, Fluoride & Cavity Protection",
    image: "/images/services/pediatric-dentistry.jpg",
    overview: "We believe children should never fear the dentist. Our dedicated pediatric dental team creates a fun, playful, and soothing environment for toddlers, children, and teenagers. From the very first milk tooth checkup to cavity-preventing pit and fissure sealants, we help your child build a lifelong foundation of oral wellness.",
    symptoms: [
      "Early childhood cavities or brown spots on baby teeth",
      "Toothache or sensitivity while eating cold foods or sweets",
      "Thumb-sucking, mouth breathing, or pacifier dependence",
      "Chipped baby or young permanent teeth from playground falls",
      "Delayed or irregular eruption of permanent teeth"
    ],
    approach: [
      { step: "Gentle 'Tell-Show-Do' Exam", desc: "We introduce tools in a playful manner so the child feels completely comfortable and in control." },
      { step: "Preventive Fluoride Polish", desc: "Topical fluoride varnish to strengthen developing enamel against acid attacks." },
      { step: "Pit & Fissure Sealants", desc: "Painless protective shield painted onto deep molar grooves to stop cavities before they start." },
      { step: "Habit & Diet Counseling", desc: "Friendly guidance on proper brushing techniques and tooth-friendly snacks for parents and kids." }
    ],
    goals: [
      "Eliminate dental fear and cultivate positive healthcare associations",
      "Prevent painful cavities and premature loss of primary teeth",
      "Guide proper jaw development and correct harmful childhood habits",
      "Maintain space for permanent teeth to emerge straight"
    ],
    recoveryTimeline: "Immediate",
    sessions: "Bi-Annual Checkups (Every 6 Months)",
    benefits: [
      "Friendly, anxiety-free pediatric atmosphere",
      "Painless cavity-prevention sealants",
      "Milk tooth preservation prevents adult crowding",
      "Compassionate child-focused dentists"
    ]
  },
  "wisdom-tooth-extraction": {
    title: "Tooth Extraction & Wisdom Teeth",
    subtitle: "Atraumatic & Minimally Invasive Impaction Surgery",
    image: "/images/services/wisdom-tooth.jpg",
    overview: "When wisdom teeth become impacted, angled horizontally, or trapped under the gum, they can cause intense jaw pain, facial swelling, and damage to adjacent molars. Our maxillofacial surgical team specializes in painless extractions using atraumatic instruments and local anesthesia for smooth, stress-free procedures with swift recovery.",
    symptoms: [
      "Throbbing pain or swelling at the very back of the jaw",
      "Difficulty opening the mouth, chewing, or swallowing (trismus)",
      "Recurrent gum swelling and foul taste around a partially erupted tooth",
      "Food constantly getting trapped behind the last molar",
      "Headaches and jaw stiffness radiating to the ear"
    ],
    approach: [
      { step: "Digital Panoramic X-Ray", desc: "High-resolution imaging to evaluate root anatomy and proximity to the mandibular nerve." },
      { step: "Complete Local Numbness", desc: "Profound anesthesia ensures you feel only gentle pressure, never sharp pain." },
      { step: "Atraumatic Sectioning", desc: "The tooth is gently divided into small segments to preserve bone and minimize swelling." },
      { step: "Rapid-Healing Dressing", desc: "Dissolvable sutures and healing pack placed for smooth, uncomplicated recovery." }
    ],
    goals: [
      "Relieve acute jaw pain and eliminate recurrent gum infections",
      "Protect neighboring healthy second molars from root cavities and resorption",
      "Prevent cyst formation in the jawbone surrounding impacted roots",
      "Ensure swift, pain-managed post-operative recovery"
    ],
    recoveryTimeline: "3 to 5 Days",
    sessions: "1 Surgical Visit",
    benefits: [
      "Profound painless local anesthesia",
      "Minimally invasive piezo surgical technique",
      "Protects healthy neighboring molars",
      "Comprehensive post-op care and medication kit"
    ]
  },
  "laser-gum-therapy": {
    title: "Laser Gum Therapy & Ultrasonic Scaling",
    subtitle: "Advanced Periodontal Debridement & Tartar Removal",
    image: "/images/services/laser-gum-therapy.jpg",
    overview: "Healthy gums are the foundation of healthy teeth. Plaque and mineralized calculus (tartar) beneath the gumline harbor colonies of bacteria that cause bleeding, bad breath, and bone loss. We employ gentle ultrasonic scalers and soft-tissue diode lasers to eradicate deep periodontal bacteria, reattach gums to tooth roots, and save loose teeth.",
    symptoms: [
      "Gums bleeding while brushing, flossing, or biting into hard fruit",
      "Red, swollen, tender, or puffy gum tissue",
      "Persistent bad breath (halitosis) that won't go away with mouthwash",
      "Receding gumlines causing teeth to appear unnaturally long",
      "Loose or shifting teeth indicating advanced periodontitis"
    ],
    approach: [
      { step: "Periodontal Pocket Probing", desc: "Mapping gum sulcus depths to measure the exact severity of bacterial infection." },
      { step: "Ultrasonic Piezo Scaling", desc: "Gentle high-frequency micro-vibrations and water spray safely remove hardened tartar." },
      { step: "Subgingival Diode Laser Decontamination", desc: "Targeted laser light vaporizes harmful anaerobic bacteria and sterilizes deep pockets." },
      { step: "Gingival Reattachment Polish", desc: "Polishing root surfaces smooth, allowing healthy gum fibers to re-adhere firmly." }
    ],
    goals: [
      "Halt the progression of periodontal bone loss and tooth mobility",
      "Permanently stop gum bleeding and reduce pocket depths to healthy levels (< 3mm)",
      "Eliminate foul oral odor and restore fresh breath",
      "Promote rapid gum healing without painful surgical cutting"
    ],
    recoveryTimeline: "1 to 2 Weeks",
    sessions: "1 to 2 Sessions",
    benefits: [
      "No scalpels, cutting, or stitches required",
      "Painless ultrasonic tartar removal",
      "Laser sterilizes deep bacterial pockets",
      "Saves teeth from premature loosening"
    ]
  },
  "crowns-and-bridges": {
    title: "Metal-Free Zirconia Crowns & Bridges",
    subtitle: "CAD/CAM High-Translucency Aesthetic Restorations",
    image: "/images/services/crowns-bridges.jpg",
    overview: "Say goodbye to old-fashioned metal crowns that leave an unsightly dark grey line at the gum margin. Our monolithic zirconia and E-max ceramic crowns are milled using precision CAD/CAM technology. They offer remarkable biological compatibility, incredible chewing strength, and realistic translucency that seamlessly mirrors natural tooth enamel.",
    symptoms: [
      "Weakened tooth following Root Canal Treatment requiring structural protection",
      "Extensively cracked, chipped, or fractured teeth",
      "Severely worn down teeth from clenching or nighttime grinding (bruxism)",
      "Replacing old metallic crowns with visible black gum margins",
      "Cosmetic reconstruction of misshapen or severely discolored teeth"
    ],
    approach: [
      { step: "Conservative Preparation", desc: "Micro-preparation of the tooth preserving as much natural tooth structure as possible." },
      { step: "Digital 3D Optical Scan", desc: "Sub-millimeter accurate digital impression sent electronically to the dental lab." },
      { step: "CAD/CAM Robotic Milling", desc: "Crown is carved out of solid premium multilayered zirconia blocks for flawless fit." },
      { step: "Resin Cement Bonding", desc: "Permanent bonding with dual-cure dental resin cement for lifelong retention." }
    ],
    goals: [
      "Protect root-treated or fractured teeth against catastrophic splits",
      "Provide 100% natural aesthetics with zero black or grey metal lines",
      "Deliver superior durability capable of withstanding heavy molar chewing forces",
      "Ensure a comfortable, biologically compatible seal around the gumline"
    ],
    recoveryTimeline: "3 to 5 Days",
    sessions: "2 Clinical Visits",
    benefits: [
      "100% metal-free biocompatible zirconia",
      "Life-like optical translucency and enamel luster",
      "10 to 15 year manufacturer warranty",
      "Zero black lines at the gumline"
    ]
  }
};

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const service = serviceDictionary[slug];

  if (!service) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      {/* Breadcrumbs Navigation */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-brand-green transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href="/services" className="hover:text-brand-green transition-colors">Services</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 dark:text-white truncate font-bold">{service.title}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Hero Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Specialized Dental Procedure
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {service.title}
            </h1>
            <p className="text-sm sm:text-base font-semibold text-brand-green">
              {service.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {service.overview}
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
                <Clock className="w-4 h-4 text-brand-green" />
                <span>{service.sessions}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl">
                <Award className="w-4 h-4 text-brand-green" />
                <span>Recovery: {service.recoveryTimeline}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/book"
                className="inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-sm transition-transform active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Book This Procedure</span>
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Dental Services</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 aspect-video lg:aspect-4/3">
              <img
                src={service.image}
                alt={service.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Symptoms / Clinical Indications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              When Is This Treatment Recommended?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Common signs, clinical presentations, or aesthetic desires indicating you would benefit from this procedure:
            </p>
            <div className="space-y-2.5 pt-2">
              {service.symptoms.map((symptom, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <span>{symptom}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Key Clinical Outcomes & Benefits
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              What patients achieve following the completion of this specialized dental treatment:
            </p>
            <div className="space-y-2.5 pt-2">
              {service.goals.map((goal, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <span>{goal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step-by-Step Clinical Approach */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Step-by-Step Clinical Procedure
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              How our specialized dental team carries out this procedure from diagnosis to final polish:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {service.approach.map((step, i) => (
              <div
                key={i}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-4 space-y-2"
              >
                <div className="w-7 h-7 rounded-full bg-brand-green text-white text-xs font-black flex items-center justify-center">
                  {i + 1}
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {step.step}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="bg-gradient-to-r from-brand-green to-teal-700 rounded-3xl p-8 sm:p-10 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-black">
              Ready to restore your oral health and smile?
            </h2>
            <p className="text-xs sm:text-sm text-white/90">
              Schedule an in-depth clinical consultation with Dr. Ramesh Darisi and our specialized team at Ramesh Dental Clinic today.
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-white text-brand-green hover:bg-slate-100 font-black text-xs sm:text-sm px-7 py-4 rounded-2xl shadow-lg transition-transform active:scale-95 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
