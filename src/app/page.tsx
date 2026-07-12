"use client";

import { useState, useEffect, useRef } from "react";
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
  Zap,
  ShieldAlert,
  Sparkles,
  Phone,
  CalendarCheck,
  Users
} from "lucide-react";

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

  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Avid Runner",
      service: "Gait Analysis & Custom Insoles",
      comment: "The Gait Analysis at Gait Physio Clinic completely resolved my chronic ankle pain. They identified my weight distribution error and gave me custom training. Highly recommend!",
      rating: 5,
    },
    {
      name: "Priya Menon",
      role: "IT Consultant",
      service: "Spine & Neck Care",
      comment: "Working at a desk for 9 hours daily gave me intense cervical pain. Dr. Rohan guided me through targeted neck exercises and ergonomic posture corrections. The relief has been absolute.",
      rating: 5,
    },
    {
      name: "Abhishek Das",
      role: "Athlete",
      service: "Sports Rehabilitation (ACL)",
      comment: "Following my knee ligament reconstruction, I did my full rehab here under Dr. Ananya. The kinetic gym facility is excellent and the guidance was top-notch.",
      rating: 5,
    },
    {
      name: "Srinivas Gowda",
      role: "Retiree",
      service: "Orthopedic Post-op Care",
      comment: "Had my knee replacement last year. The home rehab exercises Dr. Vikram prescribed helped me walk again without a walker in record time. Excellent clinic with caring therapists.",
      rating: 5,
    },
    {
      name: "Nisha Sen",
      role: "Yoga Practitioner",
      service: "Dry Needling & Joint Mobilization",
      comment: "Had deep muscle knots in my shoulder blades that prevented me from stretching. The dry needling therapy resolved the muscle trigger points in just two sessions.",
      rating: 5,
    },
  ];

  const [activeReviewIndex, setActiveReviewIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handlePrevReview = () => {
    setActiveReviewIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNextReview = () => {
    setActiveReviewIndex((prev) => (prev + 1) % testimonials.length);
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
      `}</style>

      {/* Hero Section: Panoramic Background & Styled Therapist Frame */}
      <section className="relative overflow-hidden py-24 sm:py-32 text-brand-charcoal bg-brand-bg">
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
                <Link
                  href="/services"
                  className="inline-flex items-center justify-center rounded-full border border-brand-green text-brand-green hover:bg-brand-green/5 bg-white/40 backdrop-blur-sm px-8 py-4 text-base font-bold transition-all active:scale-95 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                >
                  Our Services
                </Link>
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



      {/* Conditions We Treat Section (Matching New Screenshot 2x2 layout) */}
      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
              What We Treat
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Conditions we treat at home.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Condition 1 */}
            <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-brand-charcoal/60 p-8 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.14)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350 reveal-on-scroll space-y-5">
              <div className="flex justify-between items-start">
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">01 — STROKE REHAB</span>
              </div>
              <h3 className="text-lg font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors">Stroke rehabilitation</h3>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Bed-to-stand, walking,</strong> and stairs retrained directly at home.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Neuro-physiotherapy</strong> aligned with your neurologist's plan.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Daily-living retraining</strong> for dressing, cooking, and routines.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/services" className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline inline-flex items-center gap-1 group/btn">
                  <span>Stroke rehab details</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Condition 2 */}
            <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-brand-charcoal/60 p-8 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.14)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350 reveal-on-scroll delay-100 space-y-5">
              <div className="flex justify-between items-start">
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">02 — ELDERLY PHYSIO</span>
              </div>
              <h3 className="text-lg font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors">Elderly care & falls prevention</h3>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Falls prevention</strong> assessed in your actual home environment.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Fortnightly reviews</strong> of balance, strength, and joint mobility.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Pain management</strong> without the strain of daily commutes.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/services" className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline inline-flex items-center gap-1 group/btn">
                  <span>Elderly home physio details</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Condition 3 */}
            <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-brand-charcoal/60 p-8 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.14)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350 reveal-on-scroll space-y-5">
              <div className="flex justify-between items-start">
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">03 — POST-SURGERY RECOVERY</span>
              </div>
              <h3 className="text-lg font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors">Post-surgery recovery</h3>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Knee, hip, and ACL</strong> reconstruction recovery protocols.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Swelling management</strong> to address pain before complications.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Functional walking</strong> and safe range of motion restored.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/services" className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline inline-flex items-center gap-1 group/btn">
                  <span>Post-surgery details</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>

            {/* Condition 4 */}
            <div className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-brand-charcoal/60 p-8 rounded-3xl shadow-[0_6px_25px_-6px_rgba(93,122,109,0.14)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350 reveal-on-scroll delay-100 space-y-5">
              <div className="flex justify-between items-start">
                <div className="h-11 w-11 rounded-full bg-brand-sand/80 dark:bg-brand-green/20 ring-4 ring-brand-sand/30 flex items-center justify-center text-brand-green dark:text-teal-300">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">04 — ORTHOPAEDIC & PAEDIATRIC</span>
              </div>
              <h3 className="text-lg font-black text-brand-green dark:text-teal-400 group-hover:text-brand-green-hover transition-colors">Orthopaedic & paediatric care</h3>
              <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-1 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Back, neck, & joint</strong> relief for sciatica, sprains, and sports injuries.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Ergonomic setups</strong> tailored directly to your real desk and bed.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-1.5" />
                  <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Paediatric therapy</strong> for developmental delays and neuro needs.</span>
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/services" className="text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline inline-flex items-center gap-1 group/btn">
                  <span>Paediatric & ortho details</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Specialized Care Programs Section */}
      <section className="py-20 bg-[#f4f7f5] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4 reveal-on-scroll">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
              Clinic Programs
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
              Specialized Physiotherapy Programs
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-450">
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
                
                <h3 className="text-lg font-black text-brand-green dark:text-teal-400 mb-3 group-hover:text-brand-green-hover transition-colors">
                  {svc.title}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                  {index === 0 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Identify posture imbalances,</strong> movement flaws, and pressure distribution using digital treadmills.</span>
                  )}
                  {index === 1 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Fast-track recovery</strong> from sprains, tears, and sports injuries under the guidance of specialists.</span>
                  )}
                  {index === 2 && (
                    <span><strong className="text-brand-charcoal dark:text-white font-extrabold">Effective therapy</strong> for persistent back pain, neck strain, sciatica, and joint disorders.</span>
                  )}
                </p>
                
                <Link
                  href="/services"
                  className="inline-flex items-center text-xs font-black text-brand-charcoal dark:text-white hover:text-brand-green hover:underline group/btn"
                >
                  <span>Learn more</span>
                  <ArrowRight className="ml-1 h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Google Reviews Testimonials Carousel (Matching New Screenshot) */}
      <section className="bg-slate-50 dark:bg-slate-955 py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8 reveal-on-scroll">
          <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">
            What Our Patients Say — Testimonials
          </h2>
          
          <div className="relative mx-auto max-w-3xl">
            {/* Navigation buttons */}
            <button
              onClick={handlePrevReview}
              className="absolute left-[-20px] sm:left-[-50px] top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-brand-muted dark:border-brand-charcoal/60 shadow-md text-brand-charcoal dark:text-slate-300 hover:text-brand-green active:scale-90 transition-all"
              aria-label="Previous review"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Google Review Styled Card */}
            <div className="min-h-[230px] flex items-center justify-center rounded-3xl border border-brand-muted/70 dark:border-brand-charcoal/60 bg-white dark:bg-slate-900 p-8 shadow-sm hover:shadow-md transition-all duration-300">
              <div key={activeReviewIndex} className="space-y-4 animate-fade-swap w-full">
                
                {/* Header row: Patient details and Google G logo */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-brand-charcoal/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-green/25 text-brand-green font-black flex items-center justify-center text-sm shrink-0 border border-brand-green/20">
                      {testimonials[activeReviewIndex].name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-sm text-brand-charcoal dark:text-white leading-tight">
                        {testimonials[activeReviewIndex].name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold tracking-tight">
                        {testimonials[activeReviewIndex].role} &bull; <span className="text-brand-green font-bold">{testimonials[activeReviewIndex].service}</span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Google review logo icon */}
                  <div className="h-7 w-7 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0 border border-slate-100 dark:border-slate-850">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
                      <path
                        fill="#ea4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.932 11.932 0 0 0 12 0C7.309 0 3.268 2.586 1.155 6.427l4.11 3.338z"
                      />
                      <path
                        fill="#34a853"
                        d="M16.04 15.345c-1.07.727-2.473 1.164-4.04 1.164a7.076 7.076 0 0 1-6.734-4.855L1.156 14.99A11.92 11.92 0 0 0 12 24c3.245 0 6.205-1.09 8.441-2.945l-4.4-3.71z"
                      />
                      <path
                        fill="#4285f4"
                        d="M23.49 12.273c0-.818-.073-1.609-.205-2.373H12v4.582h6.45c-.277 1.482-1.118 2.736-2.41 3.59l4.4 3.71c2.573-2.373 4.05-5.864 4.05-9.51z"
                      />
                      <path
                        fill="#fbbc05"
                        d="M5.266 14.236a7.042 7.042 0 0 1-.368-2.236c0-.782.132-1.536.368-2.236L1.155 6.427A11.947 11.947 0 0 0 0 12c0 2.018.423 3.936 1.155 5.673l4.111-3.437z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-center text-yellow-500 pt-1">
                  {[...Array(testimonials[activeReviewIndex].rating)].map((_, i) => (
                    <Star key={i} className="h-4.5 w-4.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-slate-650 dark:text-slate-300 italic leading-relaxed text-center">
                  "{testimonials[activeReviewIndex].comment}"
                </p>
              </div>
            </div>

            <button
              onClick={handleNextReview}
              className="absolute right-[-20px] sm:right-[-50px] top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-brand-muted dark:border-brand-charcoal/60 shadow-md text-brand-charcoal dark:text-slate-300 hover:text-brand-green active:scale-90 transition-all"
              aria-label="Next review"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveReviewIndex(i)}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  activeReviewIndex === i
                    ? "bg-brand-green w-5"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/testimonials"
              className="inline-flex items-center text-sm font-bold text-brand-green hover:text-brand-green-hover group"
            >
              Read more reviews 
              <ArrowRight className="ml-1 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </Link>
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
