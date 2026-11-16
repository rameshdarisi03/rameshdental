"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Trash2, 
  Video, 
  Loader2, 
  X, 
  ExternalLink,
  CheckCircle2,
  MoreVertical,
  Pencil,
  Play
} from "lucide-react";
import { 
  ExerciseItem, 
  getExerciseLibrary, 
  addExerciseToLibrary, 
  deleteExerciseFromLibrary, 
  updateExerciseInLibrary,
  extractYoutubeId 
} from "@/lib/exercisesDb";

const CATEGORIES = [
  "Post-Extraction & Surgery",
  "Root Canal (RCT) Care",
  "Dental Implants Care",
  "Clear Aligners & Ortho",
  "Gums & Periodontal Care",
  "Crowns & Bridges Care",
  "TMJ & Jaw Relaxation",
  "Pediatric & Preventive",
];

export default function ExerciseLibraryAdminPage() {
  const [mounted, setMounted] = useState(false);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Video Player Modal State
  const [playingVideo, setPlayingVideo] = useState<ExerciseItem | null>(null);

  // Modal State for adding new exercise
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState("Shoulder");
  const [duration, setDuration] = useState("1:00");
  const [tagsInput, setTagsInput] = useState("STRENGTH, MOBILITY");
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState("10");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  // Modal State for editing exercise
  const [editingExercise, setEditingExercise] = useState<ExerciseItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editCategory, setEditCategory] = useState("Shoulder");
  const [editDuration, setEditDuration] = useState("1:00");
  const [editTagsInput, setEditTagsInput] = useState("STRENGTH, MOBILITY");
  const [editDefaultSets, setEditDefaultSets] = useState(3);
  const [editDefaultReps, setEditDefaultReps] = useState("10");
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setMounted(true);
    loadExercises();

    // Close menu when clicking outside
    const handleGlobalClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const data = await getExerciseLibrary();
      setExercises(data);
    } catch (err) {
      console.error("Failed to load exercises:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!title.trim() || !youtubeUrl.trim()) {
      setAddError("Please fill in both the exercise title and YouTube URL.");
      return;
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId || youtubeId.length < 5) {
      setAddError("Could not detect a valid YouTube video ID from the URL. Please verify the link.");
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const newItem = await addExerciseToLibrary({
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        youtubeId,
        duration: duration.trim() || "1:00",
        category,
        tags: tags.length > 0 ? tags : [category.toUpperCase()],
        defaultSets: Number(defaultSets) || 3,
        defaultReps: String(defaultReps).trim() || "10"
      });

      setExercises([newItem, ...exercises]);
      setIsAddModalOpen(false);
      // Reset form
      setTitle("");
      setYoutubeUrl("");
      setCategory("Shoulder");
      setDuration("1:00");
      setTagsInput("STRENGTH, MOBILITY");
      setDefaultSets(3);
      setDefaultReps("10");
      setAddError("");
    } catch (err: any) {
      console.error("Error adding exercise:", err);
      setAddError(err?.message || "Failed to save exercise to database. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditModal = (ex: ExerciseItem) => {
    setEditingExercise(ex);
    setEditTitle(ex.title);
    setEditYoutubeUrl(ex.youtubeUrl || `https://www.youtube.com/watch?v=${ex.youtubeId}`);
    setEditCategory(ex.category);
    setEditDuration(ex.duration || "1:00");
    setEditTagsInput((ex.tags || []).join(", "));
    setEditDefaultSets(ex.defaultSets || 3);
    setEditDefaultReps(ex.defaultReps || "10");
    setEditError("");
  };

  const handleUpdateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!editingExercise || !editTitle.trim() || !editYoutubeUrl.trim()) {
      setEditError("Please fill in both the exercise title and YouTube URL.");
      return;
    }

    const youtubeId = extractYoutubeId(editYoutubeUrl);
    if (!youtubeId || youtubeId.length < 5) {
      setEditError("Could not detect a valid YouTube video ID from the URL. Please verify the link.");
      return;
    }

    setUpdating(true);
    try {
      const tags = editTagsInput
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const updatedPayload = {
        title: editTitle.trim(),
        youtubeUrl: editYoutubeUrl.trim(),
        youtubeId,
        duration: editDuration.trim() || "1:00",
        category: editCategory,
        tags: tags.length > 0 ? tags : [editCategory.toUpperCase()],
        defaultSets: Number(editDefaultSets) || 3,
        defaultReps: String(editDefaultReps).trim() || "10"
      };

      await updateExerciseInLibrary(editingExercise.id, updatedPayload);

      setExercises(
        exercises.map((item) => {
          if (item.id === editingExercise.id) {
            return { ...item, ...updatedPayload };
          }
          return item;
        })
      );

      setEditingExercise(null);
      setEditError("");
    } catch (err: any) {
      console.error("Error updating exercise:", err);
      setEditError(err?.message || "Failed to update exercise. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("Are you sure you want to remove this exercise from the clinic library?")) return;
    try {
      await deleteExerciseFromLibrary(id);
      setExercises(exercises.filter((ex) => ex.id !== id));
    } catch (err) {
      console.error("Error deleting exercise:", err);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesCat = selectedCategory === "All" || ex.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = 
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-brand-green dark:text-teal-400 uppercase">
            PATIENT EDUCATION & RECOVERY PROTOCOLS
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            Dental Post-Op & Oral Care Protocols
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage instructional protocols for post-extraction, root canal recovery, dental implants, and aligner hygiene.
          </p>
        </div>

        {/* Top Right + Add Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Add Dental Protocol
        </button>
      </div>

      {/* Filter & Search Bar Container */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Top Row: Full Width Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises by title, category, or tags (e.g. Shoulder, Core, Mobility)..."
            className="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green transition-colors shadow-inner"
          />
        </div>

        {/* Second Row: Category Filter Pills below Search Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "All"
                ? "bg-brand-green text-white shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All ({exercises.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brand-green text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
          <p className="text-xs font-bold text-slate-400">Loading library repository...</p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl">
          <Dumbbell className="h-12 w-12 mx-auto text-slate-300" />
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">No exercises found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-semibold">
            Click the "+ Add New Exercise" button on the top right to paste a YouTube video link and expand your library.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredExercises.map((ex) => (
            <div
              key={ex.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* YouTube Video Preview Frame */}
                <div 
                  onClick={() => setPlayingVideo(ex)}
                  className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 mb-3 cursor-pointer group/thumb"
                  title="Click to play video"
                >
                  <img
                    src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                    alt={ex.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-slate-950/20 group-hover/thumb:bg-slate-950/40 transition-colors flex items-center justify-center">
                    <div className="h-11 w-11 rounded-full bg-brand-green/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {ex.duration}
                  </span>
                </div>

                {/* Title & Category */}
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {ex.title}
                  </h3>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-brand-green dark:text-teal-400">
                    {ex.category}
                  </p>
                </div>

                {/* Default Target */}
                <p className="text-xs font-semibold text-slate-500 pt-2">
                  Default Target: <span className="font-bold text-slate-800 dark:text-slate-200">{ex.defaultSets} sets × {ex.defaultReps}</span>
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {ex.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Action Footer with Three-Dots Menu Button */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative">
                <span className="text-[10px] font-bold text-slate-400">ID: {ex.youtubeId}</span>
                
                {/* Three Dots Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === ex.id ? null : ex.id)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {openMenuId === ex.id && (
                    <div className="absolute right-0 bottom-8 z-30 w-44 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl p-1.5 space-y-1 animate-fade-in">
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          handleOpenEditModal(ex);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-brand-green" />
                        Edit Link & Details
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          handleDeleteExercise(ex.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        Remove Exercise
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Exercise Modal */}
      {mounted && isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-green/10 via-white to-brand-sand/30 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Video Exercise</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clinical library item with YouTube video sync</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExercise} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {addError && (
                  <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/50 flex items-center justify-between">
                    <span>{addError}</span>
                    <button type="button" onClick={() => setAddError("")} className="text-xs font-bold px-1.5 py-0.5 hover:opacity-75">✕</button>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Exercise Title
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Scapular Retractions with Resistance Band"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                      YouTube Video Link or ID
                    </label>
                    <span className="text-[10px] font-bold text-brand-green dark:text-teal-400">
                      Auto-detects URLs & IDs
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=wD7V2F3eRns"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green font-mono"
                  />
                </div>

                {youtubeUrl && extractYoutubeId(youtubeUrl) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <img
                      src={`https://img.youtube.com/vi/${extractYoutubeId(youtubeUrl)}/mqdefault.jpg`}
                      alt="YouTube Preview"
                      className="w-20 h-12 rounded-xl object-cover shrink-0 bg-black"
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                    <div className="text-[11px] leading-tight">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Valid YouTube Video Detected
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ID: {extractYoutubeId(youtubeUrl)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Target Anatomy / Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 1:00 or 45 sec"
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Default Sets
                    </label>
                    <input
                      type="text"
                      value={defaultSets}
                      onChange={(e) => setDefaultSets(e.target.value)}
                      placeholder="3"
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Default Reps / Hold
                    </label>
                    <input
                      type="text"
                      value={defaultReps}
                      onChange={(e) => setDefaultReps(e.target.value)}
                      placeholder="10"
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="SHOULDER, MOBILITY, STRENGTH"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Exercise Library"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Exercise Modal */}
      {mounted && editingExercise && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-green/10 via-white to-brand-sand/30 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-green text-white flex items-center justify-center shadow-sm shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Edit Exercise Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify clinical instructions and video link</p>
                </div>
              </div>
              <button
                onClick={() => setEditingExercise(null)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExercise} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {editError && (
                  <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-900/50 flex items-center justify-between">
                    <span>{editError}</span>
                    <button type="button" onClick={() => setEditError("")} className="text-xs font-bold px-1.5 py-0.5 hover:opacity-75">✕</button>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Exercise Title
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    YouTube Video Link or ID
                  </label>
                  <input
                    type="text"
                    required
                    value={editYoutubeUrl}
                    onChange={(e) => setEditYoutubeUrl(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green font-mono"
                  />
                </div>

                {editYoutubeUrl && extractYoutubeId(editYoutubeUrl) && (
                  <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                    <img
                      src={`https://img.youtube.com/vi/${extractYoutubeId(editYoutubeUrl)}/mqdefault.jpg`}
                      alt="YouTube Preview"
                      className="w-20 h-12 rounded-xl object-cover shrink-0 bg-black"
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                    <div className="text-[11px] leading-tight">
                      <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Valid YouTube Video Detected
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ID: {extractYoutubeId(editYoutubeUrl)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Target Anatomy / Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Estimated Duration
                    </label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      placeholder="e.g. 1:00 or 45 sec"
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Default Sets
                    </label>
                    <input
                      type="text"
                      value={editDefaultSets}
                      onChange={(e) => setEditDefaultSets(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      Default Reps / Hold
                    </label>
                    <input
                      type="text"
                      value={editDefaultReps}
                      onChange={(e) => setEditDefaultReps(e.target.value)}
                      className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editTagsInput}
                    onChange={(e) => setEditTagsInput(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingExercise(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-2.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Video Player Modal */}
      {mounted && playingVideo && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">
                  {playingVideo.category}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">{playingVideo.title}</h3>
              </div>
              <button
                onClick={() => setPlayingVideo(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex items-center justify-center bg-black">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-inner">
                <iframe
                  src={`https://www.youtube.com/embed/${playingVideo.youtubeId}?autoplay=1`}
                  title={playingVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
