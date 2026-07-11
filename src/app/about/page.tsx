import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { CheckCircle2, Shield, Heart, Zap } from "lucide-react";

export default function About() {
  const values = [
    {
      title: "Evidence-Based Treatment",
      desc: "Our therapists combine clinically proven methods, cutting-edge technology, and patient data to design effective recovery programs.",
      icon: Shield,
    },
    {
      title: "Patient-Centric Care",
      desc: "We focus on individual goals—whether you want to run a marathon, return to sports, or walk pain-free in your daily life.",
      icon: Heart,
    },
    {
      title: "Advanced Biomechanics",
      desc: "We specialize in gait analysis, posture metrics, and corrective custom orthotics to correct movement errors at the root.",
      icon: Zap,
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="About Gait Physio Clinic"
        description="Dedicated to helping Bangalore move freely, perform better, and recover from musculoskeletal pain with state-of-the-art diagnostics."
      />

      {/* Story Section */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
                Our Mission: Moving You Forward
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                Founded in 2026, Gait Physio Clinic has grown to become a benchmark in physiotherapy and posture rehab. We believe that recovery is not just about relieving pain; it is about restoring quality of life, balancing structural movements, and protecting your body from future injury.
              </p>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                Unlike generic wellness clinics, we prioritize precision. Our facility features custom force plate sensors, biomechanical alignment modules, and dedicated kinetic rehabilitation gyms to analyze exactly how you walk, run, and balance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {[
                  "Certified Dry Needling",
                  "Digital Posture Mapping",
                  "Personalized Active Rehab",
                  "Custom Orthotic Lab"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-brand-green shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Highlight block */}
            <div className="rounded-3xl bg-brand-bg dark:bg-slate-900 border border-brand-green/20 p-8 space-y-6 shadow-sm">
              <h3 className="text-xl font-black text-brand-green dark:text-teal-400">Why Gait Analysis Matters</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Every step you take sends kinetic force up through your feet, ankles, knees, hips, and spine. A minor imbalance in your foot strike can create chronic joint strains and back pains elsewhere in the body.
              </p>
              <blockquote className="border-l-4 border-brand-green pl-4 py-1 italic text-slate-600 dark:text-slate-400 text-sm">
                "We don't guess—we scan. By measuring your step patterns on force plates, we see exactly where your balance fails and target it directly."
              </blockquote>
              <div className="pt-4">
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full bg-brand-green text-white hover:bg-brand-green-hover px-6 py-3 text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  Book Assessment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">Our Core Commitments</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We hold ourselves to the highest clinical standards to ensure you experience long-term healing and wellness.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div key={v.title} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:-translate-y-1 hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] transition-all duration-350 space-y-4">
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-brand-charcoal dark:text-white">{v.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="bg-brand-charcoal py-16 text-center text-white border-t border-slate-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Need a professional assessment?</h2>
          <p className="text-slate-450 max-w-xl mx-auto text-sm sm:text-base font-medium">
            Consult with our registered biomechanists and physical therapists. Let us help you start walking and moving without limitation.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3 text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Schedule Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
