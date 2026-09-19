import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { Award, ShieldCheck, HeartHandshake, CheckCircle2, Calendar, Star, GraduationCap } from "lucide-react";

const teamMembers = [
  {
    name: "Dr. Madem Kinnera",
    role: "Lead Physiotherapist & Gait Specialist",
    qualifications: "MPT (Orthopaedics), Certified Gait Analyst, MIAP",
    experience: "10+ Years Clinical Practice",
    bio: "Dr. Madem Kinnera is the founder and lead clinical specialist at Gait Physio Clinic. Specializing in orthopedic rehabilitation and biomechanical gait assessment, she has successfully treated thousands of patients suffering from complex spine conditions, sports tears, and postural misalignments. Her philosophy centers on finding the root mechanical trigger rather than merely masking pain.",
    specialties: [
      "Biomechanical Gait Analysis",
      "Spine & Disc Decompression",
      "Sports ACL & Meniscus Rehab",
      "Post-Surgical Joint Restoration"
    ],
    image: "/images/hero_physio_session.webp"
  },
  {
    name: "Dr. Mohammad",
    role: "Senior Sports Physical Therapist",
    qualifications: "BPT, Sports Injury & Dry Needling Certified",
    experience: "6+ Years Clinical Practice",
    bio: "Dr. Mohammad specializes in athletic conditioning, acute musculoskeletal trauma, and rapid return-to-sport protocols. He works closely with runners, gym enthusiasts, and competitive athletes to restore explosive strength and joint stability.",
    specialties: [
      "Athletic Return-to-Play",
      "Dry Needling & Myofascial Release",
      "Shoulder & Rotator Cuff Rehab",
      "Functional Movement Screening"
    ],
    image: "/images/services/sports_injury.webp"
  },
  {
    name: "Dr. Charmi",
    role: "Consultant Neuro & Geriatric Specialist",
    qualifications: "BPT, Neuro-Rehabilitation Certified",
    experience: "5+ Years Clinical Practice",
    bio: "Dr. Charmi focuses on neuro-motor re-education, fall prevention in elderly patients, and gentle postpartum core restoration. Her patient-first demeanor brings tremendous confidence to patients recovering from debilitating mobility restrictions.",
    specialties: [
      "Stroke & Neuropathy Recovery",
      "Senior Balance & Fall Prevention",
      "Tailbone (Coccydynia) Therapy",
      "Pelvic Floor & Core Stability"
    ],
    image: "/images/services/geriatric.webp"
  }
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Meet Our Clinical Team"
        subtitle="Certified physiotherapists and movement specialists committed to delivering compassionate, evidence-based physical rehabilitation."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Certified Specialists</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                All clinicians hold advanced degrees and recognized certifications in physical therapy and manual modalities.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Root-Cause Diagnosis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                We reject superficial symptom masking in favor of precision biomechanical gait and kinetic analysis.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">1-on-1 Dedicated Time</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Every session provides uninterrupted attention and hands-on guidance from your primary attending therapist.
              </p>
            </div>
          </div>
        </div>

        {/* Team Members List */}
        <div className="space-y-8">
          {teamMembers.map((member, idx) => (
            <div
              key={member.name}
              className={`bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs p-6 sm:p-8 flex flex-col ${
                idx % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              } gap-8 items-center`}
            >
              {/* Photo */}
              <div className="w-full lg:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 relative shrink-0 shadow-sm">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black px-3 py-1 rounded-full">
                  {member.experience}
                </div>
              </div>

              {/* Bio & Details */}
              <div className="w-full lg:w-2/3 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <div className="flex items-center text-amber-500">
                      <Star className="w-4 h-4 fill-amber-500" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-brand-green mt-0.5">
                    {member.role}
                  </p>
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mt-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{member.qualifications}</span>
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {member.bio}
                </p>

                {/* Specialties */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Core Specializations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {member.specialties.map((spec) => (
                      <div key={spec} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span>{spec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-transform active:scale-95"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book Appointment with {member.name.split(" ")[1]}</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
