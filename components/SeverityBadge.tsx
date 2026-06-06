import type { Severity } from "@/lib/types";

const META: Record<Severity, { label: string; classes: string }> = {
  contraindicated: { label: "Contraindicated", classes: "bg-severity-contraindicated text-white" },
  major: { label: "Major", classes: "bg-severity-major text-white" },
  moderate: { label: "Moderate", classes: "bg-severity-moderate text-white" },
  minor: { label: "Minor", classes: "bg-severity-minor text-white" },
};

/** Rank for sorting most → least serious. Unknown severities sort last. */
export const SEVERITY_RANK: Record<Severity, number> = {
  contraindicated: 0,
  major: 1,
  moderate: 2,
  minor: 3,
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const meta = META[severity] ?? { label: severity, classes: "bg-ink-400 text-white" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${meta.classes}`}
    >
      {meta.label}
    </span>
  );
}
