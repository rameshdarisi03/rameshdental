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

  // Helper to split and format headers to match premium editorial style
  const formatHeading = (text: string) => {
    const words = text.split(" ");
    if (words.length <= 1) return text;
    // Highlight the last word or two words
    const lastWord = words.pop();
    const remaining = words.join(" ");
    return (
      <>
        {remaining}{" "}
        <span className="text-brand-green dark:text-teal-400 italic font-medium">
          {lastWord}
        </span>
      </>
    );
  };

  if (!article) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center bg-brand-bg dark:bg-slate-955 p-6 text-center space-y-4">
        <BookOpen className="h-12 w-12 text-slate-350 animate-pulse" />
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
      
      {/* Title & Metadata Header on Clean Spacious Background */}
      <header className="py-12 md:py-16 bg-[#fbf9f6] dark:bg-slate-900 border-b border-slate-200/40 dark:border-slate-850">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-green dark:text-slate-400 dark:hover:text-white text-xs font-black transition-colors"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span>Back to Articles</span>
          </Link>

          <div className="space-y-4">
            <span className="inline-flex items-center bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-brand-green/10">
              {article.category}
            </span>
            <h1 className="text-2xl md:text-3xl lg:text-4.5xl font-black text-brand-charcoal dark:text-white leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-green" />
                {article.readTime}
              </span>
              <span className="text-slate-350 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-green" />
                {article.date}
              </span>
              <span className="text-slate-355 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1.5 text-brand-green dark:text-teal-450 font-black">
                <UserCheck className="w-4 h-4" />
                Reviewed by Physiotherapist
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout Column */}
      <main className="py-12 md:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Contained Intro Image Card with object-top crop correction */}
          <div className="relative h-[20rem] md:h-[28rem] w-full rounded-[2.5rem] overflow-hidden border border-slate-200/50 dark:border-slate-800 shadow-[0_6px_25px_-6px_var(--brand-shadow)] bg-slate-100 dark:bg-slate-950">
            <Image
              src={article.introImage}
              alt={article.title}
              fill
              className="object-cover object-top"
              priority
            />
          </div>

          {/* Article Text Sheet */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-[2.5rem] p-6 md:p-12 shadow-[0_8px_30px_-6px_var(--brand-shadow)] space-y-8">
            
            {article.sections.map((section, idx) => {
              switch (section.type) {
                case "paragraph":
                  return (
                    <p
                      key={idx}
                      className="text-xs md:text-sm text-slate-655 dark:text-slate-350 leading-relaxed font-semibold"
                    >
                      {section.text}
                    </p>
                  );
                case "header2":
                  return (
                    <h2
                      key={idx}
                      className="text-lg md:text-xl font-black text-brand-charcoal dark:text-white pt-6 border-b border-slate-100 dark:border-slate-850 pb-3"
                    >
                      {formatHeading(section.text || "")}
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
                    <ul key={idx} className="space-y-3 pl-2">
                      {section.items?.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-655 dark:text-slate-350 font-semibold leading-relaxed">
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
                      className="p-8 rounded-[2rem] border border-[#ded5cc] dark:border-slate-800 bg-[#efe6dd]/60 dark:bg-slate-950/40 text-brand-charcoal dark:text-slate-300 space-y-4"
                    >
                      <h4 className="font-black text-brand-charcoal dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                        {section.text || "Key Takeaways"}
                      </h4>
                      {section.items && (
                        <ul className="space-y-3 pl-1">
                          {section.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="flex items-start gap-3 text-xs md:text-sm font-semibold leading-relaxed">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand-green/80 dark:bg-teal-400 mt-2 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                case "quote":
                  return (
                    <div key={idx} className="py-8 my-8 border-y border-slate-200/60 dark:border-slate-800 text-center">
                      <p className="text-sm md:text-base italic text-brand-green dark:text-teal-400 leading-relaxed font-semibold max-w-2xl mx-auto">
                        "{section.text}"
                      </p>
                    </div>
                  );
                case "reflection": {
                  const paragraphs = section.text?.split("\n\n") || [];
                  return (
                    <div
                      key={idx}
                      className="bg-brand-green dark:bg-teal-950 text-white rounded-[2rem] p-8 md:p-10 space-y-5 shadow-sm"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-sand/80 dark:text-teal-300 block">
                        Closing Reflection
                      </span>
                      {paragraphs.map((p, pIdx) => {
                        const isItalicHighlight = p.toLowerCase().startsWith("because ");
                        return (
                          <p
                            key={pIdx}
                            className={`text-xs md:text-sm leading-relaxed ${
                              isItalicHighlight ? "italic font-black text-brand-sand dark:text-teal-300" : "font-semibold"
                            }`}
                          >
                            {p}
                          </p>
                        );
                      })}
                    </div>
                  );
                }
                case "image":
                  return (
                    <div key={idx} className="relative h-64 md:h-80 w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 my-6 shadow-sm bg-slate-50 dark:bg-slate-950">
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
                  <p className="text-xs text-slate-500 dark:text-slate-450 font-semibold max-w-lg leading-relaxed">
                    Our expert physiotherapy team provides comprehensive assessments to identify the root cause of your pain and create a personalized recovery program tailored to your lifestyle.
                  </p>
                </div>
                <Link
                  href="/book"
                  className="rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  Book Your Consultation
                </Link>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
