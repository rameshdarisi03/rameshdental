import PageHeader from "@/components/public/PageHeader";
import { Activity, ShieldCheck, HeartPulse, Sparkles, Zap, Smartphone } from "lucide-react";

export default function Gallery() {
  const items = [
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

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Clinic Gallery"
        description="Take a visual tour of Gait Physio Clinic. See our modern orthopedic setup, clinical equipment, and patient spaces."
      />

      <section className="py-20 bg-brand-bg dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-brand-charcoal dark:text-white">Our Facility & Technology</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We maintain a sanitised, fully equipped environment with clinical tools designed for diagnostic precision and patient recovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item) => (
              <div
                key={item.title}
                className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col group shadow-[0_6px_25px_-6px_rgba(93,122,109,0.12)] hover:shadow-[0_12px_35px_-8px_rgba(93,122,109,0.22)] hover:-translate-y-1 transition-all duration-350"
              >
                {/* Visual placeholder box */}
                <div className={`h-56 bg-gradient-to-br ${item.gradient} flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-850 p-6 relative overflow-hidden`}>
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
    </div>
  );
}
