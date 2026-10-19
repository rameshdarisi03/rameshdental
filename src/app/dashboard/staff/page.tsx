"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { 
  Lock, 
  UserCheck, 
  ShieldAlert, 
  Plus, 
  User, 
  Mail, 
  Loader2, 
  Key, 
  Trash2, 
  ShieldCheck, 
  AlertOctagon, 
  X,
  QrCode,
  Smartphone,
  Copy,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import QRCode from "qrcode";

function generateClientSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(20);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < 20; i++) {
      secret += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 20; i++) {
      secret += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return secret;
}

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
  totpSecret?: string;
  totpEnabled?: boolean;
}

export default function DashboardStaff() {
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<UserProfile[]>([]);

  // Add Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "receptionist" as "admin" | "receptionist",
    password: "",
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  const [adminPassword1, setAdminPassword1] = useState("");
  const [adminPassword2, setAdminPassword2] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Authenticator QR Code Setup Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrStaff, setQrStaff] = useState<UserProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [formattedKey, setFormattedKey] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [testCode, setTestCode] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState("");
  const [testError, setTestError] = useState("");

  // Direct Password Reset Modal State (Admin Override)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetStaff, setResetStaff] = useState<UserProfile | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setStaffList(list);
    } catch (err) {
      console.error("Failed to load staff users: ", err);
    }
  };

  useEffect(() => {
    setMounted(true);
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      const user = JSON.parse(userJson) as UserProfile;
      if (user.role === "admin") {
        setIsAdmin(true);
      }
    }
    
    async function loadData() {
      await fetchStaff();
      setLoading(false);
    }
    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill out all fields.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const emailClean = formData.email.trim().toLowerCase();
    const firebaseConfig = {
      apiKey: "AIzaSyCQr7HOAM0NnwWNew19VIs6L4rJ7VL0ML4",
      authDomain: "gpc01-8d819.firebaseapp.com",
      projectId: "gpc01-8d819",
    };

    const tempAppName = `TempStaffApp_${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, emailClean, formData.password);
      const newUid = userCredential.user.uid;

      await signOut(tempAuth);

      const newProfile = {
        uid: newUid,
        name: formData.name.trim(),
        email: emailClean,
        role: formData.role,
        createdAt: Timestamp.now()
      };
      await setDoc(doc(db, "users", newUid), newProfile);

      await fetchStaff();

      setSuccessMsg(`Account created for ${formData.name}!`);
      setIsFormOpen(false);
      
      setFormData({
        name: "",
        email: "",
        role: "receptionist",
        password: "",
      });
    } catch (err: any) {
      console.error("Staff creation failed: ", err);
      if (err.code === "auth/email-already-in-use") {
        const isCurrentlyActive = staffList.some(
          (s) => s.email.toLowerCase() === emailClean
        );

        if (isCurrentlyActive) {
          setError("A staff member is already actively registered with this email address.");
        } else {
          // Previously deleted account being re-added with same credentials
          try {
            const reLoginCred = await signInWithEmailAndPassword(tempAuth, emailClean, formData.password);
            const reactivatedUid = reLoginCred.user.uid;
            await signOut(tempAuth);

            const newProfile = {
              uid: reactivatedUid,
              name: formData.name.trim(),
              email: emailClean,
              role: formData.role,
              createdAt: Timestamp.now()
            };
            await setDoc(doc(db, "users", reactivatedUid), newProfile);
            await fetchStaff();

            setSuccessMsg(`Account for ${formData.name} restored and permissions re-activated!`);
            setIsFormOpen(false);
            setFormData({
              name: "",
              email: "",
              role: "receptionist",
              password: "",
            });
            return;
          } catch (loginErr: any) {
            setError(
              "This email was previously used in the system. To re-activate this account, please enter its previous password, or delete the email from Firebase Console (Authentication tab) to register a new password."
            );
          }
        }
      } else {
        setError(err.message || "Failed to create staff account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete dialog
  const handleOpenDelete = (member: UserProfile) => {
    setMemberToDelete(member);
    setAdminPassword1("");
    setAdminPassword2("");
    setDeleteError("");
    setIsDeleteOpen(true);
  };

  // Handle Deletion with Admin Password check
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToDelete) return;
    if (!adminPassword1 || !adminPassword2) {
      setDeleteError("Please fill out both password fields.");
      return;
    }
    if (adminPassword1 !== adminPassword2) {
      setDeleteError("The administrator passwords do not match.");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      // 1. Re-authenticate active administrator session to prove identity
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error("No active administrator session detected. Please log in again.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, adminPassword1);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Call server-side total purge API to permanently delete from both Firebase Auth and Firestore
      let deleteResult: any = null;
      let serverPurgeSucceeded = false;
      let serverErrorMsg = "";

      try {
        const deleteResponse = await fetch("/api/staff/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: memberToDelete.uid,
            email: memberToDelete.email,
          }),
        });

        const responseText = await deleteResponse.text();
        try {
          deleteResult = JSON.parse(responseText);
        } catch {
          console.warn("[Staff Delete] Received non-JSON response from server:", responseText);
          if (!deleteResponse.ok) {
            serverErrorMsg = `Server error (${deleteResponse.status}). If running on Vercel, check that FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are added to Environment Variables.`;
          }
        }

        if (deleteResponse.ok && deleteResult?.success) {
          serverPurgeSucceeded = true;
        } else if (deleteResult?.error) {
          serverErrorMsg = deleteResult.error;
        }
      } catch (fetchErr: any) {
        console.warn("[Staff Delete] Network/API call failed:", fetchErr);
        serverErrorMsg = fetchErr.message || "Failed to contact staff deletion server endpoint.";
      }

      // 3. Client state & DB sync (ensures document is wiped from Firestore)
      try {
        await deleteDoc(doc(db, "users", memberToDelete.uid));
      } catch (dbErr: any) {
        console.error("[Staff Delete] Direct Firestore delete error:", dbErr);
        if (!serverPurgeSucceeded) {
          throw new Error(serverErrorMsg || dbErr.message || "Failed to remove staff record from database.");
        }
      }

      if (serverErrorMsg && !serverPurgeSucceeded) {
        // If Firestore document was removed locally but server purge had an issue, let user know
        console.warn("[Staff Delete] Firestore doc deleted, but server purge noted:", serverErrorMsg);
      }

      // 4. Refresh locally
      await fetchStaff();

      setSuccessMsg(`Staff member ${memberToDelete.name} has been completely removed from the system.`);
      setIsDeleteOpen(false);
      setMemberToDelete(null);
    } catch (err: any) {
      console.error("Deletion failed: ", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setDeleteError("Incorrect administrator password.");
      } else {
        setDeleteError(err.message || "Authentication verification failed. Access Denied.");
      }
    } finally {
      setDeleting(false);
    }
  };

  // Open QR modal and fetch/generate QR code
  const handleOpenQrModal = async (member: UserProfile) => {
    setQrStaff(member);
    setQrDataUrl("");
    setFormattedKey("");
    setQrError("");
    setTestCode("");
    setTestSuccess("");
    setTestError("");
    setCopiedKey(false);
    setIsQrModalOpen(true);
    setQrLoading(true);

    try {
      // 1. Secret: reuse existing or generate new Base32 secret
      const secret = member.totpSecret || generateClientSecret();
      const otpauthUrl = `otpauth://totp/Gait%20Physio%20Clinic:${encodeURIComponent(member.email)}?secret=${secret}&issuer=Gait%20Physio%20Clinic&algorithm=SHA1&digits=6&period=30`;
      
      // 2. Generate high-contrast QR Data URL instantly
      const qrUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#062e36",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
      const formatted = secret.match(/.{1,4}/g)?.join(" ") || secret;

      // 3. Persist secret in Firestore if newly created
      if (!member.totpSecret) {
        await setDoc(doc(db, "users", member.uid), {
          totpSecret: secret,
          totpEnabled: false,
          totpUpdatedAt: Timestamp.now(),
        }, { merge: true });
      }

      setQrDataUrl(qrUrl);
      setFormattedKey(formatted);
      setQrStaff((prev) => (prev ? { ...prev, totpSecret: secret } : null));
      setStaffList((prev) =>
        prev.map((s) => (s.uid === member.uid ? { ...s, totpSecret: secret } : s))
      );
    } catch (err: any) {
      console.error("[QR Modal] Generation error:", err);
      setQrError(err.message || "Failed to load Authenticator QR code");
    } finally {
      setQrLoading(false);
    }
  };

  // Copy secret key
  const handleCopyKey = () => {
    if (!formattedKey) return;
    navigator.clipboard.writeText(formattedKey.replace(/\s+/g, ""));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Test & Activate TOTP Code
  const handleTestAndActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrStaff || !testCode.trim()) return;

    const secretKey = (qrStaff.totpSecret || formattedKey || "").replace(/[\s-]/g, "").toUpperCase();
    if (!secretKey) {
      setTestError("Secret key not found. Please regenerate QR code.");
      return;
    }

    setTestLoading(true);
    setTestError("");
    setTestSuccess("");

    try {
      // 1. Verify with server API
      const res = await fetch("/api/auth/staff-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CONFIRM_TOTP",
          secret: secretKey,
          token: testCode.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Invalid 6-digit code. Please verify the code in your Authenticator app.");
      }

      // 2. Mark confirmed & enabled in Firestore directly
      await setDoc(doc(db, "users", qrStaff.uid), {
        totpSecret: secretKey,
        totpEnabled: true,
        totpActivatedAt: Timestamp.now(),
      }, { merge: true });

      setTestSuccess("Authenticator successfully verified and active!");
      setStaffList((prev) =>
        prev.map((s) => (s.uid === qrStaff.uid ? { ...s, totpSecret: secretKey, totpEnabled: true } : s))
      );
    } catch (err: any) {
      setTestError(err.message || "Invalid code. Please try again.");
    } finally {
      setTestLoading(false);
    }
  };

  // Reset / Regenerate Secret Key
  const handleRegenerateSecret = async () => {
    if (!qrStaff) return;
    if (!confirm(`Are you sure you want to regenerate a brand new Authenticator secret for ${qrStaff.name}? Any previous app setup on their phone will stop working until they scan this new QR code.`)) {
      return;
    }

    setQrLoading(true);
    setQrError("");
    setTestSuccess("");
    setTestError("");

    try {
      const newSecret = generateClientSecret();
      const otpauthUrl = `otpauth://totp/Gait%20Physio%20Clinic:${encodeURIComponent(qrStaff.email)}?secret=${newSecret}&issuer=Gait%20Physio%20Clinic&algorithm=SHA1&digits=6&period=30`;
      const qrUrl = await QRCode.toDataURL(otpauthUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: "#062e36",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
      const formatted = newSecret.match(/.{1,4}/g)?.join(" ") || newSecret;

      // Update in Firestore directly
      await setDoc(doc(db, "users", qrStaff.uid), {
        totpSecret: newSecret,
        totpEnabled: false,
        totpResetAt: Timestamp.now(),
      }, { merge: true });

      setQrDataUrl(qrUrl);
      setFormattedKey(formatted);
      setStaffList((prev) =>
        prev.map((s) => (s.uid === qrStaff.uid ? { ...s, totpSecret: newSecret, totpEnabled: false } : s))
      );
    } catch (err: any) {
      setQrError(err.message || "Failed to regenerate Authenticator key.");
    } finally {
      setQrLoading(false);
    }
  };

  // Open Direct Password Reset Modal
  const handleOpenResetPassword = (member: UserProfile) => {
    setResetStaff(member);
    setNewStaffPassword("");
    setShowResetPassword(false);
    setResetError("");
    setResetSuccess("");
    setIsResetPasswordModalOpen(true);
  };

  // Handle Direct Password Reset
  const handleDirectPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff || newStaffPassword.length < 6) {
      setResetError("Password must be at least 6 characters long.");
      return;
    }

    setResetLoading(true);
    setResetError("");
    setResetSuccess("");

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const res = await fetch("/api/auth/staff-security", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          action: "ADMIN_DIRECT_RESET_PASSWORD",
          uid: resetStaff.uid,
          email: resetStaff.email,
          newPassword: newStaffPassword,
        }),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned error status (${res.status}).`);
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update staff password.");
      }

      setResetSuccess(`Password for ${resetStaff.name} has been updated successfully!`);
      setTimeout(() => {
        setIsResetPasswordModalOpen(false);
        setResetStaff(null);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading permissions database...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Access Denied</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
          The Staff Management console is restricted to administrators only. Receptionist accounts do not have permission to view or manage staff profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Staff Management</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Register additional therapist/admin roles or receptionist login profiles.</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold rounded-2xl">
          {successMsg}
        </div>
      )}

      {/* Staff Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {staffList.map((member) => (
          <div
            key={member.uid}
            className="bg-white dark:bg-slate-905 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl flex items-start justify-between gap-4 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-full bg-brand-sand text-brand-green ring-4 ring-brand-sand/30 flex items-center justify-center shrink-0">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-brand-charcoal dark:text-white text-base leading-tight">
                  {member.name}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">{member.email}</p>
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider capitalize ${
                    member.role === "admin"
                      ? "bg-brand-charcoal/10 border border-brand-charcoal/20 text-brand-charcoal dark:text-slate-200 dark:border-slate-700"
                      : "bg-brand-green/10 border border-brand-green/20 text-brand-green"
                  }`}>
                    {member.role}
                  </span>

                  {/* Authenticator TOTP Status Badge */}
                  {member.totpSecret ? (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
                      <Smartphone className="w-3 h-3" />
                      {member.totpEnabled ? "Authenticator Active" : "QR Linked (Ready)"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      <Smartphone className="w-3 h-3" />
                      No Authenticator
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Authenticator QR Code Setup */}
              <button
                type="button"
                onClick={() => handleOpenQrModal(member)}
                className="p-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40 rounded-xl transition-colors cursor-pointer"
                title="Google Authenticator QR Code Setup"
              >
                <QrCode className="h-4.5 w-4.5" />
              </button>

              {/* Direct Password Reset Override */}
              <button
                type="button"
                onClick={() => handleOpenResetPassword(member)}
                className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                title="Direct Password Reset Override"
              >
                <Key className="h-4.5 w-4.5" />
              </button>

              {/* Delete button (cannot delete your own logged-in user profile) */}
              {auth.currentUser?.uid !== member.uid && (
                <button
                  type="button"
                  onClick={() => handleOpenDelete(member)}
                  className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
                  title="Delete User"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {mounted && isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Staff Member</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Authorize clinic receptionist or admin account</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {error && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs font-bold rounded-2xl border border-red-200 dark:border-red-900/40">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                    <input
                      type="text"
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Anjali Sharma"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                    <input
                      type="email"
                      required
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="staff@gaitphysio.com"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Password * (Min 6 chars)
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                    <input
                      type="password"
                      required
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Password for sign in"
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="receptionist">Receptionist (Limited Access)</option>
                    <option value="admin">Administrator (Full Control)</option>
                  </select>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Staff Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {mounted && isDeleteOpen && memberToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-2xl space-y-4 relative animate-scale-in max-h-[90vh] overflow-y-auto overscroll-contain">
            
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-sm shrink-0">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Staff Deletion</h3>
                <p className="text-xs text-slate-500">{memberToDelete.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                You are about to remove access for <strong className="text-slate-900 dark:text-white">{memberToDelete.name}</strong> (<span className="italic">{memberToDelete.email}</span>).
              </p>
              
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl">
                <p className="text-[11px] text-red-700 dark:text-red-300 font-bold leading-relaxed">
                  This action removes their permissions from the clinic portal immediately.
                </p>
              </div>

              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                Enter your administrator password to confirm:
              </p>
            </div>

            {deleteError && (
              <div className="p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Your Admin Password *
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                  <input
                    type="password"
                    required
                    value={adminPassword1}
                    onChange={(e) => setAdminPassword1(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Re-enter Admin Password *
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                  <input
                    type="password"
                    required
                    value={adminPassword2}
                    onChange={(e) => setAdminPassword2(e.target.value)}
                    placeholder="Re-enter to verify"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-grow bg-red-600 hover:bg-red-500 text-white rounded-full py-2.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Re-authenticate & Delete"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* AUTHENTICATOR QR CODE SETUP & VERIFY MODAL                                */}
      {/* ========================================================================= */}
      {mounted && isQrModalOpen && qrStaff && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-teal-50/60 via-white to-emerald-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Authenticator Setup</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {qrStaff.name} ({qrStaff.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQrModalOpen(false);
                  setQrStaff(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {qrLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  <p className="text-xs font-semibold">Generating high-res QR code & encryption key...</p>
                </div>
              ) : qrError ? (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{qrError}</span>
                </div>
              ) : (
                <>
                  {/* Step 1: Scan QR Code */}
                  <div className="text-center space-y-3">
                    <div className="inline-block p-3 sm:p-4 bg-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-md">
                      {qrDataUrl && (
                        <img
                          src={qrDataUrl}
                          alt="Google Authenticator QR Code"
                          className="w-44 h-44 sm:w-52 sm:h-52 object-contain mx-auto"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Scan with Google Authenticator or Microsoft Authenticator
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Open the app on the staff phone, tap <span className="font-bold text-teal-600 dark:text-teal-400">+</span> or <span className="font-bold text-teal-600 dark:text-teal-400">Add Account</span>, and scan this QR code.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Manual Key Option */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Manual Setup Key:</span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        {copiedKey ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-500">Copied Key!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-750 font-mono text-xs font-black tracking-widest text-center text-slate-800 dark:text-teal-300 select-all">
                      {formattedKey || "Generating..."}
                    </div>
                  </div>

                  {/* Step 3: Test & Activate TOTP Code */}
                  <form onSubmit={handleTestAndActivate} className="p-4 bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        Verify 6-Digit Code (Confirm Setup)
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Recommended</span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={7}
                        value={testCode}
                        onChange={(e) => setTestCode(e.target.value)}
                        placeholder="123456"
                        className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold tracking-widest text-slate-800 dark:text-teal-300 outline-none focus:border-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={testLoading || !testCode.trim()}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Code"}
                      </button>
                    </div>

                    {testSuccess && (
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{testSuccess}</span>
                      </div>
                    )}

                    {testError && (
                      <div className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{testError}</span>
                      </div>
                    )}
                  </form>

                  {/* Regenerate Key Safety Net */}
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                    <span>Lost phone or replaced device?</span>
                    <button
                      type="button"
                      onClick={handleRegenerateSecret}
                      className="inline-flex items-center gap-1 font-bold text-amber-600 hover:text-amber-500 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Issue New Secret</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsQrModalOpen(false);
                  setQrStaff(null);
                }}
                className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* LEAD ADMIN DIRECT PASSWORD RESET MODAL                                    */}
      {/* ========================================================================= */}
      {mounted && isResetPasswordModalOpen && resetStaff && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-orange-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Direct Password Reset</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Admin Override for {resetStaff.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsResetPasswordModalOpen(false);
                  setResetStaff(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDirectPasswordSubmit} className="p-5 sm:p-6 space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                <strong>Lead Admin Authority:</strong> This directly updates the login password for <em>{resetStaff.email}</em> in Firebase Authentication. No email confirmation or TOTP code is required.
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  New Password * (Min 6 Characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-brand-green" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 pl-10 pr-10 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-semibold rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPasswordModalOpen(false);
                    setResetStaff(null);
                  }}
                  className="flex-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || newStaffPassword.length < 6}
                  className="flex-grow bg-amber-600 hover:bg-amber-500 text-white rounded-full py-2.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {resetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
