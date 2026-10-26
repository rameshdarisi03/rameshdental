import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  doc,
  updateDoc
} from "firebase/firestore";
import { getClinicConfig } from "./db";

export interface ParsedPractoEvent {
  uid: string;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
  date: string; // YYYY-MM-DD
  slot: string; // hh:mm A
  serviceName: string;
  notes: string;
  status: "confirmed" | "cancelled";
  rawStart?: Date;
  rawEnd?: Date;
}

/**
 * Clean patient name by removing doctor names in parentheses or iCal prefixes
 * e.g. "Apurv Gupta (Ms. Dr.Madem Kinnera)" -> "Apurv Gupta"
 * e.g. "Appointment with Ram (Dr. Kinnera)" -> "Ram"
 */
export function cleanPatientName(name?: string): string {
  if (!name) return "Patient";
  return (
    name
      .replace(/^appointment\s+(?:with|for)\s+/i, "")
      .replace(/^practo\s*:\s*/i, "")
      .replace(/\s*-\s*physiotherapy.*$/i, "")
      .replace(/\s*\([^)]*\)/g, "") // Removes any parenthetical content like (Ms. Dr.Madem Kinnera) anywhere
      .replace(/\s*-\s*(?:confirmed|booked|practo).*$/i, "")
      .trim() || name
  );
}

/**
 * Check if an appointment is from Practo
 */
export function isPractoAppointment(app: any): boolean {
  if (!app) return false;
  return (
    app.type === "practo" ||
    !!app.practoEventId ||
    (typeof app.notes === "string" && /practo/i.test(app.notes)) ||
    (typeof app.source === "string" && /practo/i.test(app.source)) ||
    (typeof app.actionedByName === "string" && /practo/i.test(app.actionedByName))
  );
}

/**
 * Parses iCal date strings into a standard JavaScript Date object.
 * Handles formats:
 * - 20261024T093000Z (UTC)
 * - 20261024T150000 (Local / floating)
 * - 20261024 (All day)
 */
function parseIcalDate(val: string): Date | null {
  if (!val) return null;
  const cleanVal = val.trim();

  // YYYYMMDDTHHmmssZ (UTC)
  if (/^\d{8}T\d{6}Z$/.test(cleanVal)) {
    const year = parseInt(cleanVal.slice(0, 4), 10);
    const month = parseInt(cleanVal.slice(4, 6), 10) - 1;
    const day = parseInt(cleanVal.slice(6, 8), 10);
    const hours = parseInt(cleanVal.slice(9, 11), 10);
    const minutes = parseInt(cleanVal.slice(11, 13), 10);
    const seconds = parseInt(cleanVal.slice(13, 15), 10);
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  }

  // YYYYMMDDTHHmmss (Local or with TZID prefix)
  if (/^\d{8}T\d{6}$/.test(cleanVal)) {
    const year = parseInt(cleanVal.slice(0, 4), 10);
    const month = parseInt(cleanVal.slice(4, 6), 10) - 1;
    const day = parseInt(cleanVal.slice(6, 8), 10);
    const hours = parseInt(cleanVal.slice(9, 11), 10);
    const minutes = parseInt(cleanVal.slice(11, 13), 10);
    const seconds = parseInt(cleanVal.slice(13, 15), 10);
    return new Date(year, month, day, hours, minutes, seconds);
  }

  // YYYYMMDD (Date only)
  if (/^\d{8}$/.test(cleanVal)) {
    const year = parseInt(cleanVal.slice(0, 4), 10);
    const month = parseInt(cleanVal.slice(4, 6), 10) - 1;
    const day = parseInt(cleanVal.slice(6, 8), 10);
    return new Date(year, month, day, 10, 0, 0);
  }

  return null;
}

/**
 * Converts a Date object to IST (Asia/Kolkata) date string and slot time.
 */
