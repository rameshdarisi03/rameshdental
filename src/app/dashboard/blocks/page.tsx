"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  deleteDoc,
  Timestamp,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DayBlock } from "@/lib/db";
import { Clock, Plus, Trash2, AlertCircle, Loader2, Calendar, X, RotateCw } from "lucide-react";

export default function DashboardBlocks() {
  const [mounted, setMounted] = useState(false);
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    type: "full_day" as "full_day" | "session" | "holiday",
    session: "morning" as "morning" | "evening",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [minDate, setMinDate] = useState("");

  // Fetch blocks
  async function fetchBlocks() {
    setLoading(true);
    try {
      const q = query(collection(db, "blocks"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list: DayBlock[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as DayBlock);
      });
      setBlocks(list);
    } catch (error) {
      console.error("Error loading blocks: ", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    fetchBlocks();
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    setMinDate(`${year}-${month}-${day}`);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, "blocks"), {
        date: formData.date,
        type: formData.type,
        session: formData.type === "session" ? formData.session : null,
        reason: formData.reason || "General Closure",
        createdAt: Timestamp.now(),
      });

      setIsFormOpen(false);
      // Reset form
      setFormData({
        date: "",
        type: "full_day",
        session: "morning",
        reason: "",
      });

      fetchBlocks();
    } catch (error) {
      console.error("Error creating block: ", error);
      alert("Failed to block slots. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (blockId: string) => {
    if (!confirm("Are you sure you want to unblock this date/session?")) return;
    setDeletingId(blockId);
    try {
      await deleteDoc(doc(db, "blocks", blockId));
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (error) {
      console.error("Error deleting block: ", error);
      alert("Failed to delete block. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-charcoal dark:text-white">Schedule Closures</h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">Block entire dates or specific shifts so patients cannot request online appointments.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={fetchBlocks}
            disabled={loading}
            title="Refresh closures"
            type="button"
            className="p-3 border border-slate-200 dark:border-slate-805 rounded-full hover:bg-brand-bg text-slate-500 hover:text-brand-green transition-all focus:outline-none shrink-0"
          >
            <RotateCw className={`h-4.5 w-4.5 ${loading ? "animate-spin text-brand-green" : ""}`} />
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="flex-grow sm:flex-grow-0 inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-5 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Schedule Block
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Blocks List */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="font-black text-brand-charcoal dark:text-white text-base">Active Day & Session Blocks</h3>
          
          {loading ? (
            <div className="flex h-32 items-center justify-center text-slate-500 text-xs font-semibold">
              <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
              <span>Fetching active block rules...</span>
            </div>
          ) : blocks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-slate-450 space-y-2 shadow-sm">
              <AlertCircle className="h-8 w-8 mx-auto text-slate-300" />
              <p className="font-black text-brand-charcoal dark:text-white">No active block rules</p>
              <p className="text-xs font-semibold">All calendar dates are open for bookings according to clinic operating hours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {blocks.map((b) => (
                <div
                  key={b.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl flex items-center justify-between gap-4 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex gap-4 items-center">
                    <div className="h-11 w-11 rounded-full bg-rose-50 dark:bg-rose-955/30 flex items-center justify-center text-rose-600 ring-4 ring-rose-100/30 shrink-0 animate-pulse">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-brand-charcoal dark:text-white text-sm">
                        {b.date}
                      </h4>
                      <p className="text-xs text-slate-500 flex gap-2 items-center mt-1 font-semibold">
                        <span className="capitalize text-brand-green dark:text-slate-300 font-bold">
                          {b.type === "session" ? `${b.session} session` : b.type.replace("_", " ")}
                        </span>
                        &bull;
                        <span>Reason: {b.reason || "General Closure"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b.id!)}
                    disabled={deletingId === b.id}
                    className="p-2 rounded-xl text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                    title="Remove block"
                  >
                    {deletingId === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Guide Info Box */}
        <div className="lg:col-span-4 bg-brand-bg dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="font-black text-brand-charcoal dark:text-white text-base">How Blocking Works</h3>
          <ul className="space-y-3 text-xs text-slate-650 dark:text-slate-400 list-disc pl-4 leading-relaxed font-semibold">
            <li>
              <strong>Full Day / Holidays:</strong> Disables slot selections entirely for the public on the chosen date.
            </li>
            <li>
              <strong>Session Blocks:</strong> Disables either Morning slots (9:00 AM - 1:00 PM) or Evening slots (2:00 PM - 7:00 PM) for shift adjustments.
            </li>
            <li>
              Block rules take effect **instantly** without redeployment.
            </li>
          </ul>
        </div>

      </div>

      {/* Modal Dialog Form */}
      {mounted && isFormOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-green/10 via-white to-brand-sand/30 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Create Availability Block</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Override booking availability for clinic calendar</p>
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
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    name="date"
                    min={minDate}
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Block Scope
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="full_day">Full Day Closure</option>
                    <option value="holiday">Holiday</option>
                    <option value="session">Specific Session Block</option>
                  </select>
                </div>

                {formData.type === "session" && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                      Select Target Session
                    </label>
                    <select
                      name="session"
                      value={formData.session}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-bold cursor-pointer"
                    >
                      <option value="morning">Morning Session (09:00 AM - 01:00 PM)</option>
                      <option value="evening">Evening Session (02:00 PM - 07:00 PM)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    Reason for closure / block
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="e.g. Clinic Maintenance, Doctor Seminar"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-900 dark:text-white font-semibold"
                  />
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
                  disabled={submitting || !formData.date}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Block Rule"
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
