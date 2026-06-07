import type { ReactNode } from "react";

/** Editorial eyebrow + serif H2 (STYLE_GUIDE.md §3). `accent` tints the eyebrow. */
export function SectionHeading({
  eyebrow,
  title,
  accent = "brand",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  accent?: "brand" | "teal";
  className?: string;
}) {
  const eyebrowColor = accent === "teal" ? "text-teal-600" : "text-brand-600";
  return (
    <div className={className}>
      {eyebrow ? (
        <p
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowColor}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}