function formatIstDateTime(dateObj: Date): { dateStr: string; slotStr: string } {
  // Format to Asia/Kolkata timezone
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const parts = istFormatter.formatToParts(dateObj);
  let year = "2026";
  let month = "01";
  let day = "01";
  let hour = "09";
  let minute = "00";
  let dayPeriod = "AM";

  parts.forEach((p) => {
    if (p.type === "year") year = p.value;
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
    if (p.type === "dayPeriod") dayPeriod = p.value.toUpperCase();
  });

  return {
    dateStr: `${year}-${month}-${day}`,
    slotStr: `${hour}:${minute} ${dayPeriod}`,
  };
}

/**
 * Parses raw iCal RFC 5545 text into structured Practo appointments.
 */
export function parsePractoIcal(icalContent: string): ParsedPractoEvent[] {
  if (!icalContent || !icalContent.includes("BEGIN:VCALENDAR")) {
    return [];
  }

  // Unfold folded lines in RFC 5545 (lines starting with space or tab continue previous line)
  const unfolded = icalContent.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedPractoEvent[] = [];
  let inEvent = false;
  let currentEvent: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (trimmed === "END:VEVENT") {
      if (inEvent && currentEvent.UID) {
        // Parse date
        const rawStartVal = currentEvent["DTSTART"] || currentEvent["DTSTART;VALUE=DATE"] || "";
        const startDate = parseIcalDate(rawStartVal);

        if (startDate) {
          const { dateStr, slotStr } = formatIstDateTime(startDate);

          // Extract patient name & details from SUMMARY and DESCRIPTION
          let summary = currentEvent["SUMMARY"] || "Practo Patient";
          let description = currentEvent["DESCRIPTION"] || "";
          let patientPhone = "";
          let patientEmail = "";
          let serviceName = "General Physiotherapy Consultation";

          // Unescape backslashes in description
          description = description.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");

          // Extract phone number from description or summary
          const phoneMatch = description.match(/(?:\+91|91|0)?[6-9]\d{9}/);
          if (phoneMatch) {
            patientPhone = phoneMatch[0];
          }

          // Extract email from description
          const emailMatch = description.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            patientEmail = emailMatch[0];
          }

          // Clean Patient Name from Summary: e.g. "Apurv Gupta (Ms. Dr.Madem Kinnera)" -> "Apurv Gupta"
          let patientName = cleanPatientName(summary);
          if (!patientName) patientName = "Practo Patient";

          const status: "confirmed" | "cancelled" = (currentEvent["STATUS"] || "").toUpperCase() === "CANCELLED" 
            ? "cancelled" 
            : "confirmed";

          events.push({
            uid: currentEvent["UID"],
            patientName,
            patientPhone,
            patientEmail,
            date: dateStr,
            slot: slotStr,
            serviceName,
            notes: description ? `Practo Booking • ${description.slice(0, 180)}` : "Booked via Practo",
            status,
            rawStart: startDate,
          });
        }
      }
      inEvent = false;
      currentEvent = {};
      continue;
    }

    if (inEvent) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        let key = trimmed.slice(0, colonIdx);
        const value = trimmed.slice(colonIdx + 1);

        // Strip parameter qualifiers like ;TZID=... from key
        if (key.includes(";")) {
          const mainKey = key.split(";")[0];
          currentEvent[mainKey] = value;
        }
        currentEvent[key] = value;
      }
    }
  }

  return events;
}

/**
 * Fetches and synchronizes Practo iCal events into Firestore appointments.
 */
