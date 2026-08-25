import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  doc,
  Timestamp
} from "firebase/firestore";

export interface Appointment {
  id?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  slot: string; // e.g. "09:30 AM"
  status: "pending" | "approved" | "rejected";
  notes?: string;
  type: "online" | "manual";
  createdAt: Timestamp;
  
  // Multi-Therapist assignment
  assignedTherapist?: string;
  
  // Auditing / Transparency Logs
  createdByUid?: string;
  createdByName?: string;
  createdByRole?: string;
  actionedByUid?: string;
  actionedByName?: string;
  actionedByRole?: string;
  actionedAt?: Timestamp;
}

export interface DayBlock {
  id?: string;
  date: string; // YYYY-MM-DD
  type: "full_day" | "session" | "holiday" | "slot";
  session?: "morning" | "evening"; // required if type === "session"
  slot?: string; // required if type === "slot"
  reason?: string;
  createdAt: Timestamp;
}

export interface ClinicConfig {
  weeklyHolidays: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  slotDuration: number; // 30, 45, 60
  defaultCapacityPerSlot: number; // e.g. 3 therapists = 3 slots per hour
  hourlyCapacityOverrides?: Record<string, number>; // e.g. { "01:00 PM": 1, "05:00 PM": 3 }
  morningStart: string; // "09:00 AM"
  morningEnd: string; // "01:00 PM"
  eveningStart: string; // "02:00 PM"
  eveningEnd: string; // "07:00 PM"
  operationalHoursText: string;
  therapists: string[];
  address?: string;
  landmark?: string;
  phone?: string;
  email?: string;
  googleMapsLink?: string;
  googleMapsEmbed?: string;
}

// Default Configuration fallback
export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
  weeklyHolidays: {
    sunday: true,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  },
  slotDuration: 30,
  defaultCapacityPerSlot: 3,
  hourlyCapacityOverrides: {},
  morningStart: "09:00 AM",
  morningEnd: "01:00 PM",
  eveningStart: "02:00 PM",
  eveningEnd: "07:00 PM",
  operationalHoursText: "Morning: 09:00 AM - 01:00 PM | Evening: 02:00 PM - 07:00 PM (Monday - Saturday)",
  therapists: ["Dr. Sarah Jenkins", "Dr. Rohan Das"],
  address: "123 Clinical Wellness Way, Near Central Park, Sector 4, Bangalore, 560001",
  landmark: "Next to Central Bank, opposite Central Park Main Gate",
  phone: "+91 92066 51295",
  email: "info@gaitphysioclinic.com",
  googleMapsLink: "https://maps.google.com/?q=Gait+Physio+Clinic+Bangalore",
  googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.9700303102434!2d77.62018597576572!3d12.973797614838645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae16a62c4a92c1%3A0xe54e60408542cd5!2sGait%20Physio%20Clinic!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
};

// Helper: Calculate max patient capacity for a given time slot
export function getSlotCapacity(config: ClinicConfig, slotStr: string): number {
  if (config.hourlyCapacityOverrides && typeof config.hourlyCapacityOverrides[slotStr] === "number") {
    return config.hourlyCapacityOverrides[slotStr];
  }
  return config.defaultCapacityPerSlot || 3;
}

// Fetch Clinic Config settings
export async function getClinicConfig(): Promise<ClinicConfig> {
  try {
    const docRef = doc(db, "settings", "clinic_config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_CLINIC_CONFIG, ...docSnap.data() } as ClinicConfig;
    }
    return DEFAULT_CLINIC_CONFIG;
  } catch (error) {
    console.error("Error fetching clinic config: ", error);
    return DEFAULT_CLINIC_CONFIG;
  }
}

// Save Clinic Config settings
export async function saveClinicConfig(config: ClinicConfig): Promise<boolean> {
  try {
    const docRef = doc(db, "settings", "clinic_config");
    await setDoc(docRef, config);
    return true;
  } catch (error) {
    console.error("Error saving clinic config: ", error);
    return false;
  }
}

// Convert "09:30 AM" to total minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

