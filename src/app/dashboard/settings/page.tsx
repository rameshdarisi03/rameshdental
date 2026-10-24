"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  getClinicConfig, 
  saveClinicConfig, 
  ClinicConfig, 
  generateSlotsFromHours, 
  getSlotCapacity, 
  DEFAULT_DAY_SCHEDULES, 
  DaySchedule, 
  WeekdayKey,
  TeamDoctorProfile,
  DEFAULT_TEAM_MEMBERS,
  HeroPresetOption
} from "@/lib/db";
import { 
  Loader2, 
  Save, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Users, 
  Trash2, 
  Plus, 
  MapPin, 
  Mail, 
  Phone,
  Settings,
  Globe,
  Bell,
  Info,
  User,
  UserMinus,
  Map,
  Layers,
  Sparkles,
  HelpCircle,
  Power,
  AlertTriangle,
  RotateCcw,
  Palette,
  Check,
  Copy,
  X,
  Camera,
  Upload,
  Eye,
  EyeOff,
  Edit3,
  Stethoscope,
  Crop,
  Move,
  ZoomIn,
  ZoomOut,
  Monitor,
  Smartphone,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Library,
  CalendarSync
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { THEME_OPTIONS, ThemeKey } from "@/components/public/ThemeSwitcher";
import { syncMetaThemeColor } from "@/lib/themeHelper";
import WhatsAppUsageCard from "@/components/dashboard/WhatsAppUsageCard";

interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "receptionist";
  name: string;
}

interface ConfigChangeItem {
  category: string;
  detail: string;
}

function computeConfigDiff(
  initial: ClinicConfig | null, 
  current: ClinicConfig,
  themeDiff?: { initialTheme: ThemeKey; currentTheme: ThemeKey }
): ConfigChangeItem[] {
  if (!initial) return [];
  const diffs: ConfigChangeItem[] = [];

  // 1. Online booking toggle
  if (initial.enablePublicBooking !== current.enablePublicBooking) {
    diffs.push({
      category: "Public Booking",
      detail: current.enablePublicBooking !== false ? "Switched to Enabled (Online Appointment Booking)" : "Switched to Disabled (Direct WhatsApp/Call Mode)",
    });
  }

  // 2. Slot duration
  if (initial.slotDuration !== current.slotDuration) {
    diffs.push({
      category: "Slot Duration",
      detail: `Changed from ${initial.slotDuration} min to ${current.slotDuration} min`,
    });
  }

  // 3. Shifts & Sessions
  if (initial.morningStart !== current.morningStart || initial.morningEnd !== current.morningEnd) {
    diffs.push({
      category: "Morning Session",
      detail: `${current.morningStart} – ${current.morningEnd} (previously ${initial.morningStart} – ${initial.morningEnd})`,
    });
  }

  if (initial.eveningStart !== current.eveningStart || initial.eveningEnd !== current.eveningEnd) {
    diffs.push({
      category: "Evening Session",
      detail: `${current.eveningStart} – ${current.eveningEnd} (previously ${initial.eveningStart} – ${initial.eveningEnd})`,
    });
  }

  // 4. Day-by-Day schedule
  const days: Array<{ key: WeekdayKey; label: string }> = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  days.forEach(({ key, label }) => {
    const initDay = initial.daySchedules?.[key] || DEFAULT_DAY_SCHEDULES[key];
    const currDay = current.daySchedules?.[key] || DEFAULT_DAY_SCHEDULES[key];

    if (initDay.isOpen !== currDay.isOpen) {
      if (!currDay.isOpen) {
        diffs.push({
          category: `${label}`,
          detail: `Marked as Closed (was Open ${initDay.openTime} – ${initDay.closeTime})`,
        });
      } else {
        diffs.push({
          category: `${label}`,
          detail: `Marked as Open (${currDay.openTime} – ${currDay.closeTime})`,
        });
      }
    } else if (currDay.isOpen && (initDay.openTime !== currDay.openTime || initDay.closeTime !== currDay.closeTime)) {
      diffs.push({
        category: `${label}`,
        detail: `Hours changed to ${currDay.openTime} – ${currDay.closeTime} (was ${initDay.openTime} – ${initDay.closeTime})`,
      });
    }
  });

  // 5. Therapists list
  const initTherapists = initial.therapists || [];
  const currTherapists = current.therapists || [];
  const addedTherapists = currTherapists.filter((t) => !initTherapists.includes(t));
  const removedTherapists = initTherapists.filter((t) => !currTherapists.includes(t));

  if (addedTherapists.length > 0) {
    diffs.push({
      category: "Therapists Added",
      detail: `+ ${addedTherapists.join(", ")}`,
    });
  }
  if (removedTherapists.length > 0) {
    diffs.push({
      category: "Therapists Removed",
      detail: `- ${removedTherapists.join(", ")}`,
    });
  }

  // Doctor Profiles & Photos
  if (JSON.stringify(initial.teamMembers || []) !== JSON.stringify(current.teamMembers || [])) {
    const count = current.teamMembers?.length || 0;
    diffs.push({
      category: "Doctors & Roster",
      detail: `Clinical team profiles or photos modified (${count} doctor${count === 1 ? '' : 's'} enrolled)`,
    });
  }

  // 6. Capacity & Overrides
  if (initial.defaultCapacityPerSlot !== current.defaultCapacityPerSlot) {
    diffs.push({
      category: "Slot Capacity",
      detail: `Default changed to ${current.defaultCapacityPerSlot} patients/slot (was ${initial.defaultCapacityPerSlot})`,
    });
  }
  if (JSON.stringify(initial.hourlyCapacityOverrides || {}) !== JSON.stringify(current.hourlyCapacityOverrides || {})) {
    const count = Object.keys(current.hourlyCapacityOverrides || {}).length;
    diffs.push({
      category: "Hourly Overrides",
      detail: `Custom hourly slot capacities updated (${count} active override${count === 1 ? '' : 's'})`,
    });
  }

  // 7. Booking & Walk-in Rules
  if (initial.adminWalkInGraceType !== current.adminWalkInGraceType) {
    diffs.push({
      category: "Walk-in Grace",
      detail: `Tolerance set to ${current.adminWalkInGraceType?.replace(/_/g, " ")}`,
    });
  }
  if (initial.publicBookingCutoffMinutes !== current.publicBookingCutoffMinutes) {
    diffs.push({
      category: "Booking Cutoff",
      detail: `Cutoff set to ${current.publicBookingCutoffMinutes} min prior`,
    });
  }

  // 8. Contact & Location
  if (initial.phone !== current.phone && (initial.phone || current.phone)) {
    diffs.push({
      category: "Phone Number",
      detail: `${current.phone || "cleared"}`,
    });
  }
  if (initial.email !== current.email && (initial.email || current.email)) {
    diffs.push({
      category: "Email Address",
      detail: `${current.email || "cleared"}`,
    });
  }
  if (initial.address !== current.address && (initial.address || current.address)) {
    diffs.push({
      category: "Clinic Address",
      detail: `Location address text updated`,
    });
  }
  if (initial.googleMapsLink !== current.googleMapsLink && (initial.googleMapsLink || current.googleMapsLink)) {
    diffs.push({
      category: "Google Maps Link",
      detail: `Directions URL updated`,
    });
  }
  if ((initial.landmark || "") !== (current.landmark || "")) {
    diffs.push({
      category: "Landmark",
      detail: current.landmark ? `Updated to "${current.landmark}"` : "Cleared",
    });
  }
  if ((initial.googleMapsEmbed || "") !== (current.googleMapsEmbed || "")) {
    diffs.push({
      category: "Interactive Map",
      detail: current.googleMapsEmbed ? "Interactive Google Maps embed updated" : "Embed code cleared",
    });
  }
  if ((initial.operationalHoursText || "").trim() !== (current.operationalHoursText || "").trim()) {
    diffs.push({
      category: "Hours Note",
      detail: current.operationalHoursText ? "Custom schedule summary text updated" : "Reset to default auto-generated format",
    });
  }

  // 9. Website Cover Banners
  if ((initial.heroDesktopImage || "") !== (current.heroDesktopImage || "")) {
    diffs.push({
      category: "Desktop Hero Banner",
      detail: current.heroDesktopImage ? "Updated desktop cover image" : "Reset to default",
    });
  }
  if ((initial.heroMobileImage || "") !== (current.heroMobileImage || "")) {
    diffs.push({
      category: "Mobile Hero Banner",
      detail: current.heroMobileImage ? "Updated mobile cover image" : "Reset to default",
    });
  }

  // 10. Website Color Theme
  if (themeDiff && themeDiff.initialTheme !== themeDiff.currentTheme) {
    const initThemeObj = THEME_OPTIONS.find((t) => t.id === themeDiff.initialTheme);
    const currThemeObj = THEME_OPTIONS.find((t) => t.id === themeDiff.currentTheme);
    diffs.push({
      category: "Website Theme",
      detail: `Color palette changed to ${currThemeObj?.name || themeDiff.currentTheme} (was ${initThemeObj?.name || themeDiff.initialTheme})`,
    });
  }

  // 11. Presets Library Changes
  if ((initial.customHeroPresets?.length || 0) !== (current.customHeroPresets?.length || 0)) {
    const diff = (current.customHeroPresets?.length || 0) - (initial.customHeroPresets?.length || 0);
    diffs.push({
      category: "Presets Library",
      detail: diff > 0 ? `Added ${diff} custom photo(s) to library` : `Removed ${Math.abs(diff)} photo(s) from library`,
    });
  }

  return diffs;
}

export const BUILTIN_HERO_PRESETS: HeroPresetOption[] = [
  {
    id: "mobile_teal_2",
    title: "Medical Teal Studio (Wooden Flooring)",
    subtitle: "Therapists' favorite — warm wood plank flooring, gym balls & zero clinic logos",
    url: "/images/mobile_cover_teal_option_2.webp",
    recommendedBadge: "⭐ Therapists' Pick (Mobile)",
    tag: "Therapists' Favorite",
  },
  {
    id: "desktop_teal_wooden",
    title: "Teal Studio Panoramic (Wooden Flooring)",
    subtitle: "Widescreen 16:9 panoramic view with matching wood flooring & zero clinic logos",
    url: "/images/hero_cover_teal_wooden_floor.webp",
    recommendedBadge: "⭐ Therapists' Pick (Desktop)",
    tag: "Widescreen Studio",
  },
  {
    id: "spine_decompression",
    title: "Spine Decompression Treatment",
    subtitle: "Patient undergoing lumbar decompression therapy on specialized traction unit",
    url: "/images/hero_cover_option_1_spine.webp",
    recommendedBadge: "Default Desktop",
    tag: "Clinical Decompression",
  },
  {
    id: "mobile_teal_1",
    title: "Medical Teal Treatment Suite",
    subtitle: "Contemporary consultation suite with advanced rehabilitation gear",
    url: "/images/mobile_cover_teal_option_1.webp",
    tag: "Consultation Suite",
  },
  {
    id: "knee_rehab",
    title: "Knee Rehabilitation Session",
    subtitle: "Guided lower-limb strengthening and active mobility training",
    url: "/images/hero_cover_option_2_knee.webp",
    tag: "Active Rehabilitation",
  },
  {
    id: "panoramic_cover",
    title: "Panoramic Clinical Cover",
    subtitle: "Cinematic wide overview of modern physiotherapy facility",
    url: "/images/hero_panoramic_cover.webp",
    tag: "Wide Studio",
  },
  {
    id: "rehab_gym",
    title: "Rehabilitation Gym Suite",
    subtitle: "Spacious training hall with parallel walking bars and exercise benches",
    url: "/images/gallery/rehab_gym_wide.webp",
    tag: "Gym & Ambience",
  },
  {
    id: "clinic_ambience",
    title: "Clinic Ambience & Gym Balls",
    subtitle: "Clean natural light studio ambience with therapy accessories",
    url: "/images/hero_mobile_balls_ambience.webp",
    tag: "Studio Ambience",
  },
];

