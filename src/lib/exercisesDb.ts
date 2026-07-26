import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
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
  exercises: PrescribedExercise[];
  generalNotes: string;
  updatedAt?: Timestamp;
}

// Extract YouTube ID from various YouTube URL formats
export function extractYoutubeId(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url.trim();
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
    youtubeUrl: "https://www.youtube.com/watch?v=A8vN0U4z-80",
    youtubeId: "A8vN0U4z-80",
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

// Save or update active prescription for a patient
export async function savePatientPrescription(
  patientId: string, 
  exercises: PrescribedExercise[], 
  generalNotes: string
): Promise<void> {
  const docRef = doc(db, "prescriptions", patientId);
  const dateFormatted = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  
  const payload: PatientPrescription = {
    patientId,
    prescribedAt: Timestamp.now(),
    prescribedDateFormatted: dateFormatted,
    exercises,
    generalNotes
  };

  await setDoc(docRef, payload);
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