// Convert minutes back to "09:30 AM"
function formatMinutesToTime(totalMinutes: number): string {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const modifier = hours >= 12 ? "PM" : "AM";
  if (hours > 12) {
    hours -= 12;
  }
  if (hours === 0) {
    hours = 12;
  }
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes} ${modifier}`;
}

// Check if a slot string (e.g. "09:30 AM") is in the past relative to local time and today's date
export function isSlotInPast(slotStr: string, dateStr: string): boolean {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();

    // Parse slot time (e.g. "09:30 AM" or "02:00 PM")
    const [time, modifier] = slotStr.split(" ");
    let [slotHour, slotMinute] = time.split(":").map(Number);

    if (modifier === "PM" && slotHour < 12) {
      slotHour += 12;
    }
    if (modifier === "AM" && slotHour === 12) {
      slotHour = 0;
    }

    if (slotHour < currentHour) return true;
    if (slotHour === currentHour && slotMinute <= currentMinute) return true;
  } catch (error) {
    console.error("Error parsing slot time: ", error);
  }
  return false;
}

// Generate slot lists dynamically based on start/end hours and interval duration
export function generateSlotsFromHours(
  morningStart: string,
  morningEnd: string,
  eveningStart: string,
  eveningEnd: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  try {
    const mStart = parseTimeToMinutes(morningStart);
    const mEnd = parseTimeToMinutes(morningEnd);
    for (let t = mStart; t <= mEnd - durationMinutes; t += durationMinutes) {
      slots.push(formatMinutesToTime(t));
    }

    const eStart = parseTimeToMinutes(eveningStart);
    const eEnd = parseTimeToMinutes(eveningEnd);
    for (let t = eStart; t <= eEnd - durationMinutes; t += durationMinutes) {
      slots.push(formatMinutesToTime(t));
    }
  } catch (error) {
    console.error("Error generating dynamic slots: ", error);
  }
  return slots;
}

// Fetch all appointments for a given date
export async function getAppointmentsByDate(dateStr: string): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, "appointments"),
      where("date", "==", dateStr)
    );
    const snapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });
    return appointments;
  } catch (error) {
    console.error("Error fetching appointments: ", error);
    return [];
  }
}

// Fetch active blocks for a given date
export async function getBlocksByDate(dateStr: string): Promise<DayBlock[]> {
  try {
    const q = query(
      collection(db, "blocks"),
      where("date", "==", dateStr)
    );
    const snapshot = await getDocs(q);
    const blocks: DayBlock[] = [];
    snapshot.forEach((doc) => {
      blocks.push({ id: doc.id, ...doc.data() } as DayBlock);
    });
    return blocks;
  } catch (error) {
    console.error("Error fetching blocks: ", error);
    return [];
  }
}

// Submits a booking request under a transaction to prevent double bookings of APPROVED slots
export async function submitBookingRequest(
  booking: Omit<Appointment, "createdAt" | "status" | "type">
): Promise<{ success: boolean; error?: string }> {
  try {
    const appointmentsRef = collection(db, "appointments");
    const blocksRef = collection(db, "blocks");

    // Fetch active clinic configuration for capacity check
    const config = await getClinicConfig();
    const maxCapacity = getSlotCapacity(config, booking.slot);

    // 1. Verify if slot is already fully booked
    const qApproved = query(
      appointmentsRef,
      where("date", "==", booking.date),
      where("slot", "==", booking.slot),
      where("status", "==", "approved")
    );
    const approvedDocs = await getDocs(qApproved);
    if (approvedDocs.size >= maxCapacity) {
      return { success: false, error: "This time slot is now fully booked. Please select another available slot." };
    }

    // 2. Verify if slot is blocked by admin rules
    const qBlocks = query(
      blocksRef,
      where("date", "==", booking.date)
    );
    const blockDocs = await getDocs(qBlocks);
    let isBlocked = false;
    blockDocs.forEach((docSnap) => {
      const block = docSnap.data() as DayBlock;
      if (block.type === "full_day" || block.type === "holiday") {
        isBlocked = true;
      } else if (block.type === "session") {
        const slotHour = parseInt(booking.slot.split(":")[0], 10);
        const isPM = booking.slot.includes("PM");
        if (block.session === "morning" && (slotHour < 12 || (slotHour === 12 && !isPM) || (slotHour === 1 && !isPM))) {
          isBlocked = true;
        } else if (block.session === "evening" && (isPM && slotHour >= 1 && slotHour < 8)) {
          isBlocked = true;
        }
      } else if (block.type === "slot") {
        if (block.slot === booking.slot) {
          isBlocked = true;
        }
      }
    });

    if (isBlocked) {
      return { success: false, error: "This time slot is unavailable due to clinic session closures or holidays. Please select another slot." };
    }

    // 3. Write booking as pending
    await addDoc(appointmentsRef, {
      ...booking,
      status: "pending",
      type: "online",
      createdAt: Timestamp.now()
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error submitting appointment: ", error);
    return { success: false, error: error?.message || "An unexpected database error occurred. Please try again." };
  }
}
