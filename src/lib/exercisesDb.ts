import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from "firebase/firestore";

export interface ExerciseItem {
  id: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  duration: string;
  category: string;
  tags: string[];
  defaultSets: number;
  defaultReps: string;
  createdAt?: Timestamp;
}

export interface PrescribedExercise {
  exerciseId: string;
  title: string;
  youtubeUrl: string;
  youtubeId: string;
  sets: number;
  repsOrHold: string;
  category: string;
  tags: string[];
}

export interface PatientPrescription {
  patientId: string;
  prescribedAt: Timestamp;
  prescribedDateFormatted: string;
  durationDays?: number; // e.g. 7, 14, 21, 30
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  exercises: PrescribedExercise[];
  generalNotes: string;
  updatedAt?: Timestamp;
}

export interface DailyWorkoutLog {
  date: string; // YYYY-MM-DD
  completedExerciseIds: string[];
  totalExercises: number;
  isFullyCompleted: boolean;
  updatedAt: string;
}

export interface PatientWorkoutProgress {
  patientId: string;
  startDate: string;
  durationDays: number;
  endDate: string;
  currentDayNumber: number; // 1-indexed (e.g. Day 3 of 14)
  completedDaysCount: number;
  adherencePercent: number;
  streakDays: number;
  todayCompletedCount: number;
  todayTotalCount: number;
  todayIsCompleted: boolean;
  dailyLogs: Record<string, DailyWorkoutLog>;
}

// Helper function to return local date string in YYYY-MM-DD format (timezone-safe)
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to calculate the specific YYYY-MM-DD date for a program day index (0 = Day 1)
export function getProgramDayDateString(startDateStr: string, dayIndex: number): string {
  if (!startDateStr) return getLocalDateString();
  const parts = startDateStr.split("-").map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return getLocalDateString();
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + dayIndex);
  return getLocalDateString(d);
}

// Extract YouTube ID from various YouTube URL formats (watch, shorts, embed, mobile links)
export function extractYoutubeId(url: string): string {
  if (!url) return "";
  const cleanUrl = url.trim();
  
  // Handles standard 11 character ID directly
  if (cleanUrl.length === 11 && !cleanUrl.includes("/") && !cleanUrl.includes(".")) {
    return cleanUrl;
  }

  // Regular expressions for youtube links, shorts, embeds, and mobile links
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = cleanUrl.match(regExp);
  
  if (match && match[1]) {
    return match[1];
  }
  
  return cleanUrl;
}

