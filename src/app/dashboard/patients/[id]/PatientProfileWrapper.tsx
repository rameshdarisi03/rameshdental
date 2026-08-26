"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PatientDetailClient = dynamic(() => import("./PatientDetailClient"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col h-96 items-center justify-center text-slate-500 text-xs font-semibold">
      <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-3" />
      <span>Loading clinical patient profile...</span>
    </div>
  ),
});

export default function PatientProfileWrapper({ id }: { id: string }) {
  return <PatientDetailClient id={id} />;
}
