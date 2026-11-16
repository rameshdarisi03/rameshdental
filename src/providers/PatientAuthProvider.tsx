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
  signInWithCustomToken,
  setPersistence,
  browserLocalPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { 
  Patient, 
  createPatient, 
  linkPatientsInFamilyCircle, 
  getFamilyMembers,
  FamilyRelationship 
} from "@/lib/patientsDb";
import { sanitizePhone } from "@/lib/sanitizer";

interface PendingGoogleUser {
  email: string;
  uid: string;
  displayName: string;
}

interface PatientAuthContextType {
  user: User | null;
  patient: Patient | null;
  availableProfiles: Patient[];
  activeProfileId: string | null;
  selectProfile: (patientId: string) => void;
  showProfileSelector: boolean;
  setShowProfileSelector: (show: boolean) => void;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  pendingGoogle: PendingGoogleUser | null;
  setPendingGoogle: (p: PendingGoogleUser | null) => void;
  loginWithGoogle: () => Promise<{ success: boolean; needsActivation?: boolean; error?: string }>;
  linkGoogleWithActivationCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithCode: (email: string, pass: string, code: string) => Promise<{ success: boolean; error?: string }>;
  loginWithPhoneOtp: (customToken: string, phoneDigits: string, initialProfiles?: Patient[]) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  addFamilyMemberProfile: (data: {
    name: string;
    relationship: FamilyRelationship;
    age?: string | number;
    gender?: string;
    phone?: string;
    email?: string;
  }) => Promise<{ success: boolean; error?: string; patient?: Patient }>;
  linkExistingProfileByPid: (pid: string, phoneOrCode: string) => Promise<{ success: boolean; error?: string }>;
}

const PatientAuthContext = createContext<PatientAuthContextType>({
  user: null,
  patient: null,
  availableProfiles: [],
  activeProfileId: null,
  selectProfile: () => {},
  showProfileSelector: false,
  setShowProfileSelector: () => {},
  loading: true,
  error: null,
  setError: () => {},
  pendingGoogle: null,
  setPendingGoogle: () => {},
  loginWithGoogle: async () => ({ success: false }),
  linkGoogleWithActivationCode: async () => ({ success: false }),
  loginWithEmail: async () => ({ success: false }),
  signUpWithCode: async () => ({ success: false }),
  loginWithPhoneOtp: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
  addFamilyMemberProfile: async () => ({ success: false }),
  linkExistingProfileByPid: async () => ({ success: false }),
});

export const usePatientAuth = () => useContext(PatientAuthContext);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

