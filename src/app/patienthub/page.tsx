"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientHubRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/patienthub/dashboard");
  }, [router]);

  return null;
}
