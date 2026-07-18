import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { ArrowRight, Star, Heart, Award, ShieldCheck } from "lucide-react";
import { Caveat } from "next/font/google";

const caveat = Caveat({
  subsets: ["latin"],
  weight: "700",
});

export default function Team() {
  return (
    <div className="flex flex-col w-full min-h-screen">
      <PageHeader
        title="Meet Our Clinical Director"
        description="Providing specialized physical therapy, clinical gait analysis, and personalized rehabilitation programs built on trust and compassion."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950 flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Image Collage Grid (Matches the Mockup Layout) */}
            <div className="lg:col-span-6 grid grid-cols-12 gap-4 items-center relative">
              
              {/* Main Portrait (Left card) */}
              <div className="col-span-7 relative">
                <img
                  src="/images/dr-kinnera-portrait.jpg"
                  alt="Dr. Kinnera Standing in GPC Clinic"
                  className="w-full rounded-[2rem] sm:rounded-[2.5rem] object-cover aspect-[3/4] shadow-[0_15px_35px_-10px_rgba(93,122,109,0.2)] border-4 border-white dark:border-slate-900 transition-all duration-300"
                />
                
                {/* Floating circular expertise badge - Overlaid on center right edge */}
                <div className="absolute -right-6 sm:-right-8 top-1/2 -translate-y-1/2 z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-green dark:bg-teal-900 text-white flex flex-col items-center justify-center border-4 border-slate-50 dark:border-slate-950 shadow-xl text-center select-none animate-pulse-subtle">
                  <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">12+</span>
                  <span className="text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider mt-1 leading-tight">
                    Years of<br />Expertise
                  </span>
                </div>
              </div>

              {/* Stacked Images Column (Right card split) */}
              <div className="col-span-5 flex flex-col gap-4">
                <img
                  src="/images/dr-kinnera-stretch.jpg"
                  alt="Dr. Kinnera stretching a patient's leg"
                  className="w-full rounded-2xl sm:rounded-3xl object-cover aspect-[4/3] shadow-md border-2 border-white dark:border-slate-900 hover:scale-[1.02] transition-transform duration-300"
                />
                <img
                  src="/images/dr-kinnera-back.jpg"
                  alt="Dr. Kinnera performing back therapy"
                  className="w-full rounded-2xl sm:rounded-3xl object-cover aspect-[4/3] shadow-md border-2 border-white dark:border-slate-900 hover:scale-[1.02] transition-transform duration-300"
                />
              </div>

            </div>

            {/* Right Column: Premium Text Info Panel */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Sub-badge text with line graphic */}
              <div className="flex items-center gap-2 text-brand-green dark:text-teal-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest">
                <span className="h-[2px] w-8 bg-brand-green dark:bg-teal-400 rounded-full"></span>
                OUR TRUSTED SUPPORT
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal dark:text-white leading-tight">
                Passionate About Providing <span className="text-brand-green dark:text-teal-400">Expert Care</span> And Support
              </h2>

              {/* Sub-paragraph */}
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Behind every successful recovery is a physiotherapist's passion for care, relentless support, and expert guidance. Dr. Kinnera is committed to resolving underlying biomechanical dysfunctions, relieving acute and chronic pain, and helping you achieve long-term physical health.
              </p>

              {/* Quote block */}
              <div className="border-l-4 border-brand-green dark:border-teal-500 bg-[#f0f4f2]/60 dark:bg-brand-green/5 p-4 sm:p-5 rounded-r-2xl italic text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-350 leading-relaxed">
                "True Healing Comes From More Than Treatments—It's Built On Trust, Patience, And Compassion, Reflected In Each Small Victory And Ongoing Encouragement."
              </div>

              {/* Credentials & Details list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div className="flex gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900">
                  <Award className="h-5 w-5 text-brand-green dark:text-teal-400 shrink-0" />
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Credentials</h5>
                    <p className="text-[11px] font-bold text-brand-charcoal dark:text-white mt-0.5">BPT, MPT (Sports & Ortho)</p>
                  </div>
                </div>

                <div className="flex gap-3 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-900">
                  <Heart className="h-5 w-5 text-brand-green dark:text-teal-400 shrink-0" />
                  <div>
                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clinical Focus</h5>
                    <p className="text-[11px] font-bold text-brand-charcoal dark:text-white mt-0.5">Gait Mechanics & Spine Care</p>
                  </div>
                </div>
              </div>

              {/* Profile Card & Handwriting Signature (Flex row wrapper) */}
              <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/dr-kinnera-portrait.jpg"
                    alt="Dr. Kinnera Profile Icon"
                    className="w-12 h-12 rounded-full object-cover border border-brand-green/20 ring-4 ring-brand-green/5 shrink-0"
                  />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none block mb-1">
                      Senior Physiotherapist
                    </span>
                    <h4 className="text-sm font-black text-brand-charcoal dark:text-white leading-tight">
                      Dr. Kinnera, BPT, MPT
                    </h4>
                  </div>
                </div>

                {/* Handwriting Cursive Signature */}
                <div className={`${caveat.className} text-3xl sm:text-4xl text-brand-green dark:text-teal-400 italic font-black select-none pr-4 rotate-[-3deg] transform origin-center tracking-wider`}>
                  Dr. Kinnera
                </div>
              </div>

              {/* Action booking CTA Button */}
              <div className="pt-2">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span>Request Booking</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </section>
    </div>
  );
}
