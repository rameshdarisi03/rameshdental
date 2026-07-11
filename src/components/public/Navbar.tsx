"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Activity, Phone } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // If we are in the dashboard, we don't render the public Navbar
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About Us", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Team", href: "/team" },
    { name: "Gallery", href: "/gallery" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-green dark:text-teal-400">
          <Activity className="h-6 w-6 text-brand-green" />
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Gait <span className="text-brand-green dark:text-teal-400">Physio</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-brand-green dark:hover:text-brand-green/80 ${
                isActive(link.href)
                  ? "text-brand-green dark:text-teal-400 font-semibold"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <a
            href="tel:+919206651295"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-brand-green dark:text-slate-200 dark:hover:text-brand-green/85 mr-1 transition-colors"
          >
            <Phone className="h-4 w-4 text-brand-green shrink-0" />
            <span>Call Clinic</span>
          </a>

          <Link
            href="/book"
            className="hidden sm:inline-flex items-center justify-center rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-all active:scale-95"
          >
            Book Appointment
          </Link>
          
          <Link
            href="tel:+919206651295"
            className="sm:hidden flex items-center justify-center h-10 w-10 rounded-full border border-slate-200 dark:border-slate-800 text-brand-green dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            title="Call Clinic"
          >
            <Phone className="h-4 w-4" />
          </Link>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 md:hidden"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-2 shadow-inner">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-900">
            <Link
              href="/book"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center rounded-full bg-brand-green py-3 text-center text-sm font-semibold text-white hover:bg-brand-green-hover transition-colors"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
