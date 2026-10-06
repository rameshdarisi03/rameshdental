"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function PWAGuardrail() {
  const pathname = usePathname();
  const isPatientHub = pathname?.startsWith("/patienthub");
  const isDashboard = pathname?.startsWith("/dashboard");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Register clean passthrough service worker to satisfy PWA installability
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
  }, [pathname]);

  return null;
}
