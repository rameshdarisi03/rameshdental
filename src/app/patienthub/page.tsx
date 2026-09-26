"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePatientAuth } from "@/providers/PatientAuthProvider";

export default function PatientHubRootPage() {
  const router = useRouter();
  const { patient, loading } = usePatientAuth();

  useEffect(() => {
    if (loading) return;
    if (patient) {
      router.replace("/patienthub/dashboard");
    } else {
      router.replace("/patienthub/login");
    }
  }, [patient, loading, router]);

  return null;
}
