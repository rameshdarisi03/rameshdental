"use client";

import PageHeader from "@/components/public/PageHeader";
import { MapPin, Phone, Mail, Clock, Send, Navigation } from "lucide-react";

export default function Contact() {
  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Contact & Locate Us"
        description="Find our address, contact phone numbers, operating hours, and detailed directions to reach Gait Physio Clinic."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left side: Clinic Details */}
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Get In Touch</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Feel free to contact us with any booking questions, corporate tie-ups, or follow-ups. Our reception is available to assist you during business hours.
                </p>
              </div>

              <div className="space-y-6">
                {/* Address */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Clinic Location</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mt-1 font-semibold">
                      123 Clinical Wellness Way, Near Central Park, Sector 4, Bangalore, 560001
                    </p>
                    <p className="text-xs font-black text-brand-green dark:text-teal-400 mt-1">
                      Landmark: Next to Central Bank, opposite Central Park Main Gate
                    </p>
                  </div>
                </div>

                {/* Call */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Phone Number</h4>
                    <a href="tel:+919206651295" className="text-xs text-slate-500 hover:text-brand-green transition-colors mt-1 block font-semibold">
                      +91 92066 51295
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Email Address</h4>
                    <a href="mailto:info@gaitphysioclinic.com" className="text-xs text-slate-500 hover:text-brand-green transition-colors mt-1 block font-semibold">
                      info@gaitphysioclinic.com
                    </a>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Working Hours</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mt-1 font-semibold">
                      Monday - Saturday: 09:00 AM - 07:00 PM <br />
                      Sunday: Closed (Emergency consultations only)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Map Placeholder & Directions */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="h-96 rounded-3xl border border-slate-200/85 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
                {/* Visual grid layout simulating map */}
                <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                <div className="h-16 w-16 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0 animate-bounce mb-4 z-10">
                  <MapPin className="h-8 w-8" />
                </div>
                <div className="z-10 space-y-2">
                  <h3 className="font-black text-brand-charcoal dark:text-white">Gait Physio Clinic Bangalore</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-semibold">
                    Interactive Google Map is loaded on production deployment. Find us easily next to the Sector 4 Central Bank branch.
                  </p>
                  <div className="pt-4">
                    <a
                      href="https://maps.google.com/?q=Gait+Physio+Clinic+Bangalore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
                    >
                      <Navigation className="h-4 w-4" />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="border border-slate-200/80 dark:border-slate-850 rounded-3xl p-8 bg-white dark:bg-slate-900 space-y-4 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
                <h3 className="font-black text-brand-charcoal dark:text-white">Send a Quick Message</h3>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs outline-none focus:border-brand-green font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs outline-none focus:border-brand-green font-semibold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">Message</label>
                    <textarea
                      rows={3}
                      placeholder="Hi, I have a query about..."
                      className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs outline-none focus:border-brand-green font-semibold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-6 py-3 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    Submit Message
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
