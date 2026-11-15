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
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore";

export interface Appointment {
  id?: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientAddress?: string; // Residential address / locality
  serviceId: string;
  date: string; // YYYY-MM-DD
  slot: string; // e.g. "09:30 AM"
  status: "pending" | "approved" | "rejected";
  notes?: string;
  type: "online" | "manual" | "practo";
  practoEventId?: string; // Unique Practo UID for deduplication
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

  // Reschedule Request Tracking
  reschedulePending?: boolean;
  requestedDate?: string;
  requestedSlot?: string;
  rescheduleReason?: string;
  rescheduleRequestedAt?: string;
  rescheduleRequestedBy?: string;
  previousDate?: string;
  previousSlot?: string;
  rescheduledAt?: string;
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

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;  // e.g. "09:30 AM"
  closeTime: string; // e.g. "08:00 PM"
}

export type WeekdayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export const DEFAULT_DAY_SCHEDULES: Record<WeekdayKey, DaySchedule> = {
  monday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  tuesday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  wednesday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  thursday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  friday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  saturday: { isOpen: true, openTime: "09:30 AM", closeTime: "08:00 PM" },
  sunday: { isOpen: true, openTime: "09:00 AM", closeTime: "05:00 PM" },
};

export interface TeamDoctorProfile {
  id: string;
  name: string;
  role: string;
  qualifications?: string;
  experience?: string;
  specialties?: string[];
  image: string;
  bio?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export const DEFAULT_TEAM_MEMBERS: TeamDoctorProfile[] = [
  {
    id: "dr-ramesh-darisi",
    name: "Dr. Ramesh Darisi",
    role: "Chief Dental Surgeon & Implantologist",
    qualifications: "BDS, MDS (Prosthodontics & Implantology), FICOI (USA)",
    experience: "15+ Years Clinical Practice",
    specialties: ["Dental Implants", "Full Mouth Rehabilitation", "Cosmetic Dentistry", "Single-Visit RCT", "Laser Dentistry"],
    image: "/images/gallery/operatory_master.webp",
    bio: "Dr. Ramesh Darisi is the chief clinical director and lead implantologist at Ramesh Dental Clinic. Specializing in advanced oral rehabilitation, digital smile design, and guided implantology, he has restored smiles for thousands of patients with a gentle, patient-first approach.",
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "doc-dr-sneha-reddy",
    name: "Dr. Sneha Reddy",
    role: "Orthodontist & Certified Aligner Specialist",
    qualifications: "BDS, MDS (Orthodontics & Dentofacial Orthopedics)",
    experience: "8+ Years Clinical Practice",
    specialties: ["Invisalign & Clear Aligners", "Self-Ligating Ceramic Braces", "Surgical Orthodontics", "Interceptive Braces"],
    image: "/images/services/invisible-aligners.webp",
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "doc-dr-arvind-kumar",
    name: "Dr. Arvind Kumar",
    role: "Endodontist & Microscopic RCT Specialist",
    qualifications: "BDS, MDS (Conservative Dentistry & Endodontics)",
    experience: "7+ Years Clinical Practice",
    specialties: ["Painless Single-Visit RCT", "Laser Root Canal Disinfection", "Aesthetic Composite Bonding", "Teeth Whitening"],
    image: "/images/services/root-canal.webp",
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "doc-dr-priya-nair",
    name: "Dr. Priya Nair",
    role: "Pediatric Dentist (Kids Dental Specialist)",
    qualifications: "BDS, MDS (Pediatric & Preventive Dentistry)",
    experience: "6+ Years Clinical Practice",
    specialties: ["Preventive Dental Sealants", "Painless Milk Tooth Fillings", "Fluoride Varnish", "Habit Breaking Appliances"],
    image: "/images/services/pediatric-dentistry.webp",
    isActive: true,
    displayOrder: 4,
  }
];

export interface ClinicConfig {
  enablePublicBooking?: boolean; // Master toggle for public online booking access
  weeklyHolidays: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  daySchedules?: Record<WeekdayKey, DaySchedule>; // Day-by-day customized operating hours
  slotDuration: number; // 30, 45, 60
  defaultCapacityPerSlot: number; // e.g. 3 therapists = 3 slots per hour
  hourlyCapacityOverrides?: Record<string, number>; // e.g. { "01:00 PM": 1, "05:00 PM": 3 }
  morningStart: string; // "09:00 AM"
  morningEnd: string; // "01:00 PM"
  eveningStart: string; // "02:00 PM"
  eveningEnd: string; // "07:00 PM"
  operationalHoursText: string;
  therapists: string[];
  teamMembers?: TeamDoctorProfile[];
  adminWalkInGraceType?: "end_of_slot" | "15_min" | "30_min" | "anytime_today"; // Admin walk-in late tolerance
  publicBookingCutoffMinutes?: number; // Public cutoff before slot starts: 0, 15, 30, 60
  address?: string;
  landmark?: string;
  phone?: string;
  email?: string;
  googleMapsLink?: string;
  googleMapsEmbed?: string;
  heroDesktopImage?: string; // Custom panoramic desktop cover image (or preset)
  heroMobileImage?: string;  // Custom vertical mobile cover image (or preset)
  customHeroPresets?: HeroPresetOption[]; // Uploaded custom images appended to preset library
  // Practo Calendar Integration
  practoIcalUrl?: string; // e.g. "webcal://www.practo.com/ray/calendar/feed/..."
  practoDoctorName?: string; // Doctor name assigned to Practo appointments
  practoLastSyncedAt?: Timestamp;
  practoLastImportCount?: number;
}

export interface HeroPresetOption {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  recommendedBadge?: string;
  tag: string;
  isCustom?: boolean;
  uploadedAt?: string;
}

// Default Configuration fallback
export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
  enablePublicBooking: true,
  weeklyHolidays: {
    sunday: false,
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
  },
  daySchedules: DEFAULT_DAY_SCHEDULES,
  slotDuration: 30,
  defaultCapacityPerSlot: 3,
  hourlyCapacityOverrides: {},
  morningStart: "09:30 AM",
  morningEnd: "01:00 PM",
  eveningStart: "02:00 PM",
  eveningEnd: "08:00 PM",
  operationalHoursText: "Mon - Sat: 09:30 AM - 08:00 PM | Sun: 09:00 AM - 05:00 PM",
  therapists: ["Dr. Ramesh Darisi", "Dr. Sneha Reddy", "Dr. Arvind Kumar", "Dr. Priya Nair"],
  teamMembers: DEFAULT_TEAM_MEMBERS,
  adminWalkInGraceType: "end_of_slot",
  publicBookingCutoffMinutes: 0,
  address: "Metro Pillar 142, ITPL Main Road, Prasanth Extension, Whitefield, Bengaluru, Karnataka - 560066",
  landmark: "Near Hope Farm Signal, Whitefield",
  phone: "+91 98765 43210",
  email: "rameshdarisi01@gmail.com",
  googleMapsLink: "https://maps.google.com/?q=Ramesh+Dental+Clinic+Whitefield+Bangalore",
  googleMapsEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3887.8967814402685!2d77.75011131482205!3d12.984700090847253!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae0fb5b6574f2b%3A0xbcf2a8ee0322b75f!2sWhitefield!5e0!3m2!1sen!2sin!4v1691234567890!5m2!1sen!2sin",
  heroDesktopImage: "/images/hero_dental_desktop.webp",
  heroMobileImage: "/images/hero_dental_mobile.webp",
  customHeroPresets: [],
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
  // Tier 1: Client SDK Firestore lookup
  try {
    const docRef = doc(db, "settings", "clinic_config");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const merged = {
        ...DEFAULT_CLINIC_CONFIG,
        ...data,
        daySchedules: {
          ...DEFAULT_DAY_SCHEDULES,
          ...(data?.daySchedules || {}),
        },
      } as ClinicConfig;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("gpc_clinic_config_cache", JSON.stringify(merged));
        } catch (e) {}
      }
      return merged;
    }
  } catch (error) {
    console.warn("Client getDoc failed for clinic config, attempting API fallback: ", error);
  }

  // Tier 2: Infallible Serverless API endpoint
  if (typeof window !== "undefined") {
    try {
      let res = await fetch("/api/clinic/settings");
      if (!res.ok) {
        res = await fetch("/api/clinic/config");
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.config) {
          const merged = {
            ...DEFAULT_CLINIC_CONFIG,
            ...data.config,
            daySchedules: {
              ...DEFAULT_DAY_SCHEDULES,
              ...(data.config?.daySchedules || {}),
            },
          } as ClinicConfig;
          try {
            localStorage.setItem("gpc_clinic_config_cache", JSON.stringify(merged));
          } catch (e) {}
          return merged;
        }
      }
    } catch (apiErr) {
      console.warn("[getClinicConfig] API endpoint fallback error:", apiErr);
    }

    try {
      const cached = localStorage.getItem("gpc_clinic_config_cache");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
  }

  return DEFAULT_CLINIC_CONFIG;
}

