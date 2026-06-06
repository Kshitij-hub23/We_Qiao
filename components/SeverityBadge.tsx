"use client";

import type { Severity } from "@/lib/types";
import { useT } from "@/lib/i18n";

const CLASSES: Record<Severity, string> = {
  contraindicated: "bg-severity-contraindicated text-white",
  major: "bg-severity-major text-white",
  moderate: "bg-severity-moderate text-white",
  minor: "bg-severity-minor text-white",
};

const LABEL_KEY: Record<Severity, string> = {
  contraindicated: "sev.contraindicated",
  major: "sev.major",
  moderate: "sev.moderate",
  minor: "sev.minor",
};

/** Rank for sorting most → least serious. Unknown severities sort last. */
export const SEVERITY_RANK: Record<Severity, number> = {
  contraindicated: 0,
  major: 1,
  moderate: 2,
  minor: 3,
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const t = useT();
  const classes = CLASSES[severity] ?? "bg-ink-400 text-white";
  const label = LABEL_KEY[severity] ? t(LABEL_KEY[severity]) : severity;
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}
