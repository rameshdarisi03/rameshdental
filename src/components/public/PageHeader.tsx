import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
}

export default function PageHeader({ title, description, subtitle }: PageHeaderProps) {
  const displayText = description || subtitle || "";

  return (
    <section className="relative overflow-hidden bg-brand-sand dark:bg-slate-900/80 py-14 sm:py-16 text-center border-b border-slate-200/60 dark:border-slate-800 transition-colors">
      {/* Decorative blurred circles for an organic, clinical feel */}
      <div className="absolute top-0 right-10 w-32 h-32 bg-brand-green/10 dark:bg-brand-green/15 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-10 w-44 h-44 bg-brand-green/5 dark:bg-brand-green/10 rounded-full blur-3xl" />
      
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-3 sm:space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-brand-charcoal dark:text-white">
          {title}
        </h1>
        {displayText && (
          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed">
            {displayText}
          </p>
        )}
      </div>
    </section>
  );
}
