"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/public/PageHeader";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Great_Vibes } from "next/font/google";

const signatureFont = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
});

interface TherapistProfile {
  name: string;
  role: string;
  image: string;
  years: string;
  headline: string;
  desc: string;
  quote: string;
  signature: string;
}

export default function Team() {
  const profiles: TherapistProfile[] = [
    {
      name: "Dr. Kinnera, BPT, MPT",
      role: "Senior Physiotherapist & Clinical Director",
      image: "/images/dr-kinnera-portrait.jpg",
      years: "12+",
      headline: "Passionate About Providing Expert Care And Support",
      desc: "Behind every successful recovery is a physiotherapist's passion for care, relentless support, and expert guidance. Dr. Kinnera is committed to resolving underlying biomechanical dysfunctions, relieving acute and chronic pain, and helping you achieve long-term physical health.",
      quote: "True Healing Comes From More Than Treatments—It's Built On Trust, Patience, And Compassion, Reflected In Each Small Victory And Ongoing Encouragement.",
      signature: "Dr. Kinnera",
    },
    {
      name: "Dr. Rohan, BPT, MPT",
      role: "Lead Physiotherapist & Spine Rehabilitation Specialist",
      image: "/images/dr-rohan-portrait.jpg",
      years: "8+",
      headline: "Empowering Movement And Rebuilding Structural Resilience",
      desc: "Dedicated to helping patients reclaim their physical strength, Dr. Rohan combines evidence-based spinal care with manual therapy techniques. He focuses on restoring spinal function, correcting posture, and designing custom rehabilitation protocols for fast, sustainable recovery.",
      quote: "Rehabilitation Is About Reconnecting With Your Body's Potential, Reclaiming What Was Lost, And Walking Forward With Strength And Renewed Confidence.",
      signature: "Dr. Rohan",
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % profiles.length);
  }, [profiles.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + profiles.length) % profiles.length);
  }, [profiles.length]);

  // Autoplay effect loops every 4 seconds. Reset on index changes (prevents rapid double-skipping)
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  const active = profiles[currentIndex];

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Self-contained CSS Animations Injector */}
      <style>{`
        @keyframes float-badge {
          0%, 100% { transform: translateY(-50%) translateY(0px) scale(1); }
          50% { transform: translateY(-50%) translateY(-6px) scale(1.03); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-float-badge {
          animation: float-badge 3s ease-in-out infinite;
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-left {
          opacity: 0;
          animation: fade-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-right {
          opacity: 0;
          animation: fade-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
      `}</style>

      <PageHeader
        title="Meet Our Specialists"
        description="Providing specialized physical therapy, clinical gait analysis, and personalized rehabilitation programs built on trust and compassion."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-955 flex-grow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          
          {/* Navigation Arrows for desktop */}
          <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-20 hidden lg:block">
            <button
              onClick={prevSlide}
              className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="Previous Specialist"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-20 hidden lg:block">
            <button
              onClick={nextSlide}
              className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="Next Specialist"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Sliding Content Container - keyed by currentIndex to re-trigger animations cleanly */}
          <div key={currentIndex} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
            
            {/* Left Column: Portrait and floating badge */}
            <div className="lg:col-span-5 relative animate-fade-in-left">
              <div className="relative max-w-md mx-auto">
                <img
                  src={active.image}
                  alt={`${active.name} Standing in GPC Clinic`}
                  className="w-full rounded-[2.5rem] object-cover aspect-[3/4] shadow-[0_15px_35px_-10px_rgba(93,122,109,0.25)] border-4 border-white dark:border-slate-900 transition-all duration-300"
                />
                
                {/* Floating circular expertise badge - Overlaid on center right edge with pulsing/floating animation */}
                <div className="absolute -right-8 top-1/2 z-10 w-24 h-24 rounded-full bg-[#1b3d2f] text-white flex flex-col items-center justify-center border-4 border-slate-50 dark:border-slate-950 shadow-xl text-center select-none animate-float-badge">
                  <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">{active.years}</span>
                  <span className="text-[7.5px] font-black uppercase tracking-wider mt-1.5 leading-tight">
                    Years of<br />Expertise
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Text Info Panel */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Static sub-badge header (Not sliding inside the grid layout, but mounts with the dynamic slide card details) */}
              <div className="flex items-center gap-2 text-brand-green dark:text-teal-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest animate-fade-in-up">
                <span className="h-[2px] w-8 bg-brand-green dark:bg-teal-400 rounded-full"></span>
                OUR TRUSTED SUPPORT
              </div>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal dark:text-white leading-tight animate-fade-in-up delay-100">
                {active.headline.includes("Providing") ? (
                  <>
                    Passionate About <span className="text-brand-green dark:text-teal-400">Providing Expert Care</span> And Support
                  </>
                ) : (
                  <>
                    Empowering Movement And <span className="text-brand-green dark:text-teal-400">Rebuilding Structural</span> Resilience
                  </>
                )}
              </h2>

              {/* Sub-paragraph */}
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal animate-fade-in-up delay-200">
                {active.desc}
              </p>

              {/* Quote block */}
              <div className="border-l-4 border-brand-green dark:border-teal-500 bg-[#f0f4f2]/60 dark:bg-brand-green/5 p-4 sm:p-5 rounded-r-2xl italic text-[11px] sm:text-xs font-normal text-slate-655 dark:text-slate-350 leading-relaxed animate-fade-in-up delay-300">
                "{active.quote}"
              </div>

              {/* Profile Card & Handwriting Signature (Flex row wrapper) */}
              <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-200/60 dark:border-slate-800 animate-fade-in-up delay-400">
                <div className="flex items-center gap-3">
                  <img
                    src={active.image}
                    alt={`${active.name} Profile Icon`}
                    className="w-12 h-12 rounded-full object-cover border border-brand-green/20 ring-4 ring-brand-green/5 shrink-0"
                  />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none block mb-1">
                      {active.role}
                    </span>
                    <h4 className="text-sm font-black text-brand-charcoal dark:text-white leading-tight">
                      {active.name}
                    </h4>
                  </div>
                </div>

                {/* Flowy Handwriting Cursive Signature */}
                <div className={`${signatureFont.className} text-4xl sm:text-5xl text-brand-green dark:text-teal-400 font-medium select-none pr-4 rotate-[-3deg] transform origin-center tracking-wide`}>
                  {active.signature}
                </div>
              </div>

              {/* Action booking CTA Button */}
              <div className="pt-2 animate-fade-in-up delay-400">
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

          {/* Desktop/Tablet Pagination Indicator Dots & Mobile Navigator Control */}
          <div className="flex items-center justify-center gap-4 pt-12">
            <button
              onClick={prevSlide}
              className="lg:hidden p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex gap-2">
              {profiles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-350 cursor-pointer ${idx === currentIndex ? "bg-brand-green w-6" : "bg-slate-300 dark:bg-slate-700 w-2.5 hover:bg-slate-400"}`}
                  title={`View Specialist ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              className="lg:hidden p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
