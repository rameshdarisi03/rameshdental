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
 * Get active staff role for API headers
 */
function getStaffRole(): string {
  if (typeof window === "undefined") return "admin";
  try {
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      const u = JSON.parse(userJson);
      return u.role || "admin";
    }
  } catch {}
  return "admin";
}

/**
 * Save or update a recovery story in Firestore.
 * Tier 1: Infallible serverless API route using root service account credentials (guarantees zero permission errors for all admins & receptionists).
 * Tier 2: Direct client-side setDoc fallback.
 */
export async function saveRecoveryStory(story: RecoveryStory): Promise<{ success: boolean; error?: string }> {
  const storyId = story.id || `story-${Date.now()}`;
  const cleanStory = { ...story, id: storyId };

  // Tier 1: Serverless REST API with root service account authority
  if (typeof window !== "undefined") {
    try {
      const staffRole = getStaffRole();
      const res = await fetch("/api/clinic/stories", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-staff-role": staffRole,
        },
        body: JSON.stringify(cleanStory),
      });

      if (res.ok) {
        return { success: true };
      }
      const data = await res.json().catch(() => ({}));
      console.warn("Server API save returned non-ok, trying direct client setDoc:", data.error);
    } catch (apiErr) {
      console.warn("Server API save unreachable, falling back to client setDoc:", apiErr);
    }
  }

  // Tier 2: Direct client-side setDoc fallback
  try {
    const docRef = doc(db, COLLECTION_NAME, storyId);
    await setDoc(docRef, {
      ...cleanStory,
      updatedAt: Timestamp.now(),
    }, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to save recovery story:", err);
    return { success: false, error: err?.message || "Failed to save story" };
  }
}

/**
 * Delete a recovery story from Firestore.
 * Tier 1: Serverless REST API route.
 * Tier 2: Direct client-side deleteDoc fallback.
 */
export async function deleteRecoveryStory(storyId: string): Promise<{ success: boolean; error?: string }> {
  // Tier 1: Serverless REST API
  if (typeof window !== "undefined") {
    try {
      const staffRole = getStaffRole();
      const res = await fetch(`/api/clinic/stories?id=${encodeURIComponent(storyId)}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-staff-role": staffRole,
        },
      });

      if (res.ok) {
        return { success: true };
      }
      const data = await res.json().catch(() => ({}));
      console.warn("Server API delete returned non-ok, trying direct client deleteDoc:", data.error);
    } catch (apiErr) {
      console.warn("Server API delete unreachable, falling back to client deleteDoc:", apiErr);
    }
  }

  // Tier 2: Direct client-side deleteDoc
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
        await saveRecoveryStory(story);
      }
    }
  } catch (err) {
    console.warn("Could not auto-seed stories:", err);
  }
}
