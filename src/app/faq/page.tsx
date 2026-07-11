"use client";

import { useState } from "react";
import PageHeader from "@/components/public/PageHeader";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function FAQ() {
  const faqs = [
    {
      q: "Do I need a doctor's referral to get physiotherapy?",
      a: "No, a referral is not required to visit us. You can book an appointment directly. However, if you plan to claim treatments under specific insurance policies, your provider might require a doctor's referral. We suggest checking with your insurance provider.",
    },
    {
      q: "What is Digital Gait Analysis, and how should I prepare?",
      a: "Digital Gait Analysis measures your walking or running biomechanics on a pressure-mapped treadmill. Please wear comfortable athletic clothing and bring the running or walking shoes you use most frequently so we can scan your standard stride.",
    },
    {
      q: "What should I wear to my physiotherapy sessions?",
      a: "Wear loose, comfortable clothing that allows easy movement. If we are examining your knees, ankles, or feet, shorts are highly recommended. For shoulder, neck, or back assessments, a tank top or loose t-shirt is ideal.",
    },
    {
      q: "How long does a typical physiotherapy session last?",
      a: "Your initial assessment will take approximately 45 to 60 minutes, which includes a clinical examination, diagnostic scans (such as gait or posture analysis if required), and your first treatment. Follow-up sessions usually take 30 to 45 minutes.",
    },
    {
      q: "How does the online appointment booking confirmation work?",
      a: "When you select a slot online, your appointment status is saved as 'Pending'. Our clinic staff reviews the slot against the day's schedule. Once approved, you will receive a confirmation message directly on your WhatsApp number with the appointment details.",
    },
    {
      q: "Do you offer treatment plans for chronic back pain?",
      a: "Yes, chronic spine issues are one of our core specializations. We compile diagnostic posture scans, utilize manual therapy, electrotherapy, dry needling, and design core-strengthening programs to deliver long-term spinal stability.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Frequently Asked Questions"
        description="Have questions about session preparation, treatments, costs, or appointments? Find quick answers below."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">Help & Support</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Can't find the answer you are looking for? Reach out to our front desk directly at +91 92066 51295.
            </p>
          </div>

          <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={index} className="w-full">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="flex w-full items-center justify-between p-6 text-left focus:outline-none hover:bg-brand-bg/40 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-brand-green dark:text-teal-400 shrink-0" />
                      <span className="font-bold text-brand-charcoal dark:text-white text-sm sm:text-base group-hover:text-brand-green">
                        {faq.q}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="p-6 pt-0 bg-[#fafcfb] dark:bg-slate-900">
                      <p className="text-xs text-slate-500 dark:text-slate-350 leading-relaxed pl-8 font-semibold">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
