"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Phone, Mail, MapPin, Clock } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // If we are in the dashboard, we don't render the public Footer
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-brand-green dark:text-teal-400">
              <Activity className="h-6 w-6 text-brand-green" />
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Gait <span className="text-brand-green dark:text-teal-400">Physio</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Premium physiotherapy and gait analysis clinic helping you move better, live pain-free, and perform at your highest potential.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Explore
            </h3>
            <ul className="space-y-2">
              {[
                { name: "About Us", href: "/about" },
                { name: "Services", href: "/services" },
                { name: "Our Team", href: "/team" },
                { name: "Clinic Gallery", href: "/gallery" },
                { name: "Patient FAQs", href: "/faq" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 hover:text-brand-green dark:text-slate-400 dark:hover:text-brand-green/80 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-brand-green mt-0.5 shrink-0" />
                <span>123 Clinical Wellness Way, Near Central Park, Sector 4, Bangalore, 560001</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-brand-green shrink-0" />
                <a href="tel:+919206651295" className="hover:text-brand-green transition-colors">
                  +91 92066 51295
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-green shrink-0" />
                <a href="mailto:info@gaitphysioclinic.com" className="hover:text-brand-green transition-colors">
                  info@gaitphysioclinic.com
                </a>
              </li>
            </ul>
          </div>

          {/* Business Hours */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Clinic Hours
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-2">
                <Clock className="h-4 w-4 text-brand-green shrink-0" />
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-300">Mon - Sat</p>
                  <p className="text-xs">09:00 AM - 07:00 PM</p>
                </div>
              </li>
              <li className="flex gap-2">
                <Clock className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0" />
                <div>
                  <p className="font-medium text-slate-500 dark:text-slate-500">Sunday</p>
                  <p className="text-xs text-slate-500">Closed (Emergency Only)</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-850 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; {currentYear} Gait Physio Clinic. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
            <Link href="/privacy" className="hover:text-brand-green transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-brand-green transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <Link href="/login" className="font-medium text-slate-700 hover:text-brand-green dark:text-slate-300 dark:hover:text-brand-green/80 transition-colors">
              Staff Portal Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
