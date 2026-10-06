"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  const isStaffPortal = pathname?.startsWith("/dashboard") || pathname === "/login";
  const isPatientHub = pathname?.startsWith("/patienthub");

  useEffect(() => {
    if (typeof document === "undefined") return;

    const existingLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');

    if (isPatientHub) {
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "manifest";
        link.setAttribute("href", "/manifest-patient.json");
        document.head.appendChild(link);
      } else {
        existingLink.setAttribute("href", "/manifest-patient.json");
      }
    } else if (isStaffPortal) {
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "manifest";
        link.setAttribute("href", "/manifest-staff.json");
        document.head.appendChild(link);
      } else {
        existingLink.setAttribute("href", "/manifest-staff.json");
      }
    } else {
      // PUBLIC WEBSITE GUARDRAIL: Zero PWA Manifest. Remove any manifest link.
      if (existingLink) {
        existingLink.remove();
      }
    }
  }, [pathname, isPatientHub, isStaffPortal]);

  if (isPatientHub) {
    return <link rel="manifest" href="/manifest-patient.json" />;
  }
  if (isStaffPortal) {
    return <link rel="manifest" href="/manifest-staff.json" />;
  }

  // Pure public website: zero manifest, zero PWA
  return null;
}
