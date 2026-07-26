"use client";

import { useEffect } from "react";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("GPC Patient Hub Service Worker registered with scope: ", reg.scope);
          })
          .catch((err) => {
            console.error("Service Worker registration failed: ", err);
          });
      });
    }
  }, []);

  return null;
}
