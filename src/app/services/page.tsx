import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Services() {
  const treatments = [
    {
      title: "Musculoskeletal (Orthopaedic) Rehab",
      desc: "Treats bones, joints, ligaments, and muscles. It resolves conditions like back pain, arthritis, sciatica, and scoliosis.",
      conditions: ["Back Pain", "Arthritis", "Sciatica", "Scoliosis"],
      image: "/images/services/musculoskeletal.webp",
    },
    {
      title: "Post-Surgical Rehabilitation",
      desc: "Restores mobility and strength after operations. Common focus areas include joint replacements, ACL reconstructions, and fracture repairs.",
      conditions: ["Joint Replacements", "ACL Reconstruction", "Fracture Repairs"],
      image: "/images/services/postsurgical.webp",
    },
    {
      title: "Neurological Rehabilitation",
      desc: "Retrains the nervous system after injury. It improves balance and mobility for stroke, Parkinson's disease, and spinal cord injuries.",
      conditions: ["Stroke Recovery", "Parkinson's", "Spinal Cord Injury"],
      image: "/images/services/neurological.webp",
    },
    {
      title: "Sports Injury Management",
      desc: "Focuses on athletic recovery and prevention. It treats sprains, strains, rotator cuff tears, and tennis elbow.",
      conditions: ["Sprains & Strains", "Rotator Cuff Tears", "Tennis Elbow"],
      image: "/images/services/sports.webp",
    },
    {
      title: "Cardiopulmonary Physiotherapy",
      desc: "Improves heart and lung function. It benefits individuals recovering from heart attacks, bypass surgeries, or managing COPD.",
      conditions: ["Heart Recovery", "Bypass Surgery", "COPD Management"],
      image: "/images/services/cardiopulmonary.webp",
    },
    {
      title: "Pediatric Physiotherapy",
      desc: "Supports physical development in children. It treats cerebral palsy, developmental delays, and congenital conditions.",
      conditions: ["Cerebral Palsy", "Developmental Delay", "Congenital Issues"],
      image: "/images/services/pediatric.webp",
    },
    {
      title: "Geriatric Physiotherapy",
      desc: "Addresses age-related mobility issues. It focuses on fall prevention, arthritis management, and maintaining independence.",
      conditions: ["Fall Prevention", "Arthritis Care", "Mobility Enhancement"],
      image: "/images/services/geriatric.webp",
    },
    {
      title: "Pelvic Floor Rehab",
      desc: "Strengthens pelvic muscles. It treats urinary incontinence, pelvic pain, and aids in pre- and post-pregnancy recovery.",
      conditions: ["Urinary Incontinence", "Pelvic Pain", "Pregnancy Rehab"],
      image: "/images/services/pelvic.webp",
    },
  ];

  return (
    <div className="flex flex-col w-full min-h-screen">
      <PageHeader
        title="Our Physiotherapy Services"
        description="Explore our evidence-based treatment plans designed to treat pain, restore range of motion, and optimize your physical strength."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-955">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          {/* Section Heading matching mockup visual narrative */}
          <div className="max-w-3xl space-y-3">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-brand-green dark:text-teal-400 block">
              HEALING ELEVATED
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal dark:text-white tracking-tight">
              Our Comprehensive Services
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              We combine clinical excellence with biophilic design principles to create a sanctuary where physical recovery feels as natural as breathing. Explore our range of evidence-based treatments tailored to your unique journey.
            </p>
          </div>

          {/* Cards Grid: 4 columns on desktop as shown in mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {treatments.map((t) => (
              <div
                key={t.title}
                className="group flex flex-col h-full bg-[#faf8f5] dark:bg-slate-900/60 rounded-3xl border border-[#ece9e0] dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image Thumbnail Header */}
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={t.image}
                    alt={t.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                
                {/* Content Box */}
                <div className="p-5 flex flex-col flex-grow space-y-4">
                  <h3 className="text-sm font-black text-brand-charcoal dark:text-white group-hover:text-brand-green dark:group-hover:text-teal-400 transition-colors duration-250 leading-tight">
                    {t.title}
                  </h3>
                  
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium flex-grow">
                    {t.desc}
                  </p>

                  <div className="border-t border-slate-200/50 dark:border-slate-800/60 pt-4 mt-auto space-y-4">
                    {/* Treated Conditions Pills for SEO */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                        Commonly Treated:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {t.conditions.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-md bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-405"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* CTA Book Button */}
                    <Link
                      href={`/book?service=${encodeURIComponent(t.title)}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-[11px] font-black shadow-sm transition-all duration-200"
                    >
                      <span>Book Session</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Specialty Box */}
      <section className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">
            Customized Orthotics & Insoles
          </h2>
          <p className="text-slate-650 dark:text-slate-400 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed font-semibold">
            Following your Digital Gait Analysis, we can fabricate custom-designed orthotic insoles that fit inside your shoes. These correct foot strike errors, absorb impacts, and balance the pressure distributions on your lower body.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <span>Schedule Foot Scan</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
