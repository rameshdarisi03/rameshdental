"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  const pathname = usePathname();

  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isPortalRoute =
      pathname?.startsWith("/patienthub") ||
      pathname?.startsWith("/dashboard") ||
      pathname === "/login";

    if (isPortalRoute) {
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
