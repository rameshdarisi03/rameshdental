"use client";

import React, { useState, useMemo } from "react";
import PageHeader from "@/components/public/PageHeader";
import { recoveryStories, RecoveryStory } from "@/data/stories";
import StoryVideoModal from "@/components/public/StoryVideoModal";
import Link from "next/link";
import { 
  Play, 
  Sparkles, 
  Activity, 
  Clock, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Filter,
  ShieldCheck
} from "lucide-react";

const CATEGORIES = [
  "All Stories",
  "Orthopedic Rehab",
  "Spine & Posture",
  "Neuro & Gait",
  "Hand & Upper Limb",
  "Geriatric Mobility",
] as const;

export default function RecoveryStoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All Stories");
  const [selectedStory, setSelectedStory] = useState<RecoveryStory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredStories = useMemo(() => {
    if (selectedCategory === "All Stories") return recoveryStories;
    return recoveryStories.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  const openStory = (story: RecoveryStory) => {
    setSelectedStory(story);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Patient Recovery Stories"
        subtitle="Real video documentation of clinical progress, joint mobilization, and movement restoration under Dr. Kinnera's specialized care."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Trust Badges Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">100% Real Cases</p>
            <p className="text-[11px] text-slate-400">Authentic In-Clinic Therapy</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Evidence-Backed</p>
            <p className="text-[11px] text-slate-400">Protocolized Progress Milestones</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Dr. Kinnera Led</p>
            <p className="text-[11px] text-slate-400">Direct Specialist Supervision</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Functional Goals</p>
            <p className="text-[11px] text-slate-400">Zero Walker & Full Independence</p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold mr-2 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#062e36] text-white dark:bg-[#f9ab55] dark:text-[#062e36] shadow-md scale-102"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-brand-green"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredStories.map((story) => (
            <div
              key={story.id}
              onClick={() => openStory(story)}
              className="group relative bg-[#062e36] text-white rounded-3xl border border-white/10 overflow-hidden shadow-[0_12px_32px_rgba(6,46,54,0.15)] hover:shadow-[0_20px_48px_rgba(6,46,54,0.25)] transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1.5"
            >
              {/* Video Thumbnail Area */}
              <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-black rounded-t-3xl">
                <video
                  src={story.videoUrl}
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#062e36] via-black/25 to-transparent" />

                {/* Category Badge Top Left */}
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#f9ab55] border border-[#f9ab55]/40 text-[10px] font-black tracking-wider uppercase shadow-md">
                    <Activity className="w-3 h-3 text-[#f9ab55]" />
                    {story.category}
                  </span>
                </div>

                {/* Duration Top Right */}
                {story.duration && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {story.duration}
                    </span>
                  </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-[#f9ab55]/90 group-hover:bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-2xl transition-all duration-300 group-hover:scale-115">
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Story Content */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-end">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] leading-snug group-hover:text-[#f9ab55] transition-colors">
                    {story.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {story.subtitle}
                  </p>
                </div>

                {/* Key Technique Tags */}
                {story.highlights && story.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {story.highlights.slice(0, 2).map((h, i) => (
                      <span key={i} className="text-[10px] font-bold bg-white/10 text-slate-200 px-2.5 py-0.5 rounded-full">
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold">{story.therapist}</span>
                  <span className="inline-flex items-center gap-1 text-[#f9ab55] font-black text-xs group-hover:translate-x-1 transition-transform">
                    <span>Watch Video</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Consultation Banner */}
        <section className="bg-gradient-to-br from-[#062e36] to-[#0d4d5a] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden border border-white/10">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f9ab55]/20 text-[#f9ab55] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              PERSONALIZED REHABILITATION
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans',sans-serif]">
              Facing a Similar Condition or Surgery Recovery?
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
              Dr. Kinnera and our clinical team develop targeted recovery programs tailored to your exact mobility goals and comfort level.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10 pt-2">
            <Link
              href="/patienthub/appointments"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#f9ab55] hover:bg-[#e09840] text-[#062e36] px-8 py-4 text-xs sm:text-sm font-black shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wide"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Clinical Consultation</span>
            </Link>
            <a
              href="tel:+918971462949"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/30 hover:bg-white/10 text-white px-8 py-4 text-xs sm:text-sm font-bold transition-all active:scale-95"
            >
              <span>Call Clinic (+91 89714 62949)</span>
            </a>
          </div>
        </section>
      </main>

      {/* Global Interactive Video Modal Player */}
      <StoryVideoModal
        story={selectedStory}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
