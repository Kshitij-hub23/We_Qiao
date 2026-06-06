import type { ReactNode } from "react";

/** Frosted-glass surface — the core Liquid-Glass primitive used across the UI. */
export function GlassCard({
  children,
  className = "",
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`${strong ? "glass-strong" : "glass"} rounded-3xl ${className}`}
    >
      {children}
    </div>
  );
}
