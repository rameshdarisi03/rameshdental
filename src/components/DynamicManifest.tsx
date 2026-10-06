"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  const isStaffPortal = pathname?.startsWith("/dashboard") || pathname === "/login";
  const isPatientHub = pathname?.startsWith("/patienthub");

  // Scoped manifests:
  // - /dashboard -> manifest-staff.json (scope: /dashboard/)
  // - /patienthub -> manifest-patient.json (scope: /patienthub/)
  // - Public clinic website -> manifest.json (scope: /, start_url: /)
  const targetManifest = isStaffPortal
    ? "/manifest-staff.json"
    : isPatientHub
    ? "/manifest-patient.json"
    : "/manifest.json";

  useEffect(() => {
    if (typeof document === "undefined") return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      link.setAttribute("href", targetManifest);
      document.head.appendChild(link);
    } else if (link.getAttribute("href") !== targetManifest) {
      link.setAttribute("href", targetManifest);
    }
  }, [targetManifest]);

  return <link rel="manifest" href={targetManifest} />;
}
