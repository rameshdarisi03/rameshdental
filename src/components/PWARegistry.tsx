"use client";

import { useEffect } from "react";
import { FEATURES } from "@/lib/features";

export default function PWARegistry() {
  useEffect(() => {
    if (!FEATURES.enablePatientHub) return;
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("GPC Patient Hub Service Worker registered with scope: ", reg.scope);
            // Request service worker update checks immediately
            reg.update();
          })
          .catch((err) => {
            console.error("Service Worker registration failed: ", err);
          });
      };

      if (document.readyState === "complete") {
        registerSW();
      } else {
        window.addEventListener("load", registerSW);
        return () => window.removeEventListener("load", registerSW);
      }
    }
  }, []);

  return null;
}
