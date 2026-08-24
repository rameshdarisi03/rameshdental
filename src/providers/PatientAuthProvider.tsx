"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  onAuthStateChanged, 
  User, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Patient } from "@/lib/patientsDb";

interface PendingGoogleUser {
  email: string;
  uid: string;
  displayName: string;
}

interface PatientAuthContextType {
  user: User | null;
  patient: Patient | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  pendingGoogle: PendingGoogleUser | null;
  setPendingGoogle: (p: PendingGoogleUser | null) => void;
  loginWithGoogle: () => Promise<{ success: boolean; needsActivation?: boolean; error?: string }>;
  linkGoogleWithActivationCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithCode: (email: string, pass: string, code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const PatientAuthContext = createContext<PatientAuthContextType>({
  user: null,
  patient: null,
  loading: true,
  error: null,
  setError: () => {},
  pendingGoogle: null,
  setPendingGoogle: () => {},
  loginWithGoogle: async () => ({ success: false }),
  linkGoogleWithActivationCode: async () => ({ success: false }),
  loginWithEmail: async () => ({ success: false }),
  signUpWithCode: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export const usePatientAuth = () => useContext(PatientAuthContext);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleUser | null>(null);

  // Helper: Find Patient Record in Cloud Firestore
  const lookupPatientDoc = async (fbUser: User): Promise<any | null> => {
    try {
      // 1. Match exact email
      if (fbUser.email) {
        const q1 = query(collection(db, "patients"), where("email", "==", fbUser.email));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) return snap1.docs[0];

        const q2 = query(collection(db, "patients"), where("email", "==", fbUser.email.toLowerCase().trim()));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) return snap2.docs[0];
      }

      // 2. Match authUid
      if (fbUser.uid) {
        const q3 = query(collection(db, "patients"), where("authUid", "==", fbUser.uid));
        const snap3 = await getDocs(q3);
        if (!snap3.empty) return snap3.docs[0];
      }

      // 3. Fallback scan all patients
      if (fbUser.email) {
        const allSnap = await getDocs(collection(db, "patients"));
        const target = fbUser.email.trim().toLowerCase();
        for (const d of allSnap.docs) {
          const emailVal = d.data().email;
          if (emailVal && emailVal.trim().toLowerCase() === target) {
            return d;
          }
        }
      }
    } catch (e) {
      console.warn("Patient lookup warning:", e);
    }
    return null;
  };

  // Helper: Initialize explicit browser storage persistence (TenoPilot pattern)
  const ensureLocalPersistence = async () => {
    try {
      if (typeof window !== "undefined") {
        await setPersistence(auth, browserLocalPersistence);
      }
    } catch {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch {}
    }
  };

  // Central Initializer: runs ONCE on app mount
  useEffect(() => {
    // 1. Instant Fast Path from Local Storage Cache (0ms render)
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("gpc_patient");
        if (cached) {
          const parsed = JSON.parse(cached);
          setPatient(parsed);
          setLoading(false);
        }
      } catch (e) {}
    }

    ensureLocalPersistence();

    // 2. Single Unified Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Look up verified patient in Firestore
        const docSnap = await lookupPatientDoc(currentUser);
        if (docSnap) {
          const patientData = { id: docSnap.id, ...docSnap.data() } as Patient;
          setPatient(patientData);
          if (typeof window !== "undefined") {
            localStorage.setItem("gpc_patient", JSON.stringify(patientData));
          }
        } else {
          // User authenticated with Firebase, but no linked clinic profile found
          if (typeof window !== "undefined") {
            const cached = localStorage.getItem("gpc_patient");
            if (!cached) {
              setPatient(null);
            }
          }
        }
      } else {
        setPatient(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("gpc_patient");
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Action: Google OAuth Sign-In
  const loginWithGoogle = async (): Promise<{ success: boolean; needsActivation?: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    await ensureLocalPersistence();

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const matchedDoc = await lookupPatientDoc(fbUser);
      if (!matchedDoc) {
        // Not linked yet: Prompt for Activation Code
        setPendingGoogle({
          email: fbUser.email || "",
          uid: fbUser.uid,
          displayName: fbUser.displayName || "Patient"
        });
        setLoading(false);
        return { success: false, needsActivation: true };
      }

      // Existing Patient linked: Update UID link
      const patientData = { id: matchedDoc.id, ...matchedDoc.data() } as Patient;
      await updateDoc(doc(db, "patients", matchedDoc.id), {
        authUid: fbUser.uid,
        activated: true
      });

      patientData.authUid = fbUser.uid;
      patientData.activated = true;

      setPatient(patientData);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Google login error:", err);
      setLoading(false);
      if (err.code === "auth/popup-closed-by-user") {
        return { success: false, error: "Google Sign-In was cancelled." };
      }
      const msg = err.message || "Failed to sign in with Google.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Action: Link Google Account with Activation Code
  const linkGoogleWithActivationCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!code || !pendingGoogle) {
      const msg = "Please enter a valid activation code.";
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);

    try {
      const cleanCode = code.trim().toUpperCase();
      let matchedDoc: any = null;

      const q = query(collection(db, "patients"), where("activationCode", "==", cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else {
        const allSnap = await getDocs(collection(db, "patients"));
        for (const d of allSnap.docs) {
          const data = d.data();
          if (data.activationCode?.trim().toUpperCase() === cleanCode || d.id.toUpperCase() === cleanCode) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc) {
        setLoading(false);
        const msg = "Invalid activation code. Please check with the clinic reception.";
        setError(msg);
        return { success: false, error: msg };
      }

      const patientData = {
        ...matchedDoc.data(),
        id: matchedDoc.id,
        email: pendingGoogle.email.toLowerCase().trim(),
        authUid: pendingGoogle.uid,
        activated: true
      } as Patient;

      await updateDoc(doc(db, "patients", matchedDoc.id), {
        email: pendingGoogle.email.toLowerCase().trim(),
        authUid: pendingGoogle.uid,
        activated: true,
        activationCode: ""
      });

      setPatient(patientData);
      setPendingGoogle(null);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Link Google error:", err);
      setLoading(false);
      const msg = err.message || "Failed to link Google account.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Action: Email & Password Sign-In
  const loginWithEmail = async (emailStr: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    await ensureLocalPersistence();

    try {
      const cred = await signInWithEmailAndPassword(auth, emailStr.trim(), pass);
      const matchedDoc = await lookupPatientDoc(cred.user);

      if (!matchedDoc) {
        await signOut(auth);
        setLoading(false);
        const msg = "This email is not registered as a patient. Please sign up with your activation code.";
        setError(msg);
        return { success: false, error: msg };
      }

      const patientData = { id: matchedDoc.id, ...matchedDoc.data() } as Patient;
      if (!patientData.authUid) {
        await updateDoc(doc(db, "patients", matchedDoc.id), {
          authUid: cred.user.uid,
          activated: true
        });
        patientData.authUid = cred.user.uid;
      }

      setPatient(patientData);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Email login error:", err);
      setLoading(false);
      let msg = "Invalid email or password.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        msg = "Invalid email or password. Please verify and try again.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Action: Sign Up with Activation Code
  const signUpWithCode = async (
    emailStr: string, 
    pass: string, 
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    await ensureLocalPersistence();

    try {
      const cleanCode = code.trim().toUpperCase();
      let matchedDoc: any = null;

      const q = query(collection(db, "patients"), where("activationCode", "==", cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else {
        const allSnap = await getDocs(collection(db, "patients"));
        for (const d of allSnap.docs) {
          const data = d.data();
          if (data.activationCode?.trim().toUpperCase() === cleanCode || d.id.toUpperCase() === cleanCode) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc) {
        setLoading(false);
        const msg = "Invalid activation code. Please check with your clinic receptionist.";
        setError(msg);
        return { success: false, error: msg };
      }

      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, emailStr.trim(), pass);

      const patientData = {
        ...matchedDoc.data(),
        id: matchedDoc.id,
        email: emailStr.trim().toLowerCase(),
        authUid: cred.user.uid,
        activated: true
      } as Patient;

      await updateDoc(doc(db, "patients", matchedDoc.id), {
        email: emailStr.trim().toLowerCase(),
        authUid: cred.user.uid,
        activated: true,
        activationCode: ""
      });

      setPatient(patientData);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Signup error:", err);
      setLoading(false);
      let msg = "Sign up failed.";
      if (err.code === "auth/email-already-in-use") {
        msg = "This email is already registered. Please sign in instead.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Action: Safe Global Logout (TenoPilot pattern)
  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gpc_patient");
      }
      setPatient(null);
      setUser(null);
      await signOut(auth);
    } catch (e) {
      console.warn("Signout warning:", e);
    } finally {
      if (typeof window !== "undefined") {
        window.location.href = "/patienthub/login";
      }
    }
  };

  // Action: Refresh patient profile
  const refreshProfile = async () => {
    if (!user) return;
    const docSnap = await lookupPatientDoc(user);
    if (docSnap) {
      const patientData = { id: docSnap.id, ...docSnap.data() } as Patient;
      setPatient(patientData);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
      }
    }
  };

  return (
    <PatientAuthContext.Provider
      value={{
        user,
        patient,
        loading,
        error,
        setError,
        pendingGoogle,
        setPendingGoogle,
        loginWithGoogle,
        linkGoogleWithActivationCode,
        loginWithEmail,
        signUpWithCode,
        logout,
        refreshProfile
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
}
