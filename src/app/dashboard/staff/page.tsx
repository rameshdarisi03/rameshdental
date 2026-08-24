"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Lock, UserCheck, ShieldAlert, Plus, User, Mail, Loader2, Key, Trash2, ShieldCheck, AlertOctagon } from "lucide-react";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

export default function DashboardStaff() {
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
            className="bg-white dark:bg-slate-905 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl flex items-start justify-between gap-4 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:-translate-y-0.5 transition-all duration-300"
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
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl space-y-5 relative animate-zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-black text-brand-charcoal dark:text-white">Add Staff Member</h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs font-black"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Anjali Sharma"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="staff@gaitphysio.com"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Password * (Min 6 chars)
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Password for sign in"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Assigned Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-855 bg-slate-50/50 dark:bg-slate-900 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                >
                  <option value="receptionist">Receptionist (Limited Access)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-grow flex items-center justify-center bg-brand-green hover:bg-brand-green-hover text-white rounded-full py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    "Create Staff Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-955/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl space-y-4 relative animate-zoom-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center gap-3 text-red-650 dark:text-red-400 border-b border-slate-100 dark:border-slate-800 pb-3">
              <AlertOctagon className="h-6 w-6 animate-pulse" />
              <h3 className="text-base sm:text-lg font-black">Confirm Deletion</h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                You are about to delete staff member <strong className="text-slate-900 dark:text-white font-bold">{memberToDelete.name}</strong> (<span className="italic">{memberToDelete.email}</span>). 
              </p>
              
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 rounded-2xl">
                <p className="text-[10px] text-red-750 dark:text-red-400 font-bold leading-relaxed">
                  <strong>WARNING</strong>: This action deletes their access profile from the clinic database. They will be signed out and blocked from logging in.
                </p>
              </div>

              <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                Please enter your administrator password twice to confirm:
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Your Admin Password *
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="password"
                    required
                    value={adminPassword1}
                    onChange={(e) => setAdminPassword1(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                  Re-enter Admin Password *
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-brand-green" />
                  <input
                    type="password"
                    required
                    value={adminPassword2}
                    onChange={(e) => setAdminPassword2(e.target.value)}
                    placeholder="Re-enter password to verify"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-805 bg-slate-50/50 dark:bg-slate-900 pl-11 pr-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setMemberToDelete(null);
                  }}
                  className="flex-1 rounded-full border border-slate-200 text-slate-655 py-3 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-grow flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    "Re-authenticate & Delete"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
