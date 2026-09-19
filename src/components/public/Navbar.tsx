"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Activity, Phone, Moon, Sun, MessageSquare } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG } from "@/lib/db";
import { syncMetaThemeColor } from "@/lib/themeHelper";
import { getCleanWhatsAppNumber } from "@/lib/phoneUtils";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncState = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    syncState();

    // Listen for OS scheme transitions when no explicit user override exists
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem("theme");
      if (!storedTheme) {
        if (e.matches) {
          document.documentElement.classList.add("dark");
          setIsDark(true);
          syncMetaThemeColor(undefined, true);
        } else {
          document.documentElement.classList.remove("dark");
          setIsDark(false);
          syncMetaThemeColor(undefined, false);
        }
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);

    async function loadConfig() {
      try {
        const conf = await getClinicConfig();
        setClinicConfig(conf);
      } catch (e) {
        console.error(e);
      }
    }
    loadConfig();

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
      syncMetaThemeColor(undefined, false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
      syncMetaThemeColor(undefined, true);
    }
  };

  const isPortalSubroute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/patienthub") || pathname === "/login";
  if (isPortalSubroute) {
    return null;
  }

  const navLinks = [
    { name: "Home", href: "/", desktopHidden: true },
    { name: "Services", href: "/services" },
    { name: "Team", href: "/team" },
    { name: "Gallery", href: "/gallery" },
    { name: "Articles", href: "/articles" },
    { name: "FAQ", href: "/faq" },
    { name: "Locate Us", href: "/locate-us" },
    ...(FEATURES.enablePatientHub ? [{ name: "Patient Hub", href: "/patienthub/login" }] : [])
  ];

  const isActive = (link: { href: string }) => {
    if (link.href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(link.href);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold group select-none shrink-0 mr-3 md:mr-4 lg:mr-6">
          <img
            src="/images/gait_physio_logo.png"
            alt="Gait Physio Clinic Emblem Logo"
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0 group-hover:scale-105 transition-transform duration-300 drop-shadow-2xs"
          />
          <span className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-brand-green dark:text-white whitespace-nowrap group-hover:opacity-90 transition-opacity">
            Gait Physio Clinic
          </span>
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2.5 xl:gap-5 min-w-0">
          {navLinks.filter((link) => !link.desktopHidden).map((link) => {
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`whitespace-nowrap px-2 py-1 lg:px-2.5 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors hover:text-brand-green hover:bg-slate-50 dark:hover:bg-slate-900/60 dark:hover:text-brand-green/80 ${
                  isActive(link)
                    ? "text-brand-green dark:text-teal-400 font-bold bg-brand-green/10 dark:bg-brand-green/20"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* CTA & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
          {/* Dark Mode Slider Toggle (Desktop/Tablet) */}
          <button
            onClick={toggleDarkMode}
            className="hidden md:inline-flex relative h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            aria-label="Toggle Dark Mode"
            title="Toggle Dark Mode"
          >
            <span className="sr-only">Toggle Dark Mode</span>
            <span
              className={`${
                isDark ? "translate-x-5" : "translate-x-0.5"
              } pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            >
              {isDark ? (
                <Moon className="h-3 w-3 text-slate-700" />
              ) : (
                <Sun className="h-3 w-3 text-amber-500" />
              )}
            </span>
          </button>

          {clinicConfig.enablePublicBooking !== false ? (
            <>
              <a
                href={`tel:${clinicConfig.phone || "+919206651295"}`}
                className="hidden sm:flex items-center gap-1.5 text-xs lg:text-sm font-bold text-slate-700 hover:text-brand-green dark:text-slate-200 dark:hover:text-brand-green/85 transition-colors p-1.5 lg:px-2.5 lg:py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 shrink-0"
                title="Call Clinic: +91 92066 51295"
              >
                <Phone className="h-4 w-4 text-brand-green shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">Call Clinic</span>
              </a>

              <Link
                href="/book"
                className="hidden sm:inline-flex items-center justify-center rounded-full bg-brand-green px-3.5 py-1.5 lg:px-5 lg:py-2 text-xs lg:text-sm font-bold text-white shadow-xs hover:bg-brand-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                Book Appointment
              </Link>
            </>
          ) : (
            <a
              href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to inquire about booking an appointment.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center gap-2 rounded-full bg-brand-green px-3.5 py-1.5 lg:px-5 lg:py-2 text-xs lg:text-sm font-bold text-white shadow-xs hover:bg-brand-green-hover transition-all active:scale-95 whitespace-nowrap shrink-0"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden xl:inline">WhatsApp Us</span>
            </a>
          )}
          
          <a
            href={`tel:${clinicConfig.phone || "+919206651295"}`}
            className="sm:hidden flex items-center justify-center h-10 w-10 rounded-full border border-slate-200 dark:border-slate-800 text-brand-green dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
            title="Call Clinic"
          >
            <Phone className="h-4 w-4" />
          </a>

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
                isActive(link)
                  ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
          {/* Display Options for Mobile */}
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dark Mode:</span>
            <button
              onClick={toggleDarkMode}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
              aria-label="Toggle Dark Mode"
            >
              <span
                className={`${
                  isDark ? "translate-x-5" : "translate-x-0.5"
                } pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              >
                {isDark ? (
                  <Moon className="h-3 w-3 text-slate-700" />
                ) : (
                  <Sun className="h-3 w-3 text-amber-500" />
                )}
              </span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-900">
            {clinicConfig.enablePublicBooking !== false ? (
              <Link
                href="/book"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-brand-green py-3 text-center text-sm font-semibold text-white hover:bg-brand-green-hover transition-colors"
              >
                Book Appointment
              </Link>
            ) : (
              <a
                href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to inquire about booking an appointment.")}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-3 text-center text-sm font-semibold text-white hover:bg-brand-green-hover transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp Reception
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
