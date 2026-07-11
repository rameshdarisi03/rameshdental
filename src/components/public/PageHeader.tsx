import React from "react";

interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-brand-sand py-16 text-center border-b border-slate-200/40">
      {/* Decorative blurred circles in brand sage green for an organic, clinical feel */}
      <div className="absolute top-0 right-10 w-32 h-32 bg-brand-green/10 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-10 w-44 h-44 bg-brand-green/5 rounded-full blur-3xl" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-brand-charcoal">{title}</h1>
        <p className="text-base sm:text-lg text-brand-charcoal/80 max-w-2xl mx-auto font-semibold">{description}</p>
      </div>
    </section>
  );
}
