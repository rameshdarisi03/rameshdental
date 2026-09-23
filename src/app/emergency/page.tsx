import PageHeader from "@/components/public/PageHeader";
import { AlertCircle, Phone, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function Emergency() {
  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Emergency Pain & Injury Guide"
        description="Experiencing acute spasms, a severe sports injury, or sudden joint lock? Read our guidance and get in touch with our front desk immediately."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Urgent Alert Banner */}
          <div className="flex flex-col sm:flex-row gap-4 bg-red-50 dark:bg-red-950/20 border border-red-200/80 p-6 rounded-3xl shadow-sm">
            <AlertCircle className="h-8 w-8 text-red-650 dark:text-red-400 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-black text-red-950 dark:text-red-300 text-lg">Acute Injury Response</h3>
              <p className="text-xs text-red-800 dark:text-red-400 leading-relaxed font-semibold">
                If you have experienced a joint dislocation, a suspected fracture, severe swelling, or sudden inability to bear weight, do not force movement. Reach out to our front desk for an emergency slots priority review or visit the nearest hospital.
              </p>
              <div className="pt-2">
                <a
                  href="tel:+918904456243"
                  className="inline-flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call Front Desk: +91 89044 56243
                </a>
              </div>
            </div>
          </div>

          {/* R.I.C.E. Guide */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Immediate Care: The P.R.I.C.E. Protocol</h2>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-semibold">
              For soft tissue injuries (sprains, strains, tears) incurred during sports or daily activities, apply this first-aid method during the first 24 to 48 hours to minimize swelling and protect the tissues:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl bg-white dark:bg-slate-900 space-y-2 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350">
                <h4 className="font-black text-brand-green dark:text-white text-sm">1. Protect (P)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Protect the injured area from further damage. Stop the activity immediately and use a brace, splint, or crutches if necessary.
                </p>
              </div>
              <div className="border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl bg-white dark:bg-slate-900 space-y-2 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350">
                <h4 className="font-black text-brand-green dark:text-white text-sm">2. Rest (R)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Avoid putting weight or stress on the injured muscle or joint. Rest is essential for the initial tissue-healing phase.
                </p>
              </div>
              <div className="border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl bg-white dark:bg-slate-900 space-y-2 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350">
                <h4 className="font-black text-brand-green dark:text-white text-sm">3. Ice (I)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Apply a cold pack or wrapped ice to the injured area for 15-20 minutes every 2-3 hours. This decreases pain and local inflammation.
                </p>
              </div>
              <div className="border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl bg-white dark:bg-slate-900 space-y-2 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-350">
                <h4 className="font-black text-brand-green dark:text-white text-sm">4. Compress & Elevate (C & E)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Lightly wrap the area with an elastic bandage to control swelling. Elevate the injured limb above heart level whenever resting.
                </p>
              </div>
            </div>
          </div>

          {/* Medical Disclaimer */}
          <div className="flex gap-3 bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-450 leading-relaxed shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
            <ShieldAlert className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
            <p className="font-semibold">
              <strong className="text-brand-charcoal font-black">Disclaimer:</strong> The first-aid information on this page is for educational purposes only and does not replace clinical diagnosis. For life-threatening emergencies, severe fractures, chest pain, or head trauma, immediately call standard government emergency numbers or visit the nearest multi-specialty emergency room.
            </p>
          </div>

          <div className="text-center pt-4">
            <Link
              href="/book"
              className="inline-flex items-center gap-1 text-sm font-black text-brand-green hover:text-brand-green-hover dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
            >
              Request a priority slot online <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
