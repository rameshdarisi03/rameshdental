"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  const pathname = usePathname();

  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("Service Worker registration warning: ", err);
      });
  }, []);

  return null;
}
