import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { Star, MessageSquare } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Rajesh Kumar",
      type: "Tech Lead, Whitefield",
      service: "Painless Root Canal & Zirconia Crown",
      rating: 5,
      comment: "I was terrified of root canals due to past painful experiences elsewhere. Dr. Ramesh Darisi did single-visit painless RCT using rotary endo. Absolutely zero pain during or after the procedure. The crown fits naturally!",
    },
    {
      name: "Priya Menon",
      type: "IT Consultant",
      service: "Clear Aligners (Invisible Braces)",
      rating: 5,
      comment: "Completed my smile transformation with invisible aligners at Ramesh Dental Clinic. The digital 3D intraoral scans made the planning effortless. My teeth alignment was perfected in just 7 months!",
    },
    {
      name: "Abhishek Das",
      type: "Architect",
      service: "Dental Implants & Bone Grafting",
      rating: 5,
      comment: "Replaced two missing lower molars with titanium implants. Dr. Ramesh explained every surgical step patiently and the implant integration was completely painless. I can chew normally again!",
    },
    {
      name: "Srinivas Gowda",
      type: "Retired Executive",
      service: "Full Mouth Rehabilitation & Laser Gum Therapy",
      rating: 5,
      comment: "Dr. Ramesh treated my chronic gum bleeding and tooth mobility with laser therapy and crown restorations. Very hygienic clinic, gentle bedside manner, and state-of-the-art facilities.",
    },
    {
      name: "Nisha Sen",
      type: "School Teacher",
      service: "ZOOM Teeth Whitening & Smile Design",
      rating: 5,
      comment: "Got in-office laser teeth whitening before my wedding. In just one 45-minute session, my teeth brightened by 5 shades with no sensitivity at all. Wonderful clinical care!",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Patient Smile Stories & Testimonials"
        description="Read real stories from our patients who restored their smiles, tooth health, and chewing confidence at Ramesh Dental Clinic."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Overview Rating Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
            <div className="space-y-1">
              <p className="text-3xl font-black text-brand-charcoal dark:text-white">4.9 / 5.0</p>
              <div className="flex justify-center text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Based on 350+ reviews</p>
            </div>
            <div className="space-y-1 md:border-x border-slate-100 dark:border-slate-800 py-4 md:py-0 flex flex-col justify-center">
              <p className="text-3xl font-black text-brand-charcoal dark:text-white">99%</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient Satisfaction Rate</p>
            </div>
            <div className="space-y-1.5 flex flex-col items-center justify-center">
              <div className="h-8.5 w-8.5 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green">
                <MessageSquare className="h-4 w-4" />
              </div>
              <p className="text-xs font-black text-brand-charcoal dark:text-slate-350">Google Verified</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">100% genuine feedback</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {reviews.map((r) => (
              <div
                key={r.name}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 space-y-4 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white group-hover:text-brand-green transition-colors">{r.name}</h4>
                    <p className="text-xs font-bold text-slate-400">{r.type}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-brand-green/10 border border-brand-green/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-green dark:text-teal-400 shrink-0">
                    {r.service}
                  </span>
                </div>

                <div className="flex text-yellow-500">
                  {[...Array(r.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold italic">
                  "{r.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-16 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Let us help you write your success story</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-xs sm:text-sm font-semibold">
            Book your consultation today and take the first step towards recovery.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-3 text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            Start Your Recovery
          </Link>
        </div>
      </section>
    </div>
  );
}
