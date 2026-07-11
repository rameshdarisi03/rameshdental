import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { Activity, ShieldCheck, HeartPulse, Hammer, Zap, User } from "lucide-react";

export default function Services() {
  const treatments = [
    {
      title: "Gait & Biomechanical Analysis",
      desc: "Advanced foot strike and posture monitoring. Ideal for correcting skeletal imbalances and finding running shoe fits.",
      conditions: ["Plantar Fasciitis", "Flat Feet", "Ankle Instability", "Runner's Knee"],
      icon: Activity,
    },
    {
      title: "Sports Rehabilitation",
      desc: "Performance coaching and recovery routines for athletes. We treat muscle strains, ligament tears, and joint problems.",
      conditions: ["ACL/MCL Tears", "Rotator Cuff Strain", "Tennis Elbow", "Hamstring Pulls"],
      icon: Zap,
    },
    {
      title: "Spine & Joint Care",
      desc: "Focused manual manipulation and decompression exercises to resolve back, neck, hip, and shoulder stiffness.",
      conditions: ["Slip Disc", "Sciatica", "Knee Arthritis", "Frozen Shoulder"],
      icon: ShieldCheck,
    },
    {
      title: "Post-Operative Orthopedic Care",
      desc: "Guided physical routines to restore muscle strength and range of motion following joint surgeries or fractures.",
      conditions: ["Total Knee Replacement", "Shoulder Scope", "Fracture Recovery"],
      icon: HeartPulse,
    },
    {
      title: "Dry Needling & Myofascial Release",
      desc: "Dry needling targets muscle trigger points to release tightness, decrease local pain, and increase blood circulation.",
      conditions: ["Muscle Knots", "Chronic Headaches", "Fibromyalgia", "Spasms"],
      icon: Hammer,
    },
    {
      title: "Pediatric & Geriatric Care",
      desc: "Developmental physical support for children and gentle mobility enhancement and fall prevention for senior patients.",
      conditions: ["Balance Issues", "Postural Scoliosis", "Age-related Stiffness"],
      icon: User,
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Our Physiotherapy Services"
        description="Explore our evidence-based treatment plans designed to treat pain, restore range of motion, and optimize your physical strength."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {treatments.map((t) => (
              <div
                key={t.title}
                className="group flex flex-col h-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350"
              >
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300 mb-6">
                  <t.icon className="h-5 w-5" />
                </div>
                
                <h3 className="text-lg font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors mb-3">{t.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium flex-grow">
                  {t.desc}
                </p>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 mt-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Frequently Treated:</p>
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {t.conditions.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                  
                  <Link
                    href={`/book?service=${encodeURIComponent(t.title)}`}
                    className="flex w-full items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white py-2.5 text-xs font-black shadow-sm transition-all duration-200"
                  >
                    Book Session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialty Box */}
      <section className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Customized Orthotics & Insoles</h2>
          <p className="text-slate-600 dark:text-slate-450 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed font-semibold">
            Following your Digital Gait Analysis, we can fabricate custom-designed orthotic insoles that fit inside your shoes. These correct foot strike errors, absorb impacts, and balance the pressure distributions on your lower body.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3 text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Schedule Foot Scan
          </Link>
        </div>
      </section>
    </div>
  );
}
