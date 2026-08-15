"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
  Loader2
} from "lucide-react";
import { getClinicConfig, ClinicConfig, DEFAULT_CLINIC_CONFIG } from "@/lib/db";

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
  const services = [
    {
      title: "Gait & Biomechanical Analysis",
      desc: "Identify posture imbalances, movement flaws, and pressure distribution using advanced digital treadmills and cameras.",
      icon: Activity,
      highlight: true,
    },
    {
      title: "Sports Rehabilitation",
      desc: "Fast-track recovery from sprains, tears, and sports-related injuries under the guidance of movement specialists.",
      icon: Award,
      highlight: false,
    },
    {
      title: "Spine & Musculoskeletal Care",
      desc: "Effective therapy for persistent back pain, neck strain, slip discs, sciatica, and joint disorders.",
      icon: ShieldCheck,
      highlight: false,
    },
  ];

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

  // Integrated Specialists/Team data
  interface TherapistProfile {
    name: string;
    role: string;
    image: string;
    years: string;
    headline: string;
    desc: string;
    quote: string;
    signature: string;
  }

  const therapistProfiles: TherapistProfile[] = [
    {
      name: "Dr. Kinnera, BPT, MPT",
      role: "Senior Physiotherapist & Clinical Director",
      image: "/images/dr-kinnera-portrait.jpg",
      years: "12+",
      headline: "Passionate About Providing Expert Care And Support",
      desc: "Behind every successful recovery is a physiotherapist's passion for care, relentless support, and expert guidance. Dr. Kinnera is committed to resolving underlying biomechanical dysfunctions, relieving acute and chronic pain, and helping you achieve long-term physical health.",
      quote: "True Healing Comes From More Than Treatments—It's Built On Trust, Patience, And Compassion, Reflected In Each Small Victory And Ongoing Encouragement.",
      signature: "Dr. Kinnera",
    },
    {
      name: "Dr. Rohan, BPT, MPT",
      role: "Lead Physiotherapist & Spine Rehabilitation Specialist",
      image: "/images/dr-rohan-portrait.jpg",
      years: "8+",
      headline: "Empowering Movement And Rebuilding Structural Resilience",
      desc: "Dedicated to helping patients reclaim their physical strength, Dr. Rohan combines evidence-based spinal care with manual therapy techniques. He focuses on restoring spinal function, correcting posture, and designing custom rehabilitation protocols for fast, sustainable recovery.",
      quote: "Rehabilitation Is About Reconnecting With Your Body's Potential, Reclaiming What Was Lost, And Walking Forward With Strength And Renewed Confidence.",
      signature: "Dr. Rohan",
    }
  ];

  const [teamIndex, setTeamIndex] = useState(0);

  const nextTeamSlide = useCallback(() => {
    setTeamIndex((prev) => (prev + 1) % therapistProfiles.length);
  }, [therapistProfiles.length]);

  const prevTeamSlide = useCallback(() => {
    setTeamIndex((prev) => (prev - 1 + therapistProfiles.length) % therapistProfiles.length);
  }, [therapistProfiles.length]);

  // Autoplay for team slider
  useEffect(() => {
    const timer = setInterval(() => {
      nextTeamSlide();
    }, 4000);
    return () => clearInterval(timer);
  }, [nextTeamSlide]);

  // Integrated Gallery data
  const galleryItems = [
    {
      title: "Digital Gait Treadmill & Capture Lab",
      desc: "Our high-speed camera system and force plate treadmill to record step strikes.",
      icon: Activity,
      gradient: "from-brand-green/20 to-brand-sand/40",
    },
    {
      title: "Orthopedic Rehabilitation Gym",
      desc: "Kettlebells, balance pads, and resistance stations for functional recovery.",
      icon: Zap,
      gradient: "from-brand-green/25 to-brand-bg",
    },
    {
      title: "Private Consult & Treatment Rooms",
      desc: "Hygienic, quiet private suites for manual joint manipulation and consultations.",
      icon: ShieldCheck,
      gradient: "from-brand-sand/50 to-brand-green/15",
    },
    {
      title: "Foot Scanner & Orthotics Lab",
      desc: "High-resolution 3D foot scanners to design custom arch insoles.",
      icon: Sparkles,
      gradient: "from-brand-bg to-brand-sand/65",
    },
    {
      title: "Dry Needling & Laser Care Suite",
      desc: "Clean treatment spaces for dry needling and target electrotherapy.",
      icon: HeartPulse,
      gradient: "from-brand-green/15 to-brand-sand/35",
    },
    {
      title: "Digital Client Analytics Station",
      desc: "Where therapists review biomechanical metrics alongside our patients.",
      icon: Smartphone,
      gradient: "from-brand-sand/60 to-brand-bg",
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

  const [reviewPage, setReviewPage] = useState(0);
  const [isReviewHovered, setIsReviewHovered] = useState(false);
  const totalReviewPages = Math.ceil(googleReviews.length / 2);

  // Auto-slide every 3.5 seconds (pauses when user hovers over the cards)
  useEffect(() => {
    if (isReviewHovered) return;
    const timer = setInterval(() => {
      setReviewPage((prev) => (prev + 1) % totalReviewPages);
    }, 3500);
    return () => clearInterval(timer);
  }, [isReviewHovered, totalReviewPages]);

  const handlePrevReview = () => {
    setReviewPage((prev) => (prev === 0 ? totalReviewPages - 1 : prev - 1));
  };

  const handleNextReview = () => {
    setReviewPage((prev) => (prev + 1) % totalReviewPages);
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
      `}</style>

      {/* Hero Section: Panoramic Background & Styled Therapist Frame */}
      <section id="home" className="relative overflow-hidden py-24 sm:py-32 text-brand-charcoal bg-brand-bg">
        {/* Panoramic Background (Crisp and rich visibility) */}
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-[0.5px] scale-[1.01] opacity-100" 
          style={{ backgroundImage: "url('/images/hero-bg.png')" }} 
        />
        {/* Horizontal gradient mask: high opacity on the left for text readability, clear on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/20 dark:from-brand-charcoal/95 dark:via-brand-charcoal/80 dark:to-brand-charcoal/30" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Bold Clinical Messaging */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-sand px-4 py-1.5 text-xs font-black uppercase tracking-wider text-brand-green dark:bg-brand-green/20 dark:text-teal-300 border border-brand-green/10 animate-fade-in-up">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                Bangalore's Premier Movement Clinic
              </span>
              
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-brand-charcoal dark:text-white">
                <span className="block mb-2">
                  {["Restore", "Your", "Movement."].map((word, i) => (
                    <span
                      key={i}
                      className="animate-word inline-block mr-3"
                      style={{ animationDelay: `${i * 120}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
                <span className="block text-brand-green">
                  {["Reclaim", "Your", "Life."].map((word, i) => (
                    <span
                      key={i}
                      className="animate-word inline-block mr-3"
                      style={{ animationDelay: `${(3 + i) * 120}ms` }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed font-semibold animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                Experience clinical precision blended with holistic wellness. Our tailored physiotherapy plans help you recover faster, prevent injury, and move with confidence.
              </p>
              
              {/* Trust Checkmarks */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                <div className="flex items-center justify-center lg:justify-start gap-2 hover:scale-105 transition-transform duration-200">
                  <div className="h-5 w-5 rounded-full bg-brand-green/10 dark:bg-brand-green/30 flex items-center justify-center text-brand-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Digital Foot Scans</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2 hover:scale-105 transition-transform duration-200">
                  <div className="h-5 w-5 rounded-full bg-brand-green/10 dark:bg-brand-green/30 flex items-center justify-center text-brand-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Active Rehabilitation</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2 hover:scale-105 transition-transform duration-200">
                  <div className="h-5 w-5 rounded-full bg-brand-green/10 dark:bg-brand-green/30 flex items-center justify-center text-brand-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Custom Orthotics</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 animate-fade-in-up" style={{ animationDelay: '1100ms' }}>
                <Link
                  href="/book"
                  className="inline-flex items-center justify-center rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-8 py-4 text-base font-bold shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Book Free Consultation
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <a
                  href="#services"
                  className="inline-flex items-center justify-center rounded-full border border-brand-green text-brand-green hover:bg-brand-green/5 bg-white/40 backdrop-blur-sm px-8 py-4 text-base font-bold transition-all active:scale-95 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                >
                  Our Services
                </a>
              </div>
            </div>
            
            {/* Right Column: Therapist-Patient Image Visual Frame */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative rounded-3xl p-2.5 bg-white/40 dark:bg-brand-charcoal/40 backdrop-blur-md border border-brand-green/10 dark:border-white/20 shadow-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-500 animate-slide-in-card w-full">
                <img 
                  src="/images/hero-therapist.jpg" 
                  alt="Therapist helping patient with mobility exercises" 
                  className="rounded-2xl w-full h-auto object-cover shadow-inner"
                />
                
                {/* Floating Micro-Badge */}
                <div className="absolute bottom-6 left-6 bg-white/95 dark:bg-brand-charcoal/95 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <Activity className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Active Healing</p>
                    <p className="text-xs font-black text-brand-charcoal dark:text-white">Posture Alignment</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Stats: Triggers rolling number animations */}
      <section className="bg-white dark:bg-brand-charcoal border-y border-brand-muted dark:border-brand-charcoal py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2 reveal-on-scroll">
              <h3 className="text-3xl font-black text-brand-green">
                <ScrollTriggeredCounter value={10000} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Patients Recovered</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-100">
              <h3 className="text-3xl font-black text-brand-green">
                <ScrollTriggeredCounter value={15} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Years Experience</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-200">
              <h3 className="text-3xl font-black text-brand-green">
                <ScrollTriggeredCounter value={99} suffix="%" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Patient Satisfaction</p>
            </div>
            <div className="space-y-2 reveal-on-scroll delay-300">
              <h3 className="text-3xl font-black text-brand-green">
                <ScrollTriggeredCounter value={30} suffix="+" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Diagnostic Tests</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services / Treatments Section */}
      <section id="services" className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="max-w-3xl space-y-2 reveal-on-scroll">
            <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-widest text-brand-green dark:text-teal-400 block">
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
                  className={`group flex flex-col h-full bg-[#faf8f5] dark:bg-slate-900/60 rounded-3xl border border-[#ece9e0] dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer reveal-on-scroll ${
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
                  className={`group flex flex-col h-full bg-[#faf8f5] dark:bg-slate-900/60 rounded-3xl border border-[#ece9e0] dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer reveal-on-scroll ${
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
      {/* Specialized Care Programs Section */}
      <section className="py-20 bg-[#f4f7f5] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3.5 py-1.5 rounded-full inline-block">
              Clinic Programs
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Specialized Physiotherapy Programs
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              We leverage diagnostic tools, manual therapy, and clinical biomechanics to resolve the root cause of your physical limitations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((svc, index) => (
              <div
                key={svc.title}
                className={`group relative overflow-hidden rounded-3xl border p-8 bg-white dark:bg-slate-900 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] transition-all duration-350 hover:-translate-y-1.5 reveal-on-scroll ${
                  index === 0 ? "" : index === 1 ? "delay-100" : "delay-200"
                } ${
                  svc.highlight
                    ? "border-brand-green ring-2 ring-brand-green/10 shadow-[0_6px_25px_-4px_rgba(93,122,109,0.18)] hover:shadow-[0_12px_35px_-6px_rgba(93,122,109,0.26)]"
                    : "border-slate-200/80 dark:border-brand-charcoal/60"
                }`}
              >
                {svc.highlight && (
                  <span className="absolute top-0 right-0 bg-brand-green text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                    Featured
                  </span>
                )}
                
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300 mb-6">
                  <svc.icon className="h-5 w-5" />
                </div>
                
                <h3 className="text-lg sm:text-xl font-black text-brand-green dark:text-teal-400 mb-3 group-hover:text-brand-green-hover transition-colors">
                  {svc.title}
                </h3>
                
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-normal">
                  {index === 0 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-bold">Identify posture imbalances,</strong> movement flaws, and pressure distribution using digital treadmills.</span>
                  )}
                  {index === 1 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-bold">Fast-track recovery</strong> from sprains, tears, and sports injuries under the guidance of specialists.</span>
                  )}
                  {index === 2 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-bold">Effective therapy</strong> for persistent back pain, neck strain, sciatica, and joint disorders.</span>
                  )}
                </p>
                
                <a
                  href="#services"
                  className="inline-flex items-center text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline group/btn"
                >
                  <span>Learn more</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Specialists / Team Section */}
      <section id="team" className="py-20 bg-brand-bg dark:bg-slate-955 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center max-w-3xl mx-auto mb-14 reveal-on-scroll">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Meet Our Specialists
            </h2>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-20 hidden lg:block">
            <button
              onClick={prevTeamSlide}
              className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="Previous Specialist"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-20 hidden lg:block">
            <button
              onClick={nextTeamSlide}
              className="p-3.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
              title="Next Specialist"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div key={teamIndex} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
            <div className="lg:col-span-5 relative animate-fade-in-left">
              <div className="relative max-w-md mx-auto">
                <img
                  src={therapistProfiles[teamIndex].image}
                  alt={`${therapistProfiles[teamIndex].name} Standing in GPC Clinic`}
                  className="w-full rounded-[2.5rem] object-cover aspect-[3/4] shadow-[0_15px_35px_-10px_rgba(93,122,109,0.25)] border-4 border-white dark:border-slate-900 transition-all duration-300"
                />
                <div className="absolute -right-8 top-1/2 z-10 w-24 h-24 rounded-full bg-[#1b3d2f] text-white flex flex-col items-center justify-center border-4 border-slate-50 dark:border-slate-950 shadow-xl text-center select-none animate-float-badge">
                  <span className="text-xl sm:text-2xl font-black tracking-tight leading-none">{therapistProfiles[teamIndex].years}</span>
                  <span className="text-[7.5px] font-black uppercase tracking-wider mt-1.5 leading-tight">
                    Years of<br />Expertise
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-brand-green dark:text-teal-400 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest animate-fade-in-up">
                <span className="h-[2px] w-8 bg-brand-green dark:bg-teal-400 rounded-full"></span>
                OUR TRUSTED SUPPORT
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-brand-charcoal dark:text-white leading-tight animate-fade-in-up delay-100">
                {therapistProfiles[teamIndex].headline.includes("Providing") ? (
                  <>
                    Passionate About <span className="text-brand-green dark:text-teal-400">Providing Expert Care</span> And Support
                  </>
                ) : (
                  <>
                    Empowering Movement And <span className="text-brand-green dark:text-teal-400">Rebuilding Structural</span> Resilience
                  </>
                )}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal animate-fade-in-up delay-200">
                {therapistProfiles[teamIndex].desc}
              </p>

              <div className="border-l-4 border-brand-green dark:border-teal-500 bg-[#f0f4f2]/60 dark:bg-brand-green/5 p-4 sm:p-5 rounded-r-2xl italic text-[11px] sm:text-xs font-normal text-slate-655 dark:text-slate-350 leading-relaxed animate-fade-in-up delay-300">
                "{therapistProfiles[teamIndex].quote}"
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-200/60 dark:border-slate-800 animate-fade-in-up delay-400">
                <div className="flex items-center gap-3">
                  <img
                    src={therapistProfiles[teamIndex].image}
                    alt={`${therapistProfiles[teamIndex].name} Profile Icon`}
                    className="w-12 h-12 rounded-full object-cover border border-brand-green/20 ring-4 ring-brand-green/5 shrink-0"
                  />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 leading-none block mb-1">
                      {therapistProfiles[teamIndex].role}
                    </span>
                    <h4 className="text-sm font-black text-brand-charcoal dark:text-white leading-tight">
                      {therapistProfiles[teamIndex].name}
                    </h4>
                  </div>
                </div>

                <div className="font-[family-name:var(--font-signature)] text-4xl sm:text-5xl text-brand-green dark:text-teal-400 font-medium select-none pr-4 rotate-[-3deg] transform origin-center tracking-wide">
                  {therapistProfiles[teamIndex].signature}
                </div>
              </div>

              <div className="pt-2 animate-fade-in-up delay-400">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-green hover:bg-brand-green-hover text-white px-7 py-3.5 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span>Request Booking</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-12">
            <button
              onClick={prevTeamSlide}
              className="lg:hidden p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-2">
              {therapistProfiles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setTeamIndex(idx)}
                  className={`h-2.5 rounded-full transition-all duration-350 cursor-pointer ${idx === teamIndex ? "bg-brand-green w-6" : "bg-slate-300 dark:bg-slate-700 w-2.5 hover:bg-slate-400"}`}
                  title={`View Specialist ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTeamSlide}
              className="lg:hidden p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-brand-charcoal dark:text-white hover:bg-brand-green hover:text-white transition-all shadow"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* Clinic Gallery Section */}
      <section id="gallery" className="py-20 bg-[#f4f7f5] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
              Clinic Gallery
            </span>
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Our Facility & Technology
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              We maintain a sanitised, fully equipped environment with clinical tools designed for diagnostic precision and patient recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {galleryItems.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col group shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350 reveal-on-scroll"
              >
                <div className={`h-56 bg-gradient-to-br ${item.gradient} flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-855 p-6 relative overflow-hidden`}>
                  <item.icon className="h-16 w-16 text-brand-green dark:text-teal-400 z-10 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-white/20 dark:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="p-6 space-y-2 flex-grow">
                  <h3 className="text-base font-black text-brand-charcoal dark:text-white group-hover:text-brand-green transition-colors">{item.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 bg-brand-bg dark:bg-slate-955">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center max-w-xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
              Common Questions
            </span>
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
              Have questions about session preparation, treatments, costs, or appointments? Find answers or reach our front desk at +91 92066 51295.
            </p>
          </div>

          <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-850 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] reveal-on-scroll">
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
                    <div className="p-6 pt-0 bg-[#fafcfb] dark:bg-slate-900">
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

      {/* Real Google Reviews Showcase */}
      <section className="bg-[#faf8f5] dark:bg-slate-955 py-24 overflow-hidden relative border-y border-slate-200/60 dark:border-slate-850">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header Row: Title & Official Google Rating Trust Summary */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 reveal-on-scroll">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 dark:bg-brand-green/20 px-3.5 py-1.5 rounded-full">
                  Verified Patient Stories
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Real Google Reviews
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

          {/* 2-Card Carousel Track with Side Navigation Arrows */}
          <div 
            className="relative px-2 sm:px-12"
            onMouseEnter={() => setIsReviewHovered(true)}
            onMouseLeave={() => setIsReviewHovered(false)}
          >
            {/* Left Nav Arrow Button (Beside Slide) */}
            <button
              onClick={handlePrevReview}
              className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green dark:hover:bg-teal-500 dark:hover:text-slate-950 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-90 cursor-pointer"
              aria-label="Previous review page"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Right Nav Arrow Button (Beside Slide) */}
            <button
              onClick={handleNextReview}
              className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-brand-green hover:text-white hover:border-brand-green dark:hover:bg-teal-500 dark:hover:text-slate-950 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] active:scale-90 cursor-pointer"
              aria-label="Next review page"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* 2 Side-by-Side Review Cards */}
            <div 
              key={reviewPage}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-swap"
            >
              {[0, 1].map((offset) => {
                const reviewIndex = (reviewPage * 2 + offset) % googleReviews.length;
                const review = googleReviews[reviewIndex];
                return (
                  <div
                    key={review.name + reviewIndex}
                    className="flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-7 sm:p-8 shadow-[0_6px_25px_-6px_rgba(93,122,109,0.08)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.18)] hover:-translate-y-1 transition-all duration-300 group"
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

            {/* Pagination Dots (3 Pairs) */}
            <div className="flex justify-center gap-2 pt-6">
              {Array.from({ length: totalReviewPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewPage(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    reviewPage === i
                      ? "bg-brand-green w-8"
                      : "bg-slate-300 dark:bg-slate-700 w-2.5 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to slide pair ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Bottom CTAs */}
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

      {/* Locate Us Section */}
      <section id="locate-us" className="py-20 bg-[#f4f7f5] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
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
                      href={`tel:${(clinicConfig.phone || DEFAULT_CLINIC_CONFIG.phone)?.replace(/\s+/g, "")}`}
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
              <div className="h-[450px] w-full rounded-3xl border border-slate-250/85 dark:border-slate-800 bg-white dark:bg-slate-955 relative overflow-hidden shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)]">
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
          <div className="flex justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold text-brand-charcoal shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
            >
              Book Online Now
            </Link>
            <a
              href="#locate-us"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-transparent px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all active:scale-95"
            >
              Locate Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
