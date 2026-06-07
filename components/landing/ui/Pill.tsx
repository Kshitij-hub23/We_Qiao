import type { ReactNode } from "react";

/** Frosted pill family (STYLE_GUIDE.md §4/§6). `roadmap` = terracotta future-marker. */
type Tone = "white" | "roadmap" | "brand";

const TONES: Record<Tone, string> = {
  white: "bg-white/70 border-white/80 text-ink-700",
  roadmap: "bg-teal-100 border-teal-200/70 text-teal-700",
  brand: "bg-brand-100 border-brand-200/70 text-brand-700",
};

export function Pill({
  children,
  tone = "white",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur-md ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
