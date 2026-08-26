import { Suspense } from "react";
import PatientDetailClient from "./PatientDetailClient";
import { Loader2 } from "lucide-react";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-96 items-center justify-center text-slate-500 text-xs font-semibold">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green mb-3" />
          <span>Loading clinical patient profile...</span>
        </div>
      }
    >
      <PatientDetailClient id={id} />
    </Suspense>
  );
}
