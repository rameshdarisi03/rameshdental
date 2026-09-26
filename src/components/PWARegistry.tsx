"use client";

import { useEffect } from "react";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("Service Worker registration warning: ", err);
        });
    }
  }, []);

  return null;
}
