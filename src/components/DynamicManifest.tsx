"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function DynamicManifest() {
  const pathname = usePathname();

  const isStaffPortal = pathname?.startsWith("/dashboard") || pathname === "/login";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const existingLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const targetHref = isStaffPortal ? "/manifest-staff.json" : "/manifest-patient.json";

    if (!existingLink) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.setAttribute("href", targetHref);
      document.head.appendChild(link);
    } else if (existingLink.getAttribute("href") !== targetHref) {
      existingLink.setAttribute("href", targetHref);
    }
  }, [pathname, isStaffPortal]);

  if (isStaffPortal) {
    return <link rel="manifest" href="/manifest-staff.json" />;
  }

  return <link rel="manifest" href="/manifest-patient.json" />;
}
