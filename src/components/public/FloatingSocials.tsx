"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun, ChevronRight, ChevronLeft } from "lucide-react";

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

export default function FloatingSocials() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    // Check initial dark mode state
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark");
      
      // Collapse by default on mobile/tablet (less than lg breakpoint / 1024px)
      const isMobileOrTablet = window.innerWidth < 1024;
      setIsOpen(!isMobileOrTablet);
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

  // Hide on portal and dashboard pages
  const isPortalSubroute = pathname?.startsWith("/dashboard") || pathname?.startsWith("/patienthub") || pathname === "/login";
  if (isPortalSubroute) return null;

  return (
    <div
      className={`fixed top-1/2 left-0 -translate-y-1/2 z-50 flex items-center transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-[48px]"
      }`}
    >
      {/* Socials bar content */}
      <div className="flex flex-col gap-4 bg-brand-green/95 backdrop-blur-md px-3 py-5 rounded-r-2xl border border-l-0 border-white/20 shadow-[4px_0_24px_rgba(93,122,109,0.3)]">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleDarkMode}
          className="text-white hover:text-brand-sand hover:scale-110 transition-transform p-1 mb-2 border-b border-white/20 pb-4"
          aria-label="Toggle Dark Mode"
          title="Toggle Dark Mode"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <Link
          href="https://www.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-brand-sand hover:scale-110 transition-transform p-1"
          aria-label="Facebook"
        >
          <FacebookIcon className="w-5 h-5" />
        </Link>
        <Link
          href="https://www.instagram.com/rameshdentalclinic"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-brand-sand hover:scale-110 transition-transform p-1"
          aria-label="Instagram"
        >
          <InstagramIcon className="w-5 h-5" />
        </Link>
        <Link
          href="https://www.linkedin.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-brand-sand hover:scale-110 transition-transform p-1"
          aria-label="LinkedIn"
        >
          <LinkedinIcon className="w-5 h-5" />
        </Link>
        <Link
          href="https://www.youtube.com/@rameshdentalclinic"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white hover:text-brand-sand hover:scale-110 transition-transform p-1"
          aria-label="YouTube"
        >
          <YoutubeIcon className="w-5 h-5" />
        </Link>
      </div>

      {/* Toggle Tab Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-5 bg-brand-green/95 hover:bg-brand-green text-white border border-l-0 border-white/20 rounded-r-xl flex items-center justify-center cursor-pointer shadow-[2px_0_10px_rgba(93,122,109,0.2)] focus:outline-none transition-colors"
        aria-label={isOpen ? "Collapse Widget" : "Expand Widget"}
        title={isOpen ? "Collapse Social Links" : "Expand Social Links"}
      >
        {isOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
