"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, Moon, Sun, MessageSquare, ChevronDown } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG } from "@/lib/db";
import { syncMetaThemeColor } from "@/lib/themeHelper";
import { getPrimaryDialNumber } from "@/lib/phoneUtils";

interface NavItem {
  name: string;
  href: string;
  sectionId?: string;
  desktopHidden?: boolean;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [activeSection, setActiveSection] = useState<string>("");
  const pathname = usePathname();
  const moreDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  // Primary links visible on both lg and xl
  const primaryNavLinks: NavItem[] = [
    { name: "Services", href: "/#services", sectionId: "services" },
    { name: "Team", href: "/#team", sectionId: "team" },
    { name: "Stories", href: "/#stories", sectionId: "stories" },
    { name: "Articles", href: "/#articles", sectionId: "articles" },
    { name: "Locate Us", href: "/#locate-us", sectionId: "locate-us" },
    ...(FEATURES.enablePatientHub ? [{ name: "Patient Hub", href: "/#patient-hub", sectionId: "patient-hub" }] : [])
  ];

  // Secondary links shown inline on xl, but grouped under "More" on lg (1024-1279px) to prevent stacking
  const secondaryNavLinks: NavItem[] = [
    { name: "Gallery", href: "/#gallery", sectionId: "gallery" },
    { name: "FAQ", href: "/#faq", sectionId: "faq" },
  ];

  // Complete list for mobile drawer
  const allMobileNavLinks: NavItem[] = [
    { name: "Home", href: "/#home", sectionId: "home" },
    { name: "Services", href: "/#services", sectionId: "services" },
    { name: "Team", href: "/#team", sectionId: "team" },
    { name: "Stories", href: "/#stories", sectionId: "stories" },
    { name: "Gallery", href: "/#gallery", sectionId: "gallery" },
    { name: "Articles", href: "/#articles", sectionId: "articles" },
    { name: "FAQ", href: "/#faq", sectionId: "faq" },
    { name: "Locate Us", href: "/#locate-us", sectionId: "locate-us" },
    ...(FEATURES.enablePatientHub ? [{ name: "Patient Hub", href: "/#patient-hub", sectionId: "patient-hub" }] : [])
  ];

  useEffect(() => {
    if (pathname !== "/") {
      setActiveSection("");
      return;
    }

    const sectionIds = ["services", "team", "stories", "gallery", "articles", "patient-hub", "faq", "locate-us"];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      let currentSection = "";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            currentSection = id;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, link: NavItem) => {
    if (pathname === "/" && link.sectionId) {
      e.preventDefault();
      const el = document.getElementById(link.sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `#${link.sectionId}`);
        setActiveSection(link.sectionId);
      }
      setIsOpen(false);
      setMoreOpen(false);
    } else {
      setIsOpen(false);
      setMoreOpen(false);
    }
  };