type CropTarget = "doctor" | "hero_desktop" | "hero_mobile";

const getCropperConfig = (target: CropTarget) => {
  switch (target) {
    case "hero_desktop":
      return {
        viewfinderW: 460,
        viewfinderH: 215, // ~16:7 panoramic
        outW: 1600,
        outH: 750,
        title: "Frame & Position Desktop Hero Banner",
        subtitle: "Panoramic aspect ratio (~16:7) for desktop & widescreen displays",
        ratioLabel: "16:7 PANORAMIC DESKTOP RATIO",
      };
    case "hero_mobile":
      return {
        viewfinderW: 240,
        viewfinderH: 360, // 2:3 portrait
        outW: 720,
        outH: 1080,
        title: "Frame & Position Mobile Hero Banner",
        subtitle: "Vertical aspect ratio (2:3 / 9:16) for smartphone screens",
        ratioLabel: "2:3 PORTRAIT MOBILE RATIO",
      };
    case "doctor":
    default:
      return {
        viewfinderW: 300,
        viewfinderH: 375, // 4:5 portrait
        outW: 600,
        outH: 750,
        title: "Frame & Position Portrait",
        subtitle: "Drag & zoom to ensure head & face aren't chopped off",
        ratioLabel: "4:5 PORTRAIT RATIO",
      };
  }
};

