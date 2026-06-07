import type { ReactNode } from "react";

/** Frosted liquid-glass surface (STYLE_GUIDE.md §4). `strong` = hero/feature card. */
export function GlassCard({
  children,
  strong = false,
  className = "",
}: {
  children: ReactNode;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={`${strong ? "glass-strong" : "glass"} ${className}`}>
      {children}
    </div>
  );
}
