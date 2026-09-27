"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const isPatientHub = pathname?.startsWith("/patienthub");
    const isStaffPortal = pathname?.startsWith("/dashboard") || pathname === "/login";

    let targetManifest: string | null = null;
    if (isPatientHub) {
      targetManifest = "/manifest-patient.json";
    } else if (isStaffPortal) {
      targetManifest = "/manifest-staff.json";
    }

    const existingLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');

    if (!targetManifest) {
      // On public website pages, remove manifest link so browsers never treat public pages as an app
      if (existingLink && existingLink.parentNode) {
        existingLink.parentNode.removeChild(existingLink);
      }
      return;
    }

    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.setAttribute("href", targetManifest);
      document.head.appendChild(link);
    } else if (existingLink.getAttribute("href") !== targetManifest) {
      existingLink.setAttribute("href", targetManifest);
    }
  }, [pathname]);

  return null;
}
