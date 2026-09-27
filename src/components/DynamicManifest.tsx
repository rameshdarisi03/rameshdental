"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const isPatientHub = pathname?.startsWith("/patienthub");
    const targetManifest = isPatientHub ? "/manifest-patient.json" : "/manifest-staff.json";

    // Find existing manifest link or create one
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }

    if (link.getAttribute("href") !== targetManifest) {
      link.setAttribute("href", targetManifest);
    }
  }, [pathname]);

  return null;
}
