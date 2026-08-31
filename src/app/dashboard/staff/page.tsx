"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock, UserCheck, ShieldAlert, Plus, User, Mail, Loader2, Key, Trash2, ShieldCheck, AlertOctagon, X } from "lucide-react";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
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

    try {
      const firebaseConfig = {
        apiKey: "AIzaSyCQr7HOAM0NnwWNew19VIs6L4rJ7VL0ML4",
        authDomain: "gpc01-8d819.firebaseapp.com",
        projectId: "gpc01-8d819",
      };

      const tempAppName = `TempStaffApp_${Date.now()}`;
      const tempApp = initializeApp(firebaseConfig, tempAppName);
      const tempAuth = getAuth(tempApp);

      const emailClean = formData.email.trim().toLowerCase();
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
        setError("This email address is already registered.");
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

      // 2. Delete the user document in Firestore database
      await deleteDoc(doc(db, "users", memberToDelete.uid));

      // 3. Refresh locally
      await fetchStaff();

      setSuccessMsg(`Staff member ${memberToDelete.name} has been deleted successfully.`);
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
                <div className="pt-2">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider capitalize ${
                    member.role === "admin"
                      ? "bg-brand-charcoal/10 border border-brand-charcoal/20 text-brand-charcoal"
                      : "bg-brand-green/10 border border-brand-green/20 text-brand-green"
                  }`}>
                    {member.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Delete button (cannot delete your own logged-in user profile) */}
            {auth.currentUser?.uid !== member.uid && (
              <button
                type="button"
                onClick={() => handleOpenDelete(member)}
                className="p-2 text-slate-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors shrink-0"
                title="Delete User"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
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

    </div>
  );
}
