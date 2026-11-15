"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { ChevronDown, HelpCircle, Calendar, MessageSquare, Phone } from "lucide-react";

const faqData = [
  {
    question: "Is root canal treatment (RCT) really painful?",
    answer: "No! With modern computerized local anesthesia and motorized rotary endodontics, a root canal is virtually painless—no more uncomfortable than getting a routine dental filling. In fact, a root canal immediately relieves the agonizing throbbing pain caused by inflamed or infected dental pulp."
  },
  {
    question: "How long do dental implants last and who is eligible?",
    answer: "Dental implants are biologically permanent restorations. The titanium fixture fuses directly with your jawbone through osseointegration and can easily last 25+ years to a lifetime with routine brushing, flossing, and 6-month checkups. Most healthy adults with sufficient jawbone density are excellent candidates. Even with bone loss, modern bone grafting and sinus lifts make implants widely accessible."
  },
  {
    question: "How do invisible clear aligners compare to traditional metal braces?",
    answer: "Clear aligners use custom series of medical-grade transparent thermoplastic trays that gently move teeth into position. Unlike metal braces, aligners are virtually invisible in photos and meetings, removable for meals, have zero dietary restrictions, and allow standard brushing and flossing without cumbersome wires."
  },
  {
    question: "Does teeth scaling loosen teeth or wear away enamel?",
    answer: "This is a common myth. Professional ultrasonic scaling does not remove enamel or loosen teeth. Ultrasonic instruments use gentle high-frequency sound micro-vibrations paired with a cooling water mist to break away calcified bacterial tartar (calculus). Tartar is what actually destroys bone and loosens teeth—scaling saves teeth from gum disease."
  },
  {
    question: "Do all wisdom teeth have to be extracted?",
    answer: "No. If a wisdom tooth emerges upright, properly aligned, and can be thoroughly cleaned during daily oral hygiene, it can remain safely in place. Extraction is only recommended if the tooth is impacted, growing sideways against adjacent molar roots, causing recurrent gum infection (pericoronitis), or harboring deep cavities."
  },
  {
    question: "At what age should a child have their first dental visit?",
    answer: "The Indian Dental Association and pediatric dental academies recommend the 'First Tooth, First Birthday' rule: a child's first visit should happen when their first tooth erupts or by age one. Early visits ensure healthy jaw development, detect early childhood cavities, and help children associate the dental clinic with a fun, gentle experience."
  },
  {
    question: "How long does professional in-office teeth whitening last?",
    answer: "In-office blue LED laser teeth whitening can brighten teeth by up to 6 to 8 shades in a single 45-minute clinical appointment. Depending on your consumption of staining beverages (coffee, tea, red wine, turmeric) and oral hygiene habits, results typically last 1 to 2 years. Touch-up maintenance can extend the brightness indefinitely."
  },
  {
    question: "What should I do in a dental emergency (knocked-out tooth or severe pain)?",
    answer: "Call our emergency line (+91 89714 62949) immediately. For a knocked-out permanent tooth, handle it only by the crown, gently rinse it in cold water or milk for 5 seconds without scrubbing, place it in a cup of cold milk, and reach our clinic within 30 to 60 minutes for the highest re-implantation success rate."
  },
  {
    question: "Can I claim insurance reimbursement for dental procedures?",
    answer: "Yes. Many corporate wellness health policies and comprehensive health insurance covers include outpatient dental treatments (OPD dental riders) or surgical hospital extractions. After your consultation, we provide an itemized official clinical invoice with complete diagnostic codes and doctor registration numbers for insurance claim reimbursement."
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
        title="Frequently Asked Dental Questions"
        subtitle="Clear clinical answers about root canals, dental implants, clear aligners, pediatric care, teeth whitening, and insurance coverage at Ramesh Dental Clinic."
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
              Have a Specific Dental Question?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Our clinical desk and doctors are available to assist you with treatment estimates, appointment scheduling, and emergency queries.
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
              href="https://wa.me/918971462949?text=Hello%20Ramesh%20Dental%20Clinic,%20I%20have%20a%20question%20regarding%20a%20dental%20procedure."
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
