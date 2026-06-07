import type { ReactNode } from "react";

/** Medication / herb chip (STYLE_GUIDE.md §6). `sub` shows a muted secondary name. */
export function Chip({
  children,
  sub,
  className = "",
}: {
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-ink-700 shadow-soft ${className}`}
    >
      {children}
      {sub ? <span className="text-ink-400">{sub}</span> : null}
    </span>
  );
}