async function syncPatientActivation(payload: {
  patientId: string;
  authUid?: string;
  email?: string;
  activationCode?: string;
  linkedEmails?: string[];
  phone?: string;
}) {
  try {
    await fetch("/api/patient/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Server syncPatientActivation non-fatal:", err);
  }
}

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Patient[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingGoogle, setPendingGoogle] = useState<PendingGoogleUser | null>(null);

  // Helper: Find all matching Patient Profiles in Cloud Firestore for this user (Multi-Profile Family Circle)
  const lookupAllPatientProfiles = async (fbUser: User, phoneDigits?: string): Promise<Patient[]> => {
    try {
      const email = fbUser.email ? fbUser.email.trim().toLowerCase() : "";
      const uid = fbUser.uid;
      const storedPhone = phoneDigits || (typeof window !== "undefined" 
        ? (sessionStorage.getItem("gpc_auth_phone") || localStorage.getItem("gpc_auth_phone") || "") 
        : "");
      const cleanPhoneDigits = storedPhone.replace(/\D/g, "").slice(-10);

      // Tier 1: Infallible Serverless REST API lookup (bypasses all client Firestore security limits)
      try {
        const params = new URLSearchParams();
        if (cleanPhoneDigits) params.set("phone", cleanPhoneDigits);
        if (uid) params.set("uid", uid);
        if (email) params.set("email", email);

        const res = await fetch(`/api/patient/profiles?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.success && Array.isArray(data.profiles) && data.profiles.length > 0) {
            return data.profiles;
          }
        }
      } catch (apiErr) {
        console.warn("[lookupAllPatientProfiles] Serverless API lookup warning:", apiErr);
      }

      // Tier 2: Direct Document Lookup by UID (e.g. if fbUser.uid is the patient document ID)
      let all: Patient[] = [];
      if (uid) {
        try {
          const directDocSnap = await getDoc(doc(db, "patients", uid));
          if (directDocSnap.exists()) {
            all.push({ id: directDocSnap.id, ...directDocSnap.data() } as Patient);
          }
        } catch (e) {}
      }

      // Tier 3: Bulk and targeted queries
      if (all.length === 0) {
        try {
          const allPatientsSnap = await getDocs(collection(db, "patients"));
          all = allPatientsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Patient));
        } catch (err) {
          console.warn("Bulk patients read non-fatal, falling back to targeted queries:", err);
        }
      }

      if (all.length === 0) {
        if (email) {
          try {
            const emailSnap = await getDocs(query(collection(db, "patients"), where("email", "==", email)));
            emailSnap.docs.forEach((d) => all.push({ id: d.id, ...d.data() } as Patient));
          } catch (e) {}
        }
        if (uid) {
          try {
            const uidSnap = await getDocs(query(collection(db, "patients"), where("authUid", "==", uid)));
            uidSnap.docs.forEach((d) => {
              if (!all.some(p => p.id === d.id)) all.push({ id: d.id, ...d.data() } as Patient);
            });
          } catch (e) {}
        }
      }

      // Tier 4: Cache fallback
      if (all.length === 0 && typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("gpc_available_profiles");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) {}
      }

      // 1. Direct matches for this authenticated user
      const directMatches = all.filter((p) => {
        const pEmail = (p.email || "").trim().toLowerCase();
        const pLinked = (p.linkedEmails || []).map((e) => e.trim().toLowerCase());
        const pUid = p.authUid;
        const pPhoneDigits = (p.phone || "").replace(/\D/g, "").slice(-10);

        if (uid && (pUid === uid || p.id === uid)) return true;
        if (email && pEmail === email) return true;
        if (email && pLinked.includes(email)) return true;
        if (cleanPhoneDigits && pPhoneDigits && pPhoneDigits === cleanPhoneDigits) return true;
        return false;
      });

      if (directMatches.length === 0) {
        return [];
      }

      // Collect all familyGroupIds and primaryPatientIds from direct matches
      const familyGroupIds = new Set<string>();
      const patientIds = new Set<string>();

      directMatches.forEach((p) => {
        if (p.id) patientIds.add(p.id);
        if (p.familyGroupId) familyGroupIds.add(p.familyGroupId);
        if (p.primaryPatientId) patientIds.add(p.primaryPatientId);
      });

      // 2. Expand to all members in these family groups or sharing primaryPatientId
      const fullFamilyCircle = all.filter((p) => {
        if (p.id && patientIds.has(p.id)) return true;
        if (p.familyGroupId && familyGroupIds.has(p.familyGroupId)) return true;
        if (p.primaryPatientId && patientIds.has(p.primaryPatientId)) return true;
        return false;
      });

      // Dedup by patient.id
      const uniqueMap = new Map<string, Patient>();
      fullFamilyCircle.forEach((p) => {
        if (p.id) uniqueMap.set(p.id, p);
      });

      const list = Array.from(uniqueMap.values());

      // Activation Inheritance: If any member in the circle is activated, all inherit activation!
      const isAnyActivated = list.some((p) => p.activated === true);
      if (isAnyActivated) {
        list.forEach((p) => {
          if (p.activated !== true) {
            p.activated = true;
          }
        });
      }

      return list;
    } catch (e) {
      console.warn("Patient lookup warning:", e);
      return [];
    }
  };

  // Helper: Find single primary doc fallback
  const lookupPatientDoc = async (fbUser: User): Promise<any | null> => {
    const profiles = await lookupAllPatientProfiles(fbUser);
    if (profiles.length > 0) {
      return { id: profiles[0].id, data: () => profiles[0] };
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

  // Profile Selector Action
  const selectProfile = useCallback((patientId: string) => {
    const target = availableProfiles.find((p) => p.id === patientId);
    if (target) {
      setPatient(target);
      setActiveProfileId(target.id || null);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(target));
        if (target.id) {
          localStorage.setItem("gpc_active_patient_id", target.id);
        }
      }
      setShowProfileSelector(false);
    }
  }, [availableProfiles]);

  // Central Initializer: runs ONCE on app mount
  useEffect(() => {
    // 1. Instant Fast Path from Local Storage Cache (0ms render)
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("gpc_patient");
        const cachedProfiles = localStorage.getItem("gpc_available_profiles");
        const cachedActiveId = localStorage.getItem("gpc_active_patient_id");

        if (cached) {
          const parsed = JSON.parse(cached);
          setPatient(parsed);
          setActiveProfileId(parsed.id);
        }
        if (cachedProfiles) {
          setAvailableProfiles(JSON.parse(cachedProfiles));
        }
        if (cachedActiveId) {
          setActiveProfileId(cachedActiveId);
        }
        if (cached) {
          setLoading(false);
        }
      } catch (e) {}
    }

    ensureLocalPersistence();

    // 2. Single Unified Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Look up verified patient profiles in Firestore
        const profiles = await lookupAllPatientProfiles(currentUser);

        if (profiles.length > 0) {
          setAvailableProfiles(profiles);
          if (typeof window !== "undefined") {
            localStorage.setItem("gpc_available_profiles", JSON.stringify(profiles));
          }

          // Determine which profile is active
          const storedActiveId = typeof window !== "undefined" 
            ? localStorage.getItem("gpc_active_patient_id") 
            : null;

          let chosenProfile = profiles.find((p) => p.id === storedActiveId);
          if (!chosenProfile) {
            // Priority: Primary account owner, or direct email match, or first
            chosenProfile = profiles.find((p) => p.isPrimaryAccount) ||
                            profiles.find((p) => p.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
                            profiles[0];
          }

          // Check if clinic explicitly revoked or disabled access
          const isAccessRevoked = 
            (chosenProfile.status as string) === "inactive" || 
            (chosenProfile.status as string) === "revoked" ||
            (chosenProfile.status as string) === "suspended";

          if (isAccessRevoked) {
            setPatient(null);
            setAvailableProfiles([]);
            if (typeof window !== "undefined") {
              localStorage.removeItem("gpc_patient");
              localStorage.removeItem("gpc_available_profiles");
              localStorage.removeItem("gpc_active_patient_id");
            }
            await signOut(auth);
            setError("Your Patient Hub access has been disabled by the clinic.");
            return;
          }

          // Patient is valid! If newly logging in, ensure activated & linked
          if (chosenProfile.id && (!chosenProfile.activated || chosenProfile.authUid !== currentUser.uid)) {
            chosenProfile.activated = true;
            chosenProfile.authUid = currentUser.uid;
            syncPatientActivation({
              patientId: chosenProfile.id,
              authUid: currentUser.uid,
              email: currentUser.email || undefined,
            });
            updateDoc(doc(db, "patients", chosenProfile.id), {
              authUid: currentUser.uid,
              activated: true,
            }).catch(() => {});
          }

          setPatient(chosenProfile);
          setActiveProfileId(chosenProfile.id || null);
          if (typeof window !== "undefined") {
            localStorage.setItem("gpc_patient", JSON.stringify(chosenProfile));
            if (chosenProfile.id) {
              localStorage.setItem("gpc_active_patient_id", chosenProfile.id);
            }
          }

          // If account has > 1 profile, and this is the very first time entering in this browser session
          if (profiles.length > 1 && typeof window !== "undefined" && !sessionStorage.getItem("gpc_profile_selected_session")) {
            setShowProfileSelector(true);
            sessionStorage.setItem("gpc_profile_selected_session", "true");
          }
        } else {
          // No profile found yet for this currentUser
          setPatient(null);
          setAvailableProfiles([]);
          if (typeof window !== "undefined") {
            localStorage.removeItem("gpc_patient");
            localStorage.removeItem("gpc_available_profiles");
            localStorage.removeItem("gpc_active_patient_id");
          }
          // Do NOT sign out immediately if user is on login page (they may be in the middle of linking activation code)
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/patienthub/login")) {
            await signOut(auth);
          }
        }
      } else {
        setPatient(null);
        setAvailableProfiles([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem("gpc_patient");
          localStorage.removeItem("gpc_available_profiles");
          localStorage.removeItem("gpc_active_patient_id");
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

      const profiles = await lookupAllPatientProfiles(fbUser);
      if (profiles.length === 0) {
        // Not linked yet: Prompt for Activation Code
        setPendingGoogle({
          email: fbUser.email || "",
          uid: fbUser.uid,
          displayName: fbUser.displayName || "Patient"
        });
        setLoading(false);
        return { success: false, needsActivation: true };
      }

      // Existing Patient linked: Update UID link on primary/matched doc
      const matchedProfile = profiles.find((p) => p.email?.toLowerCase() === fbUser.email?.toLowerCase()) || profiles[0];

      if (matchedProfile.id) {
        matchedProfile.authUid = fbUser.uid;
        matchedProfile.activated = true;

        syncPatientActivation({
          patientId: matchedProfile.id,
          authUid: fbUser.uid,
          email: fbUser.email || undefined,
        });

        updateDoc(doc(db, "patients", matchedProfile.id), {
          authUid: fbUser.uid,
          activated: true
        }).catch((e) => console.warn("Client updateDoc non-fatal:", e));
      }

      // Update state
      setAvailableProfiles(profiles);
      setPatient(matchedProfile);
      setActiveProfileId(matchedProfile.id || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(matchedProfile));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(profiles));
        if (matchedProfile.id) {
          localStorage.setItem("gpc_active_patient_id", matchedProfile.id);
        }
        sessionStorage.setItem("gpc_profile_selected_session", "true");
      }

      // Show profile selector if more than 1 profile
      if (profiles.length > 1) {
        setShowProfileSelector(true);
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
      if (!cleanCode) {
        setLoading(false);
        const msg = "Please enter a valid activation code provided by the clinic.";
        setError(msg);
        return { success: false, error: msg };
      }

      const userEmail = pendingGoogle.email.toLowerCase().trim();

      // Strict Validation: Ensure Google email is registered in clinic database
      const valRes = await fetch("/api/patient/validate-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, activationCode: cleanCode }),
      });
      const valData = await valRes.json().catch(() => ({}));
      if (!valRes.ok || !valData.success) {
        setLoading(false);
        const msg = valData.error || "This Google account has not been registered with the clinic. Please use the email provided during clinic registration or contact our front desk at +91 98765 43210.";
        setError(msg);
        return { success: false, error: msg };
      }

      let matchedDoc: any = null;

      const q = query(collection(db, "patients"), where("activationCode", "==", cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else {
        const allSnap = await getDocs(collection(db, "patients"));
        for (const d of allSnap.docs) {
          const data = d.data();
          if (data.activationCode && data.activationCode.trim().toUpperCase() === cleanCode) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc && valData?.patient) {
        matchedDoc = {
          id: valData.patient.id || valData.patientId,
          data: () => valData.patient,
        };
      }

      if (!matchedDoc) {
        setLoading(false);
        const msg = "Invalid activation code. Please check with the clinic reception.";
        setError(msg);
        return { success: false, error: msg };
      }
      const existingData = matchedDoc.data() as Patient;
      const emailsSet = new Set<string>();
      if (existingData.email) emailsSet.add(existingData.email.toLowerCase().trim());
      (existingData.linkedEmails || []).forEach(e => emailsSet.add(e.toLowerCase().trim()));
      emailsSet.add(userEmail);

      const patientData: Patient = {
        ...existingData,
        id: matchedDoc.id,
        email: existingData.email || userEmail,
        linkedEmails: Array.from(emailsSet),
        authUid: pendingGoogle.uid,
        activated: true,
        isPrimaryAccount: true,
      };

      syncPatientActivation({
        patientId: matchedDoc.id,
        authUid: pendingGoogle.uid,
        email: userEmail,
        activationCode: cleanCode,
        linkedEmails: Array.from(emailsSet),
      });

      updateDoc(doc(db, "patients", matchedDoc.id), {
        linkedEmails: Array.from(emailsSet),
        authUid: pendingGoogle.uid,
        activated: true,
        activationCode: ""
      }).catch((e) => console.warn("Client updateDoc non-fatal:", e));

      // Fetch all family profiles
      const allProfiles = await getFamilyMembers(patientData);
      setAvailableProfiles(allProfiles);
      setPatient(patientData);
      setActiveProfileId(patientData.id || null);
      setPendingGoogle(null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(allProfiles));
        if (patientData.id) {
          localStorage.setItem("gpc_active_patient_id", patientData.id);
        }
        sessionStorage.setItem("gpc_profile_selected_session", "true");
      }

      if (allProfiles.length > 1) {
        setShowProfileSelector(true);
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
      const profiles = await lookupAllPatientProfiles(cred.user);

      if (profiles.length === 0) {
        await signOut(auth);
        setLoading(false);
        const msg = "This email address has not been registered with the clinic. Please use the email provided during your clinic registration or contact our front desk at +91 98765 43210.";
        setError(msg);
        return { success: false, error: msg };
      }

      const chosenProfile = profiles.find((p) => p.email?.toLowerCase() === emailStr.toLowerCase().trim()) || profiles[0];

      if (chosenProfile.id && (!chosenProfile.authUid || !chosenProfile.activated)) {
        chosenProfile.authUid = cred.user.uid;
        chosenProfile.activated = true;

        syncPatientActivation({
          patientId: chosenProfile.id,
          authUid: cred.user.uid,
          email: cred.user.email || undefined,
        });

        updateDoc(doc(db, "patients", chosenProfile.id), {
          authUid: cred.user.uid,
          activated: true
        }).catch((e) => console.warn("Client updateDoc non-fatal:", e));
      }

      setAvailableProfiles(profiles);
      setPatient(chosenProfile);
      setActiveProfileId(chosenProfile.id || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(chosenProfile));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(profiles));
        if (chosenProfile.id) {
          localStorage.setItem("gpc_active_patient_id", chosenProfile.id);
        }
        sessionStorage.setItem("gpc_profile_selected_session", "true");
      }

      if (profiles.length > 1) {
        setShowProfileSelector(true);
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Email login error:", err);
      setLoading(false);
      let msg = "Invalid email or password.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password. If you haven't created a password yet, please use 'Continue with Google' or click 'Register with Code' below.";
      } else if (err.code === "auth/user-not-found") {
        msg = "Account not found. Please click 'Register with Code' below to activate your account.";
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
      const cleanEmail = emailStr.trim().toLowerCase();
      const cleanCode = code.trim().toUpperCase();

      if (!cleanEmail || !cleanEmail.includes("@")) {
        setLoading(false);
        const msg = "Please enter a valid registered email address.";
        setError(msg);
        return { success: false, error: msg };
      }

      if (!cleanCode) {
        setLoading(false);
        const msg = "Please enter a valid activation code provided by the clinic.";
        setError(msg);
        return { success: false, error: msg };
      }

      // Step 1: Strict Server-Side Validation against Clinic Database
      const valRes = await fetch("/api/patient/validate-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, activationCode: cleanCode }),
      });
      const valData = await valRes.json().catch(() => ({}));
      if (!valRes.ok || !valData.success) {
        setLoading(false);
        const msg = valData.error || "This email address has not been registered with the clinic. Please use the email provided during your clinic registration or contact our front desk at +91 98765 43210.";
        setError(msg);
        return { success: false, error: msg };
      }

      let matchedDoc: any = null;

      const q = query(collection(db, "patients"), where("activationCode", "==", cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        matchedDoc = snap.docs[0];
      } else {
        const allSnap = await getDocs(collection(db, "patients"));
        for (const d of allSnap.docs) {
          const data = d.data();
          if (data.activationCode && data.activationCode.trim().toUpperCase() === cleanCode) {
            matchedDoc = d;
            break;
          }
        }
      }

      if (!matchedDoc && valData?.patient) {
        matchedDoc = {
          id: valData.patient.id || valData.patientId,
          data: () => valData.patient,
        };
      }

      if (!matchedDoc) {
        setLoading(false);
        const msg = "Invalid activation code. Please check with your clinic receptionist.";
        setError(msg);
        return { success: false, error: msg };
      }

      // Create or update Firebase Auth user
      let authUser: any = null;
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailStr.trim(), pass);
        authUser = cred.user;
      } catch (authCreateErr: any) {
        if (authCreateErr.code === "auth/email-already-in-use") {
          // Account already exists in Firebase Auth (e.g. previously authenticated via Google).
          // Since the patient has provided the valid clinic Activation Code, attach the password to their existing account!
          const activateRes = await fetch("/api/patient/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patientId: matchedDoc.id,
              email: emailStr.trim(),
              password: pass,
              activationCode: cleanCode,
            }),
          });
          const activateData = await activateRes.json().catch(() => ({}));
          if (!activateRes.ok || !activateData.success) {
            throw new Error(activateData.error || "Failed to link password to your account.");
          }

          // Sign in with the newly attached password
          const signInCred = await signInWithEmailAndPassword(auth, emailStr.trim(), pass);
          authUser = signInCred.user;
        } else {
          throw authCreateErr;
        }
      }

      const existingData = matchedDoc.data() as Patient;
      const emailsSet = new Set<string>();
      if (existingData.email) emailsSet.add(existingData.email.toLowerCase().trim());
      (existingData.linkedEmails || []).forEach(e => emailsSet.add(e.toLowerCase().trim()));
      emailsSet.add(emailStr.trim().toLowerCase());

      const patientData = {
        ...existingData,
        id: matchedDoc.id,
        email: existingData.email || emailStr.trim().toLowerCase(),
        linkedEmails: Array.from(emailsSet),
        authUid: authUser.uid,
        activated: true,
        isPrimaryAccount: true,
      } as Patient;

      syncPatientActivation({
        patientId: matchedDoc.id,
        authUid: authUser.uid,
        email: emailStr.trim().toLowerCase(),
        activationCode: cleanCode,
        linkedEmails: Array.from(emailsSet),
      });

      updateDoc(doc(db, "patients", matchedDoc.id), {
        linkedEmails: Array.from(emailsSet),
        authUid: authUser.uid,
        activated: true,
        activationCode: ""
      }).catch((e) => console.warn("Client updateDoc non-fatal:", e));

      const allProfiles = await getFamilyMembers(patientData);
      setAvailableProfiles(allProfiles);
      setPatient(patientData);
      setActiveProfileId(patientData.id || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(patientData));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(allProfiles));
        if (patientData.id) {
          localStorage.setItem("gpc_active_patient_id", patientData.id);
        }
        sessionStorage.setItem("gpc_profile_selected_session", "true");
      }

      if (allProfiles.length > 1) {
        setShowProfileSelector(true);
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

  // Action: Authenticate with verified Phone OTP custom token
  const loginWithPhoneOtp = async (
    customToken: string, 
    phoneDigits: string,
    initialProfiles?: Patient[]
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);
    await ensureLocalPersistence();

    try {
      const cleanPhone = phoneDigits.replace(/\D/g, "").slice(-10);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("gpc_auth_phone", cleanPhone);
        localStorage.setItem("gpc_auth_phone", cleanPhone);
      }

      const cred = await signInWithCustomToken(auth, customToken);
      
      let profiles: Patient[] = (initialProfiles && initialProfiles.length > 0) ? initialProfiles : [];
      if (profiles.length === 0) {
        profiles = await lookupAllPatientProfiles(cred.user, cleanPhone);
      }

      if (profiles.length === 0) {
        await signOut(auth);
        setLoading(false);
        const msg = "No registered patient record matched this mobile number.";
        setError(msg);
        return { success: false, error: msg };
      }

      const chosenProfile = profiles.find((p) => {
        const pPhone = (p.phone || "").replace(/\D/g, "").slice(-10);
        return pPhone === cleanPhone;
      }) || profiles[0];

      if (chosenProfile.id && (!chosenProfile.authUid || !chosenProfile.activated)) {
        chosenProfile.authUid = cred.user.uid;
        chosenProfile.activated = true;

        syncPatientActivation({
          patientId: chosenProfile.id,
          authUid: cred.user.uid,
          phone: cleanPhone,
        });

        updateDoc(doc(db, "patients", chosenProfile.id), {
          authUid: cred.user.uid,
          activated: true,
        }).catch((e) => console.warn("Client updateDoc non-fatal:", e));
      }

      setAvailableProfiles(profiles);
      setPatient(chosenProfile);
      setActiveProfileId(chosenProfile.id || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(chosenProfile));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(profiles));
        if (chosenProfile.id) {
          localStorage.setItem("gpc_active_patient_id", chosenProfile.id);
        }
        sessionStorage.setItem("gpc_profile_selected_session", "true");
      }

      if (profiles.length > 1) {
        setShowProfileSelector(true);
      }

      setLoading(false);
      return { success: true };
    } catch (err: any) {
      console.error("Phone OTP login error:", err);
      setLoading(false);
      const msg = err.message || "Failed to complete login with verification code.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Action: Add a new family member profile from Patient Hub
  const addFamilyMemberProfile = async (data: {
    name: string;
    relationship: FamilyRelationship;
    age?: string | number;
    gender?: string;
    phone?: string;
    email?: string;
  }): Promise<{ success: boolean; error?: string; patient?: Patient }> => {
    try {
      if (!patient) {
        return { success: false, error: "Please log in first." };
      }

      const primaryPatient = availableProfiles.find((p) => p.isPrimaryAccount) || patient;
      const familyGroupId = primaryPatient.familyGroupId || `FAM-${primaryPatient.id}`;

      const emailsSet = new Set<string>();
      if (primaryPatient.email) emailsSet.add(primaryPatient.email.trim().toLowerCase());
      (primaryPatient.linkedEmails || []).forEach(e => emailsSet.add(e.trim().toLowerCase()));
      if (user?.email) emailsSet.add(user.email.trim().toLowerCase());
      if (data.email) emailsSet.add(data.email.trim().toLowerCase());

      const newMember = await createPatient({
        name: data.name.trim(),
        relationship: data.relationship,
        age: data.age ? String(data.age).trim() : "",
        gender: data.gender || "Male",
        phone: data.phone ? sanitizePhone(data.phone) : primaryPatient.phone,
        email: data.email ? data.email.trim().toLowerCase() : primaryPatient.email,
        primaryPatientId: primaryPatient.id,
        familyHeadName: primaryPatient.name,
        familyGroupId: familyGroupId,
        linkedEmails: Array.from(emailsSet),
        activated: true, // Inherits activation from the family head!
        status: "active",
        treatmentPlan: "General Physiotherapy Consultation"
      });

      // Refresh full profile circle
      const updatedProfiles = [...availableProfiles, newMember];
      setAvailableProfiles(updatedProfiles);
      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_available_profiles", JSON.stringify(updatedProfiles));
      }

      // Switch to the newly created family member
      if (newMember.id) {
        selectProfile(newMember.id);
      }

      return { success: true, patient: newMember };
    } catch (err: any) {
      console.error("Failed to add family member:", err);
      return { success: false, error: err.message || "Failed to add family member." };
    }
  };

  // Action: Link an existing patient account by PID
  const linkExistingProfileByPid = async (
    pid: string, 
    phoneOrCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!patient) {
        return { success: false, error: "Please log in first." };
      }

      const cleanPid = pid.trim().toUpperCase();
      const targetDoc = await getDoc(doc(db, "patients", cleanPid));

      if (!targetDoc.exists()) {
        return { success: false, error: `No patient file found with ID ${cleanPid}.` };
      }

      const targetPatient = { id: targetDoc.id, ...targetDoc.data() } as Patient;
      const cleanInput = phoneOrCode.trim().toLowerCase();
      const targetPhone = sanitizePhone(targetPatient.phone);
      const targetCode = (targetPatient.activationCode || "").trim().toLowerCase();

      // Verify authorization: input must match last 4 digits of phone, or full phone, or activation code
      const isAuthorized = 
        cleanInput === targetCode ||
        targetPhone.includes(cleanInput) ||
        (cleanInput.length >= 4 && targetPhone.endsWith(cleanInput));

      if (!isAuthorized) {
        return { 
          success: false, 
          error: "Verification failed. The contact number or activation code does not match this Patient ID." 
        };
      }

      const primaryPatient = availableProfiles.find((p) => p.isPrimaryAccount) || patient;
      await linkPatientsInFamilyCircle(primaryPatient, targetPatient, "Other");

      // Refresh profiles
      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      console.error("Failed to link profile:", err);
      return { success: false, error: err.message || "Failed to link profile." };
    }
  };

  // Action: Safe Global Logout (TenoPilot pattern)
  const logout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("gpc_patient");
        localStorage.removeItem("gpc_available_profiles");
        localStorage.removeItem("gpc_active_patient_id");
        localStorage.removeItem("gpc_auth_phone");
        sessionStorage.removeItem("gpc_profile_selected_session");
        sessionStorage.removeItem("gpc_auth_phone");
      }
      setPatient(null);
      setAvailableProfiles([]);
      setActiveProfileId(null);
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
    const profiles = await lookupAllPatientProfiles(user);

    if (profiles.length > 0) {
      setAvailableProfiles(profiles);
      const currentId = activeProfileId || (typeof window !== "undefined" ? localStorage.getItem("gpc_active_patient_id") : null);
      const target = profiles.find((p) => p.id === currentId) || profiles[0];
      setPatient(target);
      setActiveProfileId(target.id || null);

      if (typeof window !== "undefined") {
        localStorage.setItem("gpc_patient", JSON.stringify(target));
        localStorage.setItem("gpc_available_profiles", JSON.stringify(profiles));
        if (target.id) {
          localStorage.setItem("gpc_active_patient_id", target.id);
        }
      }
    } else {
      setPatient(null);
      setAvailableProfiles([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("gpc_patient");
        localStorage.removeItem("gpc_available_profiles");
        localStorage.removeItem("gpc_active_patient_id");
        localStorage.removeItem("gpc_auth_phone");
        sessionStorage.removeItem("gpc_auth_phone");
      }
      await signOut(auth);
    }
  };

  return (
    <PatientAuthContext.Provider
      value={{
        user,
        patient,
        availableProfiles,
        activeProfileId,
        selectProfile,
        showProfileSelector,
        setShowProfileSelector,
        loading,
        error,
        setError,
        pendingGoogle,
        setPendingGoogle,
        loginWithGoogle,
        linkGoogleWithActivationCode,
        loginWithEmail,
        signUpWithCode,
        loginWithPhoneOtp,
        logout,
        refreshProfile,
        addFamilyMemberProfile,
        linkExistingProfileByPid
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
}
