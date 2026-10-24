import { decodeCalendarToken, CalendarEventData } from "@/lib/calendarUtils";
import { getFirestoreDocRest } from "@/lib/firebaseRestAdmin";
import CalendarClient from "../CalendarClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CalendarSlugPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  let eventData: CalendarEventData | null = null;

  // 1. Try decoding as base64url token
  eventData = decodeCalendarToken(slug);

  // 2. If not a base64 token, attempt lookup as a Firestore appointment ID
  if (!eventData && slug && slug !== "preview") {
    try {
      const doc = await getFirestoreDocRest("appointments", slug);
      if (doc) {
        eventData = {
          appointmentId: slug,
          patientName: doc.patientName || "Patient",
          date: doc.date || "",
          slot: doc.slot || "",
          therapistName: doc.therapistName || doc.therapist || "Lead Physiotherapist",
          serviceName: doc.serviceName || doc.serviceId || "Physiotherapy Session",
        };
      }
    } catch (e) {
      console.warn("[CalendarPage] Firestore lookup fallback:", e);
    }
  }

  // 3. Fallback to query parameters if present
  if (!eventData && sParams) {
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

  return <CalendarClient initialData={eventData} slug={slug} />;
}
