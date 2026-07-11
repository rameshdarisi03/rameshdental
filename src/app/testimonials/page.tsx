import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { Star, MessageSquare } from "lucide-react";

export default function Testimonials() {
  const reviews = [
    {
      name: "Rajesh Kumar",
      type: "Marathon Runner",
      service: "Gait Analysis & Custom Insoles",
      rating: 5,
      comment: "I suffered from chronic shin splints for over a year. The gait scan showed I was severely overpronating on my left heel. The custom insoles and exercise plan they provided solved it in six weeks. Back to running my standard 20k!",
    },
    {
      name: "Priya Menon",
      type: "IT Consultant",
      service: "Spine & Neck Care",
      rating: 5,
      comment: "Working on a desk for 9 hours daily gave me intense cervical pain. Dr. Rohan guided me through targeted neck exercises and ergonomic posture corrections. The relief has been absolute. Very professional!",
    },
    {
      name: "Abhishek Das",
      type: "Athlete",
      service: "Sports Rehabilitation (ACL)",
      rating: 5,
      comment: "Following my knee ligament reconstruction, I did my full rehab here under Dr. Ananya. The kinetic gym facility is excellent. She pushed me at the correct level, and my knee feels solid and fully mobile now.",
    },
    {
      name: "Srinivas Gowda",
      type: "Retiree",
      service: "Orthopedic Post-op Care",
      rating: 5,
      comment: "Had my knee replacement last year. The home rehab exercises Dr. Vikram prescribed helped me walk again without a walker in record time. Excellent clinic with caring therapists.",
    },
    {
      name: "Nisha Sen",
      type: "Yoga Practitioner",
      service: "Dry Needling & Joint Mobilization",
      rating: 5,
      comment: "Had deep muscle knots in my shoulder blades that prevented me from stretching. The dry needling therapy resolved the muscle trigger points in just two sessions. The relief was immediate.",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Patient Testimonials"
        description="Read real recovery stories from our patients who restored their mobility and returned to pain-free daily living."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Overview Rating Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
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
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 space-y-4 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350"
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