// Save Clinic Config settings
export async function saveClinicConfig(config: ClinicConfig): Promise<{ success: boolean; error?: string }> {
  // 1. Sanitize to pure JSON without any undefined values (preventing Firestore undefined property rejection)
  const cleanConfig = JSON.parse(JSON.stringify(config));

  let lastError = "";

  // Tier 1: Infallible Serverless REST API endpoint (runs with Admin root privileges)
  if (typeof window !== "undefined") {
    try {
      let staffRole = "admin";
      let staffEmail = "";
      try {
        const userJson = localStorage.getItem("gpc_user");
        if (userJson) {
          const u = JSON.parse(userJson);
          staffRole = u.role || "admin";
          staffEmail = u.email || "";
        }
      } catch {}

      // Ensure session cookie is primed
      try {
        document.cookie = `gpc_session=${staffRole}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}

      const { auth } = await import("./firebase");
      const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
      const reqHeaders = {
        "Content-Type": "application/json",
        "x-staff-role": staffRole,
        "x-staff-email": staffEmail,
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };

      let res = await fetch("/api/clinic/settings", {
        method: "POST",
        credentials: "include",
        headers: reqHeaders,
        body: JSON.stringify(cleanConfig),
      });

      if (!res.ok) {
        res = await fetch("/api/clinic/config", {
          method: "POST",
          credentials: "include",
          headers: reqHeaders,
          body: JSON.stringify(cleanConfig),
        });
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.success) {
          try {
            localStorage.setItem("gpc_clinic_config_cache", JSON.stringify(cleanConfig));
          } catch (e) {}
          return { success: true };
        } else {
          lastError = data?.error || "Server rejected clinic settings configuration.";
          console.warn("[saveClinicConfig] API returned failure:", lastError);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        lastError = errJson?.error || `Server HTTP Error (${res.status}): ${res.statusText}`;
        console.warn("[saveClinicConfig] API HTTP error:", res.status, errJson);
      }
    } catch (apiErr: any) {
      lastError = apiErr?.message || "Network error contacting configuration server.";
      console.warn("[saveClinicConfig] API endpoint attempt notice:", apiErr);
    }
  }

  // Tier 2: Direct Client Firestore SDK fallback
  try {
    const docRef = doc(db, "settings", "clinic_config");
    await setDoc(docRef, cleanConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("gpc_clinic_config_cache", JSON.stringify(cleanConfig));
      } catch (e) {}
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error saving clinic config via client SDK: ", error);
    return {
      success: false,
      error: lastError || error?.message || "Failed to persist clinic configuration.",
    };
  }
}

// Convert "09:30 AM" to total minutes from midnight
export function parseTimeToMinutes(timeStr: string): number {
  const [time, modifier] = timeStr.split(" ");
  const [rawHours, minutes] = time.split(":").map(Number);
  let hours = rawHours;
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

// Convert minutes back to "09:30 AM"
export function formatMinutesToTime(totalMinutes: number): string {
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

export interface SlotPastCheckOptions {
  isAdmin?: boolean;
  graceType?: "end_of_slot" | "15_min" | "30_min" | "anytime_today";
  cutoffMinutes?: number;
  slotDuration?: number;
}

// Check if a slot string (e.g. "09:30 AM") is in the past relative to local time and today's date
export function isSlotInPast(
  slotStr: string, 
  dateStr: string, 
  options?: SlotPastCheckOptions
): boolean {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    // For admin staff: if graceType is "anytime_today", all slots for today can be booked/blocked
    if (options?.isAdmin && options?.graceType === "anytime_today") {
      return false;
    }

    const currentTotalMinutes = today.getHours() * 60 + today.getMinutes();

    // Parse slot time (e.g. "09:30 AM" or "02:00 PM")
    const [time, modifier] = slotStr.split(" ");
    const [rawHour, slotMinute] = time.split(":").map(Number);
    let slotHour = rawHour;

    if (modifier === "PM" && slotHour < 12) {
      slotHour += 12;
    }
    if (modifier === "AM" && slotHour === 12) {
      slotHour = 0;
    }

    const slotStartTotalMinutes = slotHour * 60 + slotMinute;

    if (options?.isAdmin) {
      const graceType = options.graceType || "end_of_slot";
      let graceMinutes = options.slotDuration || 30; // default end_of_slot
      if (graceType === "15_min") {
        graceMinutes = 15;
      } else if (graceType === "30_min") {
        graceMinutes = 30;
      } else if (graceType === "end_of_slot") {
        graceMinutes = options.slotDuration || 30;
      }

      // Slot is only past once current time passes (slotStart + graceMinutes)
      return currentTotalMinutes >= slotStartTotalMinutes + graceMinutes;
    } else {
      // Customer / Public mode
      const cutoff = options?.cutoffMinutes ?? 0;
      // Cutoff applies before the slot starts (e.g. 15 mins before)
      return currentTotalMinutes > (slotStartTotalMinutes - cutoff);
    }
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

// Helper: Get weekday key ("monday" | "tuesday" | ...) from a YYYY-MM-DD date string
export function getWeekdayKey(dateStr: string): WeekdayKey {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() as WeekdayKey;
}

// Generate slots for a specific date or day, respecting:
// 1. That specific day's open/close times from daySchedules
// 2. That day's isOpen status (0 slots if marked closed)
// 3. Shift boundaries & lunch break (morningStart -> morningEnd, eveningStart -> eveningEnd)
export function generateSlotsForDay(
  config: ClinicConfig,
  dateStrOrDayKey?: string
): string[] {
  if (!config) return [];

  let dayKey: WeekdayKey | undefined;
  if (dateStrOrDayKey) {
    if (dateStrOrDayKey.includes("-")) {
      dayKey = getWeekdayKey(dateStrOrDayKey);
    } else {
      dayKey = dateStrOrDayKey.toLowerCase() as WeekdayKey;
    }
  }

  // If day is closed according to daySchedules or weeklyHolidays, return 0 slots
  if (dayKey) {
    const daySched = config.daySchedules?.[dayKey] || DEFAULT_DAY_SCHEDULES[dayKey];
    if (daySched && !daySched.isOpen) {
      return [];
    }
    if (config.weeklyHolidays?.[dayKey] === true) {
      return [];
    }
  }

  const duration = config.slotDuration || 30;
  const daySched = dayKey ? (config.daySchedules?.[dayKey] || DEFAULT_DAY_SCHEDULES[dayKey]) : undefined;

  // Day's outer boundary (e.g. 09:30 AM to 08:00 PM on Mon, or 09:00 AM to 05:00 PM on Sun)
  const dayOpenMins = daySched ? parseTimeToMinutes(daySched.openTime) : 0;
  const dayCloseMins = daySched ? parseTimeToMinutes(daySched.closeTime) : 24 * 60;

  // Morning shift: start at max(morningStart, dayOpenMins), end at min(morningEnd, dayCloseMins)
  const mStartMins = Math.max(parseTimeToMinutes(config.morningStart), dayOpenMins);
  const mEndMins = Math.min(parseTimeToMinutes(config.morningEnd), dayCloseMins);

  const slots: string[] = [];

  if (mStartMins < mEndMins) {
    for (let t = mStartMins; t <= mEndMins - duration; t += duration) {
      slots.push(formatMinutesToTime(t));
    }
  }

  // Evening shift: start at max(eveningStart, dayOpenMins), end at min(eveningEnd, dayCloseMins)
  const eStartMins = Math.max(parseTimeToMinutes(config.eveningStart), dayOpenMins);
  const eEndMins = Math.min(parseTimeToMinutes(config.eveningEnd), dayCloseMins);

  if (eStartMins < eEndMins) {
    for (let t = eStartMins; t <= eEndMins - duration; t += duration) {
      slots.push(formatMinutesToTime(t));
    }
  }

  return slots;
}

// Fetch all appointments for a given date
export async function getAppointmentsByDate(dateStr: string): Promise<Appointment[]> {
  try {
    const altDate = dateStr.includes("-") ? dateStr.split("-").reverse().join("-") : dateStr;
    const dateList = Array.from(new Set([dateStr, altDate]));
    const q = query(
      collection(db, "appointments"),
      where("date", "in", dateList)
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

// Fetch recent appointments (walk-ins & online bookings) for quick registration linking
export async function getRecentAppointments(limitCount: number = 60): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, "appointments"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    const appointments: Appointment[] = [];
    snapshot.forEach((doc) => {
      appointments.push({ id: doc.id, ...doc.data() } as Appointment);
    });
    return appointments;
  } catch (error) {
    console.warn("Fallback fetching recent appointments without index:", error);
    try {
      const snap = await getDocs(collection(db, "appointments"));
      const appointments: Appointment[] = [];
      snap.forEach((doc) => {
        appointments.push({ id: doc.id, ...doc.data() } as Appointment);
      });
      appointments.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      return appointments.slice(0, limitCount);
    } catch {
      return [];
    }
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
    const sanitizedBooking = {
      patientName: booking.patientName || "Patient",
      patientEmail: booking.patientEmail || "",
      patientPhone: booking.patientPhone || "",
      patientAddress: booking.patientAddress || "",
      serviceId: booking.serviceId || "General Physiotherapy Consultation",
      date: booking.date,
      slot: booking.slot,
      notes: booking.notes || "",
      status: "pending",
      type: "online",
      createdAt: Timestamp.now()
    };
    await addDoc(appointmentsRef, sanitizedBooking);

    // 4. Trigger Automated Email Notifications (Patient Acknowledgement + Clinic Desk Alert)
    try {
      const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com");
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BOOKING_RECEIVED",
          payload: {
            patientName: sanitizedBooking.patientName,
            patientEmail: sanitizedBooking.patientEmail,
            patientPhone: sanitizedBooking.patientPhone,
            serviceId: sanitizedBooking.serviceId,
            date: sanitizedBooking.date,
            slot: sanitizedBooking.slot,
            notes: sanitizedBooking.notes,
            notifyAdmin: true,
          },
        }),
      }).catch((err) => {
        console.warn("[Booking Email] Failed to dispatch booking received email:", err);
      });
    } catch (e) {
      console.warn("[Booking Email] Error triggering email:", e);
    }

    // 5. Trigger Automated WhatsApp Notification to Patient
    if (sanitizedBooking.patientPhone) {
      try {
        const baseUrl = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_APP_URL || "https://www.gaitphysioclinic.com");
        fetch(`${baseUrl}/api/whatsapp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "BOOKING_RECEIVED",
            payload: {
              patientName: sanitizedBooking.patientName,
              patientPhone: sanitizedBooking.patientPhone,
              serviceName: sanitizedBooking.serviceId,
              date: sanitizedBooking.date,
              slot: sanitizedBooking.slot,
            },
          }),
        }).catch((err) => {
          console.warn("[Booking WhatsApp] Failed to dispatch booking WhatsApp notification:", err);
        });
      } catch (e) {
        console.warn("[Booking WhatsApp] Error triggering WhatsApp:", e);
      }
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Error submitting appointment: ", error);
    const msg = error instanceof Error ? error.message : "An unexpected database error occurred. Please try again.";
    return { success: false, error: msg };
  }
}
