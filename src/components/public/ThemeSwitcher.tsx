"use client";

import { useEffect, useState, useRef } from "react";
import { Palette, Check, ChevronDown } from "lucide-react";

export type ThemeKey = "sage" | "teal" | "royal" | "midnight";

export interface ThemeOption {
  id: ThemeKey;
  name: string;
  badge: string;
  primaryColor: string;
  accentColor: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "sage",
    name: "Sage & Sand",
    badge: "Default",
    primaryColor: "#5d7a6d",
    accentColor: "#efe6dd",
  },
  {
    id: "teal",
    name: "Medical Teal",
    badge: "Clinical",
    primaryColor: "#0e5e6f",
    accentColor: "#3a98b9",
  },
  {
    id: "royal",
    name: "Kinetic Royal Blue",
    badge: "Sports",
    primaryColor: "#1a4b84",
    accentColor: "#0284c7",
  },
  {
    id: "midnight",
    name: "Midnight Navy",
    badge: "Executive",
    primaryColor: "#0a2540",
    accentColor: "#00a3c4",
  },
];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("sage");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = (localStorage.getItem("gpc_public_theme") as ThemeKey) || "sage";
      setCurrentTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const selectTheme = (themeId: ThemeKey) => {
    setCurrentTheme(themeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gpc_public_theme", themeId);
      document.documentElement.setAttribute("data-theme", themeId);
    }
    setIsOpen(false);
  };

  const activeOption = THEME_OPTIONS.find((t) => t.id === currentTheme) || THEME_OPTIONS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 shadow-2xs transition-all cursor-pointer"
        title="Change Visual Theme"
      >
        <span
          className="w-3 h-3 rounded-full border border-black/15 shrink-0 shadow-2xs"
          style={{ backgroundColor: activeOption.primaryColor }}
        />
        <span className="hidden sm:inline text-[11px] font-extrabold text-slate-800 dark:text-slate-200">
          {activeOption.name}
        </span>
        <Palette className="sm:hidden h-3.5 w-3.5 text-slate-500" />
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-slide-down">
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Select Color Theme
            </span>
            <Palette className="h-3 w-3 text-slate-400" />
          </div>

          {THEME_OPTIONS.map((theme) => {
            const isSelected = theme.id === currentTheme;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => selectTheme(theme.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black"
                    : "hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-900 shadow-2xs"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 shadow-2xs"
                      style={{ backgroundColor: theme.accentColor }}
                    />
                  </div>
                  <div className="truncate">
                    <div className="text-xs truncate">{theme.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    {theme.badge}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-brand-green" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
