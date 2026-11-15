"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PageHeader from "@/components/public/PageHeader";
import { articles } from "@/data/articles";
import { BookOpen, Calendar, Clock, ArrowRight } from "lucide-react";

export default function ArticlesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];

  const filteredArticles = selectedCategory === "All"
    ? articles
    : articles.filter((a) => a.category === selectedCategory);

  return (
    <div className="flex flex-col w-full min-h-screen bg-brand-bg dark:bg-slate-955">
      <PageHeader
        title="Dental Articles & Oral Health Insights"
        description="Explore dental science, practical oral care guides, and expert advice from our dental specialists to maintain a healthy, pain-free smile."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-full text-xs font-black transition-all ${
                  selectedCategory === category
                    ? "bg-brand-green text-white shadow-md scale-105"
                    : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* 3-Column Grid Layout (3x3 basis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => (
              <article
                key={article.slug}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-850 overflow-hidden shadow-[0_8px_30px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_40px_-6px_var(--brand-shadow-hover)] transition-all duration-300 flex flex-col group"
              >
                {/* Thumbnail Image */}
                <Link href={`/articles/${article.slug}`} className="block relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
                  <Image
                    src={article.thumbnail}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    priority={article.slug === "knee-pain-stair-climbing"}
                  />
                  <div className="absolute top-4 left-4 bg-brand-green/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                    {article.category}
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-7 flex flex-col flex-1 justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Meta info (like in reference screenshot) */}
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{article.readTime}</span>
                      <span className="text-slate-300">•</span>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{article.date}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-brand-charcoal dark:text-white leading-snug group-hover:text-brand-green transition-colors">
                      <Link href={`/articles/${article.slug}`} className="hover:underline">
                        {article.title}
                      </Link>
                    </h3>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed font-semibold line-clamp-3">
                      {article.excerpt}
                    </p>

                    {/* SEO Tags preview */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {article.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Read More Link */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-brand-green hover:text-brand-green-hover transition-colors"
                    >
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Empty State */}
          {filteredArticles.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-850 rounded-[2rem] space-y-3">
              <BookOpen className="h-10 w-10 text-slate-350 mx-auto" />
              <h3 className="text-sm font-black text-brand-charcoal dark:text-white">No articles found</h3>
              <p className="text-xs text-slate-455 max-w-xs mx-auto font-semibold">
                We haven't published any articles in the "{selectedCategory}" category yet. Check back soon!
              </p>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
