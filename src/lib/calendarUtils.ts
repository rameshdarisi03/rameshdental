/**
 * Calendar Link & Event Generation Utilities for Ramesh Dental Clinic
 * Supports Google Calendar direct deep-links, Apple Calendar / Outlook (.ics), and compact slug encoding.
 */

import { CLINIC_BRAND } from "./clinicBranding";

export interface CalendarEventData {
  appointmentId?: string;
  patientName: string;
  date: string;       // e.g. "2026-10-24", "24-10-2026", "24 Oct 2026"
  slot: string;       // e.g. "06:00 PM", "10:30 AM"
  therapistName?: string;
  serviceName?: string;
  clinicAddress?: string;
}

const CLINIC_NAME = CLINIC_BRAND.name;
const CLINIC_ADDRESS = CLINIC_BRAND.addressLine;
const CLINIC_PHONE = CLINIC_BRAND.phone;

/**
 * Normalizes appointment date and slot strings into standard Date objects.
 */
export function parseAppointmentDateTime(dateStr: string, slotStr: string): { start: Date; end: Date } | null {
  try {
    let year = 2026;
    let month = 0; // 0-indexed
    let day = 1;

    // Handle "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split("-").map(Number);
      year = parts[0];
      month = parts[1] - 1;
      day = parts[2];
    }
    // Handle "DD-MM-YYYY"
    else if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const parts = dateStr.split("-").map(Number);
      day = parts[0];
      month = parts[1] - 1;
      year = parts[2];
    }
    // Handle textual dates like "24 Oct 2026" or "Oct 24, 2026"
    else {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      }
    }

    // Parse Slot: e.g. "06:00 PM", "10:30 AM", "18:00"
    let hours = 10;
    let minutes = 0;

    const timeMatch = (slotStr || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = (timeMatch[3] || "").toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }

    const start = new Date(year, month, day, hours, minutes, 0);
    // Standard appointment duration: 45 minutes
    const end = new Date(start.getTime() + 45 * 60 * 1000);

    return { start, end };
  } catch {
    return null;
  }
}

/**
 * Generates direct Google Calendar URL
 */
export function generateGoogleCalendarUrl(app: {
  date: string;
  slot: string;
  serviceId?: string;
  serviceName?: string;
  patientName?: string;
  therapistName?: string;
}): string {
  try {
    const parsed = parseAppointmentDateTime(app.date, app.slot);
    if (!parsed) return "";

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatGDate = (d: Date) => {
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    };

    const startTimeStr = formatGDate(parsed.start);
    const endTimeStr = formatGDate(parsed.end);

    const cleanDoctor = (app.therapistName || "Lead Physiotherapist").replace(/^Dr\.?\s*/i, "");
    const service = app.serviceName || app.serviceId || "Physiotherapy Session";

    const title = encodeURIComponent(
      `Physiotherapy Session - Dr. ${cleanDoctor} (${CLINIC_NAME})`
    );
    const details = encodeURIComponent(
      `Patient: ${app.patientName || "Patient"}\n` +
      `Doctor: Dr. ${cleanDoctor}\n` +
      `Service: ${service}\n` +
      `Clinic: ${CLINIC_NAME}\n` +
      `Address: ${CLINIC_ADDRESS}\n` +
      `Phone: ${CLINIC_PHONE}\n\n` +
      `Please arrive 5-10 minutes early in comfortable clothing suitable for physiotherapy exercises.`
    );
    const location = encodeURIComponent(CLINIC_ADDRESS);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeStr}/${endTimeStr}&details=${details}&location=${location}`;
  } catch {
    return "";
  }
}

/**
 * Encodes calendar event data into a compact, URL-safe base64 string for WhatsApp buttons.
 */
export function encodeCalendarToken(data: {
  id?: string;
  patientName: string;
  date: string;
  slot: string;
  therapistName?: string;
  serviceName?: string;
}): string {
  try {
    const compact = {
      i: data.id || "",
      n: (data.patientName || "Patient").trim(),
      d: (data.date || "").trim(),
      s: (data.slot || "").trim(),
      t: (data.therapistName || "Physiotherapist").replace(/^Dr\.?\s*/i, "").trim(),
      v: (data.serviceName || "Physiotherapy").trim(),
    };
    const json = JSON.stringify(compact);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(json, "utf8").toString("base64url");
    }
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return data.id || "appointment";
  }
}

/**
 * Decodes a calendar token from URL path.
 */
export function decodeCalendarToken(token: string): CalendarEventData | null {
  try {
    if (!token) return null;
    let jsonStr = "";
    if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(token, "base64url").toString("utf8");
    } else {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      jsonStr = decodeURIComponent(escape(atob(base64)));
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed.d || !parsed.s) return null;
    return {
      appointmentId: parsed.i || undefined,
      patientName: parsed.n || "Patient",
      date: parsed.d || "",
      slot: parsed.s || "",
      therapistName: parsed.t || "Physiotherapist",
      serviceName: parsed.v || "Physiotherapy Session",
      clinicAddress: CLINIC_ADDRESS,
    };
  } catch {
    return null;
  }
}

/**
 * Generates RFC 5545 iCalendar (.ics) string for Apple Calendar and Microsoft Outlook.
 */
export function generateIcsCalendarData(event: {
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const toIcsDate = (d: Date) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };

  const dtStart = toIcsDate(event.start);
  const dtEnd = toIcsDate(event.end);
  const dtStamp = toIcsDate(new Date());
  const uid = `rdc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@rameshdental.com`;

  // Escape special iCal characters
  const cleanSummary = event.title.replace(/[\\;,]/g, " ");
  const cleanDesc = event.description.replace(/\n/g, "\\n").replace(/[\\;,]/g, " ");
  const cleanLoc = event.location.replace(/[\\;,]/g, " ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ramesh Dental Clinic//Appointment Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${cleanSummary}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${cleanLoc}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Dental appointment reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
