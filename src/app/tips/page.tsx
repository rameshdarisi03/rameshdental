import PageHeader from "@/components/public/PageHeader";
import { BookOpen, Calendar, Clock } from "lucide-react";
import Link from "next/link";

export default function Tips() {
  const articles = [
    {
      title: "5 Exercises to Alleviate Work-from-Home Back Stiffness",
      desc: "Stuck at a desk all day? These five simple movements will open your hips, stretch your spine, and relieve lower back compression.",
      category: "Ergonomics",
      date: "Jul 05, 2026",
      readTime: "4 Min Read",
    },
    {
      title: "Understanding Flat Feet: Do You Actually Need Insoles?",
      desc: "Having low arches isn't always a problem. Learn when flat feet require orthotic correction and when they just need strength training.",
      category: "Gait & Foot Health",
      date: "Jun 28, 2026",
      readTime: "6 Min Read",
    },
    {
      title: "The Ultimate Pre-Run Warmup Routine to Save Your Knees",
      desc: "Don't start running cold. Activate your glutes, warm up your hamstrings, and prep your calf muscles with these dynamic stretches.",
      category: "Sports Rehab",
      date: "Jun 15, 2026",
      readTime: "5 Min Read",
    },
    {
      title: "How to Detect Posture Errors in 3 Simple Steps",
      desc: "A quick self-assessment guide using a mirror to examine shoulder levels, pelvic tilts, and forward-head postures.",
      category: "Posture",
      date: "May 30, 2026",
      readTime: "4 Min Read",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Health & Mobility Tips"
        description="Read research-backed tips, stretches, and articles from our movement specialists to prevent injuries and maintain structural balance."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {articles.map((article) => (
              <div
                key={article.title}
                className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 flex flex-col shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center rounded-full bg-brand-green/10 border border-brand-green/20 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-green">
                    {article.category}
                  </span>
                  
                  <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-brand-green" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-brand-green" />
                      {article.readTime}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-brand-charcoal dark:text-white mb-3 hover:text-brand-green transition-colors leading-snug">
                  {article.title}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold flex-grow">
                  {article.desc}
                </p>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex items-center justify-between mt-auto">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-brand-green" />
                    Patient Guide
                  </span>
                  <span className="text-xs font-black text-brand-green hover:underline cursor-pointer">
                    Read Article
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
