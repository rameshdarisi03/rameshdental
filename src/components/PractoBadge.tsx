import React from "react";

interface PractoBadgeProps {
  size?: "xs" | "sm" | "md";
  className?: string;
}

export default function PractoBadge({ size = "sm", className = "" }: PractoBadgeProps) {
  if (size === "xs") {
    return (
      <span
        title="Synced from Practo"
        className={`inline-flex items-center gap-1 rounded-full bg-[#263077] px-1.5 py-0.5 text-[8.5px] font-black tracking-tight text-white border border-[#3b4796] shadow-2xs shrink-0 select-none ${className}`}
      >
        <span className="w-1 h-1 rounded-full bg-[#2cb0da] shrink-0" />
        <span className="leading-none lowercase">practo</span>
        <span className="w-1 h-1 rounded-full bg-[#2cb0da] shrink-0" />
      </span>
    );
  }

  if (size === "md") {
    return (
      <span
        title="Synced from Practo"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#263077] px-2.5 py-1 text-[11px] font-black tracking-tight text-white border border-[#3b4796] shadow-xs shrink-0 select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
        <span className="leading-none lowercase">practo</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
      </span>
    );
  }

  // Default "sm" size (for cards and lists)
  return (
    <span
      title="Synced from Practo"
      className={`inline-flex items-center gap-1 rounded-full bg-[#263077] px-2 py-0.5 text-[9.5px] font-black tracking-tight text-white border border-[#3b4796] shadow-2xs shrink-0 select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
      <span className="leading-none lowercase">practo</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#2cb0da] shrink-0" />
    </span>
  );
}
