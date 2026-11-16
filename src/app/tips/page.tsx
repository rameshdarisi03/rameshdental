import PageHeader from "@/components/public/PageHeader";
import { BookOpen, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { articles } from "@/data/articles";

export default function Tips() {
  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Dental Health & Patient Care Guides"
        description="Read research-backed oral healthcare advice, post-op instructions, and clinical insights from Dr. Ramesh Darisi and our specialist dental team."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
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

                <h3 className="text-lg font-black text-brand-charcoal dark:text-white mb-3 group-hover:text-brand-green transition-colors leading-snug">
                  {article.title}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-semibold flex-grow">
                  {article.excerpt}
                </p>

                <div className="border-t border-slate-100 dark:border-slate-850 pt-4 flex items-center justify-between mt-auto">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-brand-green" />
                    Dental Guide
                  </span>
                  <span className="text-xs font-black text-brand-green group-hover:underline">
                    Read Article →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
