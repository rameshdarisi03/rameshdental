"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const isStaffPortal = pathname?.startsWith("/dashboard") || pathname === "/login";
    const targetManifest = isStaffPortal ? "/manifest-staff.json" : "/manifest-patient.json";

    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      link.setAttribute("href", targetManifest);
      document.head.appendChild(link);
    } else if (link.getAttribute("href") !== targetManifest) {
      link.setAttribute("href", targetManifest);
    }
  }, [pathname]);

  return null;
}