  const isActive = (link: NavItem) => {
    if (pathname === "/") {
      if (link.sectionId) {
        return activeSection === link.sectionId;
      }
      return !activeSection;
    }
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold group select-none shrink-0 mr-2 lg:mr-3 xl:mr-5">
          <img
            src="/images/gait_physio_logo.png"
            alt="Gait Physio Clinic Emblem Logo"
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain shrink-0 group-hover:scale-105 transition-transform duration-300 drop-shadow-2xs"
          />
          <span className="text-sm sm:text-base lg:text-lg xl:text-xl font-black tracking-tight text-brand-green dark:text-white whitespace-nowrap group-hover:opacity-90 transition-opacity">
            Gait Physio Clinic
          </span>
        </Link>

        {/* Desktop Navigation (lg & xl) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 2xl:gap-3 shrink-0">
          {/* Primary core links */}
          {primaryNavLinks.map((link) => {
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`whitespace-nowrap px-2 py-1 xl:px-2.5 xl:py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-colors hover:text-brand-green hover:bg-slate-100/70 dark:hover:bg-slate-900/60 dark:hover:text-brand-green/80 cursor-pointer ${
                  isActive(link)
                    ? "text-brand-green dark:text-teal-400 font-bold bg-brand-green/10 dark:bg-brand-green/20"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.name}
              </Link>
            );
          })}

          {/* Secondary links: inline on xl screens (>= 1280px) */}
          <div className="hidden xl:flex items-center gap-2 2xl:gap-3">
            {secondaryNavLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-colors hover:text-brand-green hover:bg-slate-100/70 dark:hover:bg-slate-900/60 dark:hover:text-brand-green/80 cursor-pointer ${
                  isActive(link)
                    ? "text-brand-green dark:text-teal-400 font-bold bg-brand-green/10 dark:bg-brand-green/20"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Compact "More" dropdown: active on lg (1024-1279px) so the bar never stacks or overflows */}
          <div className="relative xl:hidden" ref={moreDropdownRef}>
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`inline-flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-lg text-xs font-semibold transition-colors hover:text-brand-green hover:bg-slate-100/70 dark:hover:bg-slate-900/60 cursor-pointer ${
                moreOpen || secondaryNavLinks.some(isActive)
                  ? "text-brand-green dark:text-teal-400 bg-brand-green/10 dark:bg-brand-green/20"
                  : "text-slate-600 dark:text-slate-300"
              }`}
              aria-expanded={moreOpen}
              aria-label="More navigation items"
            >
              <span>More</span>
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                {secondaryNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link)}
                    className={`block px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isActive(link)
                        ? "text-brand-green dark:text-teal-400 bg-brand-green/10 dark:bg-brand-green/20"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-brand-green"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* CTA & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-2.5 shrink-0">
          {/* Dark Mode Slider Toggle (Desktop / Tablet) */}
          <button
            onClick={toggleDarkMode}
            className="hidden lg:inline-flex relative h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            aria-label="Toggle Dark Mode"
            title="Toggle Dark Mode"
          >
            <span className="sr-only">Toggle Dark Mode</span>
            <span
              className={`${
                isDark ? "translate-x-5" : "translate-x-0.5"
              } pointer-events-none flex h-5 w-5 transform items-center justify-center rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out`}
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
                href={`tel:${getPrimaryDialNumber(clinicConfig.phone)}`}
                className="hidden sm:flex items-center gap-1.5 text-xs xl:text-sm font-bold text-slate-700 hover:text-brand-green dark:text-slate-200 dark:hover:text-brand-green/85 transition-colors p-1.5 xl:px-2.5 xl:py-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 shrink-0"
                title={`Call Clinic: ${clinicConfig.phone || "+91 89044 56243"}`}
              >
                <Phone className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-brand-green shrink-0" />
                <span className="hidden xl:inline whitespace-nowrap">Call Clinic</span>
              </a>

              <Link
                href="/book"
                className="hidden sm:inline-flex items-center justify-center rounded-full bg-brand-green px-3.5 py-1.5 xl:px-5 xl:py-2 text-xs xl:text-sm font-bold text-white shadow-xs hover:bg-brand-green-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green transition-all active:scale-95 whitespace-nowrap shrink-0"
              >
                Book Appointment
              </Link>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 lg:gap-2 shrink-0">
              <a 
                href="tel:+918971462949" 
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-green px-3 py-1.5 xl:px-4.5 xl:py-2 text-xs xl:text-sm font-bold text-white shadow-xs hover:bg-brand-green-hover transition-all active:scale-95 whitespace-nowrap shrink-0" 
                title="Call Clinic: +91 89714 62949"
              >
                <Phone className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0" />
                <span className="hidden xl:inline">Call Clinic</span>
                <span className="xl:hidden">Call</span>
              </a>
              <a
                href={`https://wa.me/918971462949?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to inquire about booking an appointment.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-green px-3 py-1.5 xl:px-4.5 xl:py-2 text-xs xl:text-sm font-bold text-white shadow-xs hover:bg-brand-green-hover transition-all active:scale-95 whitespace-nowrap shrink-0"
                title="WhatsApp Us: +91 89714 62949"
              >
                <MessageSquare className="h-3.5 w-3.5 xl:h-4 xl:w-4 shrink-0" />
                <span className="hidden xl:inline">WhatsApp Us</span>
                <span className="xl:hidden">WhatsApp</span>
              </a>
            </div>
          )}
          
          {/* Mobile Icon Buttons: Call Clinic + WhatsApp Us (< sm) */}
          <div className="sm:hidden flex items-center gap-1.5">
            <a
              href="tel:+918971462949"
              className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 text-brand-green dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              title="Call Clinic: +91 89714 62949"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/918971462949?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to inquire about booking an appointment.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center h-9 w-9 rounded-full border border-slate-200 dark:border-slate-800 text-brand-green dark:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              title="WhatsApp Us: +91 89714 62949"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
          </div>

          {/* Mobile & Tablet Drawer Trigger (< lg) */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden cursor-pointer"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-brand-green dark:text-teal-400" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer (< lg) */}
      {isOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          {allMobileNavLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={(e) => handleNavClick(e, link)}
              className={`block rounded-lg px-3 py-2 text-base font-semibold transition-colors ${
                isActive(link)
                  ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
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
              <div className="flex flex-col gap-2 pt-1">
                <a href="tel:+918971462949" onClick={() => setIsOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-3 text-center text-sm font-bold text-white hover:bg-brand-green-hover transition-colors shadow-xs">
                  <Phone className="h-4 w-4" />
                  Call Clinic (+91 89714 62949)
                </a>
                <a href={`https://wa.me/918971462949?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to inquire about booking an appointment.")}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsOpen(false)} className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green py-3 text-center text-sm font-bold text-white hover:bg-brand-green-hover transition-colors shadow-xs">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp Us (+91 89714 62949)
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
