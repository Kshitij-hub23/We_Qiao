import type { ReactNode } from "react";

/**
 * Centered max-w-5xl section wrapper with consistent vertical rhythm (STYLE_GUIDE.md §8).
 *
 * `band` renders a full-bleed frosted wash with hairline top/bottom borders behind the
 * section. Alternating bands down the page give each section a clear visual boundary so
 * adjacent sections don't blur together over the shared cream gradient.
 */
export function SectionShell({
  id,
  children,
  className = "",
  band = false,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  band?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 ${
        band ? "border-y border-white/45 bg-[rgba(253,250,244,0.5)]" : ""
      }`}
    >
      <div
        className={`mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-20 ${className}`}
      >
        {children}
      </div>
    </section>
  );
}
