import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { Sparkles, Calendar, MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";

const galleryImages = [
  {
    title: "Main Physical Therapy & Exercise Bay",
    category: "Active Rehabilitation Gym",
    image: "/images/hero_physio_session.webp",
    description: "Equipped with posture grids, therapeutic bands, and progressive resistance tools for kinetic recovery."
  },
  {
    title: "Spinal Mobilization & Manual Therapy Room",
    category: "Private Treatment Suite",
    image: "/images/hero_cover_option_1_spine.webp",
    description: "Dedicated ergonomic adjustment beds for safe spinal decompression and passive manual therapies."
  },
  {
    title: "Clinical Consultation & Biomechanical Diagnostic Suite",
    category: "Clinical Assessment",
    image: "/images/mobile_cover_teal_option_2.webp",
    description: "High-precision analysis cameras and dynamic motion tracking tools for digital gait evaluation."
  },
  {
    title: "Orthopedic & Joint Mobilization Zone",
    category: "Musculoskeletal Zone",
    image: "/images/services/musculoskeletal.webp",
    description: "Designed for guided joint mobilization and targeted spinal core strengthening."
  },
  {
    title: "Sports Agility & Return-to-Play Area",
    category: "Sports Performance",
    image: "/images/services/sports_injury.webp",
    description: "Floor drills, plyometrics, and neuromuscular coordination mats for athletes."
  },
  {
    title: "Gentle Mobility & Senior Rehabilitation Bay",
    category: "Senior Mobility",
    image: "/images/services/geriatric.webp",
    description: "Low-impact balance bars and fall-prevention parallel rails for senior rehabilitation."
  }
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Clinic Facility & Gallery"
        subtitle="Take a visual tour of our modern, sanitized physiotherapy clinic, private treatment suites, and active rehabilitation gym."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Hygiene & Amenities Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">100% Sanitized</p>
            <p className="text-[11px] text-slate-400">Hospital-Grade Disinfection</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Private Bays</p>
            <p className="text-[11px] text-slate-400">Complete Patient Privacy</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Electrotherapy</p>
            <p className="text-[11px] text-slate-400">Laser, IFT, Ultrasound</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Lift & Wheelchair</p>
            <p className="text-[11px] text-slate-400">Accessible Facility</p>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {galleryImages.map((item, index) => (
            <div
              key={item.title}
              className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={item.image}
                  alt={item.title}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {item.category}
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-brand-green transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Visit Clinic Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-brand-green">
              <MapPin className="w-4 h-4" />
              <span>ITPL Main Road, Whitefield (Near Hope Farm Signal)</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Experience World-Class Clinical Care in Person
            </h3>
            <p className="text-xs text-slate-500 max-w-lg">
              Open Monday to Saturday, 9:00 AM – 8:00 PM. Book your dedicated slot online to eliminate waiting times.
            </p>
          </div>

          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs px-6 py-3.5 rounded-2xl shadow-sm transition-transform active:scale-95 shrink-0"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Consultation Bay</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