// Seed default exercises if collection is empty
const INITIAL_EXERCISES: Omit<ExerciseItem, "id">[] = [
  {
    title: "Wall Slides with Foam Roller",
    youtubeUrl: "https://www.youtube.com/watch?v=wD7V2F3eRns",
    youtubeId: "wD7V2F3eRns",
    duration: "0:45",
    category: "Shoulder",
    tags: ["SHOULDER", "MOBILITY"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Dead Bug (Level 1)",
    youtubeUrl: "https://www.youtube.com/watch?v=g_BYB0R-4Ws",
    youtubeId: "g_BYB0R-4Ws",
    duration: "1:12",
    category: "Core Stability",
    tags: ["CORE", "LUMBAR"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Single Leg Bridge",
    youtubeUrl: "https://www.youtube.com/watch?v=0k5G6F0mY7g",
    youtubeId: "0k5G6F0mY7g",
    duration: "0:30",
    category: "Hip",
    tags: ["HIP", "STRENGTH"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Banded Monster Walk",
    youtubeUrl: "https://www.youtube.com/watch?v=0k5G6F0mY7g",
    youtubeId: "0k5G6F0mY7g",
    duration: "0:55",
    category: "Hip",
    tags: ["HIP", "RESISTANCE"],
    defaultSets: 3,
    defaultReps: "12"
  },
  {
    title: "Eccentric Calf Raise",
    youtubeUrl: "https://www.youtube.com/watch?v=L8V8yW1cM8g",
    youtubeId: "L8V8yW1cM8g",
    duration: "1:05",
    category: "Ankle & Foot",
    tags: ["ANKLE", "ECCENTRIC"],
    defaultSets: 3,
    defaultReps: "15"
  },
  {
    title: "Chin Tucks (Supine)",
    youtubeUrl: "https://www.youtube.com/watch?v=3R1tA4S0y4k",
    youtubeId: "3R1tA4S0y4k",
    duration: "0:38",
    category: "Cervical (Neck)",
    tags: ["CERVICAL", "POSTURE"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Scapular Retractions",
    youtubeUrl: "https://www.youtube.com/watch?v=4Yv-pQ2m1Wk",
    youtubeId: "4Yv-pQ2m1Wk",
    duration: "0:42",
    category: "Upper Back",
    tags: ["UPPER BACK", "POSTURE"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Isometric Cervical Flexion",
    youtubeUrl: "https://www.youtube.com/watch?v=5V9xW2m9P7k",
    youtubeId: "5V9xW2m9P7k",
    duration: "0:50",
    category: "Cervical (Neck)",
    tags: ["CERVICAL", "ISOMETRIC"],
    defaultSets: 3,
    defaultReps: "10"
  },
  {
    title: "Biceps Curl Stretch & Control",
    youtubeUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
    youtubeId: "ykJmrZ5v0Oo",
    duration: "1:00",
    category: "Biceps",
    tags: ["BICEPS", "STRENGTH"],
    defaultSets: 3,
    defaultReps: "12"
  },
  {
    title: "Hamstring Wall Stretch",
    youtubeUrl: "https://www.youtube.com/watch?v=2L24Z8V1vWg",
    youtubeId: "2L24Z8V1vWg",
    duration: "1:15",
    category: "Hamstrings",
    tags: ["HAMSTRINGS", "FLEXIBILITY"],
    defaultSets: 3,
    defaultReps: "10"
  }
];

// Fetch all exercises from Firestore
export async function getExerciseLibrary(): Promise<ExerciseItem[]> {
  try {
    const colRef = collection(db, "exercise_library");
    const snap = await getDocs(colRef);
    
    if (snap.empty) {
      // Seed default exercises
      const seeded: ExerciseItem[] = [];
      for (const item of INITIAL_EXERCISES) {
        const newDocRef = doc(colRef);
        const data: ExerciseItem = {
          ...item,
          id: newDocRef.id,
          createdAt: Timestamp.now()
        };
        await setDoc(newDocRef, data);
        seeded.push(data);
      }
      return seeded;
    }

    const items: ExerciseItem[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as ExerciseItem);
    });
    return items;
  } catch (err) {
    console.error("Error fetching exercise library:", err);
    // Return fallback items in case of offline/error
    return INITIAL_EXERCISES.map((ex, idx) => ({ ...ex, id: `ex-${idx}` }));
  }
}

// Add a new exercise to library
export async function addExerciseToLibrary(
  exercise: Omit<ExerciseItem, "id" | "createdAt">
): Promise<ExerciseItem> {
  const colRef = collection(db, "exercise_library");
  const newDocRef = doc(colRef);
  const data: ExerciseItem = {
    ...exercise,
    id: newDocRef.id,
    createdAt: Timestamp.now()
  };
  await setDoc(newDocRef, data);
  return data;
}

// Delete an exercise from library
export async function deleteExerciseFromLibrary(id: string): Promise<void> {
  const docRef = doc(db, "exercise_library", id);
  await deleteDoc(docRef);
}

// Update an existing exercise in library and immediately propagate changes to all active patient prescriptions
export async function updateExerciseInLibrary(
  id: string,
  updatedFields: Partial<Omit<ExerciseItem, "id">>
): Promise<void> {
  const docRef = doc(db, "exercise_library", id);
  await updateDoc(docRef, updatedFields);

  // Propagate updated YouTube link, title, and metadata to all patient prescriptions in real time
  try {
    const prescriptionsRef = collection(db, "prescriptions");
    const snap = await getDocs(prescriptionsRef);

    for (const docSnap of snap.docs) {
      const pData = docSnap.data() as PatientPrescription;
      if (!pData.exercises || !Array.isArray(pData.exercises)) continue;

      let hasUpdated = false;
      const updatedExercises = pData.exercises.map((exItem) => {
        if (exItem.exerciseId === id) {
          hasUpdated = true;
          return {
            ...exItem,
            title: updatedFields.title ?? exItem.title,
            youtubeUrl: updatedFields.youtubeUrl ?? exItem.youtubeUrl,
            youtubeId: updatedFields.youtubeId ?? exItem.youtubeId,
            category: updatedFields.category ?? exItem.category,
            tags: updatedFields.tags ?? exItem.tags
          };
        }
        return exItem;
      });

      if (hasUpdated) {
        await updateDoc(doc(db, "prescriptions", docSnap.id), {
          exercises: updatedExercises,
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (err) {
    console.error("Error syncing exercise update to patient prescriptions:", err);
  }
}

// Fetch active prescription for a patient
export async function getPatientPrescription(patientId: string): Promise<PatientPrescription | null> {
  try {
    const docRef = doc(db, "prescriptions", patientId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as PatientPrescription;
    }
    return null;
  } catch (err) {
    console.error("Error fetching patient prescription:", err);
    return null;
  }
}

// Subscribe to active prescription for a patient in real time
export function subscribePatientPrescription(
  patientId: string,
  callback: (prescription: PatientPrescription | null) => void
): () => void {
  const docRef = doc(db, "prescriptions", patientId);
  return onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as PatientPrescription);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error("Error subscribing to patient prescription:", err);
  });
}

// Subscribe to live exercise library in real time
export function subscribeExerciseLibrary(
  callback: (library: ExerciseItem[]) => void
): () => void {
  const colRef = collection(db, "exercise_library");
  return onSnapshot(colRef, (snap) => {
    const exercises: ExerciseItem[] = [];
    snap.forEach((docSnap) => {
      exercises.push({ id: docSnap.id, ...docSnap.data() } as ExerciseItem);
    });
    callback(exercises);
  }, (err) => {
    console.error("Error subscribing to exercise library:", err);
  });
}

// Save or update active prescription for a patient with duration
export async function savePatientPrescription(
  patientId: string, 
  exercises: PrescribedExercise[], 
  generalNotes: string,
  durationDays: number = 14,
  customStartDate?: string
): Promise<void> {
  const docRef = doc(db, "prescriptions", patientId);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const startDateStr = customStartDate || `${yyyy}-${mm}-${dd}`;

  // Calculate end date
  const endObj = new Date(now);
  endObj.setDate(endObj.getDate() + durationDays);
  const endYyyy = endObj.getFullYear();
  const endMm = String(endObj.getMonth() + 1).padStart(2, "0");
  const endDd = String(endObj.getDate()).padStart(2, "0");
  const endDateStr = `${endYyyy}-${endMm}-${endDd}`;
  
  const payload: PatientPrescription = {
    patientId,
    prescribedAt: Timestamp.now(),
    prescribedDateFormatted: dateFormatted,
    durationDays,
    startDate: startDateStr,
    endDate: endDateStr,
    exercises,
    generalNotes
  };

  // 1. Update active prescription
  await setDoc(docRef, payload);

  // 2. Also archive in patient's prescriptions history subcollection
  try {
    const historyCol = collection(db, "patients", patientId, "prescriptions");
    await addDoc(historyCol, payload);
  } catch (historyErr) {
    console.warn("Could not archive prescription to patient subcollection:", historyErr);
  }
}

// Fetch all historical prescriptions for a patient
export async function getPatientPrescriptionsHistory(patientId: string): Promise<PatientPrescription[]> {
  try {
    const colRef = collection(db, "patients", patientId, "prescriptions");
    const q = query(colRef, orderBy("prescribedAt", "desc"));
    const snap = await getDocs(q);
    const list: PatientPrescription[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as any);
    });
    return list;
  } catch (err) {
    console.error("Error fetching prescriptions history:", err);
    return [];
  }
}

// Remove an individual exercise from active prescription or clear all
export async function removePrescribedExercise(patientId: string, exerciseIdToRemove?: string): Promise<void> {
  const docRef = doc(db, "prescriptions", patientId);
  if (!exerciseIdToRemove) {
    // Delete whole prescription
    await deleteDoc(docRef);
    return;
  }

  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as PatientPrescription;
    const updated = data.exercises.filter(ex => ex.exerciseId !== exerciseIdToRemove);
    if (updated.length === 0) {
      await deleteDoc(docRef);
    } else {
      await updateDoc(docRef, { exercises: updated });
    }
  }
}

// Toggle an individual exercise completion for today or a specific date
export async function toggleExerciseDailyCompletion(
  patientId: string,
  exerciseId: string,
  totalExercisesCount: number,
  targetDate?: string
): Promise<{ completed: boolean; allDone: boolean }> {
  const todayStr = targetDate || getLocalDateString();
  
  // 1. Read existing logs from LocalStorage cache first for instant sync
  let currentLogs: Record<string, DailyWorkoutLog> = {};
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`gpc_workout_progress_${patientId}`);
      if (cached) currentLogs = JSON.parse(cached);
    } catch {}
  }

  // 2. Fetch latest from Firestore top-level collection
  const progressDocRef = doc(db, "exercise_progress", patientId);
  try {
    const snap = await getDoc(progressDocRef);
    if (snap.exists()) {
      const data = snap.data();
      currentLogs = { ...currentLogs, ...(data.dailyLogs || {}) };
    }
  } catch (err) {
    console.warn("Could not read exercise_progress from firestore, using cached state:", err);
  }

  const todayLog = currentLogs[todayStr] || {
    date: todayStr,
    completedExerciseIds: [],
    totalExercises: totalExercisesCount,
    isFullyCompleted: false,
    updatedAt: new Date().toISOString()
  };

  const isAlreadyDone = todayLog.completedExerciseIds.includes(exerciseId);
  const updatedIds = isAlreadyDone
    ? todayLog.completedExerciseIds.filter(id => id !== exerciseId)
    : [...todayLog.completedExerciseIds, exerciseId];

  const isFullyCompleted = updatedIds.length >= totalExercisesCount && totalExercisesCount > 0;

  currentLogs[todayStr] = {
    date: todayStr,
    completedExerciseIds: updatedIds,
    totalExercises: totalExercisesCount,
    isFullyCompleted,
    updatedAt: new Date().toISOString()
  };

  // 3. Immediately persist to LocalStorage
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`gpc_workout_progress_${patientId}`, JSON.stringify(currentLogs));
    } catch {}
  }

  // 4. Save to Firestore root collection
  try {
    await setDoc(progressDocRef, {
      patientId,
      dailyLogs: currentLogs,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  } catch (err) {
    console.error("Failed to write to exercise_progress collection:", err);
  }

  // 5. Try syncing to patient subcollection as backup
  try {
    const subDocRef = doc(db, "patients", patientId, "exerciseProgress", "current");
    await setDoc(subDocRef, {
      dailyLogs: currentLogs,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  } catch {}

  return {
    completed: !isAlreadyDone,
    allDone: isFullyCompleted
  };
}

// Subscribe to patient's real-time workout progress
export function subscribePatientWorkoutProgress(
  patientId: string,
  prescription: PatientPrescription | null,
  callback: (progress: PatientWorkoutProgress) => void
): () => void {
  const calculateMetrics = (dailyLogs: Record<string, DailyWorkoutLog>): PatientWorkoutProgress => {
    const todayStr = getLocalDateString();
    const duration = prescription?.durationDays || 14;
    const startDate = prescription?.startDate || todayStr;
    const endDate = prescription?.endDate || todayStr;
    const totalExercises = prescription?.exercises?.length || 3;

    // Calculate current day number in the program
    const startMs = new Date(startDate).getTime();
    const todayMs = new Date(todayStr).getTime();
    const diffDays = Math.max(0, Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24)));
    const currentDayNumber = Math.min(duration, diffDays + 1);

    // Calculate completed days
    let completedDaysCount = 0;
    Object.values(dailyLogs).forEach(log => {
      if (log.isFullyCompleted) {
        completedDaysCount++;
      }
    });

    const adherencePercent = Math.min(100, Math.round((completedDaysCount / duration) * 100));

    // Today's stats
    const todayLog = dailyLogs[todayStr];
    const todayCompletedCount = todayLog?.completedExerciseIds?.length || 0;
    const todayIsCompleted = todayLog?.isFullyCompleted || false;

    // Calculate active streak
    let streakDays = 0;
    const checkDate = new Date();
    for (let i = 0; i < 60; i++) {
      const dStr = getLocalDateString(checkDate);
      const log = dailyLogs[dStr];
      if (log && log.isFullyCompleted) {
        streakDays++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      patientId,
      startDate,
      durationDays: duration,
      endDate,
      currentDayNumber,
      completedDaysCount,
      adherencePercent,
      streakDays,
      todayCompletedCount,
      todayTotalCount: totalExercises,
      todayIsCompleted,
      dailyLogs
    };
  };

  // 1. Send immediate metrics from localStorage cache
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`gpc_workout_progress_${patientId}`);
      if (cached) {
        callback(calculateMetrics(JSON.parse(cached)));
      }
    } catch {}
  }

  // 2. Listen to Firestore root collection
  const progressDocRef = doc(db, "exercise_progress", patientId);

  return onSnapshot(progressDocRef, (snap) => {
    let dailyLogs: Record<string, DailyWorkoutLog> = {};
    if (snap.exists()) {
      dailyLogs = snap.data().dailyLogs || {};
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`gpc_workout_progress_${patientId}`, JSON.stringify(dailyLogs));
        } catch {}
      }
    } else {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(`gpc_workout_progress_${patientId}`);
          if (cached) dailyLogs = JSON.parse(cached);
        } catch {}
      }
    }

    callback(calculateMetrics(dailyLogs));
  }, (err) => {
    console.warn("Firestore snapshot on exercise_progress failed, keeping cached:", err);
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`gpc_workout_progress_${patientId}`);
        if (cached) callback(calculateMetrics(JSON.parse(cached)));
      } catch {}
    }
  });
}
