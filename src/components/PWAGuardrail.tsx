"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PWAGuardrail() {
  const pathname = usePathname();
  const isPatientHub = pathname?.startsWith("/patienthub");
  const isDashboard = pathname?.startsWith("/dashboard");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (!isPatientHub && !isDashboard) {
      // 1. PUBLIC WEBSITE GUARDRAIL:
      // Completely unregister any rogue or stale Service Worker registered on the root domain!
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          // If the scope is NOT strictly /patienthub/ or /dashboard/, purge it immediately!
          if (!reg.scope.includes("/patienthub") && !reg.scope.includes("/dashboard")) {
            reg.unregister().then((success) => {
              if (success) {
                console.log("[PWA Guardrail] Unregistered root service worker for public web safety:", reg.scope);
              }
            });
          }
        }
      });

      // Clear legacy PWA caches from root domain
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            if (key.includes("gpc-pwa") || key.includes("workbox") || key.includes("next-pwa")) {
              caches.delete(key);
            }
          }
        });
      }
    } else if (isPatientHub) {
      // 2. PATIENT HUB ONLY:
      // Register service worker strictly scoped to /patienthub/
      navigator.serviceWorker
        .register("/sw.js", { scope: "/patienthub/" })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }
  }, [pathname, isPatientHub, isDashboard]);

  return null;
}
