import { TriangleAlert, ArrowLeftRight, ExternalLink } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { SeverityBadge } from "./SeverityBadge";
import { Bullet } from "./Bullet";

/**
 * STATIC VISUAL MOCK of a Qiáo conflict alert (hero, Section 1).
 * Styled to look like a live alert; not connected to the engine. The depicted interaction is
 * real and sourced (Chan TYK, Ann Pharmacother 2001, PMID 11302416), see HONESTY_LEDGER.md.
 */
export function AlertCard({ className = "" }: { className?: string }) {
  return (
    <GlassCard strong className={`p-5 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lsev-major">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          Conflict detected
        </span>
        <SeverityBadge level="major" />
      </div>

      <p className="mt-3 font-mono text-[11px] text-ink-400">
        Mrs. Chen · 73 · synthetic record
      </p>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <div className="rounded-2xl border border-white/70 bg-white/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            Western Rx
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-800">Warfarin</p>
          <p className="text-[11px] text-ink-400">anticoagulant</p>
        </div>
        <div className="flex items-center justify-center text-brand-500">
          <ArrowLeftRight className="h-5 w-5" aria-hidden />
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
            TCM formula
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-800">Danshen 丹參</p>
          <p className="text-[11px] italic text-ink-400">Salvia miltiorrhiza</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        <li className="flex gap-3">
          <Bullet />
          <span className="text-sm leading-relaxed text-ink-800">
            Danshen potentiates warfarin's anticoagulant effect, elevated INR, increased
            bleeding risk.
          </span>
        </li>
        <li className="flex gap-3">
          <Bullet />
          <span className="text-sm leading-relaxed text-ink-800">
            Evidence tier:{" "}
            <span className="font-semibold text-ink-900">established</span> · deterministic
            lookup, not AI-generated.
          </span>
        </li>
      </ul>

      <a
        href="https://pubmed.ncbi.nlm.nih.gov/11302416/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-start gap-2 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-[11px] leading-snug text-ink-500 transition-colors hover:text-brand-600"
      >
        <span>Chan TYK, Ann Pharmacother 2001 · PMID 11302416</span>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
      </a>
    </GlassCard>
  );
}
