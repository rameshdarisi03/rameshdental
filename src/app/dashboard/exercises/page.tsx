"use client";

import { useState, useEffect } from "react";
import { 
  Dumbbell, 
  Plus, 
  Search, 
  Trash2, 
  Video, 
  Loader2, 
  X, 
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { 
  ExerciseItem, 
  getExerciseLibrary, 
  addExerciseToLibrary, 
  deleteExerciseFromLibrary, 
  extractYoutubeId 
} from "@/lib/exercisesDb";

const CATEGORIES = [
  "Cervical (Neck)",
  "Shoulder",
  "Lumbar (Low Back)",
  "Hip",
  "Knee",
  "Ankle & Foot",
  "Core Stability",
  "Biceps",
  "Triceps",
  "Hamstrings",
  "Calf",
  "Upper Back"
];

export default function ExerciseLibraryAdminPage() {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal State for adding new exercise
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState("Shoulder");
  const [duration, setDuration] = useState("1:00");
  const [tagsInput, setTagsInput] = useState("STRENGTH, MOBILITY");
  const [defaultSets, setDefaultSets] = useState(3);
  const [defaultReps, setDefaultReps] = useState("10 reps");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExercises();
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
    if (!title || !youtubeUrl) return;

    setSaving(true);
    try {
      const youtubeId = extractYoutubeId(youtubeUrl);
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const newItem = await addExerciseToLibrary({
        title,
        youtubeUrl,
        youtubeId,
        duration: duration || "1:00",
        category,
        tags,
        defaultSets: Number(defaultSets) || 3,
        defaultReps: defaultReps || "10 reps"
      });

      setExercises([newItem, ...exercises]);
      setIsAddModalOpen(false);
      // Reset form
      setTitle("");
      setYoutubeUrl("");
      setCategory("Shoulder");
      setDuration("1:00");
      setTagsInput("STRENGTH, MOBILITY");
    } catch (err) {
      console.error("Error adding exercise:", err);
    } finally {
      setSaving(false);
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
            CLINICAL EXERCISE MANAGEMENT
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            Exercise Video Library
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage the global repository of physiotherapy video demonstrations for home prescription.
          </p>
        </div>

        {/* Top Right + Add Exercise Button */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          Add New Exercise
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises by title, region, or tags..."
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-brand-green"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 mb-3">
                  <img
                    src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`}
                    alt={ex.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 bg-slate-950/80 text-white text-[10px] font-black px-2 py-0.5 rounded-md backdrop-blur-sm">
                    {ex.duration}
                  </span>
                  <a
                    href={`https://www.youtube.com/watch?v=${ex.youtubeId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-2 left-2 bg-red-600/90 text-white text-[10px] font-black px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1 hover:bg-red-700 transition-colors"
                  >
                    <Video className="h-3 w-3" /> YouTube
                  </a>
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

              {/* Bottom Action Footer */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">ID: {ex.youtubeId}</span>
                <button
                  onClick={() => handleDeleteExercise(ex.id)}
                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  title="Delete exercise from library"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Exercise Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Add Video Exercise</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddExercise} className="space-y-4">
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
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  YouTube Video Link or ID
                </label>
                <input
                  type="text"
                  required
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/watch?v=wD7V2F3eRns"
                  className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Anatomical Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Duration (MM:SS)
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="1:00"
                    className="w-full px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Default Sets
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={defaultSets}
                    onChange={(e) => setDefaultSets(Number(e.target.value))}
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
                    placeholder="10 reps"
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

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Save to Exercise Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
