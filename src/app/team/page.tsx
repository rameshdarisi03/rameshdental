import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { UserCheck, Award, Heart } from "lucide-react";

export default function Team() {
  const staff = [
    {
      name: "Dr. Rohan Sharma, PT",
      role: "Lead Physiotherapist & Biomechanics Specialist",
      qualifications: "BPT, MPT (Musculoskeletal Disorders), Certified Gait Analyst",
      specialty: "Gait Alignment, Posture Reconstruction, Chronic Spine Management",
      experience: "12+ Years",
      bio: "Dr. Rohan completed his specialization in musculoskeletal gait anomalies. He works with runners, corporate professionals, and spine rehab patients to target structural imbalances.",
    },
    {
      name: "Dr. Ananya Goel, PT",
      role: "Senior Sports Physiotherapist",
      qualifications: "BPT, MPT (Sports Physiotherapy), Certified Dry Needling Practitioner",
      specialty: "ACL Rehab, Shoulder Kinesiology, Athletic Conditioning",
      experience: "8+ Years",
      bio: "Dr. Ananya has worked as the on-field therapist for state-level football academies. She specializes in return-to-sport physical programs and acute athletic injuries.",
    },
    {
      name: "Dr. Vikram Rao, PT",
      role: "Orthopedic Rehabilitation Specialist",
      qualifications: "BPT, Fellowship in Ortho Rehab (London)",
      specialty: "Post-Surgical Joint Care, Fall Prevention, Manual Mobilization",
      experience: "10+ Years",
      bio: "Dr. Vikram excels in post-operative care, particularly for hip/knee replacements. His patient approach centers on gentle manual therapies and active home recovery programs.",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Meet Our Clinical Team"
        description="Our registered and certified physiotherapists are dedicated to providing precise, individualized rehabilitation plans."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {staff.map((member) => (
              <div
                key={member.name}
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 space-y-6 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350"
              >
                {/* Profile Placeholder Image Block */}
                <div className="h-48 bg-gradient-to-br from-brand-green/20 to-brand-sand/40 rounded-2xl flex items-center justify-center border border-brand-green/10">
                  <UserCheck className="h-16 w-16 text-brand-green dark:text-teal-400" />
                </div>

                <div className="space-y-2 flex-grow">
                  <h3 className="text-lg font-black text-brand-charcoal dark:text-white group-hover:text-brand-green transition-colors">{member.name}</h3>
                  <p className="text-xs font-black text-brand-green dark:text-teal-400 uppercase tracking-wider">{member.role}</p>
                  
                  <div className="space-y-2 pt-3">
                    <div className="flex items-start gap-2.5 text-xs text-slate-500 font-medium">
                      <Award className="h-4 w-4 text-brand-green shrink-0 mt-0.5" />
                      <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Credentials:</strong> {member.qualifications}</span>
                    </div>
                    <div className="flex items-start gap-2.5 text-xs text-slate-500 font-medium">
                      <Heart className="h-4 w-4 text-brand-green shrink-0 mt-0.5" />
                      <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Clinical Focus:</strong> {member.specialty}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-450 dark:text-slate-450 leading-relaxed pt-4 font-semibold">
                    {member.bio}
                  </p>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <span>Experience: <span className="text-brand-charcoal dark:text-white font-black">{member.experience}</span></span>
                  <Link
                    href={`/book`}
                    className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-2.5 text-xs font-black shadow-sm transition-all duration-200"
                  >
                    Request Booking
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