export default function DashboardSettings() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>("teal");
  const [initialTheme, setInitialTheme] = useState<ThemeKey>("teal");

  // Practo Calendar Sync state & handlers
  const [testingPracto, setTestingPracto] = useState(false);
  const [practoSyncResult, setPractoSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestPractoSync = async () => {
    if (!config.practoIcalUrl || !config.practoIcalUrl.trim()) {
      alert("Please enter Dr. Kinnera's Practo iCal URL before testing the sync.");
      return;
    }
    setTestingPracto(true);
    setPractoSyncResult(null);
    try {
      const res = await fetch("/api/practo/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideUrl: config.practoIcalUrl,
          doctorName: config.practoDoctorName || "Dr.Kinnera",
        }),
      });
      const data = await res.json();
      setPractoSyncResult({
        success: data.success,
        message: data.message,
      });
      if (data.success) {
        setIsDirty(true);
      }
    } catch (err: any) {
      setPractoSyncResult({
        success: false,
        message: err.message || "Network error while connecting to Practo.",
      });
    } finally {
      setTestingPracto(false);
    }
  };

  // Initial config snapshot to compute granular diff
  const [initialConfig, setInitialConfig] = useState<ClinicConfig | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Expandable Hourly Overrides & Help Tooltip state
  const [showHourlyOverrides, setShowHourlyOverrides] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  // Settings State
  const [config, setConfig] = useState<ClinicConfig>({
    enablePublicBooking: true,
    weeklyHolidays: {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
    },
    daySchedules: DEFAULT_DAY_SCHEDULES,
    slotDuration: 30,
    defaultCapacityPerSlot: 3,
    hourlyCapacityOverrides: {},
    morningStart: "09:30 AM",
    morningEnd: "01:00 PM",
    eveningStart: "02:00 PM",
    eveningEnd: "08:00 PM",
    operationalHoursText: "",
    therapists: ["Dr. Madem Kinnera", "Dr. Mohammad", "Dr. Charmi"],
    teamMembers: DEFAULT_TEAM_MEMBERS,
    address: "",
    landmark: "",
    phone: "",
    email: "",
    googleMapsLink: "",
    adminWalkInGraceType: "end_of_slot",
    publicBookingCutoffMinutes: 0,
    googleMapsEmbed: "",
    heroDesktopImage: "/images/hero_cover_teal_wooden_floor.webp",
    heroMobileImage: "/images/mobile_cover_teal_option_2.webp",
    customHeroPresets: [],
  });

  const [newTherapistName, setNewTherapistName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState("Oct 12, 2023, 10:45 AM");

  // Doctor Profile & Photo Manager state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingDoctor, setEditingDoctor] = useState<TeamDoctorProfile | null>(null);
  const [isNewDoctor, setIsNewDoctor] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [formDocName, setFormDocName] = useState("");
  const [formDocRole, setFormDocRole] = useState("");
  const [formDocQualifications, setFormDocQualifications] = useState("");
  const [formDocExperience, setFormDocExperience] = useState("");
  const [formDocSpecialties, setFormDocSpecialties] = useState("");
  const [formDocImage, setFormDocImage] = useState("");
  const [formDocBio, setFormDocBio] = useState("");
  const [formDocIsActive, setFormDocIsActive] = useState(true);
  const [formDocOrder, setFormDocOrder] = useState(1);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleOpenAddDoctor = () => {
    setIsNewDoctor(true);
    setEditingDoctor(null);
    setFormDocName("");
    setFormDocRole("Physiotherapist & Rehabilitation Specialist");
    setFormDocQualifications("BPT, MIAP");
    setFormDocExperience("3+ Years Clinical Practice");
    setFormDocSpecialties("Musculoskeletal Rehab, Postural Assessment, Manual Therapy");
    setFormDocImage("/images/dr-kinnera-portrait.jpg");
    setFormDocBio("");
    setFormDocIsActive(true);
    const count = (config.teamMembers && config.teamMembers.length > 0) ? config.teamMembers.length : DEFAULT_TEAM_MEMBERS.length;
    setFormDocOrder(count + 1);
    setShowDoctorModal(true);
  };

  const handleOpenEditDoctor = (doc: TeamDoctorProfile) => {
    setIsNewDoctor(false);
    setEditingDoctor(doc);
    setFormDocName(doc.name);
    setFormDocRole(doc.role);
    setFormDocQualifications(doc.qualifications || "");
    setFormDocExperience(doc.experience || "");
    setFormDocSpecialties((doc.specialties || []).join(", "));
    setFormDocImage(doc.image || "");
    setFormDocBio(doc.bio || "");
    setFormDocIsActive(doc.isActive !== false);
    setFormDocOrder(doc.displayOrder || 1);
    setShowDoctorModal(true);
  };

  // Interactive Photo Framing & Positioner Cropper Modal State
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget>("doctor");
  const [cropperRawSrc, setCropperRawSrc] = useState<string>("");
  const [cropZoom, setCropZoom] = useState(1);
  const [cropPanX, setCropPanX] = useState(0);
  const [cropPanY, setCropPanY] = useState(0);
  const [cropNaturalWidth, setCropNaturalWidth] = useState(0);
  const [cropNaturalHeight, setCropNaturalHeight] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartPan, setDragStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hero Cover Banners Upload Refs & States
  const heroDesktopFileInputRef = useRef<HTMLInputElement>(null);
  const heroMobileFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingHeroDesktop, setUploadingHeroDesktop] = useState(false);
  const [uploadingHeroMobile, setUploadingHeroMobile] = useState(false);

  // Toggle in Cropper Modal to automatically append newly cropped image into Preset Library
  const [addToLibraryOnCrop, setAddToLibraryOnCrop] = useState(true);

  // Unified Curated Built-in Presets + Custom Uploaded Library Presets
  const allHeroPresets: HeroPresetOption[] = useMemo(() => [
    ...BUILTIN_HERO_PRESETS,
    ...(config.customHeroPresets || []),
  ], [config.customHeroPresets]);

  // Hero Presets Carousel State
  const [presetCarouselIndex, setPresetCarouselIndex] = useState(0);

  const handlePrevPreset = () => {
    setPresetCarouselIndex((prev) => (prev > 0 ? prev - 1 : allHeroPresets.length - 1));
  };

  const handleNextPreset = () => {
    setPresetCarouselIndex((prev) => (prev < allHeroPresets.length - 1 ? prev + 1 : 0));
  };

  // Helper: Manually or automatically add an image into Presets Library
  const handleAddImageToLibrary = (imageUrl: string, type: "desktop" | "mobile" | "custom", customTitle?: string) => {
    if (!imageUrl) return;
    const exists = allHeroPresets.some((p) => p.url === imageUrl);
    if (exists) {
      alert("This image is already in your Presets Library.");
      return;
    }

    const newPreset: HeroPresetOption = {
      id: `custom_${Date.now()}`,
      title: customTitle || (type === "desktop" ? "Custom Desktop Panoramic" : type === "mobile" ? "Custom Mobile Cover" : "Clinic Custom Photo"),
      subtitle: `Added to library on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
      url: imageUrl,
      tag: type === "desktop" ? "Custom Desktop" : type === "mobile" ? "Custom Mobile" : "Clinic Upload",
      isCustom: true,
      uploadedAt: new Date().toISOString(),
    };

    const updatedCustom = [...(config.customHeroPresets || []), newPreset];
    setConfig((prev) => ({
      ...prev,
      customHeroPresets: updatedCustom,
    }));
    setIsDirty(true);
    setSavedSuccess(false);

    // Immediately navigate carousel to the newly added item
    setPresetCarouselIndex(BUILTIN_HERO_PRESETS.length + updatedCustom.length - 1);
  };

  // Helper: Remove a custom uploaded image from Presets Library
  const handleRemoveCustomPreset = (presetId: string) => {
    if (!confirm("Are you sure you want to remove this custom photo from your Presets Library?")) return;
    const updated = (config.customHeroPresets || []).filter((p) => p.id !== presetId);
    setConfig((prev) => ({
      ...prev,
      customHeroPresets: updated,
    }));
    setIsDirty(true);
    setSavedSuccess(false);
    setPresetCarouselIndex((prev) => Math.max(0, Math.min(prev, BUILTIN_HERO_PRESETS.length + updated.length - 1)));
  };

  const openCropperWithImage = (url: string, target: CropTarget = "doctor") => {
    if (!url) return;
    setCropTarget(target);
    setUploadingPhoto(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      setCropNaturalWidth(nw);
      setCropNaturalHeight(nh);
      setCropperRawSrc(url);
      setCropZoom(1);

      const cfg = getCropperConfig(target);
      const baseScale = Math.max(cfg.viewfinderW / nw, cfg.viewfinderH / nh) || 1;
      const dispH = nh * baseScale;
      const defaultShiftY = dispH > cfg.viewfinderH ? Math.round((dispH - cfg.viewfinderH) * 0.2) : 0;
      setCropPanX(0);
      setCropPanY(defaultShiftY);

      setUploadingPhoto(false);
      setShowCropperModal(true);
    };
    img.onerror = () => {
      setUploadingPhoto(false);
      alert("Could not load image for positioning. Please check image URL or file.");
    };
    img.src = url;
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      openCropperWithImage(rawDataUrl, "doctor");
    };
    reader.onerror = () => {
      setUploadingPhoto(false);
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleHeroDesktopFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setUploadingHeroDesktop(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      openCropperWithImage(rawDataUrl, "hero_desktop");
      setUploadingHeroDesktop(false);
    };
    reader.onerror = () => {
      setUploadingHeroDesktop(false);
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleHeroMobileFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setUploadingHeroMobile(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      openCropperWithImage(rawDataUrl, "hero_mobile");
      setUploadingHeroMobile(false);
    };
    reader.onerror = () => {
      setUploadingHeroMobile(false);
      alert("Failed to read file.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleViewfinderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingCrop(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartPan({ x: cropPanX, y: cropPanY });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleViewfinderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop) return;
    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;
    setCropPanX(dragStartPan.x + deltaX);
    setCropPanY(dragStartPan.y + deltaY);
  };

  const handleViewfinderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingCrop) {
      setIsDraggingCrop(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  const handleApplyCrop = () => {
    if (!cropperRawSrc || cropNaturalWidth === 0 || cropNaturalHeight === 0) return;

    try {
      const cfg = getCropperConfig(cropTarget);
      const canvas = document.createElement("canvas");
      canvas.width = cfg.outW;
      canvas.height = cfg.outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const renderOntoCanvas = (loadedImg: HTMLImageElement) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cfg.outW, cfg.outH);

        const baseScale = Math.max(cfg.viewfinderW / cropNaturalWidth, cfg.viewfinderH / cropNaturalHeight) || 1;
        const currentScale = baseScale * cropZoom;
        const displayedW = cropNaturalWidth * currentScale;
        const displayedH = cropNaturalHeight * currentScale;

        const R = cfg.outW / cfg.viewfinderW;

        const drawX = ((cfg.viewfinderW - displayedW) / 2 + cropPanX) * R;
        const drawY = ((cfg.viewfinderH - displayedH) / 2 + cropPanY) * R;
        const drawW = displayedW * R;
        const drawH = displayedH * R;

        ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
        try {
          const resultBase64 = canvas.toDataURL("image/jpeg", 0.90);
          if (cropTarget === "hero_desktop") {
            let nextIndex = -1;
            setConfig((prev) => {
              const next = { ...prev, heroDesktopImage: resultBase64 };
              if (addToLibraryOnCrop) {
                const newPreset: HeroPresetOption = {
                  id: `custom_${Date.now()}`,
                  title: "Custom Desktop Panoramic",
                  subtitle: `Uploaded on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                  url: resultBase64,
                  tag: "Custom Desktop",
                  isCustom: true,
                  uploadedAt: new Date().toISOString(),
                };
                const updatedList = [...(prev.customHeroPresets || []), newPreset];
                next.customHeroPresets = updatedList;
                nextIndex = BUILTIN_HERO_PRESETS.length + updatedList.length - 1;
              }
              return next;
            });
            if (nextIndex >= 0) {
              setPresetCarouselIndex(nextIndex);
            }
            setIsDirty(true);
            setSavedSuccess(false);
          } else if (cropTarget === "hero_mobile") {
            let nextIndex = -1;
            setConfig((prev) => {
              const next = { ...prev, heroMobileImage: resultBase64 };
              if (addToLibraryOnCrop) {
                const newPreset: HeroPresetOption = {
                  id: `custom_${Date.now()}`,
                  title: "Custom Mobile Cover",
                  subtitle: `Uploaded on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
                  url: resultBase64,
                  tag: "Custom Mobile",
                  isCustom: true,
                  uploadedAt: new Date().toISOString(),
                };
                const updatedList = [...(prev.customHeroPresets || []), newPreset];
                next.customHeroPresets = updatedList;
                nextIndex = BUILTIN_HERO_PRESETS.length + updatedList.length - 1;
              }
              return next;
            });
            if (nextIndex >= 0) {
              setPresetCarouselIndex(nextIndex);
            }
            setIsDirty(true);
            setSavedSuccess(false);
          } else {
            setFormDocImage(resultBase64);
          }
          setShowCropperModal(false);
        } catch (exportErr) {
          console.error("Export canvas error:", exportErr);
          alert("Browser security prevented exporting external image. Please upload a photo from your computer or device.");
        }
      };

      const img = new Image();
      if (!cropperRawSrc.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => renderOntoCanvas(img);
      img.onerror = () => {
        const imgRetry = new Image();
        imgRetry.onload = () => renderOntoCanvas(imgRetry);
        imgRetry.onerror = () => {
          alert("Could not load image to apply positioning. Please upload the photo file directly.");
        };
        imgRetry.src = cropperRawSrc;
      };
      img.src = cropperRawSrc;
    } catch (err) {
      console.error("Error cropping image:", err);
      alert("Failed to position and save image.");
    }
  };


  const handleSaveDoctorModal = () => {
    const trimmedName = formDocName.trim();
    if (!trimmedName) {
      alert("Please enter doctor name.");
      return;
    }
    const specialtiesArray = formDocSpecialties
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let updatedMembers: TeamDoctorProfile[] = [...(config.teamMembers || DEFAULT_TEAM_MEMBERS)];

    if (isNewDoctor) {
      const newDoc: TeamDoctorProfile = {
        id: `doc-${Date.now()}`,
        name: trimmedName,
        role: formDocRole.trim() || "Physiotherapist",
        qualifications: formDocQualifications.trim(),
        experience: formDocExperience.trim(),
        specialties: specialtiesArray.length > 0 ? specialtiesArray : ["Physiotherapy & Rehabilitation"],
        image: formDocImage.trim() || "/images/dr-kinnera-portrait.jpg",
        bio: formDocBio.trim(),
        isActive: formDocIsActive,
        displayOrder: formDocOrder || updatedMembers.length + 1,
      };
      updatedMembers.push(newDoc);
    } else if (editingDoctor) {
      updatedMembers = updatedMembers.map((doc) => {
        if (doc.id === editingDoctor.id) {
          return {
            ...doc,
            name: trimmedName,
            role: formDocRole.trim() || "Physiotherapist",
            qualifications: formDocQualifications.trim(),
            experience: formDocExperience.trim(),
            specialties: specialtiesArray.length > 0 ? specialtiesArray : doc.specialties,
            image: formDocImage.trim() || doc.image,
            bio: formDocBio.trim(),
            isActive: formDocIsActive,
            displayOrder: formDocOrder || doc.displayOrder || 1,
          };
        }
        return doc;
      });
    }

    updatedMembers.sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));
    const updatedTherapists = updatedMembers.map((d) => d.name);

    setConfig((prev) => ({
      ...prev,
      teamMembers: updatedMembers,
      therapists: updatedTherapists,
    }));
    setIsDirty(true);
    setSavedSuccess(false);
    setShowDoctorModal(false);
  };

  const handleToggleDoctorActive = (id: string) => {
    const currentMembers = config.teamMembers || DEFAULT_TEAM_MEMBERS;
    const updated = currentMembers.map((doc) =>
      doc.id === id ? { ...doc, isActive: doc.isActive === false ? true : false } : doc
    );
    setConfig((prev) => ({
      ...prev,
      teamMembers: updated,
    }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleDeleteDoctor = (id: string, name: string) => {
    const currentMembers = config.teamMembers || DEFAULT_TEAM_MEMBERS;
    if (currentMembers.length <= 1) {
      alert("At least one doctor profile must remain enrolled.");
      return;
    }
    if (confirm(`Are you sure you want to remove ${name} from the clinical team?`)) {
      const updated = currentMembers.filter((doc) => doc.id !== id);
      const updatedTherapists = updated.map((d) => d.name);
      setConfig((prev) => ({
        ...prev,
        teamMembers: updated,
        therapists: updatedTherapists,
      }));
      setIsDirty(true);
      setSavedSuccess(false);
    }
  };

  const hourOptions = {
    morningStart: ["08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM"],
    morningEnd: ["12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM"],
    eveningStart: ["01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM"],
    eveningEnd: ["05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"],
  };

  const dayScheduleTimeOptions = {
    open: [
      "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
      "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"
    ],
    close: [
      "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "05:30 PM",
      "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
      "09:00 PM", "09:30 PM", "10:00 PM"
    ],
  };

  const WEEKDAY_ORDER: Array<{ key: WeekdayKey; label: string; short: string }> = [
    { key: "monday", label: "Monday", short: "Mon" },
    { key: "tuesday", label: "Tuesday", short: "Tue" },
    { key: "wednesday", label: "Wednesday", short: "Wed" },
    { key: "thursday", label: "Thursday", short: "Thu" },
    { key: "friday", label: "Friday", short: "Fri" },
    { key: "saturday", label: "Saturday", short: "Sat" },
    { key: "sunday", label: "Sunday", short: "Sun" },
  ];

  useEffect(() => {
    setMounted(true);
    // 1. Check user permission
    const userJson = localStorage.getItem("gpc_user");
    if (userJson) {
      const user = JSON.parse(userJson) as UserProfile;
      if (user.role === "admin") {
        setIsAdmin(true);
      }
    }

    // 2. Fetch current config
    async function loadData() {
      try {
        const fetched = await getClinicConfig();
        if (!fetched.teamMembers || fetched.teamMembers.length === 0) {
          fetched.teamMembers = DEFAULT_TEAM_MEMBERS;
        }
        if (!fetched.heroDesktopImage) {
          fetched.heroDesktopImage = "/images/hero_cover_teal_wooden_floor.webp";
        }
        if (!fetched.heroMobileImage) {
          fetched.heroMobileImage = "/images/mobile_cover_teal_option_2.webp";
        }
        if (!fetched.customHeroPresets) {
          fetched.customHeroPresets = [];
        }
        setConfig(fetched);
        setInitialConfig(JSON.parse(JSON.stringify(fetched)));
        
        if (fetched.hourlyCapacityOverrides && Object.keys(fetched.hourlyCapacityOverrides).length > 0) {
          setShowHourlyOverrides(true);
        }

        // Dynamically show last saved if available in localStorage
        const savedTime = localStorage.getItem("gpc_config_saved_at");
        if (savedTime) {
          setLastSavedTime(savedTime);
        }

        // Load active website theme
        const savedTheme = (localStorage.getItem("gpc_public_theme") as ThemeKey) || "teal";
        setCurrentTheme(savedTheme);
        setInitialTheme(savedTheme);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadData();
  }, []);

  const handleSelectTheme = (themeId: ThemeKey) => {
    setCurrentTheme(themeId);
    if (typeof window !== "undefined") {
      localStorage.setItem("gpc_public_theme", themeId);
      document.documentElement.setAttribute("data-theme", themeId);
      syncMetaThemeColor(themeId);
    }
    setIsDirty(true);
    setSavedSuccess(false);
  };

  // Unsaved changes browser beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // 1. Intercept client-side link navigation when form has unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    const handleAnchorClick = (e: MouseEvent) => {
      // Ignore if modifier keys or not primary click
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore anchor jumps, script links, tel:, mailto:, or new tabs
      if (
        href.startsWith("#") || 
        href.startsWith("javascript:") || 
        href.startsWith("tel:") || 
        href.startsWith("mailto:") || 
        anchor.target === "_blank"
      ) {
        return;
      }

      // Check if it's the exact same page
      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(anchor.href, window.location.origin);
        if (targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search) {
          return;
        }
      } catch {
        // Continue to intercept
      }

      // Intercept navigation and prompt with modal
      e.preventDefault();
      e.stopPropagation();
      setPendingNavigationUrl(anchor.href);
      setShowUnsavedModal(true);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, [isDirty]);

  // 2. Intercept browser back/forward button navigation when form has unsaved changes
  useEffect(() => {
    if (!isDirty) return;

    // Push guard state so Back button triggers popstate before unmounting
    if (!window.history.state?.unsavedGuard) {
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
    }

    const handlePopState = () => {
      // Re-push state so user remains on this page while modal is active
      window.history.pushState({ unsavedGuard: true }, "", window.location.href);
      setPendingNavigationUrl("BACK_NAVIGATION");
      setShowUnsavedModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  // 3. Escape key dismisses modal (Keep Editing)
  useEffect(() => {
    if (!showUnsavedModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUnsavedModal(false);
        setPendingNavigationUrl(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showUnsavedModal]);

  const handleDayScheduleToggle = (day: WeekdayKey) => {
    setConfig((prev) => {
      const current = prev.daySchedules?.[day] || DEFAULT_DAY_SCHEDULES[day];
      const newIsOpen = !current.isOpen;
      return {
        ...prev,
        daySchedules: {
          ...(prev.daySchedules || DEFAULT_DAY_SCHEDULES),
          [day]: {
            ...current,
            isOpen: newIsOpen,
          },
        },
        weeklyHolidays: {
          ...prev.weeklyHolidays,
          [day]: !newIsOpen,
        },
      };
    });
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleDayScheduleTimeChange = (day: WeekdayKey, field: "openTime" | "closeTime", value: string) => {
    setConfig((prev) => {
      const current = prev.daySchedules?.[day] || DEFAULT_DAY_SCHEDULES[day];
      return {
        ...prev,
        daySchedules: {
          ...(prev.daySchedules || DEFAULT_DAY_SCHEDULES),
          [day]: {
            ...current,
            [field]: value,
          },
        },
      };
    });
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleApplyMonToWeekdays = () => {
    setConfig((prev) => {
      const mondaySched = prev.daySchedules?.monday || DEFAULT_DAY_SCHEDULES.monday;
      const updated = { ...(prev.daySchedules || DEFAULT_DAY_SCHEDULES) };
      const weekdays: WeekdayKey[] = ["tuesday", "wednesday", "thursday", "friday", "saturday"];
      const updatedHolidays = { ...prev.weeklyHolidays };

      weekdays.forEach((d) => {
        updated[d] = { ...mondaySched };
        updatedHolidays[d] = !mondaySched.isOpen;
      });

      return {
        ...prev,
        daySchedules: updated,
        weeklyHolidays: updatedHolidays,
      };
    });
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleResetToGoogleDefaults = () => {
    setConfig((prev) => ({
      ...prev,
      daySchedules: { ...DEFAULT_DAY_SCHEDULES },
      weeklyHolidays: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
    }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === "slotDuration" || name === "defaultCapacityPerSlot" ? Number(value) : value,
    }));
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleSlotCapacityChange = (slot: string, newCapacity: number) => {
    setConfig((prev) => {
      const overrides = { ...(prev.hourlyCapacityOverrides || {}) };
      if (newCapacity === (prev.defaultCapacityPerSlot || 3)) {
        delete overrides[slot];
      } else {
        overrides[slot] = newCapacity;
      }
      return { ...prev, hourlyCapacityOverrides: overrides };
    });
    setIsDirty(true);
    setSavedSuccess(false);
  };

  const handleSave = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    
    // Automatically assemble operational hours text if left blank
    const hoursText = config.operationalHoursText.trim()
      ? config.operationalHoursText
      : `Morning: ${config.morningStart} - ${config.morningEnd} | Evening: ${config.eveningStart} - ${config.eveningEnd}`;

    const updatedConfig = {
      ...config,
      operationalHoursText: hoursText,
    };

    try {
      const result = await saveClinicConfig(updatedConfig);
      if (result.success) {
        setSavedSuccess(true);
        setIsDirty(false);
        setConfig(updatedConfig);
        setInitialConfig(JSON.parse(JSON.stringify(updatedConfig)));
        setInitialTheme(currentTheme);
        
        // Update saving timestamp
        const now = new Date();
        const formatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
          ", " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        setLastSavedTime(formatted);
        localStorage.setItem("gpc_config_saved_at", formatted);
        return true;
      } else {
        alert(result.error ? `Failed to save settings: ${result.error}` : "Failed to save settings. Please try again.");
        return false;
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message ? `Error saving settings: ${err.message}` : "Error saving settings.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setPendingNavigationUrl(null);
    setShowUnsavedModal(true);
  };

  const handleStay = () => {
    setShowUnsavedModal(false);
    setPendingNavigationUrl(null);
  };

  const handleDiscardAndLeave = () => {
    setIsDirty(false);
    setShowUnsavedModal(false);

    // Revert form state in memory to initial snapshot
    if (initialConfig) {
      setConfig(JSON.parse(JSON.stringify(initialConfig)));
    }
    setCurrentTheme(initialTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("gpc_public_theme", initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
      syncMetaThemeColor(initialTheme);
    }

    if (pendingNavigationUrl === "BACK_NAVIGATION") {
      if (window.history.length > 2) {
        window.history.go(-2);
      } else {
        router.push("/dashboard");
      }
    } else if (pendingNavigationUrl) {
      if (pendingNavigationUrl.startsWith("http")) {
        window.location.href = pendingNavigationUrl;
      } else {
        router.push(pendingNavigationUrl);
      }
    }
    setPendingNavigationUrl(null);
  };

  const handleSaveAndContinue = async () => {
    const success = await handleSave();
    if (success) {
      setIsDirty(false);
      setShowUnsavedModal(false);
      if (pendingNavigationUrl === "BACK_NAVIGATION") {
        if (window.history.length > 2) {
          window.history.go(-2);
        } else {
          router.push("/dashboard");
        }
      } else if (pendingNavigationUrl) {
        if (pendingNavigationUrl.startsWith("http")) {
          window.location.href = pendingNavigationUrl;
        } else {
          router.push(pendingNavigationUrl);
        }
      }
      setPendingNavigationUrl(null);
    }
  };

  // Helper to extract clean iframe source for maps preview
  const getEmbedUrl = (embed: string) => {
    if (!embed) return "";
    if (embed.includes("src=")) {
      const match = embed.match(/src="([^"]+)"/);
      return match ? match[1] : embed;
    }
    return embed;
  };

  // Helper to display specialized icons and styles for Mockup Therapists
  const getTherapistMeta = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("kinnera")) {
      return {
        role: "Senior Physiotherapist",
        bgColor: "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/35",
        iconColor: "text-emerald-600 dark:text-emerald-450 bg-emerald-100/50 dark:bg-emerald-900/30",
        roleColor: "text-emerald-650 dark:text-emerald-450",
        isLeave: false,
        icon: User
      };
    }
    if (nameLower.includes("vikram")) {
      return {
        role: "Lead Consultant",
        bgColor: "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/35",
        iconColor: "text-blue-600 dark:text-blue-450 bg-blue-100/50 dark:bg-blue-900/30",
        roleColor: "text-blue-650 dark:text-blue-450",
        isLeave: false,
        icon: User
      };
    }
    if (nameLower.includes("sarah")) {
      return {
        role: "On Leave",
        bgColor: "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 opacity-60",
        iconColor: "text-slate-400 bg-slate-100 dark:bg-slate-800",
        roleColor: "text-slate-405",
        isLeave: true,
        icon: UserMinus
      };
    }
    return {
      role: "Consultant Physiotherapist",
      bgColor: "bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800",
      iconColor: "text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
      roleColor: "text-slate-500",
      isLeave: false,
      icon: User
    };
  };

  if (loadingConfig) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-slate-500 text-xs font-semibold">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green mr-2" />
        <span>Loading Configuration Center...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-805 rounded-3xl space-y-4 max-w-xl mx-auto shadow-sm">
        <div className="h-14 w-14 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-650 animate-pulse">
          <Settings className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-black text-brand-charcoal dark:text-white">Admin Settings Restricted</h2>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold">
          The Clinic Configuration Panel is restricted to administrators only.
        </p>
      </div>
    );
  }

  const pendingDiffs = computeConfigDiff(initialConfig, config, { initialTheme, currentTheme });

  return (
    <div className="flex flex-col min-h-screen -m-4 sm:-m-6 md:-m-8 bg-[#f8fafc] dark:bg-slate-955">
      
      {/* Top Configuration Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-8 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-brand-green" />
          <span className="text-xs sm:text-sm font-black text-brand-charcoal dark:text-white select-none">Clinic Configuration</span>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/40 text-[9px] font-black uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            
            {/* Header Quick-Save Button */}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shadow-xs ${
                isDirty
                  ? "bg-brand-green text-white hover:bg-brand-green-hover ring-4 ring-brand-green/20 scale-105"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isDirty ? "Save Changes *" : "Save"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Body Grid */}
      <div className="flex-grow p-6 sm:p-8 space-y-6 pb-36">
        
        {/* Title and Intro */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal dark:text-white tracking-tight">Configuration Center</h1>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Refine your clinic's operational heart. Adjust shift patterns, holiday schedules, and manage your team of world-class therapists.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-4 bg-brand-sand/60 dark:bg-slate-900 border border-brand-green/20 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl flex items-center gap-2 max-w-4xl animate-fade-in-up">
            <CheckCircle className="h-4.5 w-4.5 text-brand-green shrink-0" />
            Clinic configurations successfully saved and live on the patient scheduler!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl">
          
          {/* Left Column (Span 8) */}
          <div className="lg:col-span-8 space-y-8">

            {/* Master Public Online Booking Toggle Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                    config.enablePublicBooking !== false
                      ? "bg-emerald-500/10 text-brand-green"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Public Online Appointment Booking
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control direct customer booking access on the website
                    </p>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  config.enablePublicBooking !== false
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${config.enablePublicBooking !== false ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {config.enablePublicBooking !== false ? "Online Booking: Enabled" : "Online Booking: Disabled"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/80 dark:bg-slate-950 p-4.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed max-w-md">
                  {config.enablePublicBooking !== false
                    ? "Enabled: Website visitors can view real-time time slots and schedule appointments directly."
                    : "Disabled: Online booking slots are hidden from visitors. Website shows direct Call and WhatsApp booking buttons."}
                </p>
                
                <button
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, enablePublicBooking: prev.enablePublicBooking === false ? true : false }));
                    setIsDirty(true);
                    setSavedSuccess(false);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                    config.enablePublicBooking !== false
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300"
                      : "bg-brand-green text-white hover:bg-brand-green-hover shadow-sm"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{config.enablePublicBooking !== false ? "Disable Online Booking" : "Enable Online Booking"}</span>
                </button>
              </div>
            </div>

            {/* WhatsApp Cloud API Live Usage & Billing Card */}
            <WhatsAppUsageCard />


            {/* Website Brand Theme Palette Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Website Color Theme & Branding
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Select the primary color palette displayed across the public clinic website
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  Active: {THEME_OPTIONS.find((t) => t.id === currentTheme)?.name || "Medical Teal"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = theme.id === currentTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelectTheme(theme.id)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-brand-green bg-brand-green/5 dark:bg-brand-green/10 shadow-sm ring-2 ring-brand-green/20"
                          : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center -space-x-1">
                          <span
                            className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
                            style={{ backgroundColor: theme.primaryColor }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
                            style={{ backgroundColor: theme.accentColor }}
                          />
                        </div>
                        {isSelected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-green text-white shadow-2xs">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-black text-brand-charcoal dark:text-white">
                          {theme.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {theme.badge} Palette
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Operational Shifts and Durations Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Operational Shifts & Durations
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Configure appointment slot lengths and doctor shifts. Booking slots automatically respect each day&apos;s open/close timings below.
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration and operational status */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Duration dropdown */}
                <div className="md:col-span-5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Time Slot Duration
                  </label>
                  <select
                    name="slotDuration"
                    value={config.slotDuration}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-bold"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>

                {/* Operating status card */}
                <div className="md:col-span-7 bg-brand-sand/50 dark:bg-brand-green/5 border border-brand-green/10 p-4 rounded-2xl flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-brand-green shrink-0 mt-0.5 shadow-sm">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-brand-green tracking-wider uppercase block">
                      Operating Status
                    </span>
                    <p className="text-[11px] text-slate-655 dark:text-slate-355 leading-relaxed font-semibold">
                      Morning: {config.morningStart} - {config.morningEnd} | Evening: {config.eveningStart} - {config.eveningEnd}
                    </p>
                  </div>
                </div>

              </div>

              {/* Sessions Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850">
                
                {/* Morning Session */}
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                    <span className="text-[10px] font-black text-brand-charcoal dark:text-slate-300 tracking-wider uppercase">
                      Morning Session
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Start Hour</label>
                      <div className="relative">
                        <select
                          name="morningStart"
                          value={config.morningStart}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.morningStart.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">End Hour</label>
                      <div className="relative">
                        <select
                          name="morningEnd"
                          value={config.morningEnd}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.morningEnd.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evening Session */}
                <div className="space-y-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                    <span className="text-[10px] font-black text-brand-charcoal dark:text-slate-300 tracking-wider uppercase">
                      Evening Session
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">Start Hour</label>
                      <div className="relative">
                        <select
                          name="eveningStart"
                          value={config.eveningStart}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.eveningStart.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 block mb-1 uppercase tracking-wider">End Hour</label>
                      <div className="relative">
                        <select
                          name="eveningEnd"
                          value={config.eveningEnd}
                          onChange={handleInputChange}
                          className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs outline-none focus:border-brand-green font-bold text-slate-700 dark:text-slate-200 pr-8"
                        >
                          {hourOptions.eveningEnd.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Day-by-Day Operating Hours Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Day-by-Day Operating Hours
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Clinic door timings shown on Locate Us. Booking slots strictly respect each day&apos;s open/close times (e.g. Sunday automatically stops at 5:00 PM).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleApplyMonToWeekdays}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-[10px] font-bold transition-all border border-teal-200/60 dark:border-teal-800/60 shadow-2xs"
                    title="Copy Monday's open & close timings to Tuesday through Saturday"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Mon to Tue–Sat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToGoogleDefaults}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold transition-all border border-slate-200 dark:border-slate-700"
                    title="Reset all days to standard Google Business Profile hours (Mon-Sat 9:30am-8pm, Sun 9am-5pm)"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Google Default</span>
                  </button>
                </div>
              </div>

              {/* Day Schedules List */}
              <div className="space-y-3 pt-1">
                {WEEKDAY_ORDER.map(({ key, label }) => {
                  const schedule = config.daySchedules?.[key] || DEFAULT_DAY_SCHEDULES[key];
                  const isOpen = schedule.isOpen;

                  return (
                    <div
                      key={key}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        isOpen
                          ? "bg-slate-50/50 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800"
                          : "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/40 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Day Name & Status Indicator */}
                        <div className="flex items-center gap-3 min-w-[130px]">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              isOpen ? "bg-emerald-500 ring-4 ring-emerald-500/20" : "bg-rose-500 ring-4 ring-rose-500/20"
                            }`}
                          />
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-white capitalize">
                              {label}
                            </p>
                            <span
                              className={`inline-block text-[9px] font-bold uppercase tracking-wider ${
                                isOpen ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                              }`}
                            >
                              {isOpen ? "Open" : "Closed"}
                            </span>
                          </div>
                        </div>

                        {/* Controls (Toggle + Times) */}
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          {/* Open / Closed Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleDayScheduleToggle(key)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
                              isOpen
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                            }`}
                          >
                            {isOpen ? "Set Closed" : "Set Open"}
                          </button>

                          {/* Time pickers when open */}
                          {isOpen ? (
                            <div className="flex items-center gap-2">
                              {/* Open Time */}
                              <div className="relative">
                                <select
                                  value={schedule.openTime}
                                  onChange={(e) => handleDayScheduleTimeChange(key, "openTime", e.target.value)}
                                  className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-green pr-7 cursor-pointer"
                                >
                                  {dayScheduleTimeOptions.open.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              </div>

                              <span className="text-xs font-bold text-slate-400">to</span>

                              {/* Close Time */}
                              <div className="relative">
                                <select
                                  value={schedule.closeTime}
                                  onChange={(e) => handleDayScheduleTimeChange(key, "closeTime", e.target.value)}
                                  className="appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-green pr-7 cursor-pointer"
                                >
                                  {dayScheduleTimeOptions.close.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-rose-500 font-semibold px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50">
                              Clinic closed all day
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informative Note */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex items-start gap-2.5 text-xs">
                <Info className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p className="text-teal-800 dark:text-teal-300 text-[11px] leading-relaxed">
                  <strong>Live Synchronization:</strong> These timings appear directly on your public <span className="underline font-bold">/locate-us</span> page and match your Google Maps Business profile. Toggling any day to closed also automatically updates the Weekly Holidays calendar.
                </p>
              </div>

            </div>

            {/* Multi-Therapist Slot Capacity & Flexible Hourly Controls Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-brand-green flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Multi-Therapist Slot Capacity & Hourly Controls
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control how many patients can book concurrently per hour based on on-duty therapists
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Flexible Capacity
                </span>
              </div>

              {/* Default Slot Capacity Input */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-brand-sand/50 dark:bg-brand-green/5 border border-brand-green/15 p-5 rounded-2xl">
                <div className="md:col-span-6 space-y-1">
                  <label className="block text-xs font-black text-brand-charcoal dark:text-white">
                    Default Concurrent Capacity (Therapists on Duty)
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    Set the base number of patients that can book each slot (e.g., 3 therapists = 3 slots).
                  </p>
                </div>

                <div className="md:col-span-6 flex items-center gap-3 justify-start md:justify-end">
                  {[1, 2, 3, 4, 5].map((count) => {
                    const isSelected = (config.defaultCapacityPerSlot || 3) === count;
                    return (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, defaultCapacityPerSlot: count }));
                          setSavedSuccess(false);
                        }}
                        className={`h-11 w-11 rounded-2xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-brand-green text-white shadow-md shadow-brand-green/20 scale-105"
                            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-green"
                        }`}
                      >
                        <span className="text-sm leading-none">{count}</span>
                        <span className="text-[8px] font-bold opacity-75">slots</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable Hourly Overrides Toggle with Help Tooltip */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showHourlyOverrides}
                      onChange={(e) => setShowHourlyOverrides(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green accent-brand-green cursor-pointer"
                    />
                    <span className="text-xs font-black text-brand-charcoal dark:text-white">
                      Enable Custom Hourly Overrides
                    </span>
                    {Object.keys(config.hourlyCapacityOverrides || {}).length > 0 && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                        {Object.keys(config.hourlyCapacityOverrides || {}).length} custom
                      </span>
                    )}
                  </label>

                  {/* Help Tooltip Icon */}
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowHelpTooltip(true)}
                      onMouseLeave={() => setShowHelpTooltip(false)}
                      onClick={() => setShowHelpTooltip((prev) => !prev)}
                      className="p-1 rounded-full text-slate-400 hover:text-brand-green hover:bg-brand-green/10 transition-colors cursor-pointer"
                      title="Learn what hourly overrides do"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>

                    {/* Hover Tooltip Card */}
                    {showHelpTooltip && (
                      <div className="absolute right-0 bottom-full mb-2 w-72 p-3.5 bg-brand-charcoal text-white text-[11px] rounded-2xl shadow-xl z-50 animate-fade-in pointer-events-none border border-slate-700 leading-relaxed font-medium">
                        <p className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          What are Hourly Overrides?
                        </p>
                        Set specific capacities for individual peak or lunch hours when fewer or more therapists are on duty (e.g. 1 therapist at 1:00 PM lunch, or 4 therapists during 5:00 PM peak).
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible Hourly Matrix */}
                {showHourlyOverrides && (
                  <div className="mt-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Select capacity for each hour. Hours matching default capacity ({config.defaultCapacityPerSlot || 3}) are automatically streamlined.
                      </p>
                      {Object.keys(config.hourlyCapacityOverrides || {}).length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({ ...prev, hourlyCapacityOverrides: {} }));
                            setIsDirty(true);
                            setSavedSuccess(false);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Reset all to default
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {generateSlotsFromHours(
                        config.morningStart,
                        config.morningEnd,
                        config.eveningStart,
                        config.eveningEnd,
                        config.slotDuration
                      ).map((time) => {
                        const currentCapacity = getSlotCapacity(config, time);
                        const isCustom = config.hourlyCapacityOverrides && typeof config.hourlyCapacityOverrides[time] === "number";

                        return (
                          <div
                            key={time}
                            className={`p-3 rounded-2xl border transition-all ${
                              isCustom
                                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80"
                                : "bg-slate-50/60 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-brand-charcoal dark:text-white">
                                {time}
                              </span>
                              {isCustom && (
                                <span className="text-[8px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                                  Custom
                                </span>
                              )}
                            </div>

                            {/* Capacity Selector */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map((cap) => (
                                <button
                                  key={cap}
                                  type="button"
                                  onClick={() => handleSlotCapacityChange(time, cap)}
                                  className={`flex-1 py-1 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                    currentCapacity === cap
                                      ? "bg-brand-green text-white shadow-xs"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                  title={`${time}: ${cap} patient slots`}
                                >
                                  {cap}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Booking Window & Walk-in Flexibility Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Booking Window & Walk-in Flexibility
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Control how late walk-ins can be accepted by staff and when public online bookings cut off
                    </p>
                  </div>
                </div>

                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Real-Time Rules
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Admin Walk-in Grace Window */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-green" />
                    <label className="text-xs font-black text-slate-900 dark:text-white">
                      Walk-in Grace Window (Staff Portal)
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    Allows therapists to assign arriving walk-in patients to an ongoing or just-started time slot.
                  </p>
                  <select
                    name="adminWalkInGraceType"
                    value={config.adminWalkInGraceType || "end_of_slot"}
                    onChange={(e) => {
                      setConfig((prev) => ({ 
                        ...prev, 
                        adminWalkInGraceType: e.target.value as ClinicConfig["adminWalkInGraceType"]
                      }));
                      setSavedSuccess(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="end_of_slot">Until End of Current Slot (Recommended)</option>
                    <option value="15_min">Slot Start + 15 Minutes</option>
                    <option value="30_min">Slot Start + 30 Minutes</option>
                    <option value="anytime_today">Anytime Today (Full retroactive flexibility)</option>
                  </select>
                </div>

                {/* Customer Public Booking Cutoff */}
                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500" />
                    <label className="text-xs font-black text-slate-900 dark:text-white">
                      Online Booking Cutoff (Patient Hub & Website)
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    How far in advance an online patient must submit a booking before the slot starts.
                  </p>
                  <select
                    name="publicBookingCutoffMinutes"
                    value={config.publicBookingCutoffMinutes ?? 0}
                    onChange={(e) => {
                      setConfig((prev) => ({ 
                        ...prev, 
                        publicBookingCutoffMinutes: Number(e.target.value)
                      }));
                      setSavedSuccess(false);
                    }}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold outline-none focus:border-brand-green text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <option value={0}>Up to Slot Start Time (0 min - e.g. 10:59 AM for 11 AM)</option>
                    <option value={15}>15 Minutes Before Slot</option>
                    <option value={30}>30 Minutes Before Slot</option>
                    <option value={60}>1 Hour Before Slot</option>
                  </select>
                </div>

              </div>

            </div>

            {/* Clinic Location & Contact Info Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                    Clinic Location & Contact Info
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                    Public facing details for patient discovery
                  </p>
                </div>
              </div>

              {/* Two Column details split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
                
                {/* Inputs Left Column */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Address */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Clinic Location Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={config.address || ""}
                      onChange={handleInputChange}
                      placeholder="Shop No:26, 2nd Floor, Arya Hub Mall..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  {/* Landmark */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                      Landmark
                    </label>
                    <input
                      type="text"
                      name="landmark"
                      value={config.landmark || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. Near Phoenix Marketcity"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                    />
                  </div>

                  {/* Contact Info (Phone / Email side-by-side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        required
                        value={config.phone || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={config.email || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-4 py-2.5 text-xs outline-none focus:border-brand-green text-slate-700 dark:text-slate-200 font-semibold"
                      />
                    </div>
                  </div>

                </div>

                {/* Map Preview Right Column */}
                <div className="md:col-span-5 space-y-3">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Map Preview
                  </label>
                  
                  {/* Styled Map frame */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 h-36">
                    <iframe
                      src={getEmbedUrl(config.googleMapsEmbed || "") || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3888.012301980838!2d77.7479703!3d12.9711227!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzE2LjAiTiA3N8KwNDQnNTIuNyJFCg!5e0!3m2!1sen!2sin!4v1700000000000"}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen={false}
                      loading="lazy"
                    />
                  </div>

                  {/* Navigation share link field */}
                  <div className="relative">
                    <input
                      type="text"
                      name="googleMapsLink"
                      required
                      value={config.googleMapsLink || ""}
                      onChange={handleInputChange}
                      placeholder="https://maps.google.com/..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-[10px] outline-none focus:border-brand-green text-slate-500 dark:text-slate-400 font-normal pr-8 truncate"
                      title={config.googleMapsLink}
                    />
                    <Map className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

              </div>

            </div>

            {/* Practo Ray Calendar Sync Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <CalendarSync className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Practo Ray Calendar Sync
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Automatically import Practo doctor appointments into your clinic queue and block matching time slots
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  2-Way Slot Protection
                </span>
              </div>

              {/* URL Input & Doctor Selector */}
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Practo iCal / Webcal Subscription Feed URL
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      name="practoIcalUrl"
                      value={config.practoIcalUrl || ""}
                      onChange={handleInputChange}
                      placeholder="e.g. webcal://www.practo.com/ray/calendar/feed/... or https://..."
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3.5 py-2.5 text-xs outline-none focus:border-purple-500 text-slate-800 dark:text-slate-200 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      disabled={testingPracto}
                      onClick={handleTestPractoSync}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {testingPracto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CalendarSync className="w-3.5 h-3.5" />
                      )}
                      <span>{testingPracto ? "Testing Feed..." : "Test & Sync Now"}</span>
                    </button>
                  </div>
                  <p className="text-[10.5px] text-slate-400 mt-1 font-medium">
                    Supports both <code className="text-purple-600">webcal://</code> and <code className="text-purple-600">https://</code> calendar links provided by Practo Ray.
                  </p>
                </div>

                {/* Doctor Assignment Selection */}
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Assign Practo Bookings To
                  </label>
                  <select
                    name="practoDoctorName"
                    value={config.practoDoctorName || "Dr.Kinnera"}
                    onChange={handleInputChange}
                    className="w-full sm:w-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-purple-500"
                  >
                    <option value="Dr.Kinnera">Dr.Kinnera (Lead Physiotherapist)</option>
                    {(config.therapists || []).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Sync Result Alert */}
                {practoSyncResult && (
                  <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
                    practoSyncResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                  }`}>
                    {practoSyncResult.success ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{practoSyncResult.message}</span>
                  </div>
                )}

                {/* How to get link guide for the doctor */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-200">
                    <Info className="w-4 h-4 text-purple-600" />
                    <span>How Dr. Kinnera gets her Practo Calendar link (3 steps):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed pl-1 font-medium">
                    <li>Log in to the <strong>Practo Ray</strong> account (desktop web portal or app).</li>
                    <li>Navigate to <strong>Settings &rarr; Calendar &rarr; Subscribe</strong>.</li>
                    <li>Click <strong>Google Calendar Sync</strong> next to Dr. Kinnera's name and copy the link.</li>
                    <li>Paste the link into the box above and click <strong>Save</strong> at the top right.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Homepage Hero Cover Banners (Desktop & Mobile) Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 rounded-[2rem] shadow-sm space-y-6">
              {/* Hidden file inputs for cover banner uploads */}
              <input
                type="file"
                ref={heroDesktopFileInputRef}
                onChange={handleHeroDesktopFileUpload}
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={heroMobileFileInputRef}
                onChange={handleHeroMobileFileUpload}
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
              />

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-brand-green flex items-center justify-center shrink-0">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm sm:text-base leading-none">
                      Homepage Hero Cover Banners (Desktop & Mobile)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Customize the showcase hero banners displayed to patients on large screens and mobile phones
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-brand-green text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Live on Homepage
                </span>
              </div>

              {/* Curated Presets Carousel Showcase Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
                {/* Carousel Header with Counter & Navigation Arrows */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-brand-charcoal dark:text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-brand-green" />
                      <span>Curated Clinical Presets Library</span>
                    </h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      Slide through the curated clinic photo gallery and 1-click apply to desktop, mobile, or both.
                    </p>
                  </div>

                  {/* Arrow Navigation & Counter */}
                  <div className="flex items-center gap-2 self-start sm:self-auto ml-auto sm:ml-0">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xs">
                      {presetCarouselIndex + 1} / {allHeroPresets.length}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePrevPreset}
                        className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Previous preset photo"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPreset}
                        className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        title="Next preset photo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Single Active Preset Showcase Frame */}
                {(() => {
                  const currentPreset = allHeroPresets[presetCarouselIndex] || allHeroPresets[0];
                  const isDeskActive = (config.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp") === currentPreset.url;
                  const isMobActive = (config.heroMobileImage || "/images/mobile_cover_teal_option_2.webp") === currentPreset.url;

                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3.5 transition-all">
                      
                      {/* Image Viewer with Floating Navigation Arrows & Badges */}
                      <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner group select-none">
                        <img
                          key={currentPreset.id}
                          src={currentPreset.url}
                          alt={currentPreset.title}
                          className="w-full h-full object-cover object-center transition-all duration-300"
                        />

                        {/* Floating Left Arrow on Image */}
                        <button
                          type="button"
                          onClick={handlePrevPreset}
                          className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 border border-white/20"
                          title="Previous image"
                        >
                          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Floating Right Arrow on Image */}
                        <button
                          type="button"
                          onClick={handleNextPreset}
                          className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 border border-white/20"
                          title="Next image"
                        >
                          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Recommended Badge or Custom Library Badge (Top-Left) */}
                        {currentPreset.isCustom ? (
                          <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-full text-[9.5px] sm:text-[10px] font-black bg-teal-600 text-white shadow-md tracking-tight z-10 flex items-center gap-1">
                            <FolderPlus className="w-3 h-3" />
                            <span>Clinic Library Upload</span>
                          </span>
                        ) : currentPreset.recommendedBadge ? (
                          <span className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 px-2.5 py-1 rounded-full text-[9.5px] sm:text-[10px] font-black bg-brand-green text-white shadow-md tracking-tight z-10">
                            {currentPreset.recommendedBadge}
                          </span>
                        ) : null}

                        {/* Live Active Badges (Bottom-Right) */}
                        <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 flex items-center gap-1.5 z-10">
                          {isDeskActive && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-600 text-white shadow-md flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Desk Active</span>
                            </span>
                          )}
                          {isMobActive && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-600 text-white shadow-md flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Mob Active</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title, Description & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs sm:text-sm font-black text-brand-charcoal dark:text-white truncate">
                              {currentPreset.title}
                            </h5>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              currentPreset.isCustom 
                                ? "text-teal-700 bg-teal-100 dark:bg-teal-950/80 dark:text-teal-300"
                                : "text-slate-400 bg-slate-100 dark:bg-slate-800"
                            }`}>
                              {currentPreset.tag}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                            {currentPreset.subtitle}
                          </p>
                        </div>

                        {/* Action Buttons: Set Desktop, Set Mobile, Both & Delete (if custom) */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setConfig((prev) => ({ ...prev, heroDesktopImage: currentPreset.url }));
                              setIsDirty(true);
                              setSavedSuccess(false);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                              isDeskActive
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            }`}
                            title="Apply as Desktop Hero Banner"
                          >
                            <Monitor className="w-3.5 h-3.5" />
                            <span>{isDeskActive ? "Desktop Set ✓" : "Set Desktop"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfig((prev) => ({ ...prev, heroMobileImage: currentPreset.url }));
                              setIsDirty(true);
                              setSavedSuccess(false);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                              isMobActive
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                            }`}
                            title="Apply as Mobile Hero Banner"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>{isMobActive ? "Mobile Set ✓" : "Set Mobile"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfig((prev) => ({
                                ...prev,
                                heroDesktopImage: currentPreset.url,
                                heroMobileImage: currentPreset.url,
                              }));
                              setIsDirty(true);
                              setSavedSuccess(false);
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-green/10 text-brand-green hover:bg-brand-green/20 border border-brand-green/30 transition-all cursor-pointer flex items-center gap-1"
                            title="Apply to both Desktop and Mobile simultaneously"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Both</span>
                          </button>

                          {/* Delete custom preset button */}
                          {currentPreset.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomPreset(currentPreset.id)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer flex items-center gap-1"
                              title="Delete this custom photo from Presets Library"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mini Thumbnail Navigation Rail */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                          {allHeroPresets.map((p, idx) => {
                            const isSelected = idx === presetCarouselIndex;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setPresetCarouselIndex(idx)}
                                className={`relative shrink-0 w-14 sm:w-16 aspect-[16/10] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-brand-green ring-2 ring-brand-green/30 scale-105 shadow-xs"
                                    : "border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100"
                                }`}
                                title={p.title}
                              >
                                <img
                                  src={p.url}
                                  alt={p.title}
                                  className="w-full h-full object-cover object-center"
                                />
                                {p.isCustom && (
                                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-teal-500 border border-white shadow-xs" title="Custom Upload" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>

              {/* Individual Desktop & Mobile Banner Managers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                
                {/* Desktop Cover Image Box (7 cols) */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-brand-green" />
                      <label className="text-xs font-black text-slate-900 dark:text-white">
                        Desktop Hero Cover (16:7 Panoramic)
                      </label>
                    </div>
                    <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                      Widescreen View
                    </span>
                  </div>

                  {/* Panoramic Live Preview */}
                  <div 
                    onClick={() => heroDesktopFileInputRef.current?.click()}
                    className="relative aspect-[16/7] w-full rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner bg-slate-900 cursor-pointer group"
                    title="Click to browse and upload a new image from your device"
                  >
                    <img
                      src={config.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp"}
                      alt="Desktop Hero Preview"
                      className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                    />
                    
                    {/* Always visible tap badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-md pointer-events-none">
                      <Camera className="w-3.5 h-3.5 text-brand-green" />
                      <span>Tap / Click to Change</span>
                    </div>
                  </div>

                  {/* Dedicated Action Buttons (Fully visible on all screens!) */}
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => heroDesktopFileInputRef.current?.click()}
                        disabled={uploadingHeroDesktop}
                        className="w-full py-2.5 px-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer border-0 flex items-center justify-center gap-1.5"
                        title="Browse photo from your computer or phone storage"
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{uploadingHeroDesktop ? "Reading..." : "Browse & Upload"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCropperWithImage(config.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp", "hero_desktop")}
                        className="w-full py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center gap-1.5"
                        title="Reposition and pan image framing"
                      >
                        <Crop className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="truncate">Move & Adjust</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddImageToLibrary(config.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp", "desktop")}
                        className="w-full py-2.5 px-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-teal-200/80 dark:border-teal-800 shadow-2xs flex items-center justify-center gap-1.5"
                        title="Save current desktop banner into the Presets Library"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="truncate">Add to Library</span>
                      </button>
                    </div>

                    {/* URL fallback & Reset button */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={config.heroDesktopImage || ""}
                        onChange={(e) => {
                          setConfig((prev) => ({ ...prev, heroDesktopImage: e.target.value }));
                          setIsDirty(true);
                          setSavedSuccess(false);
                        }}
                        placeholder="Or paste direct image URL (/images/... or https://...)"
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-green text-slate-700 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, heroDesktopImage: "/images/hero_cover_teal_wooden_floor.webp" }));
                          setIsDirty(true);
                          setSavedSuccess(false);
                        }}
                        className="px-3 py-2 rounded-xl text-[10.5px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Reset to default wooden floor studio cover"
                      >
                        Reset Default
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports JPG, PNG, WebP files from device storage. Recommended: widescreen ~1600×750px.
                    </p>
                  </div>
                </div>

                {/* Mobile Cover Image Box (5 cols) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-brand-green" />
                        <label className="text-xs font-black text-slate-900 dark:text-white">
                          Mobile Hero Cover (2:3 Portrait)
                        </label>
                      </div>
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-brand-green bg-brand-green/10 px-2.5 py-0.5 rounded-full border border-brand-green/20">
                        Smartphone View
                      </span>
                    </div>

                    {/* Mobile Phone Mockup Preview */}
                    <div 
                      onClick={() => heroMobileFileInputRef.current?.click()}
                      className="relative mx-auto w-40 aspect-[9/15] rounded-3xl overflow-hidden border-4 border-slate-700 dark:border-slate-600 shadow-xl bg-slate-900 cursor-pointer group"
                      title="Click to browse and upload a mobile cover from your device"
                    >
                      <img
                        src={config.heroMobileImage || "/images/mobile_cover_teal_option_2.webp"}
                        alt="Mobile Hero Preview"
                        className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
                      />

                      {/* Subtle click badge */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-md pointer-events-none whitespace-nowrap">
                        <Camera className="w-3 h-3 text-brand-green" />
                        <span>Tap to Change</span>
                      </div>
                    </div>
                  </div>

                  {/* Dedicated Action Buttons (Fully visible on all screens!) */}
                  <div className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => heroMobileFileInputRef.current?.click()}
                        disabled={uploadingHeroMobile}
                        className="w-full py-2.5 px-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer border-0 flex items-center justify-center gap-1.5"
                        title="Browse photo from your phone or device storage"
                      >
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{uploadingHeroMobile ? "Reading..." : "Browse & Upload"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCropperWithImage(config.heroMobileImage || "/images/mobile_cover_teal_option_2.webp", "hero_mobile")}
                        className="w-full py-2.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center gap-1.5"
                        title="Reposition and pan mobile image framing"
                      >
                        <Crop className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="truncate">Move & Adjust</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddImageToLibrary(config.heroMobileImage || "/images/mobile_cover_teal_option_2.webp", "mobile")}
                        className="w-full py-2.5 px-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-teal-200/80 dark:border-teal-800 shadow-2xs flex items-center justify-center gap-1.5"
                        title="Save current mobile banner into the Presets Library"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="truncate">Add to Library</span>
                      </button>
                    </div>

                    {/* URL fallback & Reset button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={config.heroMobileImage || ""}
                        onChange={(e) => {
                          setConfig((prev) => ({ ...prev, heroMobileImage: e.target.value }));
                          setIsDirty(true);
                          setSavedSuccess(false);
                        }}
                        placeholder="Or paste direct image URL (/images/... or https://...)"
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold outline-none focus:border-brand-green text-slate-700 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({ ...prev, heroMobileImage: "/images/mobile_cover_teal_option_2.webp" }));
                          setIsDirty(true);
                          setSavedSuccess(false);
                        }}
                        className="px-2.5 py-2 rounded-xl text-[10px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Reset to default Medical Teal Option 2"
                      >
                        Reset Default
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports portrait photos from phone gallery/storage (~720×1080px).
                    </p>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Right Column (Span 4) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Doctors & Team Profile Manager Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-5">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-brand-charcoal dark:text-white text-sm leading-none">
                      Doctors & Roster
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                      Photos, qualifications & homepage showcase
                    </p>
                  </div>
                </div>

                {/* Add Doctor Button */}
                <button
                  type="button"
                  onClick={handleOpenAddDoctor}
                  className="px-3 py-1.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm border-0"
                  title="Add New Doctor"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Doctor</span>
                </button>
              </div>

              {/* Doctor Profiles List */}
              <div className="space-y-3 pt-2 max-h-[440px] overflow-y-auto pr-1">
                {((config.teamMembers && config.teamMembers.length > 0) ? config.teamMembers : DEFAULT_TEAM_MEMBERS).map((doctor) => {
                  const isHidden = doctor.isActive === false;
                  return (
                    <div
                      key={doctor.id || doctor.name}
                      className={`p-3.5 border rounded-2xl transition-all ${
                        isHidden 
                          ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75"
                          : "bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-brand-green/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Photo Thumbnail with Quick-Edit Overlay */}
                        <div className="relative group shrink-0">
                          <img
                            src={doctor.image || "/images/dr-kinnera-portrait.jpg"}
                            alt={doctor.name}
                            className="w-14 h-16 rounded-xl object-cover object-top border border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => handleOpenEditDoctor(doctor)}
                            className="absolute inset-0 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-0.5 transition-opacity cursor-pointer border-0 text-[8px] font-bold"
                            title="Replace Photo"
                          >
                            <Camera className="w-3.5 h-3.5 text-white" />
                            <span>Edit</span>
                          </button>
                        </div>

                        {/* Doctor Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-black text-brand-charcoal dark:text-white truncate">
                              {doctor.name}
                            </h4>
                            <span
                              className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isHidden
                                  ? "bg-slate-200/80 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                              }`}
                            >
                              {isHidden ? "Hidden" : "Active"}
                            </span>
                          </div>

                          <p className="text-[10px] font-bold text-brand-green truncate mt-0.5">
                            {doctor.role}
                          </p>

                          <p className="text-[9.5px] text-slate-400 truncate mt-0.5">
                            {doctor.experience || doctor.qualifications || "Physiotherapy Specialist"}
                          </p>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDoctor(doctor)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-green/10 hover:text-brand-green text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer border-0"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit & Replace Photo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleDoctorActive(doctor.id)}
                              className={`p-1 rounded-lg text-xs transition-colors cursor-pointer border-0 ${
                                isHidden
                                  ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  : "text-emerald-600 hover:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title={isHidden ? "Unhide: Show on Website" : "Hide from Website"}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteDoctor(doctor.id, doctor.name)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 ml-auto"
                              title="Delete doctor profile"
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

            </div>

          </div>

        </div>

      </div>

      {/* Sticky Bottom Actions Bar (Mobile & Desktop) */}
      <footer className={`fixed bottom-0 left-0 md:left-64 right-0 min-h-20 border-t transition-all z-30 shadow-2xl px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDirty
          ? "bg-slate-900 text-white border-brand-green/40 ring-4 ring-brand-green/20"
          : "bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 backdrop-blur-md"
      }`}>
        <div className="flex items-center gap-2 select-none w-full sm:w-auto justify-between sm:justify-start">
          {isDirty ? (
            <div className="flex items-center gap-2 text-emerald-400 font-black text-xs animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>You have unsaved changes pending</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-[10px] sm:text-xs font-bold">
              <Clock className="h-4 w-4 text-brand-green shrink-0" />
              <span>Last saved on {lastSavedTime}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleDiscard}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-black transition-colors cursor-pointer"
            >
              Discard
            </button>
          )}
          
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-full bg-brand-green text-white hover:bg-brand-green-hover px-6 py-2.5 text-xs font-black shadow-lg hover:scale-105 active:scale-95 transition-all border-0 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Config...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Clinic Config</span>
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Unsaved Changes Confirmation Modal (Mounted to document.body via Portal) */}
      {mounted && showUnsavedModal && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
          onClick={handleStay}
        >
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/60 via-white to-orange-50/40 dark:from-slate-850 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="unsaved-modal-title" className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                    Unsaved Settings
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Modifications will be lost if you leave without saving
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStay}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
                title="Close and continue editing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                You have modified clinic configuration settings. Here is a summary of all changes:
              </p>

              {/* Pending Changes Diff Box */}
              <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3.5 sm:p-4 flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Pending Changes ({pendingDiffs.length})
                  </span>
                  {pendingDiffs.length > 2 && (
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                      Scroll to review all
                    </span>
                  )}
                </div>

                <div className="max-h-40 sm:max-h-52 overflow-y-auto pr-1 space-y-2 divide-y divide-amber-200/50 dark:divide-amber-900/30">
                  {pendingDiffs.length > 0 ? (
                    pendingDiffs.map((item, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex items-start gap-2.5 text-xs">
                        <span className="shrink-0 px-2.5 py-0.5 rounded-lg font-bold text-[10px] uppercase tracking-wide bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/60 dark:border-amber-800/40">
                          {item.category}
                        </span>
                        <span className="flex-1 text-slate-700 dark:text-slate-200 font-medium leading-relaxed break-words">
                          {item.detail}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                      Configuration edits in progress.
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Choose an action below to proceed:
              </p>
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleStay}
                disabled={saving}
                className="order-3 sm:order-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center bg-white dark:bg-slate-800"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={handleDiscardAndLeave}
                disabled={saving}
                className="order-2 sm:order-2 px-4 py-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 text-red-650 dark:text-red-400 bg-red-50/80 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span>{pendingNavigationUrl ? "Discard & Leave" : "Discard Changes"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={saving}
                className="order-1 sm:order-3 px-5 py-2.5 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 border-0"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 shrink-0" />
                    <span>{pendingNavigationUrl ? "Save & Continue" : "Save Changes"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Doctor Profile & Photo Manager Modal */}
      {showDoctorModal && mounted && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-955/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-fade-in-up my-auto max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-brand-charcoal dark:text-white leading-tight">
                    {isNewDoctor ? "Add Doctor Profile" : "Edit Doctor Profile & Photo"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Configures homepage showcase & appointment booking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDoctorModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-left">
              
              {/* Photo Upload & Preview Section */}
              <div className="p-4 rounded-2xl bg-brand-bg/40 dark:bg-slate-950/50 border border-brand-green/20 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Doctor Portrait Photo
                </label>
                
                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="relative shrink-0 group">
                    <img
                      src={formDocImage || "/images/dr-kinnera-portrait.jpg"}
                      alt="Doctor Preview"
                      className="w-20 h-24 rounded-2xl object-cover object-top border-2 border-brand-green/30 shadow-md bg-white dark:bg-slate-800"
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      </div>
                    )}
                    {!uploadingPhoto && (
                      <button
                        type="button"
                        onClick={() => openCropperWithImage(formDocImage || "/images/dr-kinnera-portrait.jpg")}
                        className="absolute inset-0 bg-black/55 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity cursor-pointer border-0 text-[9px] font-bold"
                        title="Click to reposition or zoom photo"
                      >
                        <Crop className="w-4 h-4 text-brand-green" />
                        <span>Move / Zoom</span>
                      </button>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoFileUpload}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer border-0"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingPhoto ? "Compressing..." : "Upload Photo"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openCropperWithImage(formDocImage || "/images/dr-kinnera-portrait.jpg")}
                        disabled={uploadingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-250 dark:border-slate-700 shadow-xs"
                        title="Adjust position, zoom, and frame so head is not cut off"
                      >
                        <Crop className="w-3.5 h-3.5 text-brand-green" />
                        <span>Move & Reposition</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Click <strong>Move & Reposition</strong> to drag the photo up/down/left/right so the head and face are framed perfectly!
                    </p>
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 mb-1">
                    Or Enter Direct Image URL
                  </label>
                  <input
                    type="text"
                    value={formDocImage}
                    onChange={(e) => setFormDocImage(e.target.value)}
                    placeholder="e.g. /images/dr-kinnera-portrait.jpg or https://..."
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-brand-green font-medium"
                  />
                </div>
              </div>

              {/* Full Name & Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocName}
                    onChange={(e) => setFormDocName(e.target.value)}
                    placeholder="e.g. Dr. Madem Kinnera"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold outline-none focus:border-brand-green"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocRole}
                    onChange={(e) => setFormDocRole(e.target.value)}
                    placeholder="e.g. Lead Physiotherapist & Gait Specialist"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-bold outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Qualifications & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Qualifications
                  </label>
                  <input
                    type="text"
                    value={formDocQualifications}
                    onChange={(e) => setFormDocQualifications(e.target.value)}
                    placeholder="e.g. MPT (Orthopaedics), Certified Gait Analyst, MIAP"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:border-brand-green"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Experience Badge
                  </label>
                  <input
                    type="text"
                    value={formDocExperience}
                    onChange={(e) => setFormDocExperience(e.target.value)}
                    placeholder="e.g. 10+ Years Clinical Practice"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:border-brand-green"
                  />
                </div>
              </div>

              {/* Key Specialties */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Key Specialties / Focus Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={formDocSpecialties}
                  onChange={(e) => setFormDocSpecialties(e.target.value)}
                  placeholder="e.g. Biomechanical Gait Analysis, Spine & Disc Decompression, Sports Rehab"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:border-brand-green"
                />
                <p className="text-[9.5px] text-slate-400">
                  Separated by commas. Displayed as specialty pills on homepage cards.
                </p>
              </div>

              {/* Bio / Summary */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Doctor Biography / Summary
                </label>
                <textarea
                  rows={3}
                  value={formDocBio}
                  onChange={(e) => setFormDocBio(e.target.value)}
                  placeholder="Clinical background, treatment philosophy, or message to patients..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium outline-none focus:border-brand-green resize-none leading-relaxed"
                />
              </div>

              {/* Display Order & Active Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Display Order:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDocOrder}
                    onChange={(e) => setFormDocOrder(parseInt(e.target.value) || 1)}
                    className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-center font-bold text-slate-800 dark:text-white outline-none focus:border-brand-green"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formDocIsActive}
                    onChange={(e) => setFormDocIsActive(e.target.checked)}
                    className="h-4 w-4 rounded text-brand-green focus:ring-brand-green cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Visible on Website
                  </span>
                </label>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDoctorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoctorModal}
                className="px-5 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border-0 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Doctor Profile</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Interactive Photo Framing & Positioner Cropper Modal */}
      {showCropperModal && mounted && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm sm:max-w-xl w-full shadow-2xl overflow-hidden animate-fade-in-up my-auto flex flex-col">
            
            {/* Modal Header & Content */}
            {(() => {
              const cropperCfg = getCropperConfig(cropTarget);
              return (
                <>
                  <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                        <Crop className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-brand-charcoal dark:text-white leading-tight">
                          {cropperCfg.title}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {cropperCfg.subtitle}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCropperModal(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Viewfinder Canvas Area */}
                  <div className="p-4 sm:p-5 flex flex-col items-center select-none bg-slate-50/40 dark:bg-slate-950/40">
                    <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/20">
                      <Move className="w-3.5 h-3.5 text-brand-green animate-pulse" />
                      <span>Click & drag inside frame to reposition image</span>
                    </div>

                    {/* Viewfinder Frame */}
                    <div 
                      className="relative overflow-hidden rounded-2xl border-2 border-brand-green shadow-xl bg-slate-950 cursor-grab active:cursor-grabbing touch-none select-none ring-4 ring-brand-green/15 max-w-full"
                      style={{ width: `${cropperCfg.viewfinderW}px`, height: `${cropperCfg.viewfinderH}px` }}
                      onPointerDown={handleViewfinderPointerDown}
                      onPointerMove={handleViewfinderPointerMove}
                      onPointerUp={handleViewfinderPointerUp}
                      onPointerCancel={handleViewfinderPointerUp}
                    >
                      {/* Scaled & Positioned Image */}
                      {cropperRawSrc && (
                        (() => {
                          const baseScale = Math.max(cropperCfg.viewfinderW / (cropNaturalWidth || 1), cropperCfg.viewfinderH / (cropNaturalHeight || 1)) || 1;
                          const currentScale = baseScale * cropZoom;
                          const displayedW = (cropNaturalWidth || cropperCfg.viewfinderW) * currentScale;
                          const displayedH = (cropNaturalHeight || cropperCfg.viewfinderH) * currentScale;
                          const left = (cropperCfg.viewfinderW - displayedW) / 2 + cropPanX;
                          const top = (cropperCfg.viewfinderH - displayedH) / 2 + cropPanY;

                          return (
                            <img
                              src={cropperRawSrc}
                              alt="Crop target"
                              draggable={false}
                              className="absolute max-w-none pointer-events-none select-none transition-transform duration-75 ease-out"
                              style={{
                                width: `${displayedW}px`,
                                height: `${displayedH}px`,
                                left: `${left}px`,
                                top: `${top}px`,
                              }}
                            />
                          );
                        })()
                      )}

                      {/* Viewfinder Grid Guidelines (Rule of thirds) */}
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20">
                        <div className="border-r border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div className="border-r border-b border-white/15" />
                        <div />
                      </div>

                      {/* Corner Viewfinder Indicators */}
                      <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2 border-brand-green pointer-events-none" />
                      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2 border-brand-green pointer-events-none" />
                      <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2 border-brand-green pointer-events-none" />
                      <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2 border-brand-green pointer-events-none" />
                      
                      {/* Dynamic Aspect Ratio Badge */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xs text-white/80 px-2 py-0.5 rounded-full text-[9px] font-bold pointer-events-none tracking-wider whitespace-nowrap">
                        {cropperCfg.ratioLabel}
                      </div>
                    </div>

                    {/* Zoom & Positioning Controls */}
                    <div className="w-full max-w-[340px] mt-4 space-y-3">
                      {/* Zoom Slider */}
                      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                        <button
                          type="button"
                          onClick={() => setCropZoom((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-0 cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 min-w-[32px] text-center">
                          {cropZoom.toFixed(1)}x
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="3"
                          step="0.05"
                          value={cropZoom}
                          onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-green"
                        />
                        <button
                          type="button"
                          onClick={() => setCropZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-0 cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Alignment Presets */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Presets:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {cropTarget === "doctor" ? (
                            <button
                              type="button"
                              onClick={() => {
                                const baseScale = Math.max(cropperCfg.viewfinderW / (cropNaturalWidth || 1), cropperCfg.viewfinderH / (cropNaturalHeight || 1)) || 1;
                                const dispH = (cropNaturalHeight || 375) * baseScale * cropZoom;
                                const maxShiftDown = Math.max(0, Math.round((dispH - cropperCfg.viewfinderH) / 2));
                                setCropPanX(0);
                                setCropPanY(maxShiftDown);
                              }}
                              className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-brand-green/10 text-brand-green hover:bg-brand-green/20 border border-brand-green/30 transition-colors cursor-pointer"
                              title="Align to show top of head completely"
                            >
                              Head / Face Focus
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const baseScale = Math.max(cropperCfg.viewfinderW / (cropNaturalWidth || 1), cropperCfg.viewfinderH / (cropNaturalHeight || 1)) || 1;
                                const dispH = (cropNaturalHeight || 375) * baseScale * cropZoom;
                                const shiftDown = Math.max(0, Math.round((dispH - cropperCfg.viewfinderH) * 0.25));
                                setCropPanX(0);
                                setCropPanY(shiftDown);
                              }}
                              className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-brand-green/10 text-brand-green hover:bg-brand-green/20 border border-brand-green/30 transition-colors cursor-pointer"
                            >
                              Top Horizon
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCropPanX(0);
                              setCropPanY(0);
                            }}
                            className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            Center
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCropZoom(1);
                              setCropPanX(0);
                              setCropPanY(0);
                            }}
                            className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer border-0 bg-transparent"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Add to Presets Library option (for hero cover banners) */}
                    {cropTarget !== "doctor" && (
                      <div className="w-full max-w-[340px] mt-2 p-2.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <FolderPlus className="w-4 h-4 text-brand-green shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate">
                              Add to Presets Library
                            </span>
                            <span className="text-[9.5px] text-slate-500 dark:text-slate-400 block truncate">
                              Permanently save into curated carousel
                            </span>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={addToLibraryOnCrop}
                            onChange={(e) => setAddToLibraryOnCrop(e.target.checked)}
                            className="h-4 w-4 rounded text-brand-green focus:ring-brand-green cursor-pointer accent-brand-green"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCropperModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer border-0 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply Framing</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
