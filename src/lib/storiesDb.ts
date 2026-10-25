import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp 
} from "firebase/firestore";
import { recoveryStories as defaultStories, RecoveryStory } from "@/data/stories";

const COLLECTION_NAME = "recovery_stories";

/**
 * Fetch all recovery stories from Firestore with seamless fallback to static defaults
 */
export async function getRecoveryStories(): Promise<RecoveryStory[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("order", "asc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecoveryStory));
    }
  } catch (err) {
    console.warn("Using default recovery stories fallback:", err);
  }
  return defaultStories;
}

/**
 * Real-time subscription to recovery stories
 */
export function subscribeRecoveryStories(callback: (stories: RecoveryStory[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("order", "asc"));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecoveryStory)));
      } else {
        callback(defaultStories);
      }
    }, (err) => {
      console.warn("Real-time stories subscription fallback:", err);
      callback(defaultStories);
    });
  } catch (err) {
    console.warn("Failed setting up stories listener, using static defaults:", err);
    callback(defaultStories);
    return () => {};
  }
}

/**
 * Save or update a recovery story in Firestore
 */
export async function saveRecoveryStory(story: RecoveryStory): Promise<{ success: boolean; error?: string }> {
  try {
    const storyId = story.id || `story-${Date.now()}`;
    const docRef = doc(db, COLLECTION_NAME, storyId);
    await setDoc(docRef, {
      ...story,
      id: storyId,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to save recovery story:", err);
    return { success: false, error: err?.message || "Failed to save story" };
  }
}

/**
 * Delete a recovery story from Firestore
 */
export async function deleteRecoveryStory(storyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, COLLECTION_NAME, storyId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err: any) {
    console.error("Failed to delete recovery story:", err);
    return { success: false, error: err?.message || "Failed to delete story" };
  }
}

/**
 * Seed initial stories into Firestore if collection is empty
 */
export async function seedDefaultStoriesIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    if (snap.empty) {
      for (const story of defaultStories) {
        await setDoc(doc(db, COLLECTION_NAME, story.id), {
          ...story,
          createdAt: Timestamp.now(),
        });
      }
      console.log("[Recovery Stories] Seeded initial 5 clinical stories into Firestore");
    }
  } catch (err) {
    console.warn("[Recovery Stories] Seed check note:", err);
  }
}
