"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Activity, 
  ShieldCheck, 
  Award, 
  HeartHandshake, 
  Star, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  CheckCircle2,
  Zap,
  ShieldAlert,
  Sparkles,
  Phone,
  CalendarCheck,
  Users,
  HeartPulse,
  Smartphone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Mail,
  Clock,
  Navigation,
  Loader2,
  MessageSquare,
  Calendar,
  BookOpen,
  Download,
  Dumbbell,
  FileText,
  Flame,
  Monitor,
  X
} from "lucide-react";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG, TeamDoctorProfile, DEFAULT_TEAM_MEMBERS } from "@/lib/db";
import { getCleanWhatsAppNumber, getPrimaryDialNumber } from "@/lib/phoneUtils";
import { articles } from "@/data/articles";

// Viewport-Triggered rolling number counter for trust stats
function ScrollTriggeredCounter({ 
  value, 
  duration = 1000, 
  prefix = "", 
  suffix = "" 
}: { 
  value: number; 
  duration?: number; 
  prefix?: string; 
  suffix?: string; 
}) {
  const [count, setCount] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !triggered) {
          setTriggered(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [triggered]);

  useEffect(() => {
    if (!triggered) return;
    let startTimestamp: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [triggered, value, duration]);

  return (
    <span ref={elementRef}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Home() {
  // Integrated Treatments data
  const treatmentList = [
    {
      title: "Musculoskeletal (Orthopaedic) Rehab",
      slug: "musculoskeletal",
      desc: "Treats bones, joints, ligaments, and muscles. It resolves conditions like back pain, arthritis, sciatica, and scoliosis.",
      image: "/images/services/musculoskeletal.webp",
    },
    {
      title: "Post-Surgical Rehabilitation",
      slug: "post-surgical",
      desc: "Restores mobility and strength after operations. Common focus areas include joint replacements, ACL reconstructions, and fracture repairs.",
      image: "/images/services/postsurgical.webp",
    },
    {
      title: "Neurological Rehabilitation",
      slug: "neurological",
      desc: "Retrains the nervous system after injury. It improves balance and mobility for stroke, Parkinson's disease, and spinal cord injuries.",
      image: "/images/services/neurological.webp",
    },
    {
      title: "Sports Injury Management",
      slug: "sports-injury",
      desc: "Focuses on athletic recovery and prevention. It treats sprains, strains, rotator cuff tears, and tennis elbow.",
      image: "/images/services/sports.webp",
    },
    {
      title: "Cardiopulmonary Physiotherapy",
      slug: "cardiopulmonary",
      desc: "Improves heart and lung function. It benefits individuals recovering from heart attacks, bypass surgeries, or managing COPD.",
      image: "/images/services/cardiopulmonary.webp",
    },
    {
      title: "Geriatric Physiotherapy",
      slug: "geriatric",
      desc: "Addresses age-related mobility issues. It focuses on fall prevention, arthritis management, and maintaining independence.",
      image: "/images/services/geriatric.webp",
    },
    {
      title: "Pelvic Floor Rehab",
      slug: "pelvic-floor",
      desc: "Strengthens pelvic muscles. It treats urinary incontinence, pelvic pain, and aids in pre- and post-pregnancy recovery.",
      image: "/images/services/pelvic.webp",
    },
  ];

  // Integrated Gallery data
  const galleryItems = [
    {
      title: "Body-Weight Supported Gait Training Lab",
      category: "Neuro & Gait Rehab",
      image: "/images/gallery/gait_harness_station.webp",
    },
    {
      title: "Functional Ramp & Stair Mobility Trainer",
      category: "Post-Surgical Rehab",
      image: "/images/gallery/ramp_stairs_trainer.webp",
    },
    {
      title: "Orthopedic Wall & Spine Ladder Station",
      category: "Orthopedics & Spine",
      image: "/images/gallery/swedish_wall_ladder.webp",
    },
    {
      title: "Advanced Physical Rehabilitation Floor",
      category: "Sports & Functional Gym",
      image: "/images/gallery/rehab_gym_wide.webp",
    },
  ];

  // Integrated FAQ data
  const faqs = [
    {
      q: "Do I need a doctor's referral to get physiotherapy?",
      a: "No, a referral is not required to visit us. You can book an appointment directly. However, if you plan to claim treatments under specific insurance policies, your provider might require a doctor's referral. We suggest checking with your insurance provider.",
    },
    {
      q: "What is Digital Gait Analysis, and how should I prepare?",
      a: "Digital Gait Analysis measures your walking or running biomechanics on a pressure-mapped treadmill. Please wear comfortable athletic clothing and bring the running or walking shoes you use most frequently so we can scan your standard stride.",
    },
    {
      q: "What should I wear to my physiotherapy sessions?",
      a: "Wear loose, comfortable clothing that allows easy movement. If we are examining your knees, ankles, or feet, shorts are highly recommended. For shoulder, neck, or back assessments, a tank top or loose t-shirt is ideal.",
    },
    {
      q: "How long does a typical physiotherapy session last?",
      a: "Your initial assessment will take approximately 45 to 60 minutes, which includes a clinical examination, diagnostic scans (such as gait or posture analysis if required), and your first treatment. Follow-up sessions usually take 30 to 45 minutes.",
    },
    {
      q: "How does the online appointment booking confirmation work?",
      a: "When you select a slot online, your appointment status is saved as 'Pending'. Our clinic staff reviews the slot against the day's schedule. Once approved, you will receive a confirmation message directly on your WhatsApp number with the appointment details.",
    },
    {
      q: "Do you offer treatment plans for chronic back pain?",
      a: "Yes, chronic spine issues are one of our core specializations. We compile diagnostic posture scans, utilize manual therapy, electrotherapy, dry needling, and design core-strengthening programs to deliver long-term spinal stability.",
    },
  ];

  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const toggleFAQ = (index: number) => {
    setFaqOpenIndex(faqOpenIndex === index ? null : index);
  };

  // Integrated Clinic Config data
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [clinicLoading, setClinicLoading] = useState(true);

  useEffect(() => {
    // 1. Instant synchronous check from localStorage cache (eliminates any 1-second network flash)
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("gpc_clinic_config_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          setClinicConfig((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {}
    }

    // 2. Live sync from Firestore in background
    async function loadConfig() {
      try {
        const fetched = await getClinicConfig();
        setClinicConfig(fetched);
      } catch (err) {
        console.error("Error loading clinic settings config:", err);
      } finally {
        setClinicLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Active Clinical Specialists for 3-doctor showcase
  const activeDoctors: TeamDoctorProfile[] = (
    clinicConfig.teamMembers && clinicConfig.teamMembers.length > 0
      ? clinicConfig.teamMembers
      : DEFAULT_TEAM_MEMBERS
  )
    .filter((doc) => doc.isActive !== false)
    .sort((a, b) => (a.displayOrder || 1) - (b.displayOrder || 1));

  // Smartphone Doctor Sliding Carousel State
  const [mobileDoctorIndex, setMobileDoctorIndex] = useState(0);
  const [doctorTouchStartX, setDoctorTouchStartX] = useState<number | null>(null);
  const [doctorTouchEndX, setDoctorTouchEndX] = useState<number | null>(null);
  const [isDoctorPaused, setIsDoctorPaused] = useState(false);

  // Auto-slide every 2 seconds on mobile
  useEffect(() => {
    if (activeDoctors.length <= 1 || isDoctorPaused) return;
    const interval = setInterval(() => {
      setMobileDoctorIndex((prev) => (prev + 1) % activeDoctors.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeDoctors.length, isDoctorPaused]);

  const handleDoctorTouchStart = (e: React.TouchEvent) => {
    setIsDoctorPaused(true);
    setDoctorTouchStartX(e.targetTouches[0].clientX);
    setDoctorTouchEndX(null);
  };

  const handleDoctorTouchMove = (e: React.TouchEvent) => {
    setDoctorTouchEndX(e.targetTouches[0].clientX);
  };

  const handleDoctorTouchEnd = () => {
    setIsDoctorPaused(false);
    if (!doctorTouchStartX || !doctorTouchEndX) return;
    const distance = doctorTouchStartX - doctorTouchEndX;
    const minSwipeDistance = 45; // 45px swipe threshold
    if (distance > minSwipeDistance) {
      // Swiped Left -> Next Doctor
      setMobileDoctorIndex((prev) => (prev + 1) % activeDoctors.length);
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Previous Doctor
      setMobileDoctorIndex((prev) => (prev - 1 + activeDoctors.length) % activeDoctors.length);
    }
    setDoctorTouchStartX(null);
    setDoctorTouchEndX(null);
  };

  // Patient Hub Quick Action Links & Direct PWA App Installation
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "desktop">("desktop");
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [patientHubHref, setPatientHubHref] = useState("/patienthub/login");
  const [isPatientActive, setIsPatientActive] = useState(false);

  // Dedicated direct install modals
  const [showAlreadyInstalledModal, setShowAlreadyInstalledModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showDesktopModal, setShowDesktopModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedPatient = localStorage.getItem("gpc_patient");
        if (storedPatient) {
          const parsed = JSON.parse(storedPatient);
          if (parsed && (parsed.id || parsed.name)) {
            setIsPatientActive(true);
            setPatientHubHref("/patienthub/dashboard");
          }
        }
      } catch (e) {}

      // Standalone PWA detection - purely display mode (NO android-app referrer check)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        setIsStandaloneApp(true);
        setIsAppInstalled(true);
      }

      // Detect device
      const ua = navigator.userAgent || "";
      if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
        setDeviceType("ios");
      } else if (/android/i.test(ua)) {
        setDeviceType("android");
      } else {
        setDeviceType("desktop");
      }

      // Check if deferredPrompt is already attached to window
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setIsAppInstalled(false);
        try {
          localStorage.removeItem("gpc_patienthub_installed");
          localStorage.removeItem("gpc_pwa_installed");
        } catch (e) {}
      }

      const handleBeforePrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        (window as any).deferredPrompt = e;
        setIsAppInstalled(false);
        try {
          localStorage.removeItem("gpc_patienthub_installed");
          localStorage.removeItem("gpc_pwa_installed");
        } catch (err) {}
      };
      window.addEventListener("beforeinstallprompt", handleBeforePrompt);

      const handleAppInstalled = () => {
        setIsAppInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          (window as any).deferredPrompt = null;
          try {
            localStorage.setItem("gpc_patienthub_installed", "true");
          } catch (e) {}
        }
      };
      window.addEventListener("appinstalled", handleAppInstalled);

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforePrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    // 1. If currently running in standalone PWA app mode
    if (isStandaloneApp) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 2. Native direct install prompt (Android Chrome, Edge, Samsung Internet, Desktop Chrome)
    const promptToUse = deferredPrompt || (typeof window !== "undefined" && (window as any).deferredPrompt);
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === "accepted") {
          setIsAppInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== "undefined") {
            (window as any).deferredPrompt = null;
            try {
              localStorage.setItem("gpc_patienthub_installed", "true");
            } catch (e) {}
          }
        }
        return;
      } catch (err) {
        console.warn("Direct install error:", err);
      }
    }

    // 3. If verified as ALREADY INSTALLED
    if (isAppInstalled) {
      setShowAlreadyInstalledModal(true);
      return;
    }

    // 4. On iOS (Safari)
    if (deviceType === "ios") {
      setShowIOSModal(true);
      return;
    }

    // 5. If Android without direct prompt captured
    if (deviceType === "android") {
      setShowAndroidModal(true);
      return;
    }

    // 6. On Desktop
    setShowDesktopModal(true);
  };



  // Real Google Reviews from Gait Physio Clinic Profile (4.9 Rating • 117+ Reviews)
  const googleReviews = [
    {
      name: "Krutika Kulkarni",
      avatarText: "K",
      avatarBg: "bg-emerald-600",
      reviewsCount: "2 reviews • 1 photo",
      rating: 5,
      timeAgo: "2 months ago",
      condition: "Tailbone Pain (Coccydynia)",
      comment: "I visited Gait Physio Clinic for treatment of coccydynia (tailbone pain), which developed after a long flight while traveling with my child. After reading reviews on Practo, I decided to visit the clinic and initially enrolled for 7 sessions. Dr. Charmi and Dr. Kinnera diagnosed the issue accurately and provided tailored manual therapy with ultrasound. I experienced significant relief and could sit comfortably again.",
    },
    {
      name: "Priya Satheesh",
      avatarText: "P",
      avatarBg: "bg-teal-600",
      reviewsCount: "4 reviews",
      rating: 5,
      timeAgo: "3 months ago",
      condition: "Post-Knee Surgery Recovery",
      comment: "I had an incredible recovery experience at Gait Physio Clinic following my knee surgery. Madam Kinnera, Dr. Mohammad, and Charmi are an absolute dream team of professionals. They are all compassionate, encouraging, and ensure you do every exercise with proper biomechanics. Highly recommend!",
    },
    {
      name: "Akhila Hubli",
      avatarText: "A",
      avatarBg: "bg-rose-600",
      isLocalGuide: true,
      reviewsCount: "Local Guide • 15 reviews",
      rating: 5,
      timeAgo: "a month ago",
      condition: "Lower Back Pain & Spine",
      comment: "I visited Gait Physio Clinic for treatment of my lower back pain, and I had a great experience. Dr Charmi was kind, understanding, and took the time to clearly explain the issue and the treatment plan. The consultation was thorough, and within 2 weeks my posture and morning stiffness improved drastically.",
    },
    {
      name: "Vishruthaa B",
      avatarText: "V",
      avatarBg: "bg-indigo-600",
      reviewsCount: "2 reviews",
      rating: 5,
      timeAgo: "a month ago",
      condition: "Chronic Knee Injury",
      comment: "I've had a long-standing knee injury and have been through physiotherapy before, but I finally feel like I'm making meaningful progress rather than just getting by. The systematic gait analysis and targeted quadriceps strengthening exercises under Dr. Kinnera's guidance completely changed my recovery trajectory.",
    },
    {
      name: "Srinivas Gowda",
      avatarText: "S",
      avatarBg: "bg-amber-600",
      reviewsCount: "3 reviews",
      rating: 5,
      timeAgo: "5 months ago",
      condition: "Knee Replacement Rehab",
      comment: "Had my knee replacement last year. The home rehab exercises Dr. Kinnera and team prescribed helped me walk again without a walker in record time. Excellent clinic with caring therapists and modern equipment in Whitefield.",
    },
    {
      name: "Ramesh Kumar",
      avatarText: "R",
      avatarBg: "bg-sky-600",
      isLocalGuide: true,
      reviewsCount: "Local Guide • 8 reviews",
      rating: 5,
      timeAgo: "4 months ago",
      condition: "Sports Ankle Sprain",
      comment: "Excellent clinic in Whitefield with cutting-edge equipment. The digital gait treadmill analysis was an eye-opener for my recurring ankle sprains. The therapists explain the root cause and provide structured recovery routines.",
    },
  ];

  // Real Verified Practo Patient Stories (5.0 Rating • 48+ Reviews)
  const practoReviews = [
    {
      name: "Siva Kumar",
      avatarText: "S",
      avatarBg: "bg-blue-600",
      timeAgo: "Recent",
      doctorVisited: "Dr. Madem Kinnera (Physiotherapist)",
      condition: "Hand Fracture Recovery",
      comment: "I recently suffered a hand fracture and received physiotherapy treatment at Gait Clinic. Dr. Kinnera and her assistant provided excellent care throughout my recovery journey. They treated me effectively, carefully guided me through home exercises, and ensured I understood each step of the rehabilitation process. I recovered completely and regained hand mobility much faster than expected.",
    },
    {
      name: "Sindhu Nair",
      avatarText: "S",
      avatarBg: "bg-teal-600",
      timeAgo: "11 months ago",
      doctorVisited: "Dr. Madem Kinnera & Dr. Rakshita",
      condition: "Acute Back Sprain",
      comment: "I visited for treatment of a back sprain and was under the care of Dr. Kinnera and Dr. Rakshita. Both did an exceptional job guiding me through the treatment, which included IFT, UST, hot pack, and targeted exercises. They were professional, attentive, and made sure I was comfortable throughout. The facility was well-maintained, clean, and organized.",
    },
    {
      name: "Arun",
      avatarText: "A",
      avatarBg: "bg-indigo-600",
      timeAgo: "10 months ago",
      doctorVisited: "Dr. Mohammad (Physiotherapist)",
      condition: "Severe Neck Stiffness",
      comment: "I had been suffering from neck stiffness and visited Gait Physio Clinic. Dr. Mohammad was very professional and supportive throughout my treatment. With just 5 sessions, I experienced significant relief, and he also guided me with exercises for long-term recovery and prevention. The clinic is well-maintained, and treatment was very effective.",
    },
    {
      name: "S. Sharma",
      avatarText: "S",
      avatarBg: "bg-emerald-600",
      timeAgo: "a year ago",
      doctorVisited: "Dr. Madem Kinnera & Dr. Mahammad",
      condition: "Post-ACL Surgery Rehabilitation",
      comment: "I visited GAIT Physio Clinic for post-ACL surgery pain recovery. Dr. Kinnera addressed all my queries, analyzed my condition, and provided a 4-week recovery plan. During the sessions, Dr. Mahammad handled all the exercises, along with UST and IFT, with great care. The clinic also offers flexible timings. Thank you team.",
    },
    {
      name: "Divya Ramesh",
      avatarText: "D",
      avatarBg: "bg-purple-600",
      timeAgo: "a year ago",
      doctorVisited: "Dr. Madem Kinnera (Physiotherapist)",
      condition: "Frozen Shoulder Mobility",
      comment: "Consulted Dr. Kinnera for severe shoulder restriction and pain. Her manual therapy techniques and progressive range of motion exercises gave me immense relief within 2 weeks. The clinic staff is very courteous and polite.",
    },
    {
      name: "Manoj V.",
      avatarText: "M",
      avatarBg: "bg-amber-600",
      timeAgo: "a year ago",
      doctorVisited: "Dr. Madem Kinnera (Physiotherapist)",
      condition: "Lumbar Disc & Sciatica",
      comment: "Had severe radiating leg pain due to a lumbar disc bulge. Dr. Kinnera's traction and specialized core stabilization exercises helped me avoid surgery and get back to work without pain. Top-tier physio clinic in Whitefield!",
    },
    {
      name: "Ananya Ghosh",
      avatarText: "A",
      avatarBg: "bg-rose-600",
      timeAgo: "a year ago",
      doctorVisited: "Dr. Madem Kinnera (Physiotherapist)",
      condition: "Ankle Ligament Sprain",
      comment: "Suffered an inversion ankle sprain while playing badminton. The rehab protocol with balance board exercises and gait retraining was top-notch. I was able to resume sports safely in 3 weeks.",
    },
    {
      name: "Rajesh Nair",
      avatarText: "R",
      avatarBg: "bg-sky-600",
      timeAgo: "a year ago",
      doctorVisited: "Dr. Madem Kinnera (Physiotherapist)",
      condition: "Post-Operative Orthopedic Care",
      comment: "Very professional and disciplined approach to orthopedic physiotherapy. Dr. Kinnera closely monitors your form during exercises and explains the biomechanics. The clinic is equipped with modern modalities.",
    },
  ];

  // Review slider state: Google Reviews
  const [mobileReviewIndex, setMobileReviewIndex] = useState(0);
  const [desktopReviewPage, setDesktopReviewPage] = useState(0);
  const [isReviewHovered, setIsReviewHovered] = useState(false);
  const totalDesktopPages = Math.ceil(googleReviews.length / 2);

  // Practo Review slider state
  const [mobilePractoIndex, setMobilePractoIndex] = useState(0);
  const [desktopPractoPage, setDesktopPractoPage] = useState(0);
  const [isPractoHovered, setIsPractoHovered] = useState(false);
  const totalDesktopPractoPages = Math.ceil(practoReviews.length / 2);

  // Auto-slide timers for Google Reviews
  useEffect(() => {
    if (isReviewHovered) return;
    const mobileTimer = setInterval(() => {
      setMobileReviewIndex((prev) => (prev + 1) % googleReviews.length);
    }, 3000);

    const desktopTimer = setInterval(() => {
      setDesktopReviewPage((prev) => (prev + 1) % totalDesktopPages);
    }, 3500);

    return () => {
      clearInterval(mobileTimer);
      clearInterval(desktopTimer);
    };
  }, [isReviewHovered, totalDesktopPages, googleReviews.length]);

  // Auto-slide timers for Practo Reviews
  useEffect(() => {
    if (isPractoHovered) return;
    const mobileTimer = setInterval(() => {
      setMobilePractoIndex((prev) => (prev + 1) % practoReviews.length);
    }, 3200);

    const desktopTimer = setInterval(() => {
      setDesktopPractoPage((prev) => (prev + 1) % totalDesktopPractoPages);
    }, 3700);

    return () => {
      clearInterval(mobileTimer);
      clearInterval(desktopTimer);
    };
  }, [isPractoHovered, totalDesktopPractoPages, practoReviews.length]);

  const handlePrevReviewMobile = () => {
    setMobileReviewIndex((prev) => (prev === 0 ? googleReviews.length - 1 : prev - 1));
  };

  const handleNextReviewMobile = () => {
    setMobileReviewIndex((prev) => (prev + 1) % googleReviews.length);
  };

  const handlePrevReviewDesktop = () => {
    setDesktopReviewPage((prev) => (prev === 0 ? totalDesktopPages - 1 : prev - 1));
  };

  const handleNextReviewDesktop = () => {
    setDesktopReviewPage((prev) => (prev + 1) % totalDesktopPages);
  };

  const handlePrevPractoMobile = () => {
    setMobilePractoIndex((prev) => (prev === 0 ? practoReviews.length - 1 : prev - 1));
  };

  const handleNextPractoMobile = () => {
    setMobilePractoIndex((prev) => (prev + 1) % practoReviews.length);
  };

  const handlePrevPractoDesktop = () => {
    setDesktopPractoPage((prev) => (prev === 0 ? totalDesktopPractoPages - 1 : prev - 1));
  };

  const handleNextPractoDesktop = () => {
    setDesktopPractoPage((prev) => (prev + 1) % totalDesktopPractoPages);
  };

  // Viewport Scroll Entrance Reveal hook
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Smooth scroll to section if URL has anchor hash on initial load
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, []);





  return (
    <div className="flex flex-col w-full overflow-x-hidden bg-brand-bg text-brand-charcoal">
      {/* Self-contained CSS Animations Injector */}
      <style>{`
        @keyframes floatBlob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes slideInRight {
          from { transform: translateX(50px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeInUpHero {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeSwap {
          from { opacity: 0; transform: scale(0.98) translateY(5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(-50%) translateY(0px) scale(1); }
          50% { transform: translateY(-50%) translateY(-6px) scale(1.03); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-blob-1 {
          animation: floatBlob 14s ease-in-out infinite;
        }
        .animate-blob-2 {
          animation: floatBlob 18s ease-in-out infinite alternate;
        }
        .animate-slide-in-card {
          opacity: 0;
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-up-hero {
          animation: fadeInUpHero 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-swap {
          animation: fadeSwap 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-float-badge {
          animation: float-badge 3s ease-in-out infinite;
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-left {
          opacity: 0;
          animation: fade-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-right {
          opacity: 0;
          animation: fade-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(25px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-on-scroll.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .delay-100 { transition-delay: 100ms; }
        .delay-200 { transition-delay: 200ms; }
        .delay-300 { transition-delay: 300ms; }
        .delay-400 { transition-delay: 400ms; }
        .hero-blurred-bg {
          filter: blur(16px);
          -webkit-mask: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 90%) no-repeat;
          mask: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 90%) no-repeat;
          -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 90%);
          mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 90%);
          transform: scale(1.05); /* Prevents edge bleeding */
        }
        @media (min-width: 640px) {
          .hero-blurred-bg {
            -webkit-mask: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%) no-repeat;
            mask: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%) no-repeat;
            -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%);
            mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 75%);
          }
        }
      `}</style>

      {/* Hero Section: Full-Bleed Panoramic Clinical Cover Canvas */}
      <section id="home" className="relative overflow-hidden min-h-[500px] lg:min-h-[660px] flex items-center py-14 sm:py-28 text-brand-charcoal bg-slate-950">
        {/* Mobile Background: Portrait Oriented Cover Canvas */}
        <div 
          className="sm:hidden absolute inset-0 bg-cover bg-no-repeat bg-center opacity-75 transition-all duration-700" 
          style={{ backgroundImage: `url('${clinicConfig.heroMobileImage || "/images/mobile_cover_teal_option_2.webp"}')` }} 
        />

        {/* Desktop Background: Full Panoramic Treatment Cover */}
        <div 
          className="hidden sm:block absolute inset-0 bg-cover bg-no-repeat bg-right lg:bg-center transition-all duration-700" 
          style={{ backgroundImage: `url('${clinicConfig.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp"}')` }} 
        />

        {/* Desktop Layer 2: Selective Blurred Image Overlay for Depth */}
        <div 
          className="hidden sm:block absolute inset-0 bg-cover bg-no-repeat bg-right lg:bg-center transition-all duration-700 hero-blurred-bg" 
          style={{ backgroundImage: `url('${clinicConfig.heroDesktopImage || "/images/hero_cover_teal_wooden_floor.webp"}')` }} 
        />
        
        {/* Layer 3: Sophisticated Gradient Scrim (Mobile: Gentle vertical fade / Desktop: Horizontal gradient) */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/70 to-white/35 sm:bg-gradient-to-r sm:from-white/98 sm:via-white/85 sm:to-white/10 dark:from-slate-950/94 dark:via-slate-950/75 dark:to-slate-950/30" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="max-w-2xl space-y-6 sm:space-y-8 text-center sm:text-left">
            
            {/* Official Clinic Brand Identity Lockup (Smartphone & Desktop Optimized) */}
            <div className="flex flex-row items-center justify-center sm:justify-start gap-2.5 sm:gap-6 animate-fade-in-up">
              <img
                src="/images/gait_physio_logo.png"
                alt="Gait Physio Clinic Official Logo"
                className="h-11 w-11 sm:h-18 sm:w-18 lg:h-24 lg:w-24 object-contain shrink-0 drop-shadow-md hover:scale-105 transition-transform duration-300"
              />
              <div className="min-w-0">
                <h1 className="text-[23px] sm:text-4xl lg:text-[52px] xl:text-[58px] font-black tracking-tight leading-none text-brand-green dark:text-white whitespace-nowrap drop-shadow-2xs">
                  Gait Physio Clinic
                </h1>
              </div>
            </div>

            {/* 3 Core Services (Crisp, High-Contrast Typography) */}
            <div className="pt-1 sm:pt-2 animate-fade-in-up" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center justify-center sm:justify-start gap-x-2.5 sm:gap-x-6 text-[13px] sm:text-xl lg:text-[26px] font-black text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap">
                <span className="hover:text-brand-green transition-colors">Neuro Rehab</span>
                <span className="text-brand-green/70 dark:text-teal-400/70 font-black select-none">|</span>
                <span className="hover:text-brand-green transition-colors">Ortho Rehab</span>
                <span className="text-brand-green/70 dark:text-teal-400/70 font-black select-none">|</span>
                <span className="hover:text-brand-green transition-colors">Sports Rehab</span>
              </div>
            </div>

            {/* Action Buttons: "Our Services" FIRST, WhatsApp / Book SECOND */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center sm:justify-start pt-2 sm:pt-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <Link
                href="/#services"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById("services");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    window.history.pushState(null, "", "#services");
                  }
                }}
                className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                Our Services
                <ArrowRight className="ml-2 h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </Link>

              {clinicConfig.enablePublicBooking !== false ? (
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full border-2 border-brand-green/80 text-brand-green hover:bg-brand-green/10 bg-white/85 backdrop-blur-md px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-bold transition-all active:scale-95 shadow-sm dark:bg-slate-900/90 dark:text-white dark:border-slate-700/80 hover:dark:border-slate-500 hover:dark:bg-slate-850"
                >
                  Book Appointment
                </Link>
              ) : (
                <a
                  href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to schedule a consultation.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-green/80 text-brand-green hover:bg-brand-green/10 bg-white/85 backdrop-blur-md px-7 py-3.5 sm:px-8 sm:py-4 text-sm sm:text-base font-bold transition-all active:scale-95 shadow-sm dark:bg-slate-900/90 dark:text-white dark:border-slate-700/80 hover:dark:border-slate-500 hover:dark:bg-slate-850"
                >
                  <MessageSquare className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  WhatsApp Us
                </a>
              )}
            </div>

            {/* 2 Side-by-Side Review Gateway Buttons (Always 50/50 on Mobile & Desktop) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 pt-1 animate-fade-in-up w-full max-w-lg" style={{ animationDelay: '650ms' }}>
              
              {/* Google Reviews Gateway Button */}
              <a
                href="#testimonials"
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:px-4 sm:py-3 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 hover:border-brand-green shadow-2xs hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all group text-left"
                title="View Verified Google Reviews"
              >
                {/* Google 4-Color G Emblem */}
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 sm:h-5 sm:w-5">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-none">4.9</span>
                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate mt-0.5 group-hover:text-brand-green transition-colors">
                    117+ Google Reviews
                  </p>
                </div>
              </a>

              {/* Practo Stories Gateway Button */}
              <a
                href="#practo-reviews"
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:px-4 sm:py-3 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 hover:border-brand-green shadow-2xs hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all group text-left"
                title="View Verified Practo Patient Stories"
              >
                {/* Official Practo Health Logo */}
                <img
                  src="/images/practo_logo.png"
                  alt="Practo Logo"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl object-contain shrink-0 shadow-2xs"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-none">5.0</span>
                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate mt-0.5 group-hover:text-brand-green transition-colors">
                    48+ Practo Stories
                  </p>
                </div>
              </a>

            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats: Triggers rolling number animations */}
      <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2 reveal-on-scroll">
              <h3 className="text-3xl font-black text-brand-green dark:text-brand-luminous">
                <ScrollTriggeredCounter value={10000} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">Patients Recovered</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-100">
              <h3 className="text-3xl font-black text-brand-green dark:text-brand-luminous">
                <ScrollTriggeredCounter value={15} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">Years Experience</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-200">
              <h3 className="text-3xl font-black text-brand-green dark:text-brand-luminous">
                <ScrollTriggeredCounter value={99} suffix="%" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">Patient Satisfaction</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-300">
              <h3 className="text-3xl font-black text-brand-green dark:text-brand-luminous">
                <ScrollTriggeredCounter value={30} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider font-bold">Diagnostic Tests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services / Treatments Section */}
      <section id="services" className="py-20 bg-brand-bg dark:bg-slate-950 scroll-mt-16 sm:scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="max-w-3xl space-y-2 reveal-on-scroll">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-brand-green dark:text-brand-luminous block">
              HEALING ELEVATED
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal dark:text-white tracking-tight">
              Our Comprehensive Services
            </h2>
          </div>

          <div className="space-y-6">
            {/* Top Row: 4 Services */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {treatmentList.slice(0, 4).map((t, idx) => (
                <Link
                  key={t.title}
                  href={`/services/${t.slug}`}
                  className={`group flex flex-col h-full bg-brand-sand/40 dark:bg-slate-900/60 rounded-3xl border border-brand-muted/30 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer reveal-on-scroll ${
                    idx === 0 ? "" : idx === 1 ? "delay-75" : idx === 2 ? "delay-150" : "delay-225"
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={t.image}
                      alt={t.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-brand-charcoal dark:text-white group-hover:text-brand-green dark:group-hover:text-teal-400 transition-colors duration-250 leading-tight">
                        {t.title}
                      </h3>
                      
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                        {t.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-3 text-[11px] font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors duration-200 border-t border-slate-200/50 dark:border-slate-800/60">
                      <span>Read More</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Bottom Row: 3 Services (Centered) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto gap-6">
              {treatmentList.slice(4).map((t, idx) => (
                <Link
                  key={t.title}
                  href={`/services/${t.slug}`}
                  className={`group flex flex-col h-full bg-brand-sand/40 dark:bg-slate-900/60 rounded-3xl border border-brand-muted/30 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer reveal-on-scroll ${
                    idx === 0 ? "" : idx === 1 ? "delay-75" : "delay-150"
                  }`}
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={t.image}
                      alt={t.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-brand-charcoal dark:text-white group-hover:text-brand-green dark:group-hover:text-teal-400 transition-colors duration-250 leading-tight">
                        {t.title}
                      </h3>
                      
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                        {t.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 pt-3 text-[11px] font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors duration-200 border-t border-slate-200/50 dark:border-slate-800/60">
                      <span>Read More</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Specialists / Team Section - 3 Doctor Showcase Grid */}
      <section id="team" className="py-20 bg-brand-bg dark:bg-slate-955 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-scroll">
            <div className="flex items-center justify-center gap-2 text-brand-green dark:text-teal-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest mb-2">
              <span className="h-[2px] w-8 bg-brand-green dark:bg-teal-400 rounded-full"></span>
              OUR CLINICAL SPECIALISTS
              <span className="h-[2px] w-8 bg-brand-green dark:bg-teal-400 rounded-full"></span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Meet Our Specialists
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">
              Certified physiotherapists and movement analysts combining deep biomechanical expertise with personalized 1-on-1 rehabilitation.
            </p>
          </div>

          {/* Desktop & Tablet: Auto-Adaptive Showcase Grid (3x1, 2x2, 3+2, 3x2, 4+3, 4x2) */}
          <div className="hidden md:flex flex-wrap justify-center gap-6 lg:gap-8 items-stretch">
            {activeDoctors.map((doctor) => {
              // Dynamic width classes based on active doctor count:
              // 4 doctors -> 2x2 grid (50% on desktop)
              // 7 or 8 doctors -> 4 per row (25% on desktop: 4+3 or 4x2)
              // 3, 5, 6 doctors -> 3 per row (33.333% on desktop: 3x1, 3+2 centered, 3x2)
              // Tablet (md) -> clean 2-column centered layout (50%)
              const cardWidthClass =
                activeDoctors.length === 4
                  ? "w-full md:w-[calc(50%-1rem)] lg:w-[calc(50%-1.5rem)] md:max-w-md lg:max-w-md"
                  : activeDoctors.length >= 7
                  ? "w-full md:w-[calc(50%-1rem)] lg:w-[calc(25%-1.5rem)] md:max-w-md lg:max-w-xs xl:max-w-sm"
                  : "w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] md:max-w-md lg:max-w-sm";

              return (
                <div
                  key={doctor.id || doctor.name}
                  className={`group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-brand-green/40 transition-all duration-300 flex flex-col justify-between ${cardWidthClass}`}
                >
                  {/* Photo with Experience Badge */}
                  <div>
                    <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={doctor.image || "/images/dr-kinnera-portrait.jpg"}
                        alt={`${doctor.name} - ${doctor.role}`}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-70 group-hover:opacity-50 transition-opacity" />
                      
                      {/* Experience Badge */}
                      {doctor.experience && (
                        <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md text-white text-[10.5px] font-black px-3 py-1 rounded-full border border-white/20 shadow-md flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                          <span>{doctor.experience}</span>
                        </div>
                      )}
                    </div>

                    {/* Doctor Info */}
                    <div className="p-5 xl:p-6 space-y-3">
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-brand-charcoal dark:text-white leading-snug group-hover:text-brand-green transition-colors">
                          {doctor.name}
                        </h3>
                        <p className="text-xs font-bold text-brand-green dark:text-teal-400 mt-1">
                          {doctor.role}
                        </p>
                        {doctor.qualifications && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                            {doctor.qualifications}
                          </p>
                        )}
                      </div>

                      {/* Specialties Pills */}
                      {doctor.specialties && doctor.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {doctor.specialties.slice(0, 3).map((spec, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Only rendered when online booking is enabled */}
                  {clinicConfig.enablePublicBooking !== false && (
                    <div className="p-5 xl:p-6 pt-0 space-y-2">
                      <Link
                        href={`/book?therapist=${encodeURIComponent(doctor.name)}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black py-2.5 px-3 xl:px-4 rounded-xl shadow-xs transition-transform active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Consultation</span>
                      </Link>

                      <Link
                        href={`/team#${doctor.id}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-3 xl:px-4 rounded-xl transition-colors bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                      >
                        <span>View Full Profile</span>
                        <span className="text-sm leading-none">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Smartphone / Mobile: Sliding Carousel with arrows & touch swipe every 2s */}
          <div className="md:hidden relative max-w-md mx-auto">
            {/* Carousel Frame */}
            <div
              className="overflow-hidden rounded-3xl"
              onTouchStart={handleDoctorTouchStart}
              onTouchMove={handleDoctorTouchMove}
              onTouchEnd={handleDoctorTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${mobileDoctorIndex * 100}%)` }}
              >
                {activeDoctors.map((doctor) => (
                  <div key={doctor.id || doctor.name} className="w-full shrink-0 px-1">
                    <div className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full">
                      {/* Photo with Experience Badge */}
                      <div>
                        <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img
                            src={doctor.image || "/images/dr-kinnera-portrait.jpg"}
                            alt={`${doctor.name} - ${doctor.role}`}
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-70" />
                          
                          {/* Experience Badge */}
                          {doctor.experience && (
                            <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md text-white text-[10.5px] font-black px-3 py-1 rounded-full border border-white/20 shadow-md flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                              <span>{doctor.experience}</span>
                            </div>
                          )}
                        </div>

                        {/* Doctor Info */}
                        <div className="p-6 space-y-3">
                          <div>
                            <h3 className="text-lg sm:text-xl font-black text-brand-charcoal dark:text-white leading-snug">
                              {doctor.name}
                            </h3>
                            <p className="text-xs font-bold text-brand-green dark:text-teal-400 mt-1">
                              {doctor.role}
                            </p>
                            {doctor.qualifications && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 line-clamp-1">
                                {doctor.qualifications}
                              </p>
                            )}
                          </div>

                          {/* Specialties Pills */}
                          {doctor.specialties && doctor.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {doctor.specialties.slice(0, 3).map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons: Only rendered when online booking is enabled */}
                      {clinicConfig.enablePublicBooking !== false && (
                        <div className="p-6 pt-0 space-y-2">
                          <Link
                            href={`/book?therapist=${encodeURIComponent(doctor.name)}`}
                            className="w-full inline-flex items-center justify-center gap-2 bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-xs transition-transform active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Book Consultation</span>
                          </Link>

                          <Link
                            href={`/team#${doctor.id}`}
                            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                          >
                            <span>View Full Profile</span>
                            <span className="text-sm leading-none">→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Left & Right Arrow Marks */}
            {activeDoctors.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setMobileDoctorIndex((prev) => (prev - 1 + activeDoctors.length) % activeDoctors.length)}
                  className="absolute top-[38%] -translate-y-1/2 -left-3 z-20 h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 text-brand-charcoal dark:text-white flex items-center justify-center shadow-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-brand-green hover:text-white transition-all active:scale-90 cursor-pointer"
                  title="Previous Specialist"
                  aria-label="Previous Specialist"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setMobileDoctorIndex((prev) => (prev + 1) % activeDoctors.length)}
                  className="absolute top-[38%] -translate-y-1/2 -right-3 z-20 h-10 w-10 rounded-full bg-white/95 dark:bg-slate-900/95 text-brand-charcoal dark:text-white flex items-center justify-center shadow-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-brand-green hover:text-white transition-all active:scale-90 cursor-pointer"
                  title="Next Specialist"
                  aria-label="Next Specialist"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Sliding Pagination Dots */}
            {activeDoctors.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                {activeDoctors.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMobileDoctorIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === mobileDoctorIndex 
                        ? "bg-brand-green w-7" 
                        : "bg-slate-300 dark:bg-slate-700 w-2 hover:bg-slate-400"
                    }`}
                    aria-label={`Slide to specialist ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Clinic Gallery Section */}
      <section id="gallery" className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green dark:text-brand-luminous bg-brand-green/10 dark:bg-brand-luminous/15 px-3.5 py-1.5 rounded-full inline-block">
              Clinic Gallery
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Our Facility & Technology
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-normal max-w-2xl mx-auto leading-relaxed">
              Explore our sanitized, fully equipped rehabilitation suites designed for diagnostic precision, biomechanical training, and rapid patient recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {galleryItems.map((item, idx) => (
              <div
                key={item.title}
                className={`overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col group shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_16px_40px_-8px_var(--brand-shadow-hover)] transition-all duration-500 hover:-translate-y-1.5 reveal-on-scroll ${
                  idx % 2 === 1 ? "delay-100" : ""
                }`}
              >
                {/* Image Container with Ken Burns Ambient Animation */}
                <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden bg-slate-900">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className={`w-full h-full object-cover animate-ken-burns-${(idx % 4) + 1} group-hover-ken-burns`}
                  />
                  
                  {/* Subtle Gradient Overlays for High-End Contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-85 group-hover:opacity-65 transition-opacity duration-300" />

                  {/* Top Badge: Category */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-brand-green shadow-sm border border-white/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
                      {item.category}
                    </span>
                  </div>

                  {/* Floating Title Inside Image on Mobile/Desktop */}
                  <div className="absolute bottom-5 left-5 right-5 z-10">
                    <h3 className="text-base sm:text-xl font-black tracking-tight leading-snug drop-shadow-md text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Real Google Reviews Showcase (Patient Stories) */}
      <section id="testimonials" className="bg-brand-sand/40 dark:bg-slate-955 py-24 overflow-hidden relative border-y border-slate-200/60 dark:border-slate-850">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header Row: Title & Official Google Rating Trust Summary */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 reveal-on-scroll">
            <div className="space-y-3 max-w-2xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-3.5 py-1.5 rounded-full">
                  Verified Patient Stories
                </span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
                Stories of Recovery & Mobility
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
                Read authentic feedback from patients who overcame pain and restored their natural movement at our Whitefield clinic.
              </p>
            </div>

            {/* Google Rating Trust Badge Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-wrap sm:flex-nowrap items-center gap-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                  {/* Google 4-color G Icon */}
                  <svg viewBox="0 0 24 24" className="h-7 w-7">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">4.9</span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                    Based on <strong className="text-slate-800 dark:text-slate-200">117+ Google Reviews</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:border-l sm:border-slate-100 dark:sm:border-slate-800 sm:pl-6 w-full sm:w-auto">
                <a
                  href="https://www.google.com/search?q=gait+physio+clinic+reviews&sca_esv=ac66ab952f2308c4&sxsrf=APpeQnvs_Ka2WNm-D4w7ZuN-tEFoirdPMA%3A1786782907520&ei=uySAapGzH_iUhvcPtZzxkAI&oq=gait+physio+clinic&gs_lp=Egxnd3Mtd2l6LXNlcnAiEmdhaXQgcGh5c2lvIGNsaW5pYyoCCAAyChAAGEcY1gQYsAMyChAAGEcY1gQYsANIzg5QAFgAcAF4AJABAJgBX6ABX6oBATG4AQHIAQCYAgGgAgGYAwCIBgGQBgKSBwExoAecAbIHALgHAMIHAzAuMcgHAYAIAQ&sclient=gws-wiz-serp#lrd=0x4d6ba89778b9482b:0xbeeac3f05a9f5de7,1,,,,"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-xs font-bold hover:bg-brand-green dark:hover:bg-brand-green dark:hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <span>Review on Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Responsive Reviews Carousel: 1 Card on Mobile, 2 Cards on Desktop */}
          <div 
            className="relative px-2 sm:px-12"
            onMouseEnter={() => setIsReviewHovered(true)}
            onMouseLeave={() => setIsReviewHovered(false)}
            onTouchStart={() => setIsReviewHovered(true)}
            onTouchEnd={() => setIsReviewHovered(false)}
          >
            {/* --- DESKTOP VIEW (md and up): 2 Side-by-Side Cards --- */}
            <div className="hidden md:block">
              {/* Left Nav Arrow Button */}
              <button
                onClick={handlePrevReviewDesktop}
                className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green dark:hover:bg-teal-500 dark:hover:text-slate-950 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-90 cursor-pointer"
                aria-label="Previous review pair"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right Nav Arrow Button */}
              <button
                onClick={handleNextReviewDesktop}
                className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green dark:hover:bg-teal-500 dark:hover:text-slate-950 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-90 cursor-pointer"
                aria-label="Next review pair"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* 2 Side-by-Side Review Cards */}
              <div 
                key={desktopReviewPage}
                className="grid grid-cols-2 gap-6 animate-fade-swap"
              >
                {[0, 1].map((offset) => {
                  const reviewIndex = (desktopReviewPage * 2 + offset) % googleReviews.length;
                  const review = googleReviews[reviewIndex];
                  return (
                    <div
                      key={review.name + reviewIndex}
                      className="flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 sm:p-8 shadow-[0_6px_25px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_35px_-8px_var(--brand-shadow-hover)] hover:-translate-y-1 transition-all duration-300 group"
                    >
                      <div className="space-y-4">
                        {/* Reviewer Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-full ${review.avatarBg} text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm`}>
                              {review.avatarText}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                {review.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                {review.reviewsCount}
                              </p>
                            </div>
                          </div>

                          {/* Google Logo Icon */}
                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 shrink-0">
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                          </div>
                        </div>

                        {/* Rating Stars & Time */}
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            • {review.timeAgo}
                          </span>
                        </div>

                        {/* Condition Badge */}
                        <div>
                          <span className="inline-block rounded-full bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-teal-300 text-[10px] font-black px-3 py-1">
                            {review.condition}
                          </span>
                        </div>

                        {/* Comment Quote */}
                        <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal italic pt-1">
                          "{review.comment}"
                        </p>
                      </div>

                      {/* Footer Verified Seal */}
                      <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified Google Patient
                        </span>
                        <span>5.0 / 5.0</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Pagination Dots (3 Pairs) */}
              <div className="flex justify-center gap-2 pt-6">
                {Array.from({ length: totalDesktopPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setDesktopReviewPage(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                      desktopReviewPage === i
                        ? "bg-brand-green w-8"
                        : "bg-slate-300 dark:bg-slate-700 w-2.5 hover:bg-slate-400"
                    }`}
                    aria-label={`Go to slide pair ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* --- MOBILE VIEW (< md): 1 Single Focused Card --- */}
            <div className="block md:hidden">
              {/* Single Review Card */}
              <div 
                key={mobileReviewIndex}
                className="flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-[0_6px_25px_-6px_var(--brand-shadow)] animate-fade-swap"
              >
                {(() => {
                  const review = googleReviews[mobileReviewIndex];
                  return (
                    <>
                      <div className="space-y-3.5">
                        {/* Reviewer Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full ${review.avatarBg} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm`}>
                              {review.avatarText}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                {review.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {review.reviewsCount}
                              </p>
                            </div>
                          </div>

                          {/* Google Logo Icon */}
                          <div className="p-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 shrink-0">
                            <svg viewBox="0 0 24 24" className="h-4 w-4">
                              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                            </svg>
                          </div>
                        </div>

                        {/* Rating Stars & Time */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex text-amber-400">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            • {review.timeAgo}
                          </span>
                        </div>

                        {/* Condition Badge */}
                        <div>
                          <span className="inline-block rounded-full bg-brand-green/10 dark:bg-brand-green/20 text-brand-green dark:text-teal-300 text-[9px] font-black px-2.5 py-0.5">
                            {review.condition}
                          </span>
                        </div>

                        {/* Comment Quote */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal italic pt-0.5">
                          "{review.comment}"
                        </p>
                      </div>

                      {/* Footer Verified Seal */}
                      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Google Patient
                        </span>
                        <span>5.0 / 5.0</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Mobile Arrows & Dots Nav Bar */}
              <div className="flex items-center justify-between pt-4 px-1">
                <button
                  onClick={handlePrevReviewMobile}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white transition-all shadow-sm active:scale-90"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* 6 Mobile Dots */}
                <div className="flex items-center gap-1.5">
                  {googleReviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMobileReviewIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        mobileReviewIndex === i
                          ? "bg-brand-green w-5"
                          : "bg-slate-300 dark:bg-slate-700 w-2"
                      }`}
                      aria-label={`Go to review ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextReviewMobile}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white transition-all shadow-sm active:scale-90"
                  aria-label="Next review"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom CTAs for Google */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a
              href="https://www.google.com/search?q=gait+physio+clinic+reviews&sca_esv=ac66ab952f2308c4&sxsrf=APpeQnvs_Ka2WNm-D4w7ZuN-tEFoirdPMA%3A1786782907520&ei=uySAapGzH_iUhvcPtZzxkAI&oq=gait+physio+clinic&gs_lp=Egxnd3Mtd2l6LXNlcnAiEmdhaXQgcGh5c2lvIGNsaW5pYyoCCAAyChAAGEcY1gQYsAMyChAAGEcY1gQYsANIzg5QAFgAcAF4AJABAJgBX6ABX6oBATG4AQHIAQCYAgGgAgGYAwCIBgGQBgKSBwExoAecAbIHALgHAMIHAzAuMcgHAYAIAQ&sclient=gws-wiz-serp#lrd=0x4d6ba89778b9482b:0xbeeac3f05a9f5de7,1,,,,"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-xs font-black text-brand-charcoal dark:text-white hover:border-brand-green dark:hover:border-teal-400 hover:text-brand-green transition-all shadow-sm"
            >
              <span>Read all 117+ Reviews on Google</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </section>

      {/* Verified Practo Patient Stories Section */}
      <section id="practo-reviews" className="bg-white dark:bg-slate-950 py-20 overflow-hidden relative border-b border-slate-200/60 dark:border-slate-850">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Header Row: Clean Title & Practo Rating Trust Card */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 reveal-on-scroll">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-brand-green bg-brand-green/10 dark:bg-brand-green/20 border border-brand-green/20 px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                Verified Practo Patient Stories
              </span>
            </div>

            {/* Practo Rating Trust Badge Card */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-wrap sm:flex-nowrap items-center gap-5 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src="/images/practo_logo.png"
                  alt="Practo Official Logo"
                  className="h-11 w-11 rounded-2xl object-contain shrink-0 shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-slate-900 dark:text-white leading-none">5.0</span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                    Based on <strong className="text-slate-800 dark:text-slate-200">48+ Patient Stories</strong> on Practo
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-5 w-full sm:w-auto">
                <a
                  href="https://www.practo.com/bangalore/clinic/gait-physio-clinic-whitefield-2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-green dark:hover:bg-brand-green dark:hover:text-white px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <span>View on Practo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Practo Reviews Carousel: 1 Card on Mobile, 2 Cards on Desktop */}
          <div 
            className="relative px-2 sm:px-12"
            onMouseEnter={() => setIsPractoHovered(true)}
            onMouseLeave={() => setIsPractoHovered(false)}
            onTouchStart={() => setIsPractoHovered(true)}
            onTouchEnd={() => setIsPractoHovered(false)}
          >
            {/* --- DESKTOP VIEW (md and up): 2 Side-by-Side Cards --- */}
            <div className="hidden md:block">
              {/* Left Nav Arrow */}
              <button
                onClick={handlePrevPractoDesktop}
                className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green transition-all shadow-sm active:scale-90 cursor-pointer"
                aria-label="Previous Practo review pair"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right Nav Arrow */}
              <button
                onClick={handleNextPractoDesktop}
                className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green transition-all shadow-sm active:scale-90 cursor-pointer"
                aria-label="Next Practo review pair"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {/* 2 Side-by-Side Practo Review Cards */}
              <div 
                key={desktopPractoPage}
                className="grid grid-cols-2 gap-6 animate-fade-swap"
              >
                {[0, 1].map((offset) => {
                  const reviewIndex = (desktopPractoPage * 2 + offset) % practoReviews.length;
                  const review = practoReviews[reviewIndex];
                  return (
                    <div
                      key={review.name + reviewIndex}
                      className="flex flex-col justify-between bg-slate-50/60 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                    >
                      <div className="space-y-4">
                        {/* Top Row: Author & Verification Badge */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-11 w-11 rounded-full ${review.avatarBg} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-sm`}>
                              {review.avatarText}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-black text-slate-900 dark:text-white text-base">
                                  {review.name}
                                </h3>
                                <span className="text-[10px] font-bold text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-1.5 py-0.5 rounded-md border border-brand-green/20">
                                  Verified
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                {review.doctorVisited} • {review.timeAgo}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded-full shrink-0">
                            👍 Recommends Doctor
                          </span>
                        </div>

                        {/* Condition Badge */}
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                            {review.condition}
                          </span>
                        </div>

                        {/* Review Body */}
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      </div>

                      {/* Card Bottom */}
                      <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1 text-brand-green font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Practo Patient
                        </span>
                        <span>5.0 / 5.0 ★</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* --- MOBILE VIEW: 1 Single Card --- */}
            <div className="md:hidden">
              <div 
                key={mobilePractoIndex}
                className="bg-slate-50/60 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs animate-fade-swap flex flex-col justify-between min-h-[300px]"
              >
                {(() => {
                  const review = practoReviews[mobilePractoIndex];
                  return (
                    <>
                      <div className="space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-10 w-10 rounded-full ${review.avatarBg} text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-sm`}>
                              {review.avatarText}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                  {review.name}
                                </h3>
                                <span className="text-[9px] font-bold text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-1.5 py-0.5 rounded-md border border-brand-green/20">
                                  Verified
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                {review.doctorVisited} • {review.timeAgo}
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                            👍 Recommended
                          </span>
                        </div>

                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200/80 dark:border-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                            {review.condition}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                          &ldquo;{review.comment}&rdquo;
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1 text-brand-green font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified Practo Patient
                        </span>
                        <span>5.0 / 5.0 ★</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Mobile Arrows & Dots */}
              <div className="flex items-center justify-between pt-4 px-1">
                <button
                  onClick={handlePrevPractoMobile}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white transition-all shadow-sm active:scale-90"
                  aria-label="Previous Practo review"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  {practoReviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMobilePractoIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        mobilePractoIndex === i
                          ? "bg-brand-green w-5"
                          : "bg-slate-300 dark:bg-slate-700 w-2"
                      }`}
                      aria-label={`Go to Practo review ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextPractoMobile}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white transition-all shadow-sm active:scale-90"
                  aria-label="Next Practo review"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom CTA for Practo */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="https://www.practo.com/bangalore/clinic/gait-physio-clinic-whitefield-2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-3 text-xs font-black text-brand-charcoal dark:text-white hover:border-brand-green dark:hover:border-teal-400 hover:text-brand-green transition-all shadow-sm"
            >
              <span>Read all 48+ Patient Stories on Practo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </section>

      {/* Articles & Health Insights Section */}
      <section id="articles" className="py-20 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green dark:text-brand-luminous bg-brand-green/10 dark:bg-brand-luminous/15 px-3 py-1.5 rounded-full">
              Clinical Insights & Guides
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Health Articles & Research
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Evidence-based physiotherapy advice, movement health tips, and recovery guides authored by our clinical team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {articles.slice(0, 2).map((article) => (
              <article
                key={article.slug}
                className="bg-brand-bg/60 dark:bg-slate-950 rounded-[2.5rem] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-[0_8px_30px_-6px_var(--brand-shadow)] hover:shadow-[0_12px_40px_-6px_var(--brand-shadow-hover)] transition-all duration-300 flex flex-col group"
              >
                {/* Thumbnail Image */}
                <Link href={`/articles/${article.slug}`} className="block relative h-60 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <Image
                    src={article.thumbnail}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-brand-green/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                    {article.category}
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-7 flex flex-col flex-1 justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{article.readTime}</span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{article.date}</span>
                    </div>

                    <h3 className="text-lg font-black text-brand-charcoal dark:text-white leading-snug group-hover:text-brand-green transition-colors">
                      <Link href={`/articles/${article.slug}`} className="hover:underline">
                        {article.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800">
                    <Link
                      href={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black text-brand-green hover:text-brand-green-hover transition-colors"
                    >
                      <span>Read Full Guide</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="flex justify-center pt-4">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-brand-charcoal dark:text-white hover:border-brand-green dark:hover:border-teal-400 hover:text-brand-green transition-all shadow-sm group"
            >
              <span>Explore All Articles & Patient Guides</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* Patient Hub Section */}
      <section id="patient-hub" className="py-16 sm:py-20 bg-brand-bg dark:bg-slate-955 border-t border-slate-200/60 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green dark:text-brand-luminous bg-brand-green/10 dark:bg-brand-luminous/15 px-3 py-1.5 rounded-full inline-block">
              PATIENT DIGITAL PORTAL
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Patient Hub
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
              Everything you need for your ongoing rehabilitation, directly accessible on your smartphone.
            </p>
          </div>

          <div className="max-w-5xl mx-auto bg-gradient-to-br from-brand-charcoal via-slate-900 to-slate-950 text-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 lg:p-12 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.4)] relative overflow-hidden border border-white/10">
            {/* Subtle luminous ambient glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-brand-green/25 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Left Column: 5 Core Features & Primary Action Buttons */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 5 Real Features (No Fluff) */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 transition-colors hover:bg-white/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/30 flex items-center justify-center shrink-0 text-brand-luminous mt-0.5">
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">Prescribed Video Workouts</h4>
                      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                        HD guided exercise routines with custom sets, reps, and hold timers prescribed by Dr. Kinnera.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 transition-colors hover:bg-white/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/30 flex items-center justify-center shrink-0 text-brand-luminous mt-0.5">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">Smart Session Calendar</h4>
                      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                        Track upcoming clinic appointments, check slot availability, and book follow-up visits.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 transition-colors hover:bg-white/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/30 flex items-center justify-center shrink-0 text-brand-luminous mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">Clinical Records & Invoices</h4>
                      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                        Instant access to doctor assessment notes, posture scans, and itemized GST insurance receipts.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 transition-colors hover:bg-white/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/30 flex items-center justify-center shrink-0 text-brand-luminous mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">Family Circle Switcher</h4>
                      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                        Manage rehabilitation protocols for family members (spouse, children, parents) in 1 tap.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-3 sm:p-3.5 transition-colors hover:bg-white/10">
                    <div className="w-8 h-8 rounded-xl bg-brand-green/30 flex items-center justify-center shrink-0 text-brand-luminous mt-0.5">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white">Daily Streak & Progress Tracker</h4>
                      <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                        Mark completed days, monitor mobility improvements, and receive WhatsApp clinic reminders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary Action Buttons - Mobile First Focus */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 pt-2">
                  <a
                    href={patientHubHref}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs sm:text-sm font-black transition-all shadow-lg hover:shadow-brand-green/30 active:scale-95 text-center cursor-pointer shrink-0"
                  >
                    <span>{isPatientActive ? "Open Patient Hub" : "Log in to Patient Hub"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  {!isStandaloneApp ? (
                    <div className="flex flex-col items-center sm:items-start gap-1.5">
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-black transition-all border border-white/20 active:scale-95 text-center cursor-pointer group"
                      >
                        <Download className="w-4 h-4 text-brand-luminous group-hover:animate-bounce" />
                        <span>Install GaitPhysio PatientHub App</span>
                      </button>
                      <p className="text-[11px] text-slate-300/80 font-normal pl-1">
                        Already installed? Look for <strong>GaitPhysio</strong> on your home screen or Start menu.
                      </p>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold self-center sm:self-auto">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Running in GaitPhysio App Mode
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Authentic Smartphone App Showcase */}
              <div className="hidden lg:flex lg:col-span-5 justify-center items-center">
                <div className="relative group">
                  {/* Subtle Ambient Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-brand-green/25 to-teal-500/25 rounded-[48px] blur-2xl opacity-60 group-hover:opacity-85 transition-opacity duration-500" />

                  {/* Floating Live Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900/95 border border-white/20 shadow-lg backdrop-blur-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black tracking-wider uppercase text-emerald-300">
                      Live Patient Hub
                    </span>
                  </div>

                  {/* Smartphone Chassis Frame */}
                  <div className="relative w-[280px] sm:w-[290px] rounded-[38px] p-2 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-black/50">
                    {/* Screen Container */}
                    <div className="relative rounded-[30px] overflow-hidden bg-slate-950 shadow-inner aspect-[1/2]">
                      <Image
                        src="/images/patienthub_app_preview.jpg"
                        alt="Gait Physio Patient Hub Portal"
                        width={512}
                        height={1024}
                        className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                        priority
                      />
                      {/* Subtle Glass Reflection */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.10] pointer-events-none rounded-[30px]" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* MODAL 1: App Already Installed Notice */}
          {showAlreadyInstalledModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowAlreadyInstalledModal(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    App Already Installed!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    <strong>GaitPhysio Patient Hub</strong> is already installed on your device. You can launch it directly from your home screen, app drawer, or Windows Start Menu anytime!
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAlreadyInstalledModal(false)}
                    className="w-full py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md cursor-pointer transition-all text-center"
                  >
                    Got It
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAlreadyInstalledModal(false);
                      setIsAppInstalled(false);
                      try {
                        localStorage.removeItem("gpc_patienthub_installed");
                        localStorage.removeItem("gpc_pwa_installed");
                      } catch (e) {}
                      const promptToUse = deferredPrompt || (typeof window !== "undefined" && (window as any).deferredPrompt);
                      if (promptToUse) {
                        try {
                          promptToUse.prompt();
                        } catch (e) {}
                      } else if (deviceType === "ios") {
                        setShowIOSModal(true);
                      } else if (deviceType === "android") {
                        setShowAndroidModal(true);
                      } else {
                        setShowDesktopModal(true);
                      }
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
                  >
                    Uninstalled? Click here to reinstall
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: iOS Direct Add to Home Screen Sheet */}
          {showIOSModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
                  <Smartphone className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Install Patient Hub on iPhone
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                    To install the Patient Hub app on iOS:
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <strong>Share</strong> icon at the bottom of Safari.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                    <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* MODAL 3: Android / Firefox / Other Browser Instructions */}
          {showAndroidModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowAndroidModal(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
                  <Smartphone className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Install on Your Device
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    To install the Patient Hub app directly on your browser:
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2 font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <strong>three dots (⋮ menu)</strong> at the top right of your browser.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                    <span>Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAndroidModal(false)}
                  className="w-full py-2.5 rounded-full bg-brand-green text-white text-xs font-black cursor-pointer shadow-md"
                >
                  Got It
                </button>
              </div>
            </div>
          )}

          {/* MODAL 4: Desktop Browser Instructions */}
          {showDesktopModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-4 relative">
                <button
                  type="button"
                  onClick={() => setShowDesktopModal(false)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-brand-green">
                  <Monitor className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Install on Your Computer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                    Install the <strong>GaitPhysio Patient Hub</strong> directly to your Windows or Mac desktop for 1-click access:
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 text-left space-y-2.5 font-semibold">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Look for the <strong>Install App icon (💻 or ➕)</strong> in your browser&apos;s address bar at the top right.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-green text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Click <strong>Install</strong> to add GaitPhysio to your Desktop &amp; Start Menu.</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={patientHubHref}
                    className="w-full py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black shadow-md cursor-pointer transition-all text-center"
                  >
                    Open Patient Hub in Browser
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowDesktopModal(false)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center max-w-xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green dark:text-brand-luminous bg-brand-green/10 dark:bg-brand-luminous/15 px-3 py-1.5 rounded-full">
              Common Questions
            </span>
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              Have questions about session preparation, treatments, costs, or appointments? Find answers or reach our front desk at +91 89044 56243.
            </p>
          </div>

          <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-850 shadow-[0_6px_25px_-6px_var(--brand-shadow)] reveal-on-scroll">
            {faqs.map((faq, index) => {
              const isOpen = faqOpenIndex === index;
              return (
                <div key={index} className="w-full">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="flex w-full items-center justify-between p-6 text-left focus:outline-none hover:bg-brand-bg/40 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5 text-brand-green dark:text-teal-400 shrink-0" />
                      <span className="font-bold text-brand-charcoal dark:text-white text-sm sm:text-base group-hover:text-brand-green">
                        {faq.q}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="p-6 pt-0 bg-brand-bg/50 dark:bg-slate-900">
                      <p className="text-xs text-slate-500 dark:text-slate-350 leading-relaxed pl-8 font-semibold">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Locate Us Section */}
      <section id="locate-us" className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green dark:text-brand-luminous bg-brand-green/10 dark:bg-brand-luminous/15 px-3 py-1.5 rounded-full">
              Find Our Clinic
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Locate Us
            </h2>
            <p className="text-base text-slate-655 dark:text-slate-400">
              Get directions, contact details, operating hours, and maps location to reach Gait Physio Clinic.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left side: Clinic Details */}
            <div className="lg:col-span-5 space-y-8 reveal-on-scroll">
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-brand-charcoal dark:text-white">Get In Touch</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Feel free to contact us with any booking questions, corporate tie-ups, or follow-ups. Our reception is available to assist you during business hours.
                </p>
              </div>

              <div className="space-y-6">
                {/* Address */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Clinic Location</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed mt-1 font-semibold">
                      {clinicConfig.address || DEFAULT_CLINIC_CONFIG.address}
                    </p>
                    {clinicConfig.landmark && (
                      <p className="text-xs font-black text-brand-green dark:text-teal-400 mt-1">
                        Landmark: {clinicConfig.landmark}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Phone Number</h4>
                    <a
                      href={`tel:${getPrimaryDialNumber(clinicConfig.phone || DEFAULT_CLINIC_CONFIG.phone)}`}
                      className="text-xs text-slate-500 hover:text-brand-green dark:text-slate-400 dark:hover:text-brand-green transition-colors mt-1 block font-semibold"
                    >
                      {clinicConfig.phone || DEFAULT_CLINIC_CONFIG.phone}
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Email Address</h4>
                    <a
                      href={`mailto:${clinicConfig.email || DEFAULT_CLINIC_CONFIG.email}`}
                      className="text-xs text-slate-500 hover:text-brand-green dark:text-slate-400 dark:hover:text-brand-green transition-colors mt-1 block font-semibold"
                    >
                      {clinicConfig.email || DEFAULT_CLINIC_CONFIG.email}
                    </a>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-xl bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-brand-charcoal dark:text-white text-sm">Working Hours</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed mt-1 font-semibold whitespace-pre-line">
                      {clinicConfig.operationalHoursText || DEFAULT_CLINIC_CONFIG.operationalHoursText}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Dynamic Map Frame */}
            <div className="lg:col-span-7 flex flex-col gap-6 w-full reveal-on-scroll">
              <div className="h-[450px] w-full rounded-3xl border border-slate-250/85 dark:border-slate-800 bg-white dark:bg-slate-955 relative overflow-hidden shadow-[0_6px_25px_-6px_var(--brand-shadow)]">
                {clinicConfig.googleMapsEmbed ? (
                  <iframe
                    src={clinicConfig.googleMapsEmbed}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 w-full h-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900">
                    <div className="h-16 w-16 rounded-full bg-brand-sand/85 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green shrink-0 animate-bounce mb-4">
                      <MapPin className="h-8 w-8" />
                    </div>
                    <h3 className="font-black text-brand-charcoal dark:text-white">Gait Physio Clinic Bangalore</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-450 max-w-sm font-semibold mt-1">
                      Map configuration is incomplete. Update maps embed details in settings config.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <a
                  href={clinicConfig.googleMapsLink || DEFAULT_CLINIC_CONFIG.googleMapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all"
                >
                  <Navigation className="h-4 w-4" />
                  Open in Google Maps
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Banner / CTA */}
      <section className="bg-brand-green py-16 text-white text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6 relative z-10 reveal-on-scroll">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to feel like yourself again?
          </h2>
          <p className="text-lg text-teal-50 max-w-2xl mx-auto">
            Take the first step toward pain-free movement. Book your initial consultation today at our convenient location.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            {clinicConfig.enablePublicBooking !== false ? (
              <Link
                href="/book"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold text-brand-charcoal shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
              >
                Book Online Now
              </Link>
            ) : (
              <a
                href={`https://wa.me/${getCleanWhatsAppNumber(clinicConfig.phone)}?text=${encodeURIComponent("Hello Gait Physio Clinic, I would like to schedule an appointment.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-brand-charcoal shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
              >
                <MessageSquare className="h-5 w-5 text-brand-green" />
                WhatsApp Us
              </a>
            )}
            <Link
              href="/locate-us"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all active:scale-95"
            >
              Locate Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
