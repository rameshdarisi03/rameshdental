"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  const pathname = usePathname();

  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;

    // Standalone PWA route guard: ensure installed app stays strictly in Patient Hub
    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        (document.referrer && document.referrer.indexOf("android-app://") !== -1);

      if (isStandalone) {
        const isPortalRoute =
          pathname?.startsWith("/patienthub") ||
          pathname?.startsWith("/dashboard") ||
          pathname === "/login";

        if (!isPortalRoute) {
          window.location.replace("/patienthub/login");
          return;
        }
      }
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 1. Force update all active registrations
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update().catch(() => {});
        }
      });

      // 2. Register fresh service worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("Service Worker registration warning: ", err);
        });
    }
  }, [pathname]);

  return null;
}
