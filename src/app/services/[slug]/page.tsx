import React, { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  ChevronRight, 
  CheckCircle, 
  Calendar, 
  Clock, 
  Activity, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Video
} from "lucide-react";

interface ServiceData {
  title: string;
  subtitle: string;
  image: string;
  overview: string;
  symptoms: string[];
  approach: { step: string; desc: string }[];
  goals: string[];
  recoveryTimeline: string;
  sessions: string;
  youtubeId: string;
}

const serviceDictionary: Record<string, ServiceData> = {
  "musculoskeletal": {
    title: "Musculoskeletal (Orthopaedic) Rehab",
    subtitle: "Restoring Joint Alignment and Strengthening the Musculoskeletal Core",
    image: "/images/services/musculoskeletal.webp",
    overview: "Musculoskeletal rehabilitation is designed for patients suffering from acute or chronic conditions affecting the bones, joints, ligaments, tendons, and muscles. Whether dealing with nagging lower back strain, knee arthritis, or skeletal imbalances like scoliosis, our clinical team targets the root cause of mechanical dysfunction. We focus on active manual adjustments and targeted alignment therapies to secure natural joint tracking.",
    symptoms: [
      "Chronic lower back strain and lumber disc stiffness",
      "Persistent knee, hip, or shoulder osteoarthritis pain",
      "Sciatica and radiating nerve discomfort",
      "Scoliosis, postural imbalances, and structural compression",
      "Acute tendonitis, bursitis, and muscle tears"
    ],
    approach: [
      { step: "Biomechanical Assessment", desc: "Detailed analysis of joint range of motion, muscle balance, and postural alignment." },
      { step: "Manual Therapy & Mobilization", desc: "Hands-on joint mobilization and soft tissue release to restore elasticity and decrease pain." },
      { step: "Targeted Strengthening Exercises", desc: "Personalized movements to rebuild support around compromised joints." },
      { step: "Postural & Ergonomic Coaching", desc: "Education on sitting, standing, and lifting mechanics to prevent future injury recurrence." }
    ],
    goals: [
      "Restore pain-free range of motion across primary joints",
      "Re-establish balanced muscular support on both sides of the skeletal frame",
      "Correct minor mechanical deviations in gait and posture",
      "Improve baseline functional capacity for daily activities"
    ],
    recoveryTimeline: "4 to 8 Weeks",
    sessions: "8 to 12 Sessions",
    youtubeId: "3_Pey0bXg78" // Back pain physical therapy exercises
  },
  "post-surgical": {
    title: "Post-Surgical Rehabilitation",
    subtitle: "Accelerated, Safe Recovery Paths Following Major Orthopedic Surgeries",
    image: "/images/services/postsurgical.webp",
    overview: "Orthopedic surgery is only the first step toward recovery; the real restoration of strength and mobility happens during post-surgical physical therapy. Our post-operative rehabilitation program utilizes evidence-based protocols to guide patients safely through recovery. We help manage swelling, gradually restore joint extension/flexion, and build up support muscles without putting premature stress on healing surgical anchors.",
    symptoms: [
      "Post-operative stiffness following Total Knee or Hip Replacements",
      "Instability and muscle atrophy after ACL or MCL reconstructions",
      "Post-fracture stiffness and muscle weakness after cast removal",
      "Restricted shoulder mobility following rotator cuff or scope surgeries",
      "Joint swelling and restricted movement after minor arthroscopic procedures"
    ],
    approach: [
      { step: "Phase-Based Protocol Review", desc: "Customizing your rehab stages to match your surgeon's specific post-op timeline." },
      { step: "Swelling & Inflammation Control", desc: "Gentle lymphatic drainage, cold therapy, and passive movement to lower swelling." },
      { step: "Gradual Range-of-Motion Restore", desc: "Careful stretching and passive-to-active exercises to reclaim full joint flexibility." },
      { step: "Functional Progressions", desc: "Progressive weight-bearing exercises to transition safely back to daily life." }
    ],
    goals: [
      "Manage and reduce local tissue swelling and pain",
      "Safely achieve full extension and flexion milestones set by the surgeon",
      "Re-activate and strengthen muscles surrounding the surgical site",
      "Re-establish normal walking gait patterns without compensations"
    ],
    recoveryTimeline: "8 to 16 Weeks",
    sessions: "12 to 24 Sessions",
    youtubeId: "2pYBD5i2Yw0" // Post arthroscopic knee surgery rehab
  },
  "neurological": {
    title: "Neurological Rehabilitation",
    subtitle: "Rewiring the Nervous System to Reclaim Coordination and Stability",
    image: "/images/services/neurological.webp",
    overview: "Neurological rehabilitation addresses conditions affecting the brain, spinal cord, and peripheral nervous system. Following a stroke, or when managing progressive neurological disorders like Parkinson's disease, patients often experience loss of balance, coordination, and motor control. Our approach leverages neuroplasticity—the nervous system's capacity to reorganize and create new pathways—using targeted repetitive motor retraining.",
    symptoms: [
      "Post-stroke motor weakness, paralysis, or localized hemiparesis",
      "Balance deficits, gate freezing, and tremors from Parkinson's disease",
      "Sensory disturbances and muscle spasticity from Multiple Sclerosis",
      "Coordination loss and mobility constraints after spinal cord injuries",
      "Peripheral neuropathy, tingling, and chronic motor imbalances"
    ],
    approach: [
      { step: "Motor Control Testing", desc: "Assessing muscle tone, coordination, functional balance, and walking safety." },
      { step: "Neuroplasticity Retraining", desc: "High-repetition, goal-oriented tasks to stimulate neural pathway reorganization." },
      { step: "Proprioceptive & Balance Drills", desc: "Specialized exercises to improve foot-eye coordination and ground awareness." },
      { step: "Spasticity Management", desc: "Stretching and positioning guides to manage muscle tightness and cramps." }
    ],
    goals: [
      "Optimize functional independence in home and community mobility",
      "Retrain balance reflexes to significantly lower the risk of falls",
      "Improve stride consistency and overall coordination during walking",
      "Enhance fine and gross motor controls for daily tasks"
    ],
    recoveryTimeline: "12 to 24 Weeks",
    sessions: "16 to 32 Sessions",
    youtubeId: "jNlCea99iP0" // Stroke rehabilitation exercises
  },
  "sports-injury": {
    title: "Sports Injury Management",
    subtitle: "Rapid Athletic Recovery and Comprehensive Injury Prevention Programs",
    image: "/images/services/sports.webp",
    overview: "Sports injury management is tailored to active individuals and competitive athletes who need to return safely to peak performance. We look beyond basic pain relief to isolate biomechanical vulnerabilities—such as weak stabilizing muscles or poor movement patterns—that caused the injury. We treat acute muscle sprains, ligament tears, and chronic repetitive strain injuries common in sports.",
    symptoms: [
      "Acute ankle sprains, hamstring pulls, and groin strains",
      "Rotator cuff impingement, shoulder instability, and overhead throw pain",
      "Tennis or Golfer's elbow from repetitive wrist movements",
      "Runner's knee, shin splints, and Achilles tendonitis",
      "Chronic joint instability following minor athletic collisions"
    ],
    approach: [
      { step: "Movement & Kinematic Analysis", desc: "Analyzing sport-specific movements (e.g. running gait, throwing form, landing mechanics)." },
      { step: "Active Joint Mobilization", desc: "Targeted hands-on techniques to release athletic tightness and restore joint glide." },
      { step: "Eccentric & Reactive Training", desc: "Drills to build up muscle deceleration capacity and absorb ground forces." },
      { step: "Sport-Specific Simulation", desc: "Gradual introduction of agility, cutting, jumping, and loaded movements." }
    ],
    goals: [
      "Eliminate localized sports-related pain and inflammatory response",
      "Restore symmetrical strength and flexibility between limbs",
      "Fix biomechanical errors during running, landing, and throwing patterns",
      "Build tissue tolerance to sustain heavy athletic workloads"
    ],
    recoveryTimeline: "4 to 12 Weeks",
    sessions: "6 to 16 Sessions",
    youtubeId: "H07W-nF8mPE" // ACL sports rehabilitation
  },
  "cardiopulmonary": {
    title: "Cardiopulmonary Physiotherapy",
    subtitle: "Enhancing Cardiovascular Efficiency, Lung Capacity, and Vitality",
    image: "/images/services/cardiopulmonary.webp",
    overview: "Cardiopulmonary physiotherapy assists individuals recovering from heart events, surgeries, or those managing chronic respiratory conditions like COPD and asthma. We provide a highly supervised framework for progressive cardiovascular conditioning, targeted breathing retraining, and energy conservation techniques. This gradual loading improves the heart's pumping efficiency, increases lung capacity, and restores daily stamina.",
    symptoms: [
      "Shortness of breath and low stamina during basic walking",
      "Deconditioning and muscle weakness following heart bypass or stenting surgeries",
      "Reduced lung capacity and breathing difficulties from COPD or emphysema",
      "Frequent asthma flair-ups and compromised chest expansion",
      "Chronic fatigue and systemic weakness from prolonged bed rest"
    ],
    approach: [
      { step: "Vitals & Aerobic Assessment", desc: "Closely monitoring heart rate, oxygen levels, and blood pressure under light exercise." },
      { step: "Diaphragmatic Breathing retraining", desc: "Exercises to maximize lung expansion and lower the work of breathing." },
      { step: "Graduated Aerobic Conditioning", desc: "Safe, low-impact cardio routines (treadmill, recumbent bike) to strengthen the heart." },
      { step: "Airway Clearance Techniques", desc: "Postural positioning and chest mobility exercises to clear bronchial congestion." }
    ],
    goals: [
      "Increase oxygen consumption efficiency and baseline cardiorespiratory stamina",
      "Alleviate breathing effort and shortness of breath during functional actions",
      "Build confidence in performing exercises safely under self-monitoring",
      "Restore independence in basic domestic activities without rapid fatigue"
    ],
    recoveryTimeline: "6 to 12 Weeks",
    sessions: "10 to 20 Sessions",
    youtubeId: "uV2f8WvE1gU" // Chest physiotherapy breathing exercises
  },
  "geriatric": {
    title: "Geriatric Physiotherapy",
    subtitle: "Securing Balance, Lowering Fall Risks, and Maintaining Senior Independence",
    image: "/images/services/geriatric.webp",
    overview: "Geriatric physiotherapy addresses age-related physical changes, helping senior patients live pain-free and maintain their physical independence. As we age, joints stiffen, balance pathways slow down, and muscle mass naturally decreases. Our specialized senior care program focuses on fall prevention, gentle joint lubrication, bone density exercises, and functional movement patterns to secure safe daily mobility.",
    symptoms: [
      "Age-related balance concerns and frequent trips or near-falls",
      "Joint stiffness and gait abnormalities from severe osteoarthritis",
      "Muscle loss (sarcopenia) and core weakness causing fatigue",
      "Restricted walking range and difficulty getting up from low chairs",
      "Post-fracture or post-illness physical deconditioning and balance loss"
    ],
    approach: [
      { step: "Fall Risk & Balance Audit", desc: "Measuring baseline balance, gait speed, and identifying potential fall triggers." },
      { step: "Gentle Mobilization & Stretch", desc: "Slow, focused stretching to lubricate stiff joints and improve extension." },
      { step: "Functional Strength Retraining", desc: "Exercises mimicking sit-to-stands, stair steps, and safe reaching patterns." },
      { step: "Balance & Stride Retraining", desc: "Gait coaching to widen base support, lift feet properly, and avoid shuffling." }
    ],
    goals: [
      "Significantly lower objective fall risks during daily routines",
      "Increase independent walking distances with reduced fatigue",
      "Manage chronic arthritic pain through safe, active movement",
      "Restore ease in rising from chairs, stepping over obstacles, and climbing stairs"
    ],
    recoveryTimeline: "6 to 12 Weeks",
    sessions: "8 to 16 Sessions",
    youtubeId: "_nE8f6nK9C0" // Senior balance physical therapy exercises
  },
  "pelvic-floor": {
    title: "Pelvic Floor Rehab",
    subtitle: "Strengthening Pelvic Muscle Supports for Incontinence and Recovery",
    image: "/images/services/pelvic.webp",
    overview: "Pelvic floor rehabilitation is a highly specialized therapy targeting the muscle sling that supports the bladder, bowel, and uterus. Weakness or excessive tension in these muscles can cause bladder leakage (incontinence), pelvic discomfort, or pregnancy complications. Our clinical team provides private, comfortable, and highly compassionate care, utilizing targeted biofeedback and muscle retraining to restore function.",
    symptoms: [
      "Bladder leakage (stress incontinence) during coughing, laughing, or exercising",
      "Urgent, frequent bathroom trips and bladder control concerns",
      "Pelvic girdle discomfort, tailbone pain, or deep hip tightness",
      "Post-pregnancy muscle separation (diastasis recti) and core weakness",
      "Pelvic organ prolapse pressure and lower abdominal discomfort"
    ],
    approach: [
      { step: "Muscle Tone Evaluation", desc: "A private assessment of muscle activation strength, coordination, and resting tone." },
      { step: "Guided Pelvic Activation", desc: "Coaching to isolate, contract, and completely relax the pelvic floor muscles." },
      { step: "Core-Pelvic Coordination", desc: "Integrating pelvic floor activation with breathing and abdominal exercises." },
      { step: "Home Management Strategies", desc: "Practical bladder logs, posture adjustments, and targeted home routine pacing." }
    ],
    goals: [
      "Eliminate stress-induced bladder leaks and pelvic pressure",
      "Restore full control and coordinate muscle contraction/relaxation cycles",
      "Safely heal and strengthen core-abdominal walls post-pregnancy",
      "Alleviate deep tailbone, hip, and pelvic girdle discomfort"
    ],
    recoveryTimeline: "6 to 10 Weeks",
    sessions: "6 to 12 Sessions",
    youtubeId: "3W_hG_n9x3A" // Pelvic floor muscles exercises guide
  }
};

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const data = serviceDictionary[slug];

  if (!data) {
    notFound();
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-brand-bg dark:bg-slate-955">
      {/* Top Header Banner with Breadcrumbs (Warm Sand Style) */}
      <section className="relative overflow-hidden bg-brand-sand py-12 border-b border-slate-200/60 dark:border-slate-800">
        {/* Decorative blurred circles for natural biophilic feel */}
        <div className="absolute top-0 right-10 w-32 h-32 bg-brand-green/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-44 h-44 bg-brand-green/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-brand-charcoal/60 select-none">
            <Link href="/" className="hover:text-brand-green transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-brand-charcoal/40" />
            <Link href="/#services" className="hover:text-brand-green transition-colors">Services</Link>
            <ChevronRight className="w-3.5 h-3.5 text-brand-charcoal/40" />
            <span className="text-brand-green font-extrabold">{data.title}</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">{data.title}</h1>
            <p className="text-xs sm:text-sm text-brand-green font-bold tracking-wide italic">{data.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Detailed Clinical Copy (Span 8) */}
            <div className="lg:col-span-8 space-y-10 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 sm:p-8 rounded-[2rem] shadow-sm">
              
              {/* Back Button */}
              <Link 
                href="/#services" 
                className="inline-flex items-center gap-1.5 text-[11px] font-black text-brand-green dark:text-teal-400 hover:text-brand-green-hover transition-colors mb-4 border border-brand-green/20 px-3.5 py-1.5 rounded-full select-none group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to All Services</span>
              </Link>

              {/* Section 1: Overview */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
                  <Activity className="w-4 h-4 text-brand-green dark:text-teal-400" />
                  Clinical Overview
                </h2>
                {/* Paragraph is kept clean at font-normal weight to avoid looking bold */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-normal">
                  {data.overview}
                </p>
              </div>

              {/* Section: Clinical Video Demonstration */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-850 pt-8">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
                  <Video className="w-4.5 h-4.5 text-brand-green dark:text-teal-400" />
                  Rehabilitation Demonstration Video
                </h2>
                
                {data.youtubeId && (data as any).hasUploadedVideo ? (
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-200/60 dark:border-slate-800 bg-black shadow-sm">
                    <iframe
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${data.youtubeId}`}
                      title={`${data.title} Demonstration`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-[#062e36] to-slate-900 shadow-md flex flex-col items-center justify-center p-6 text-center text-white">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:16px_16px]" />
                    <div className="relative z-10 space-y-3 max-w-md">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mx-auto text-brand-luminous shadow-sm">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-luminous bg-brand-green/30 px-3 py-1 rounded-full">
                          Clinical Video Production
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white mt-2">
                          {data.title} Protocol Video
                        </h3>
                        <p className="text-xs text-slate-300 font-normal leading-relaxed mt-1">
                          Dedicated in-clinic video demonstration by Dr. Madem Kinnera will be uploaded soon. Schedule a consultation for an individualized clinical assessment.
                        </p>
                      </div>
                      <Link
                        href="/book"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-green hover:bg-brand-green-hover text-white text-xs font-black transition-all shadow-md active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Book Initial Consultation</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Symptoms Treated */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-850 pt-8">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-500" />
                  Key Symptoms & Conditions Treated
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.symptoms.map((sym, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 bg-brand-sand/40 dark:bg-slate-955 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-850"
                    >
                      <CheckCircle className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-655 dark:text-slate-300 font-normal leading-snug">
                        {sym}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Recovery Approach */}
              <div className="space-y-5 border-t border-slate-100 dark:border-slate-850 pt-8">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 select-none">
                  <Sparkles className="w-4.5 h-4.5 text-brand-green dark:text-teal-400" />
                  Our Treatment Approach
                </h2>
                
                <div className="space-y-4 relative pl-5 border-l border-slate-200 dark:border-slate-800 ml-1">
                  {data.approach.map((ap, idx) => (
                    <div key={idx} className="relative space-y-1">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-green ring-4 ring-brand-green/10" />
                      {/* Bold ONLY the caption header */}
                      <h4 className="text-xs font-black text-brand-charcoal dark:text-white leading-tight">
                        {ap.step}
                      </h4>
                      {/* Description kept at clean font-normal */}
                      <p className="text-[11px] sm:text-xs text-slate-550 dark:text-slate-400 leading-normal font-normal">
                        {ap.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Goals */}
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-850 pt-8">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider select-none">
                  Rehabilitation Goals
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 list-none pl-0">
                  {data.goals.map((goal, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-2 bg-brand-sand/50 dark:bg-brand-green/5 p-4 rounded-2xl border border-brand-green/10"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-green shrink-0 mt-2" />
                      <span className="text-xs text-slate-655 dark:text-slate-355 font-normal leading-normal">
                        {goal}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Right Column: Sidebar Stats & Booking (Span 4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Thumbnail Card */}
              <div className="bg-brand-sand/40 dark:bg-slate-900 border border-brand-muted/30 dark:border-slate-800 p-3 rounded-[2rem] overflow-hidden shadow-sm">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={data.image}
                    alt={data.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-5">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider select-none">
                  Rehab Quick Stats
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Session Duration</p>
                      <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">45 - 60 Minutes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Expected Timeline</p>
                      {/* Bold only the key timeline parameter */}
                      <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{data.recoveryTimeline}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                      <Activity className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Recommended Pacing</p>
                      <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">{data.sessions}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-850 pt-3">
                    <div className="h-9 w-9 rounded-xl bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
                      <img
                        src="/images/dr-kinnera-portrait.jpg"
                        alt="Dr. Kinnera Profile Thumbnail"
                        className="w-full h-full rounded-xl object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Care Director</p>
                      <p className="text-xs font-bold text-brand-charcoal dark:text-slate-200 mt-0.5">Dr. Kinnera, BPT, MPT</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book session CTA Card */}
              <div className="bg-brand-green text-white p-6 rounded-[2rem] border border-brand-green/10 text-center space-y-4 shadow-md">
                <h4 className="text-sm font-black tracking-tight leading-tight">Ready to Begin Your Recovery?</h4>
                <p className="text-[10px] sm:text-xs text-white/70 leading-normal font-normal">
                  Schedule your comprehensive clinical consultation directly with Dr. Kinnera.
                </p>
                <Link
                  href={`/book?service=${encodeURIComponent(data.title)}`}
                  className="flex items-center justify-center gap-1.5 w-full rounded-full bg-white hover:bg-slate-50 text-brand-charcoal py-3 text-xs font-black shadow-sm transition-all duration-200"
                >
                  <span>Book Consultation</span>
                  <ArrowRight className="w-4 h-4 text-brand-charcoal" />
                </Link>
              </div>

            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
