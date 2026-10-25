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
  ArrowUpRight,
  Upload,
  FileVideo
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

  // File Upload State (for Firebase Storage bucket)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setUploadProgress(null);

    setEditingStory({
      id: `story-${Date.now()}`,
      title: "",
      subtitle: "",
      category: "Orthopedic Rehab",
      orientation: "portrait",
      videoUrl: "",
      therapist: "Dr. Kinnera (Lead Physiotherapist)",
      duration: "0:45",
      highlights: [],
      clinicalNotes: "",
      doctorAssessment: "",
      featured: true,
      order: stories.length + 1,
    });
    setHighlightsInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (story: RecoveryStory) => {
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    setUploadProgress(null);

    const assessment = story.doctorAssessment || story.clinicalNotes || "";
    setEditingStory({ 
      ...story,
      doctorAssessment: assessment,
      clinicalNotes: assessment
    });
    setHighlightsInput(story.highlights?.join(", ") || "");
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      setEditingStory((prev) => (prev ? { ...prev, videoUrl: url } : null));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory?.title || (!editingStory?.videoUrl && !selectedFile)) {
      alert("Please provide a story title and select a video file or URL.");
      return;
    }

    setSaving(true);
    let finalVideoUrl = editingStory.videoUrl || "";

    // Upload to Firebase Storage bucket if file selected
    if (selectedFile) {
      try {
        setUploadProgress(10);
        const { storage } = await import("@/lib/firebase");
        const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");

        const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `recovery_stories/${Date.now()}_${cleanFileName}`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageRef, selectedFile);

        finalVideoUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (error) => {
              console.warn("Firebase Storage upload task error:", error);
              reject(error);
            },
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            }
          );
        });
      } catch (uploadErr: any) {
        console.warn("Storage upload failed (bucket may not be activated yet):", uploadErr);
        // If therapist hasn't configured Blaze plan yet, inform them
        if (finalVideoUrl.startsWith("blob:")) {
          alert(
            "Firebase Storage bucket is not activated yet on this Google account (requires Blaze plan). We've saved the record with your local preview URL so your work isn't lost. Once Blaze is enabled, files will upload and stream directly from the cloud!"
          );
        }
      }
    }

    const parsedHighlights = highlightsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const assessmentText = editingStory.doctorAssessment || editingStory.clinicalNotes || "";

    const updatedStory: RecoveryStory = {
      id: editingStory.id || `story-${Date.now()}`,
      title: editingStory.title || "",
      subtitle: editingStory.subtitle || "",
      category: (editingStory.category as any) || "Orthopedic Rehab",
      orientation: editingStory.orientation || "portrait",
      videoUrl: finalVideoUrl,
      therapist: editingStory.therapist || "Dr. Kinnera (Lead Physiotherapist)",
      duration: editingStory.duration || "0:45",
      highlights: parsedHighlights,
      clinicalNotes: assessmentText,
      doctorAssessment: assessmentText,
      featured: editingStory.featured ?? true,
      order: editingStory.order ?? 1,
    };

    const res = await saveRecoveryStory(updatedStory);
    setSaving(false);
    setUploadProgress(null);

    if (res.success) {
      setIsModalOpen(false);
      setSelectedFile(null);
      setActionSuccess("Story saved and updated on live website!");
      setTimeout(() => setActionSuccess(null), 3500);
    } else {
      alert(res.error || "Failed to save story. Please try again.");
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
    const updated = { ...story, featured: !story.featured };
    await saveRecoveryStory(updated);
  };

  return (
    <div className="space-y-8 font-['Inter',sans-serif]">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-[#062e36] to-[#0d4550] p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-[#f9ab55]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#f9ab55] text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Therapist Media Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">
            Recovery Stories Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Upload and manage patient clinical videos, configure Portrait (9:16) vs Landscape (16:9) orientation, and toggle homepage carousel features.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href="/stories"
            target="_blank"
            className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>View Live Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={openNewStoryModal}
            className="px-5 py-2.5 rounded-xl bg-[#f9ab55] hover:bg-[#e49b4b] text-[#062e36] text-xs font-black shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Story</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Stories Grid / Cards */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
          <span className="text-xs font-semibold">Loading recovery stories database...</span>
        </div>
      ) : stories.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <Video className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">No stories added yet</p>
          <p className="text-xs text-slate-500">Click &ldquo;Add New Story&rdquo; to publish your first patient rehabilitation video.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Card Header & Video Preview Thumbnail */}
              <div>
                <div className="relative aspect-[16/10] bg-black overflow-hidden group">
                  <video
                    src={story.videoUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[#f9ab55] border border-[#f9ab55]/40 text-[9px] font-black uppercase">
                      <Activity className="w-3 h-3 text-[#f9ab55]" />
                      {story.category}
                    </span>
                  </div>

                  {/* Orientation & Duration Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[9px] font-bold">
                      {story.orientation === "portrait" ? (
                        <Smartphone className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Monitor className="w-3 h-3 text-cyan-400" />
                      )}
                      <span>{story.orientation === "portrait" ? "9:16" : "16:9"}</span>
                    </span>
                  </div>

                  {/* Click to Preview Play Button */}
                  <button
                    onClick={() => setPreviewStory(story)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-[#f9ab55] text-[#062e36] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 active:scale-95 cursor-pointer"
                    title="Preview video"
                  >
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  </button>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                      {story.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {story.subtitle}
                    </p>
                  </div>

                  {/* Highlights Pill Cloud */}
                  {story.highlights && story.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {story.highlights.slice(0, 3).map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          {item}
                        </span>
                      ))}
                      {story.highlights.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">
                          +{story.highlights.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-850/50">
                {/* Homepage Toggle */}
                <button
                  type="button"
                  onClick={() => toggleFeatured(story)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                    story.featured
                      ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20 dark:text-teal-400"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                  title="Toggle homepage carousel display"
                >
                  {story.featured ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{story.featured ? "Home Carousel" : "Stories Only"}</span>
                </button>

                {/* Edit & Delete Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(story)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    title="Edit story details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(story.id, story.title)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    title="Delete story"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- ADD / EDIT STORY MODAL --- */}
      {isModalOpen && editingStory && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]">
                  {editingStory.id?.startsWith("story-") && !stories.some((s) => s.id === editingStory.id)
                    ? "Add Recovery Story"
                    : "Edit Recovery Story"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure clinical video, orientation, and showcase notes.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-left">
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
                  placeholder="e.g. Comminuted Tibia Fracture & Mobilization"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-brand-green"
                />
              </div>

              {/* Subtitle / Clinical Synopsis */}
              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-200 block mb-1">
                  Clinical Subtitle / Case Synopsis
                </label>
                <input
                  type="text"
                  value={editingStory.subtitle || ""}
                  onChange={(e) => setEditingStory({ ...editingStory, subtitle: e.target.value })}
                  placeholder="e.g. Post-ORIF internal fixation restoring full unassisted gait."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-brand-green"
                />
              </div>

              {/* Therapy Category & Orientation (Side by Side) */}
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
                    Video Orientation
                  </label>
                  <select
                    value={editingStory.orientation || "portrait"}
                    onChange={(e) => setEditingStory({ ...editingStory, orientation: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-brand-green"
                  >
                    <option value="portrait">📱 Portrait (9:16 Mobile Reel)</option>
                    <option value="landscape">🖥 Landscape (16:9 Wide)</option>
                  </select>
                </div>
              </div>

              {/* Video Source: Browse Device File (Firebase Storage Ready) + URL option */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileVideo className="w-3.5 h-3.5 text-brand-green" />
                    <span>Video File Source *</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold">Firebase Storage / Local</span>
                </div>

                {/* Browse from Device Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-green/50 dark:border-brand-green/40 bg-brand-green/5 dark:bg-brand-green/10 hover:bg-brand-green/10 dark:hover:bg-brand-green/20 text-brand-green dark:text-teal-400 font-black text-xs cursor-pointer transition-all shadow-2xs group">
                    <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    <span>{selectedFile ? `Selected: ${selectedFile.name}` : "📁 Browse Video File from Device"}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/*"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>

                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
                        setFilePreviewUrl(null);
                      }}
                      className="px-3 py-2 text-xs text-rose-500 hover:text-rose-700 font-bold border border-rose-200 dark:border-rose-900/60 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      Clear File
                    </button>
                  )}
                </div>

                {/* Upload Progress Bar */}
                {uploadProgress !== null && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold text-brand-green dark:text-teal-400">
                      <span>Uploading to Firebase Cloud Storage...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-green transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Direct URL or File Path Input */}
                <div className="pt-1">
                  <input
                    type="text"
                    required={!selectedFile}
                    value={editingStory.videoUrl || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, videoUrl: e.target.value })}
                    placeholder="Or enter video URL/path (e.g. /videos/stories/tibia-fracture-recovery.mp4)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-brand-green"
                  />
                </div>
              </div>

              {/* Doctor's Clinical Assessment & Technique (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200">
                    Doctor&apos;s Clinical Assessment & Technique
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Optional
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={editingStory.doctorAssessment || editingStory.clinicalNotes || ""}
                  onChange={(e) =>
                    setEditingStory({
                      ...editingStory,
                      doctorAssessment: e.target.value,
                      clinicalNotes: e.target.value,
                    })
                  }
                  placeholder="Optional: Enter clinical observations, techniques used, joint angles improved, or leave empty..."
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

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{saving ? "Saving..." : "Save & Publish"}</span>
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
