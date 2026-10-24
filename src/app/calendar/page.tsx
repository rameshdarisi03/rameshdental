import { CalendarEventData } from "@/lib/calendarUtils";
import CalendarClient from "./CalendarClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendarPage({ searchParams }: PageProps) {
  const sParams = await searchParams;

  let eventData: CalendarEventData | null = null;

  if (sParams) {
    const d = typeof sParams.d === "string" ? sParams.d : (typeof sParams.date === "string" ? sParams.date : "");
    const s = typeof sParams.s === "string" ? sParams.s : (typeof sParams.slot === "string" ? sParams.slot : "");
    if (d && s) {
      eventData = {
        patientName: typeof sParams.name === "string" ? sParams.name : "Patient",
        date: d,
        slot: s,
        therapistName: typeof sParams.doctor === "string" ? sParams.doctor : "Lead Physiotherapist",
        serviceName: typeof sParams.service === "string" ? sParams.service : "Physiotherapy Session",
      };
    }
  }

  return <CalendarClient initialData={eventData} />;
}
