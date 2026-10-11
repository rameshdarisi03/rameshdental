/**
 * Google Calendar Link Generation Utility
 */
export function generateGoogleCalendarUrl(app: {
  date: string;
  slot: string;
  serviceId?: string;
  patientName?: string;
}): string {
  try {
    const cleanDate = (app.date || "").replace(/-/g, "");
    const timeMatch = (app.slot || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch || !cleanDate) return "";

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3].toUpperCase();

    if (ampm === "PM" && hours < 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const pad = (num: number) => String(num).padStart(2, "0");
    const startHour = pad(hours);
    const startTimeStr = `${cleanDate}T${startHour}${minutes}00`;

    let endHours = hours;
    let endMinutes = parseInt(minutes, 10) + 45;
    if (endMinutes >= 60) {
      endHours += 1;
      endMinutes -= 60;
    }
    if (endHours >= 24) {
      endHours = 23;
      endMinutes = 59;
    }

    const endTimeStr = `${cleanDate}T${pad(endHours)}${pad(endMinutes)}00`;
    const title = encodeURIComponent(
      `Physiotherapy Session at Gait Physio Clinic (${app.serviceId || "Rehabilitation"})`
    );
    const details = encodeURIComponent(
      `Appointment confirmed for ${app.patientName || "Patient"} at Gait Physio Clinic, Whitefield, Bengaluru.`
    );
    const location = encodeURIComponent(
      "Gait Physio Clinic, Near Hope Farm Signal, Whitefield, Bengaluru"
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTimeStr}/${endTimeStr}&details=${details}&location=${location}`;
  } catch {
    return "";
  }
}
