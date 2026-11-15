import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { ArrowRight, CheckCircle2, Calendar, ShieldCheck, Sparkles, Activity } from "lucide-react";

export const dentalServicesList = [
  {
    slug: "root-canal-treatment",
    title: "Root Canal Treatment (RCT)",
    subtitle: "Painless Single-Sitting Rotary Endodontics",
    desc: "Advanced motorized rotary endodontic therapy that preserves infected or broken teeth with pinpoint apex localization and computerized local anesthesia.",
    image: "/images/services/root-canal.jpg",
    sessions: "1 to 2 Sessions",
    timeline: "1 to 7 Days",
    keyBenefits: ["Instant Pain Relief", "Natural Tooth Saved", "Digital Apex Accuracy", "Single-Visit Convenience"]
  },
  {
    slug: "dental-implants",
    title: "Dental Implants & Fixed Teeth",
    subtitle: "Permanent Titanium Implants & Full-Mouth Rehabilitation",
    desc: "Bio-integrated titanium dental implants replicating natural tooth roots with precision CAD/CAM zirconia crowns, restoring 100% chewing function.",
    image: "/images/services/dental-implants.jpg",
    sessions: "2 to 3 Visits",
    timeline: "2 to 3 Months",
    keyBenefits: ["Lifetime Durability", "Prevents Bone Resorption", "Adjacent Teeth Untouched", "Natural Smile & Bite"]
  },
  {
    slug: "invisible-aligners",
    title: "Invisible Aligners & Braces",
    subtitle: "Clear Orthodontic Trays & Ceramic Aesthetic Braces",
    desc: "Discreet teeth straightening with customized, transparent orthodontic aligners. Correct crowding, gaps, and bite issues with predictable 3D simulation.",
    image: "/images/services/invisible-aligners.jpg",
    sessions: "Progress Checks (Every 6-8 Wks)",
    timeline: "6 to 14 Months",
    keyBenefits: ["Virtually Invisible", "Removable for Dining", "Zero Food Restrictions", "Predictable 3D Outcome"]
  },
  {
    slug: "teeth-whitening",
    title: "Teeth Whitening & Smile Makeover",
    subtitle: "In-Office Laser Bleaching & Porcelain Veneers",
    desc: "Transform your smile with blue LED accelerator teeth whitening and ultra-thin custom ceramic veneers for radiant brightness without enamel sensitivity.",
    image: "/images/services/teeth-whitening.jpg",
    sessions: "Single 45-Min Session",
    timeline: "Immediate Results",
    keyBenefits: ["Up to 8 Shades Lighter", "Enamel-Safe Formulation", "Gum Dam Protection", "Long-Lasting Radiance"]
  },
  {
    slug: "pediatric-dentistry",
    title: "Pediatric (Kids) Dentistry",
    subtitle: "Gentle Preventive Care, Fluoride & Cavity Sealants",
    desc: "Child-friendly dental care in a warm, fear-free environment. Specializing in milk tooth preservation, pit & fissure sealants, and early habit correction.",
    image: "/images/services/pediatric-dentistry.jpg",
    sessions: "Routine Checks (Every 6 Mos)",
    timeline: "Preventive Care",
    keyBenefits: ["Zero Dental Anxiety", "Cavity-Proof Sealants", "Milk Tooth Preservation", "Gentle Experienced Staff"]
  },
  {
    slug: "wisdom-tooth-extraction",
    title: "Tooth Extraction & Wisdom Teeth",
    subtitle: "Surgical & Atraumatic Impaction Removal",
    desc: "Gentle removal of problematic, impacted wisdom teeth or non-restorable roots using minimally invasive piezo techniques and quick healing protocols.",
    image: "/images/services/wisdom-tooth.jpg",
    sessions: "1 Surgical Visit",
    timeline: "3 to 5 Days Recovery",
    keyBenefits: ["Painless Local Anesthesia", "Minimal Post-Op Swelling", "Rapid Socket Healing", "3D Nerve Mapping"]
  },
  {
    slug: "laser-gum-therapy",
    title: "Laser Gum Therapy & Ultrasonic Scaling",
    subtitle: "Deep Periodontal Disinfection & Tartar Removal",
    desc: "Painless ultrasonic tartar removal and diode laser gum therapy to stop bleeding gums, treat gingivitis, and eliminate deep bacterial pockets.",
    image: "/images/services/laser-gum-therapy.jpg",
    sessions: "1 to 2 Sessions",
    timeline: "1 to 2 Weeks",
    keyBenefits: ["Eliminates Bleeding Gums", "Removes Stubborn Tartar", "Laser Tissue Sterilization", "Freshens Breath"]
  },
  {
    slug: "crowns-and-bridges",
    title: "Metal-Free Zirconia Crowns & Bridges",
    subtitle: "CAD/CAM High-Translucency Aesthetic Restorations",
    desc: "Precision-milled monolithic zirconia and E-max ceramic dental crowns. Exceptional natural translucency, superior fracture resistance, and zero black gum lines.",
    image: "/images/services/crowns-bridges.jpg",
    sessions: "2 Clinical Visits",
    timeline: "3 to 5 Days",
    keyBenefits: ["Zero Metal / Biocompatible", "Indistinguishable from Natural Teeth", "10-15 Year Warranty", "High Chewing Strength"]
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      {/* Page Header */}
      <PageHeader
        title="Specialized Dental Services"
        subtitle="Advanced, painless, and gentle dental procedures performed with digital intraoral scanning, rotary endodontics, and modern surgical techniques in Whitefield, Bengaluru."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Intro Trust Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Advanced Digital Dentistry
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Comprehensive Dental Care for Every Generation
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Every consultation at Ramesh Dental Clinic starts with high-resolution digital imaging and a transparent treatment plan. Our specialized doctors guarantee gentle, compassionate care with zero surprises.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Consultation</span>
          </Link>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dentalServicesList.map((service) => (
            <div
              key={service.slug}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-brand-green border border-slate-200/50 dark:border-slate-700/50">
                    {service.sessions}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white group-hover:text-brand-green transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-xs font-semibold text-brand-green mt-0.5">
                      {service.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {service.desc}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    {service.keyBenefits.map((benefit, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  href={`/services/${service.slug}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-brand-green hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-green dark:hover:text-white text-xs font-bold transition-all duration-200 group-hover:bg-brand-green group-hover:text-white"
                >
                  <span>Explore Procedure</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
