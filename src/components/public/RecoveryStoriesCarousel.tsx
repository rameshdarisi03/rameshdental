"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  Clock, 
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { recoveryStories, RecoveryStory } from "@/data/stories";
import StoryVideoModal from "./StoryVideoModal";

export default function RecoveryStoriesCarousel() {
  const [selectedStory, setSelectedStory] = useState<RecoveryStory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Carousel index for desktop and mobile
  const [desktopIndex, setDesktopIndex] = useState(0);
  const [isDesktopTransitioning, setIsDesktopTransitioning] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Mobile Swipe State
  const [mobileIndex, setMobileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const featuredStories = useMemo(() => {
    return recoveryStories.filter((s) => s.featured).sort((a, b) => a.order - b.order);
  }, []);

  const totalStories = featuredStories.length;

  // Extended array for desktop loop
  const extendedDesktop = useMemo(() => {
    return totalStories > 0 ? [...featuredStories, ...featuredStories.slice(0, 3)] : [];
  }, [featuredStories, totalStories]);

  // Next / Prev handlers for Desktop (sliding 3 per view)
  const handleNextDesktop = useCallback(() => {
    setIsDesktopTransitioning(true);
    setDesktopIndex((prev) => prev + 1);
  }, []);

  const handlePrevDesktop = useCallback(() => {
    if (desktopIndex === 0) {
      setIsDesktopTransitioning(false);
      setDesktopIndex(totalStories);
      setTimeout(() => {
        setIsDesktopTransitioning(true);
        setDesktopIndex(totalStories - 1);
      }, 40);
    } else {
      setIsDesktopTransitioning(true);
      setDesktopIndex((prev) => prev - 1);
    }
  }, [desktopIndex, totalStories]);

  const handleDesktopTransitionEnd = () => {
    if (desktopIndex >= totalStories) {
      setIsDesktopTransitioning(false);
      setDesktopIndex(0);
    }
  };

  // Next / Prev handlers for Mobile (1 per view)
  const handleNextMobile = useCallback(() => {
    setMobileIndex((prev) => (prev + 1) % totalStories);
  }, [totalStories]);

  const handlePrevMobile = useCallback(() => {
    setMobileIndex((prev) => (prev === 0 ? totalStories - 1 : prev - 1));
  }, [totalStories]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNextMobile();
    if (distance < -50) handlePrevMobile();
    setTouchStart(null);
    setTouchEnd(null);
  };

  const openStory = (story: RecoveryStory) => {
    setSelectedStory(story);
    setModalOpen(true);
  };

  return (
    <section id="stories" className="py-20 sm:py-24 bg-white dark:bg-[#071317] relative overflow-hidden transition-colors border-t border-slate-200/60 dark:border-slate-800/80">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#f9ab55]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-center md:text-left">
          <div className="space-y-3 max-w-2xl mx-auto md:mx-0">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-green/10 dark:bg-[#f9ab55]/15 text-brand-green dark:text-[#f9ab55] text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              CLINICAL EVIDENCE & OUTCOMES
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-brand-charcoal dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]">
              Patient Smile Transformations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Explore real clinical transformations, pain-free root canals, dental implants, and smile makeovers restored under our specialized doctors&apos; care.
            </p>
          </div>

          {/* Desktop Next & Prev Controls */}
          <div className="hidden md:flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={handlePrevDesktop}
              className="h-11 w-11 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-[#062e36] hover:text-white hover:border-[#062e36] dark:hover:bg-[#f9ab55] dark:hover:text-[#062e36] flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
              aria-label="Previous Story"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNextDesktop}
              className="h-11 w-11 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-[#062e36] hover:text-white hover:border-[#062e36] dark:hover:bg-[#f9ab55] dark:hover:text-[#062e36] flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
              aria-label="Next Story"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* --- DESKTOP CAROUSEL (3 Per View) --- */}
        <div 
          className="hidden md:block overflow-hidden py-2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={`flex ${isDesktopTransitioning ? "transition-transform duration-500 ease-out" : ""}`}
            style={{ transform: `translateX(-${desktopIndex * (100 / 3)}%)` }}
            onTransitionEnd={handleDesktopTransitionEnd}
          >
            {extendedDesktop.map((story, idx) => (
              <div key={`desktop-story-${story.id}-${idx}`} className="w-1/3 shrink-0 px-3.5">
                <div 
                  onClick={() => openStory(story)}
                  className="group relative bg-[#062e36] text-white rounded-3xl border border-white/10 overflow-hidden shadow-[0_12px_32px_rgba(6,46,54,0.15)] hover:shadow-[0_20px_48px_rgba(6,46,54,0.25)] transition-all duration-300 flex flex-col justify-between h-[480px] cursor-pointer hover:-translate-y-1.5"
                >
                  {/* Video Thumbnail Area with Video Preview */}
                  <div className="relative h-[280px] w-full overflow-hidden bg-black rounded-t-3xl">
                    <video
                      src={story.videoUrl}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-85 group-hover:opacity-100"
                    />

                    {/* Gradient Overlay for Text Legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#062e36] via-black/20 to-transparent" />

                    {/* Top Category Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#f9ab55] border border-[#f9ab55]/40 text-[10px] font-black tracking-wider uppercase shadow-md">
                        <Activity className="w-3 h-3 text-[#f9ab55]" />
                        {story.category}
                      </span>
                    </div>

                    {/* Duration Pill */}
                    {story.duration && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {story.duration}
                        </span>
                      </div>
                    )}

                    {/* Center Glowing Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#f9ab55]/90 group-hover:bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-115">
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Content Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between bg-[#062e36]">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] leading-snug line-clamp-2 group-hover:text-[#f9ab55] transition-colors">
                        {story.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {story.subtitle}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400 font-semibold">{story.therapist}</span>
                      <span className="inline-flex items-center gap-1 text-[#f9ab55] font-black text-xs group-hover:translate-x-1 transition-transform">
                        <span>Watch Case</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-2 pt-6">
            {featuredStories.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDesktopIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  desktopIndex % totalStories === idx
                    ? "w-8 bg-[#062e36] dark:bg-[#f9ab55]"
                    : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* --- MOBILE CAROUSEL (1 Per View with Touch Swipe) --- */}
        <div 
          className="md:hidden overflow-hidden py-1"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
          >
            {featuredStories.map((story) => (
              <div key={`mobile-story-${story.id}`} className="w-full shrink-0 px-1">
                <div 
                  onClick={() => openStory(story)}
                  className="bg-[#062e36] text-white rounded-3xl border border-white/10 overflow-hidden shadow-xl flex flex-col h-[460px] cursor-pointer"
                >
                  <div className="relative h-[260px] w-full overflow-hidden bg-black rounded-t-3xl">
                    <video
                      src={story.videoUrl}
                      muted
                      playsInline
                      loop
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#062e36] via-black/20 to-transparent" />
                    
                    <div className="absolute top-4 left-4 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-[#f9ab55] border border-[#f9ab55]/40 text-[10px] font-black uppercase">
                        {story.category}
                      </span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-xl">
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between bg-[#062e36]">
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans',sans-serif] leading-tight">
                        {story.title}
                      </h3>
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {story.subtitle}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">{story.therapist}</span>
                      <span className="text-[#f9ab55] font-black inline-flex items-center gap-1">
                        Watch <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Dots */}
          <div className="flex items-center justify-center gap-2 pt-5">
            {featuredStories.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMobileIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  mobileIndex === idx ? "w-7 bg-[#062e36] dark:bg-[#f9ab55]" : "w-2 bg-slate-300 dark:bg-slate-700"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA: Explore All Recovery Stories */}
        <div className="flex justify-center pt-2">
          <Link
            href="/stories"
            className="inline-flex items-center justify-center gap-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-8 py-4 text-xs sm:text-sm font-black tracking-wide text-brand-charcoal dark:text-white shadow-sm hover:border-[#f9ab55] hover:shadow-md transition-all active:scale-95 uppercase"
          >
            <span>Explore All Recovery Stories & Video Cases</span>
            <ArrowRight className="w-4 h-4 text-brand-green dark:text-[#f9ab55]" />
          </Link>
        </div>

      </div>

      {/* Global Interactive Video Modal Player */}
      <StoryVideoModal
        story={selectedStory}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
