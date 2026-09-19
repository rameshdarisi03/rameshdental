"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { ChevronDown, HelpCircle, Calendar, MessageSquare, Phone } from "lucide-react";

const faqData = [
  {
    question: "Do I need a doctor's referral to visit Gait Physio Clinic?",
    answer: "No, a doctor's referral is not mandatory. You can walk in or book an appointment directly with our qualified physical therapists. However, if you have recent X-rays, MRI scans, or surgical discharge notes, please bring them along to assist our diagnostic review."
  },
  {
    question: "What is biomechanical gait analysis and who needs it?",
    answer: "Biomechanical gait analysis is a clinical evaluation of the way your body moves while walking or running. Using motion tracking, we analyze joint angles, foot strike patterns, and pelvic rotation to identify subtle imbalances causing recurrent knee pain, plantar fasciitis, shin splints, or lower back strain."
  },
  {
    question: "How long does a physiotherapy consultation session last?",
    answer: "An initial comprehensive assessment typically takes 45 to 60 minutes, including subjective clinical history, motion testing, hands-on treatment, and home exercise guidance. Subsequent follow-up sessions usually take 40 to 50 minutes."
  },
  {
    question: "What should I wear to my physiotherapy session?",
    answer: "We recommend comfortable, loose athletic clothing such as track pants, shorts, and a breathable t-shirt that allows your therapist to assess your spine, knee, or shoulder movements comfortably."
  },
  {
    question: "How many sessions will I need to experience pain relief?",
    answer: "Many patients experience noticeable relief within 2 to 4 sessions. However, full mechanical correction and long-term joint stabilization typically involve a 6 to 12 session protocol depending on whether your condition is acute (e.g. recent ankle sprain) or chronic (e.g. years of lumbar stiffness)."
  },
  {
    question: "Do you offer treatment for tailbone pain (Coccydynia)?",
    answer: "Yes, specialized tailbone pain relief is one of our key clinical specialties. We use gentle manual mobilization, pelvic core adjustments, and ultrasound electrotherapy to relieve coccygeal inflammation and restore pain-free sitting."
  },
  {
    question: "Can I claim insurance reimbursement for my sessions?",
    answer: "Yes. After your session, we issue an official clinical invoice with complete diagnosis details, therapist registration number, and itemized billing breakdown that you can submit to your health insurance or corporate wellness provider for reimbursement."
  }
];

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      {/* Schema.org FAQPage for Google Search snippet accordions */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Clear answers about physiotherapy consultations, gait analysis, costs, and clinical recovery protocols."
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        {/* Accordion List */}
        <div className="space-y-4">
          {faqData.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.question}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-brand-green" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 animate-in fade-in duration-200">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              Have a Specific Clinical Question?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Our clinical desk is available to assist you with session guidelines, appointment timings, or personalized treatment inquiries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/book"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-transform active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>
            <a
              href="https://wa.me/919206651295"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs px-6 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Consultation</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
