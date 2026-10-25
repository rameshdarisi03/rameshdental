"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Video, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Play, 
  Smartphone, 
  Monitor, 
  Check, 
  X, 
  Loader2, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Activity,
  Layers,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { RecoveryStory, recoveryStories as defaultStories } from "@/data/stories";
import StoryVideoModal from "@/components/public/StoryVideoModal";
import { 
  subscribeRecoveryStories, 
  saveRecoveryStory, 
  deleteRecoveryStory, 
  seedDefaultStoriesIfEmpty 
} from "@/lib/storiesDb";

const CATEGORIES = [
  "Orthopedic Rehab",
  "Spine & Posture",
  "Neuro & Gait",
  "Hand & Upper Limb",
  "Geriatric Mobility",
] as const;

export default function DashboardStoriesPage() {
  const [stories, setStories] = useState<RecoveryStory[]>(defaultStories);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Partial<RecoveryStory> | null>(null);
  const [highlightsInput, setHighlightsInput] = useState("");

  // Preview video in dashboard
  const [previewStory, setPreviewStory] = useState<RecoveryStory | null>(null);

  useEffect(() => {
    seedDefaultStoriesIfEmpty();
    const unsub = subscribeRecoveryStories((liveStories) => {
      setStories(liveStories);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openNewStoryModal = () => {
    setEditingStory({
      id: `story-${Date.now()}`,
      title: "",
      subtitle: "",
      category: "Orthopedic Rehab",
      orientation: "portrait",
      videoUrl: "",
      condition: "",
      therapist: "Dr. Kinnera (Lead Physiotherapist)",
      duration: "0:45",
      highlights: [],
      clinicalNotes: "",
      featured: true,
      order: stories.length + 1,
    });
    setHighlightsInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (story: RecoveryStory) => {
    setEditingStory({ ...story });
    setHighlightsInput(story.highlights?.join(", ") || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory?.title || !editingStory?.videoUrl) {
      alert("Please provide at least a title and a video URL.");
      return;
    }

    setSaving(true);
    const parsedHighlights = highlightsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedStory: RecoveryStory = {
      id: editingStory.id || `story-${Date.now()}`,
      title: editingStory.title || "",
      subtitle: editingStory.subtitle || "",
      category: (editingStory.category as any) || "Orthopedic Rehab",
      orientation: editingStory.orientation || "portrait",
      videoUrl: editingStory.videoUrl || "",
      condition: editingStory.condition || "Clinical Rehabilitation",
      therapist: editingStory.therapist || "Dr. Kinnera (Lead Physiotherapist)",
      duration: editingStory.duration || "0:45",
      highlights: parsedHighlights,
      clinicalNotes: editingStory.clinicalNotes || "",
      featured: editingStory.featured ?? true,
      order: editingStory.order ?? 1,
    };

    const res = await saveRecoveryStory(updatedStory);
    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      setActionSuccess("Story saved and updated on live website!");
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      alert(res.error || "Failed to save story");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    const res = await deleteRecoveryStory(id);
    if (res.success) {
      setActionSuccess("Story removed from website.");
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      alert(res.error || "Failed to delete story");
    }
  };

  const toggleFeatured = async (story: RecoveryStory) => {
    await saveRecoveryStory({
      ...story,
      featured: !story.featured,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-['Inter',sans-serif]">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 dark:bg-[#f9ab55]/15 text-brand-green dark:text-[#f9ab55] text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Website Media CMS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
            Recovery Stories & Videos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Manage real treatment videos, patient cases, and clinical proof showcased on your website homepage and stories page.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/stories"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-xs"
          >
            <span>View Live Page</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={openNewStoryModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Story</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <Video className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">No Stories Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Add New Story&quot; above to publish your first patient recovery video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story) => {
            const isPortrait = story.orientation === "portrait";
            return (
              <div
                key={story.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Video Preview Box */}
                <div className="relative aspect-[16/10] bg-black overflow-hidden group">
                  <video
                    src={story.videoUrl}
                    muted
                    playsInline
                    loop
                    preload="metadata"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />

                  {/* Orientation Pill */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase">
                      {isPortrait ? <Smartphone className="w-3 h-3 text-[#f9ab55]" /> : <Monitor className="w-3 h-3 text-cyan-400" />}
                      <span>{isPortrait ? "Portrait (9:16)" : "Landscape (16:9)"}</span>
                    </span>
                  </div>

                  {/* Homepage Featured Tag */}
                  <div className="absolute top-3 right-3 z-10">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(story)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer ${
                        story.featured
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-black/60 text-slate-400 hover:text-white"
                      }`}
                      title="Click to toggle Homepage visibility"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{story.featured ? "Homepage" : "Stories Only"}</span>
                    </button>
                  </div>

                  {/* Play Trigger */}
                  <button
                    type="button"
                    onClick={() => setPreviewStory(story)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 active:scale-95 cursor-pointer z-10"
                  >
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </button>
                </div>

                {/* Details Section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-[#8a5100] dark:text-[#f9ab55] uppercase tracking-wider">
                        {story.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono font-bold">
                        {story.duration || "0:45"}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {story.title}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {story.subtitle}
                    </p>
                  </div>

                  {/* Clinical Snippet */}
                  {story.clinicalNotes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl line-clamp-2 border border-slate-100 dark:border-slate-800">
                      &ldquo;{story.clinicalNotes}&rdquo;
                    </p>
                  )}

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 font-bold truncate max-w-[140px]">
                      {story.therapist?.split(" ")[0] || "Dr. Kinnera"}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(story)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(story.id, story.title)}
                        className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-colors cursor-pointer"
                        title="Delete Story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- ADD / EDIT STORY MODAL --- */}
      {isModalOpen && editingStory && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  {editingStory.id?.startsWith("story-") ? "Add Recovery Story" : "Edit Recovery Story"}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Update clinical details, video path, and showcase preferences.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Title */}
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                  Story Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingStory.title || ""}
                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                  placeholder="e.g. Comminuted Tibia Fracture & Skin Grafting Rehab"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-brand-green"
                />
              </div>

              {/* Subtitle / Synopsis */}
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                  Clinical Subtitle / Case Synopsis
                </label>
                <input
                  type="text"
                  value={editingStory.subtitle || ""}
                  onChange={(e) => setEditingStory({ ...editingStory, subtitle: e.target.value })}
                  placeholder="e.g. Complex lower limb crush trauma restoring progressive weight-bearing"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-brand-green"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                    Therapy Category
                  </label>
                  <select
                    value={editingStory.category || "Orthopedic Rehab"}
                    onChange={(e) => setEditingStory({ ...editingStory, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-brand-green"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                    Pathology / Condition Tag
                  </label>
                  <input
                    type="text"
                    value={editingStory.condition || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, condition: e.target.value })}
                    placeholder="e.g. Complex Tibia Fracture"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-brand-green"
                  />
                </div>
              </div>

              {/* Video URL & Orientation */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                    Video URL or File Path *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStory.videoUrl || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, videoUrl: e.target.value })}
                    placeholder="/videos/stories/tibia-fracture-recovery.mp4"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-brand-green"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                    Video Orientation
                  </label>
                  <select
                    value={editingStory.orientation || "portrait"}
                    onChange={(e) => setEditingStory({ ...editingStory, orientation: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-brand-green"
                  >
                    <option value="portrait">📱 Portrait (9:16)</option>
                    <option value="landscape">🖥 Landscape (16:9)</option>
                  </select>
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                  Doctor&apos;s Clinical Assessment & Technique
                </label>
                <textarea
                  rows={3}
                  value={editingStory.clinicalNotes || ""}
                  onChange={(e) => setEditingStory({ ...editingStory, clinicalNotes: e.target.value })}
                  placeholder="Describe the clinical progression, therapy techniques used, and mobility goals achieved..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-brand-green leading-relaxed"
                />
              </div>

              {/* Highlights (Comma Separated) */}
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                  Rehabilitation Highlights (Comma-separated)
                </label>
                <input
                  type="text"
                  value={highlightsInput}
                  onChange={(e) => setHighlightsInput(e.target.value)}
                  placeholder="Post-ORIF Internal Fixation, Soft Tissue Desensitization, Kinetic Loading"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-brand-green"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStory.featured ?? true}
                    onChange={(e) => setEditingStory({ ...editingStory, featured: e.target.checked })}
                    className="w-4 h-4 rounded text-brand-green accent-brand-green cursor-pointer"
                  />
                  <span>Feature on Homepage Carousel</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Publish</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LIVE PREVIEW MODAL --- */}
      <StoryVideoModal
        story={previewStory}
        isOpen={!!previewStory}
        onClose={() => setPreviewStory(null)}
      />
    </div>
  );
}
