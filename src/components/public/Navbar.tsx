"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Activity, Phone, Moon, Sun } from "lucide-react";
import { FEATURES } from "@/lib/features";

export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const isPortalSubroute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/patienthub") || pathname === "/login";
  if (!mounted || isPortalSubroute) {
    return null;
  }

  const navLinks = [
    { name: "Home", href: "/#home", hash: "#home" },
    { name: "Services", href: "/#services", hash: "#services" },
    { name: "Team", href: "/#team", hash: "#team" },
    { name: "Gallery", href: "/#gallery", hash: "#gallery" },
    { name: "Articles", href: "/articles", hash: "" },
    { name: "FAQ", href: "/#faq", hash: "#faq" },
    { name: "Locate Us", href: "/#locate-us", hash: "#locate-us" },
    ...(FEATURES.enablePatientHub ? [{ name: "Patient Hub", href: "/patienthub/login", hash: "" }] : [])
  ];

  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    if (pathname !== "/") return;

    const handleScroll = () => {
      const sections = ["home", "services", "team", "gallery", "testimonials", "faq", "locate-us"];
      const scrollPosition = window.scrollY + 200; // offset for navbar height

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname]);

  const isActive = (link: { href: string; hash?: string }) => {
    if (pathname === "/") {
      if (link.hash) {
        return activeSection === link.hash.replace("#", "");
      }
      return false;
    }
    return pathname === link.href;
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
          {navLinks.map((link) => {
            const targetHref = pathname === "/" && link.hash ? link.hash : link.href;
            return (
              <a
                key={link.name}
                href={targetHref}
                className={`text-sm font-medium transition-colors hover:text-brand-green dark:hover:text-brand-green/80 ${
                  isActive(link)
                    ? "text-brand-green dark:text-teal-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {link.name}
              </a>
            );
          })}
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Slider Toggle */}
          <button
            onClick={toggleDarkMode}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-200 dark:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
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
          {navLinks.map((link) => {
            const targetHref = pathname === "/" && link.hash ? link.hash : link.href;
            return (
              <a
                key={link.name}
                href={targetHref}
                onClick={() => setIsOpen(false)}
                className={`block rounded-lg px-3 py-2 text-base font-medium transition-colors ${
                  isActive(link)
                    ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                {link.name}
              </a>
            );
          })}
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
