/** Conflict-severity pill (STYLE_GUIDE.md §2/§6): solid severity colour, white uppercase text. */
export type SeverityLevel = "contraindicated" | "major" | "moderate" | "minor";

const LABEL: Record<SeverityLevel, string> = {
  contraindicated: "Contraindicated",
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
};

const BG: Record<SeverityLevel, string> = {
  contraindicated: "bg-lsev-contraindicated",
  major: "bg-lsev-major",
  moderate: "bg-lsev-moderate",
  minor: "bg-lsev-minor",
};

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${BG[level]}`}
    >
      {LABEL[level]}
    </span>
  );
}
