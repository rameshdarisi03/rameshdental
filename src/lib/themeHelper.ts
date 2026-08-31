export type ThemeKey = "sage" | "teal" | "royal" | "office";

export const THEME_COLOR_MAP: Record<ThemeKey, { primary: string; darkBg: string; lightBg: string; name: string }> = {
  sage: { primary: "#5d7a6d", darkBg: "#0f1412", lightBg: "#f7faf8", name: "Sage & Sand" },
  teal: { primary: "#0e5e6f", darkBg: "#091316", lightBg: "#f8fafb", name: "Medical Teal" },
  royal: { primary: "#1a4b84", darkBg: "#0a0f1d", lightBg: "#ffffff", name: "Kinetic Royal Blue" },
  office: { primary: "#0078d4", darkBg: "#0b1320", lightBg: "#f8fbfd", name: "Office Suite Blue" },
};

export function syncMetaThemeColor(themeKey?: ThemeKey, isDark?: boolean) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const currentTheme = themeKey || ((localStorage.getItem("gpc_public_theme") as ThemeKey) || "sage");
  const darkMode =
    isDark !== undefined
      ? isDark
      : document.documentElement.classList.contains("dark") || localStorage.getItem("theme") === "dark";

  const themeData = THEME_COLOR_MAP[currentTheme] || THEME_COLOR_MAP.sage;
  const targetColor = darkMode ? themeData.darkBg : themeData.primary;

  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", targetColor);
}
