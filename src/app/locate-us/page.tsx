"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/public/PageHeader";
import { MapPin, Phone, Mail, Clock, Navigation, Loader2 } from "lucide-react";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG } from "@/lib/db";

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
  </svg>
);

const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
  </svg>
);

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.872.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export default function LocateUs() {
  const [config, setConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const fetched = await getClinicConfig();
        setConfig(fetched);
      } catch (err) {
        console.error("Error loading clinic settings config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Locate Us"
        description="Find our address, contact phone numbers, operating hours, and detailed directions to reach Gait Physio Clinic."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-955">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {loading ? (
            <div className="flex h-96 items-center justify-center text-slate-500 text-xs font-semibold">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
              <span>Loading clinic location information...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
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
                        {config.address || DEFAULT_CLINIC_CONFIG.address}
                      </p>
                      {config.landmark && (
                        <p className="text-xs font-black text-brand-green dark:text-teal-400 mt-1">
                          Landmark: {config.landmark}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Call */}
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Phone Number</h4>
                      <a
                        href={`tel:${(config.phone || DEFAULT_CLINIC_CONFIG.phone)?.replace(/\s+/g, "")}`}
                        className="text-xs text-slate-500 hover:text-brand-green dark:text-slate-400 dark:hover:text-brand-green transition-colors mt-1 block font-semibold"
                      >
                        {config.phone || DEFAULT_CLINIC_CONFIG.phone}
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
                      <a
                        href={`mailto:${config.email || DEFAULT_CLINIC_CONFIG.email}`}
                        className="text-xs text-slate-500 hover:text-brand-green dark:text-slate-400 dark:hover:text-brand-green transition-colors mt-1 block font-semibold"
                      >
                        {config.email || DEFAULT_CLINIC_CONFIG.email}
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
                      <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mt-1 font-semibold whitespace-pre-line">
                        {config.operationalHoursText || DEFAULT_CLINIC_CONFIG.operationalHoursText}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inline Social Icons (No header text as requested) */}
                <div className="flex gap-3 pt-6 border-t border-slate-200/50 dark:border-slate-800">
                  <a
                    href="https://www.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-brand-green hover:border-brand-green dark:text-slate-400 dark:hover:text-brand-green hover:scale-105 active:scale-95 transition-all shadow-sm"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="w-4.5 h-4.5" />
                  </a>
                  <a
                    href="https://www.instagram.com/gaitphysioclinic?igsh=MXRqMWxndHpybWN5bA=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-brand-green hover:border-brand-green dark:text-slate-400 dark:hover:text-brand-green hover:scale-105 active:scale-95 transition-all shadow-sm"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="w-4.5 h-4.5" />
                  </a>
                  <a
                    href="https://www.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-brand-green hover:border-brand-green dark:text-slate-400 dark:hover:text-brand-green hover:scale-105 active:scale-95 transition-all shadow-sm"
                    aria-label="YouTube"
                  >
                    <YoutubeIcon className="w-4.5 h-4.5" />
                  </a>
                  <a
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-brand-green hover:border-brand-green dark:text-slate-400 dark:hover:text-brand-green hover:scale-105 active:scale-95 transition-all shadow-sm"
                    aria-label="LinkedIn"
                  >
                    <LinkedinIcon className="w-4.5 h-4.5" />
                  </a>
                </div>
              </div>

              {/* Right side: Dynamic Map Frame */}
              <div className="lg:col-span-7 flex flex-col gap-6 w-full">
                <div className="h-[450px] w-full rounded-3xl border border-slate-250/85 dark:border-slate-800 bg-white dark:bg-slate-950 relative overflow-hidden shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
                  {config.googleMapsEmbed ? (
                    <iframe
                      src={config.googleMapsEmbed}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={true}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900">
                      <div className="h-16 w-16 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0 animate-bounce mb-4">
                        <MapPin className="h-8 w-8" />
                      </div>
                      <h3 className="font-black text-brand-charcoal dark:text-white">Gait Physio Clinic Bangalore</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-semibold mt-1">
                        Map configuration is incomplete. Update maps embed details in settings config.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <a
                    href={config.googleMapsLink || DEFAULT_CLINIC_CONFIG.googleMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                  >
                    <Navigation className="h-4 w-4" />
                    Open in Google Maps
                  </a>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