export async function syncPractoAppointments(params?: {
  overrideUrl?: string;
  therapistName?: string;
}): Promise<{
  success: boolean;
  importedCount: number;
  skippedCount: number;
  totalFound: number;
  message: string;
}> {
  try {
    let icalUrl = params?.overrideUrl;

    if (!icalUrl) {
      const config = await getClinicConfig();
      icalUrl = config.practoIcalUrl;
    }

    if (!icalUrl || !icalUrl.trim()) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        totalFound: 0,
        message: "No Practo Calendar feed URL configured. Please paste your Practo iCal link in Clinic Settings.",
      };
    }

    // Convert webcal:// to https://
    const fetchUrl = icalUrl.trim().replace(/^webcal:\/\//i, "https://");

    console.log(`[Practo Sync] Fetching feed from: ${fetchUrl}`);
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "GaitPhysioClinic/1.0 CalendarSyncBot",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        totalFound: 0,
        message: `Failed to fetch Practo feed (HTTP ${res.status}: ${res.statusText}). Please check that the URL is valid.`,
      };
    }

    const icalText = await res.text();
    const events = parsePractoIcal(icalText);

    if (events.length === 0) {
      return {
        success: true,
        importedCount: 0,
        skippedCount: 0,
        totalFound: 0,
        message: "Connected to Practo feed, but no active appointments were found.",
      };
    }

    // Filter to active confirmed events
    const activeEvents = events.filter((e) => e.status !== "cancelled");

    // Fetch existing Practo appointments from Firestore to prevent duplicate inserts
    const appointmentsRef = collection(db, "appointments");
    const existingSnap = await getDocs(
      query(appointmentsRef, where("type", "==", "practo"))
    );

    const existingUids = new Set<string>();
    const existingSlotsByDate = new Set<string>();

    existingSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.practoEventId) {
        existingUids.add(data.practoEventId);
      }
      if (data.date && data.slot) {
        existingSlotsByDate.add(`${data.date}__${data.slot}`);
      }

      // Retroactive cleanup: remove (Dr. ...) or (doctor) from patientName if previously synced
      const rawName = data.patientName || "";
      if (/\([^)]+\)/.test(rawName)) {
        const cleaned = rawName
          .replace(/\s*\([^)]*(?:dr\.?|doctor|treating)[^)]*\)\s*$/i, "")
          .replace(/\s*\([^)]*\)\s*$/i, "")
          .trim();
        if (cleaned && cleaned !== rawName) {
          updateDoc(docSnap.ref, { patientName: cleaned }).catch(() => {});
        }
      }
    });

    let importedCount = 0;
    let skippedCount = 0;
    const defaultDoctor = params?.therapistName || "Dr.Kinnera";

    for (const evt of activeEvents) {
      // Deduplication check: check UID or date+slot
      const slotKey = `${evt.date}__${evt.slot}`;
      if (existingUids.has(evt.uid) || existingSlotsByDate.has(slotKey)) {
        skippedCount++;
        continue;
      }

      // Insert new Practo appointment
      await addDoc(appointmentsRef, {
        patientName: evt.patientName,
        patientPhone: evt.patientPhone || "",
        patientEmail: evt.patientEmail || "",
        serviceId: evt.serviceName || "Practo Consultation",
        date: evt.date,
        slot: evt.slot,
        status: "approved",
        type: "practo",
        assignedTherapist: defaultDoctor,
        practoEventId: evt.uid,
        notes: evt.notes || "Imported from Practo Calendar",
        createdAt: Timestamp.now(),
        actionedByName: "Practo Sync",
        actionedByRole: "system",
        actionedAt: Timestamp.now(),
      });

      existingUids.add(evt.uid);
      existingSlotsByDate.add(slotKey);
      importedCount++;
    }

    // Record last sync metadata in clinic configuration
    try {
      const configRef = doc(db, "settings", "clinic_config");
      await updateDoc(configRef, {
        practoLastSyncedAt: Timestamp.now(),
        practoLastImportCount: importedCount,
      });
    } catch {}

    const message = importedCount > 0
      ? `Successfully synced with Practo! Imported ${importedCount} new appointment${importedCount === 1 ? "" : "s"}.`
      : `Practo feed is up to date (${skippedCount} existing appointment${skippedCount === 1 ? "" : "s"} verified).`;

    return {
      success: true,
      importedCount,
      skippedCount,
      totalFound: activeEvents.length,
      message,
    };
  } catch (error: any) {
    console.error("[Practo Sync Error]:", error);
    return {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      totalFound: 0,
      message: error?.message || "An unexpected error occurred while syncing Practo appointments.",
    };
  }
}
