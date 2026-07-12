"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Calendar, ChevronRight, UserCheck, BookOpen } from "lucide-react";
import { articles, Article } from "@/data/articles";

export default function ArticleReaderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    const found = articles.find((a) => a.slug === slug);
    if (found) {
      setArticle(found);
    }
  }, [slug]);

  if (!article) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center bg-brand-bg dark:bg-slate-955 p-6 text-center space-y-4">
        <BookOpen className="h-12 w-12 text-slate-300 animate-pulse" />
        <h2 className="text-lg font-black text-brand-charcoal dark:text-white">Article Not Found</h2>
        <p className="text-xs text-slate-455 max-w-sm font-semibold">
          The health article you are trying to read could not be found or may have been moved.
        </p>
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-2.5 text-xs font-bold transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-brand-bg dark:bg-slate-955">
      
      {/* Intro Image Banner at the Top */}
      <div className="relative h-[25rem] md:h-[30rem] lg:h-[35rem] w-full bg-slate-900 overflow-hidden">
        <Image
          src={article.introImage}
          alt={article.title}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        
        {/* Navigation Breadcrumb inside Banner */}
        <div className="absolute top-6 left-0 w-full z-10">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 backdrop-blur-md text-white hover:text-brand-sand hover:bg-slate-900/80 px-4 py-2 text-xs font-bold transition-all shadow-md"
            >
              <ArrowLeft className="h-4 w-4 text-brand-sand" />
              <span>Back to Articles</span>
            </Link>
          </div>
        </div>

        {/* Floating title block on top of image */}
        <div className="absolute bottom-10 left-0 w-full">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-4">
            <span className="inline-flex items-center bg-brand-green text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-sm">
              {article.category}
            </span>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-md">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-sand" />
                {article.readTime}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-sand" />
                {article.date}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1.5 text-brand-sand">
                <UserCheck className="w-4 h-4" />
                Reviewed by Physiotherapist
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body Container */}
      <article className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-[2.5rem] p-6 md:p-10 shadow-[0_8px_30px_-6px_rgba(93,122,109,0.065)] space-y-8">
            
            {article.sections.map((section, idx) => {
              switch (section.type) {
                case "paragraph":
                  return (
                    <p
                      key={idx}
                      className="text-xs md:text-sm text-slate-650 dark:text-slate-350 leading-relaxed font-semibold whitespace-pre-line"
                    >
                      {section.text}
                    </p>
                  );
                case "header2":
                  return (
                    <h2
                      key={idx}
                      className="text-lg md:text-xl font-black text-brand-charcoal dark:text-white pt-6 border-b border-slate-100 dark:border-slate-850 pb-2.5"
                    >
                      {section.text}
                    </h2>
                  );
                case "header3":
                  return (
                    <h3
                      key={idx}
                      className="text-sm md:text-base font-black text-brand-green dark:text-teal-400 pt-4"
                    >
                      {section.text}
                    </h3>
                  );
                case "list":
                  return (
                    <ul key={idx} className="space-y-2.5 pl-2">
                      {section.items?.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-650 dark:text-slate-350 font-semibold leading-relaxed">
                          <ChevronRight className="w-4 h-4 text-brand-green mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  );
                case "takeaway":
                  return (
                    <div
                      key={idx}
                      className="p-6 md:p-8 rounded-3xl border border-[#d9c7ba] bg-[#e8dad0]/80 dark:bg-slate-950 dark:border-slate-800 text-brand-charcoal dark:text-slate-300 shadow-sm whitespace-pre-line"
                    >
                      <h4 className="font-black text-brand-charcoal dark:text-white text-xs md:text-sm uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        <BookOpen className="h-4.5 w-4.5 text-brand-green" />
                        Key Summary & Takeaways
                      </h4>
                      <p className="text-xs md:text-sm leading-relaxed font-bold">
                        {section.text}
                      </p>
                    </div>
                  );
                case "image":
                  return (
                    <div key={idx} className="relative h-80 w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 my-6 shadow-sm">
                      <Image
                        src={section.imageSrc || ""}
                        alt={section.imageAlt || "Medical Illustration"}
                        fill
                        className="object-cover"
                      />
                    </div>
                  );
                default:
                  return null;
              }
            })}

            {/* Bottom Call to Action Card */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-850">
              <div className="bg-[#fdfbf9] dark:bg-slate-950 border border-[#efe6dd] dark:border-slate-805 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <h3 className="text-base font-black text-brand-charcoal dark:text-white">
                    Ready to Get Back to Pain-Free Movement?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-lg leading-relaxed">
                    Our expert physiotherapy team provides comprehensive assessments to identify the root cause of your pain and create a personalized recovery program tailored to your lifestyle.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  Book Your Consultation
                </Link>
              </div>
            </div>

          </div>

        </div>
      </article>
    </div>
  );
}
