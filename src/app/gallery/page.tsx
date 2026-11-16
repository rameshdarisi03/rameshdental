import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { Sparkles, Calendar, MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";

const galleryImages = [
  {
    title: "Master Dental Operatory & Microscopic RCT Suite",
    category: "Painless Endodontics",
    image: "/images/gallery/operatory_master.webp",
    description: "Equipped with motorized dental chairs, rotary endodontic motors, and shadowless LED operatory lighting."
  },
  {
    title: "Digital Implantology & Radiography Suite",
    category: "Implantology & Surgery",
    image: "/images/gallery/implantology_3d_lab.webp",
    description: "Dedicated sterile surgical operatory for precision guided implant placement and bone grafting."
  },
  {
    title: "Laser Dentistry & Cosmetic Suite",
    category: "Cosmetic & Gum Care",
    image: "/images/gallery/dental_endodontics_suite.webp",
    description: "Soft-tissue diode lasers, ultrasonic scaling, and ZOOM in-office teeth whitening systems."
  },
  {
    title: "Clear Aligner & Orthodontic Consultation Bay",
    category: "Orthodontics",
    image: "/images/services/invisible-aligners.webp",
    description: "Digital intraoral 3D scanning station for custom clear aligner planning and smile simulations."
  },
  {
    title: "Pediatric & Gentle Dental Operatory",
    category: "Pediatric Dentistry",
    image: "/images/services/pediatric-dentistry.webp",
    description: "Child-friendly operatory designed to keep young patients calm, relaxed, and anxiety-free."
  },
  {
    title: "Welcome Lounge & Consultation Suite",
    category: "Reception & Lounge",
    image: "/images/gallery/reception_operatory_panoramic.webp",
    description: "Spacious, soothing waiting lounge with air filtration, sanitized beverage bar, and consultation desks."
  }
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Clinic Facility & Operatory Gallery"
        subtitle="Take a visual tour of our modern dental operatories, digital radiography suites, and hospital-grade sterilization protocols."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        {/* Hygiene & Amenities Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Class-B Autoclave</p>
            <p className="text-[11px] text-slate-400">100% Sterile Instruments</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Private Operatories</p>
            <p className="text-[11px] text-slate-400">Quiet, Anxiety-Free Care</p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-1 shadow-xs">
            <p className="text-sm font-black text-brand-green">Digital Radiography</p>
            <p className="text-[11px] text-slate-400">Low-Dose RVG / IOPAR</p>
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
