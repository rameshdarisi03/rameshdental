import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { ArrowRight, CheckCircle2, Calendar, ShieldCheck, Sparkles, Activity } from "lucide-react";

const servicesList = [
  {
    slug: "musculoskeletal",
    title: "Musculoskeletal (Orthopaedic) Rehab",
    subtitle: "Joint Alignment, Spine Decompression & Posture Correction",
    desc: "Targeted therapy for chronic back pain, neck stiffness, knee osteoarthritis, and structural spinal imbalances through precision manual therapy and joint realignment.",
    image: "/images/services/musculoskeletal.webp",
    sessions: "8 to 12 Sessions",
    timeline: "4 to 8 Weeks",
    keyBenefits: ["Back & Neck Pain Relief", "Spine Decompression", "Joint Tracking", "Posture Realignment"]
  },
  {
    slug: "sports-injury",
    title: "Sports Injury Rehabilitation",
    subtitle: "Athletic Return-to-Play, ACL Rehab & Muscle Recovery",
    desc: "Comprehensive rehab protocols for runners, gym athletes, and weekend warriors recovering from ligament tears, meniscus injuries, shin splints, and tendonitis.",
    image: "/images/services/sports_injury.webp",
    sessions: "10 to 14 Sessions",
    timeline: "6 to 12 Weeks",
    keyBenefits: ["ACL & Meniscus Protocol", "Rotator Cuff Rehab", "Agility Conditioning", "Injury Prevention"]
  },
  {
    slug: "post-surgical",
    title: "Post-Surgical Rehabilitation",
    subtitle: "Safe Joint Mobilization After Orthopedic Surgery",
    desc: "Structured post-op care following knee/hip replacements, arthroscopic reconstructions, and spinal surgeries. We restore scar tissue mobility and joint flexibility.",
    image: "/images/services/post_surgical.webp",
    sessions: "12 to 16 Sessions",
    timeline: "8 to 16 Weeks",
    keyBenefits: ["Knee & Hip Replacement Care", "Scar Tissue Release", "Early Mobilization", "Safe Weight Bearing"]
  },
  {
    slug: "neurological",
    title: "Neurological Physiotherapy",
    subtitle: "Neuroplasticity, Balance Retraining & Gait Coordination",
    desc: "Specialized rehabilitation for stroke recovery, Parkinson's disease, neuropathy, and balance disorders using advanced gait retraining and functional movement drills.",
    image: "/images/services/neurological.webp",
    sessions: "12 to 20 Sessions",
    timeline: "12+ Weeks",
    keyBenefits: ["Stroke Motor Recovery", "Parkinson's Gait Retraining", "Fall Prevention", "Balance Restoration"]
  },
  {
    slug: "geriatric",
    title: "Geriatric Physiotherapy & Fall Prevention",
    subtitle: "Independence, Joint Comfort & Senior Mobility",
    desc: "Gentle, compassionate movement therapy tailored to seniors. Improves functional strength, stabilizes walking balance, and reduces fall risk for independent daily living.",
    image: "/images/services/geriatric.webp",
    sessions: "6 to 10 Sessions",
    timeline: "4 to 6 Weeks",
    keyBenefits: ["Fall Prevention Drills", "Arthritic Joint Care", "Stair Climbing Confidence", "Safe Independence"]
  },
  {
    slug: "cardiopulmonary",
    title: "Cardiopulmonary Rehabilitation",
    subtitle: "Respiratory Endurance & Aerobic Capacity Building",
    desc: "Supervised exercise conditioning to rebuild lung volume, breathing efficiency, and stamina following respiratory illnesses or cardiovascular events.",
    image: "/images/services/cardiopulmonary.webp",
    sessions: "8 to 12 Sessions",
    timeline: "6 to 8 Weeks",
    keyBenefits: ["Diaphragmatic Breathing", "Aerobic Stamina Rebuild", "Chest Mobility", "Post-Viral Fatigue Care"]
  },
  {
    slug: "pelvic-floor",
    title: "Pelvic Floor Rehabilitation",
    subtitle: "Core Stability, Pelvic Alignment & Postpartum Recovery",
    desc: "Evidence-based, discreet rehabilitation to strengthen pelvic floor muscles, alleviate chronic pelvic tension, and restore core stability following childbirth or surgery.",
    image: "/images/services/pelvic_floor.webp",
    sessions: "6 to 8 Sessions",
    timeline: "4 to 8 Weeks",
    keyBenefits: ["Postpartum Core Recovery", "Pelvic Pain Alleviation", "Bladder Control", "Functional Core Strength"]
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      {/* Page Header */}
      <PageHeader
        title="Specialized Clinical Services"
        subtitle="Evidence-based physical therapy, biomechanical gait analysis, and personalized rehabilitation programs by certified specialists in Whitefield, Bengaluru."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Intro Trust Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Advanced Biomechanical Diagnosis
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Targeted Care for Every Stage of Your Recovery
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
              Every clinical journey at Gait Physio Clinic begins with a thorough biomechanical assessment. Our certified physical therapists design an individualized plan tailored to your anatomical requirements.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Initial Consultation</span>
          </Link>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {servicesList.map((service, index) => (
            <div
              key={service.slug}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={service.image}
                    alt={service.title}
                    loading={index < 3 ? "eager" : "lazy"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {service.timeline}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-brand-green transition-colors leading-snug">
                      {service.title}
                    </h3>
                    <p className="text-xs text-brand-green font-bold mt-1">
                      {service.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {service.desc}
                  </p>

                  {/* Bullet Benefits */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    {service.keyBenefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3 h-3 text-brand-green shrink-0" />
                        <span className="truncate">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 sm:px-6 pb-5 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 mt-2">
                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-green hover:underline"
                >
                  <span>Full Treatment Protocol</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/book"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-green hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors"
                >
                  <span>Book</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Booking CTA Card */}
        <section className="bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-black">
            Not Sure Which Treatment Plan Fits Your Condition?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Our clinical team performs comprehensive diagnostic assessments to map out the exact root cause of your discomfort before initiating any rehabilitation program.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/book"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl shadow-lg transition-transform active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Initial Assessment</span>
            </Link>
            <a
              href="tel:+919206651295"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-8 py-3.5 rounded-2xl border border-white/20 transition-colors"
            >
              <span>Call +91 92066 51295</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
