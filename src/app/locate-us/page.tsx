import React from "react";
import Link from "next/link";
import PageHeader from "@/components/public/PageHeader";
import { MapPin, Phone, Mail, Clock, Navigation, Calendar, MessageSquare, CheckCircle2 } from "lucide-react";

export default function LocateUsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-['Inter',sans-serif]">
      <PageHeader
        title="Locate Gait Physio Clinic"
        subtitle="Conveniently situated on ITPL Main Road near Hope Farm Signal in Whitefield, Bengaluru with dedicated patient parking and lift access."
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Clinic Contact & Landmark Cards */}
          <div className="space-y-6">
            {/* Primary Address */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Clinic Address</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Whitefield, Bengaluru</p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">Gait Physio Clinic</p>
                <p>Shop No. 26 (2nd Floor) & Shop No. 06 (3rd Floor)</p>
                <p>ITPL Main Road, Prasanth Extension</p>
                <p>Near Hope Farm Signal, Whitefield</p>
                <p>Bengaluru, Karnataka - 560066</p>
              </div>

              <div className="pt-2">
                <a
                  href="https://maps.google.com/?q=Gait+Physio+Clinic+Whitefield+Bangalore"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-transform active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Get Live Directions</span>
                </a>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Operating Hours</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Weekly Schedule</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Monday – Saturday</span>
                  <span className="font-black text-brand-green">09:00 AM – 08:00 PM</span>
                </div>
                <div className="flex items-center justify-between py-1.5 text-slate-400">
                  <span className="font-semibold">Sunday</span>
                  <span className="font-bold text-rose-500">Closed (Emergency on request)</span>
                </div>
              </div>
            </div>

            {/* Direct Contact Desk */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Direct Clinical Desk</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">Call or WhatsApp</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <a
                  href="tel:+919206651295"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors font-bold text-slate-900 dark:text-white"
                >
                  <span>Reception Phone</span>
                  <span className="text-brand-green">+91 92066 51295</span>
                </a>
                <a
                  href="https://wa.me/919206651295"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 transition-colors font-bold text-emerald-800 dark:text-emerald-300"
                >
                  <span>WhatsApp Direct</span>
                  <span>Chat Now</span>
                </a>
              </div>
            </div>
          </div>

          {/* Map & Landmark Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Interactive Map Embed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Interactive Clinical Location Map
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand-green/10 text-brand-green uppercase tracking-wider">
                  Hope Farm Junction
                </span>
              </div>
              <div className="w-full h-[380px] sm:h-[440px] bg-slate-100 dark:bg-slate-800 relative">
                <iframe
                  title="Gait Physio Clinic Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.8967814402685!2d77.75011131482205!3d12.984700090847253!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae0fb5b6574f2b%3A0xbcf2a8ee0322b75f!2sGait%20Physio%20Clinic!5e0!3m2!1sen!2sin!4v1691234567890!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Accessibility & Transit Highlights */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                Transit & Accessibility Highlights
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Namma Metro Connectivity</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Short 5-minute walk from Hope Farm Channasandra Metro Station (Purple Line).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Lift & Wheelchair Access</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Modern passenger lift directly servicing the 2nd and 3rd floor treatment bays.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Dedicated Vehicle Parking</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Designated two-wheeler and four-wheeler patient parking slots in the building basement.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Prominent Landmark</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Located opposite Prasanth Extension, right before the Hope Farm traffic signal on ITPL Main Rd.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500">Ready for your diagnostic session?</p>
                <Link
                  href="/book"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white font-bold text-xs px-6 py-3 rounded-xl shadow-xs transition-transform active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Consultation Online</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
