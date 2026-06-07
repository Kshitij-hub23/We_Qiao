"use client";

import { motion } from "framer-motion";
import type { ConflictDetail, ConflictView, Severity, Source } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";
import { useT, useTerm } from "@/lib/i18n";

const ACCENT_BAR: Record<Severity, string> = {
  contraindicated: "bg-severity-contraindicated",
  major: "bg-severity-major",
  moderate: "bg-severity-moderate",
  minor: "bg-severity-minor",
};

/** Build a link for a source reference by type (PMID / DOI / PMC), if we can. */
function sourceHref(source: Source): string | null {
  const ref = (source.ref ?? "").trim();
  if (!ref) return null;
  const type = (source.type ?? "").toUpperCase();
  if (type === "PMID") return `https://pubmed.ncbi.nlm.nih.gov/${ref}/`;
  if (type === "DOI") return `https://doi.org/${ref}`;
  if (ref.toUpperCase().startsWith("PMC")) return `https://www.ncbi.nlm.nih.gov/pmc/articles/${ref}/`;
  return null;
}

/**
 * One detected interaction. The `detail` level is set by the viewer's role:
 * - "summary" (patients / caretakers): the drug pair + severity only.
 * - "clinical" (practitioners): the full sourced record. The clinical fields are
 *   only sent over the wire for this view, so guard on their presence too.
 */
export function ConflictCard({
  conflict,
  index,
  detail = "summary",
}: {
  conflict: ConflictDetail;
  index: number;
  detail?: ConflictView;
}) {
  const bar = ACCENT_BAR[conflict.severity] ?? "bg-ink-400";
  const t = useT();
  const term = useTerm();
  const clinical = detail === "clinical";
  const sources = conflict.sources ?? [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 28 }}
      className="glass relative overflow-hidden rounded-3xl p-5 pl-6"
    >
      <span className={`absolute left-0 top-0 h-full w-1.5 ${bar}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink-900">
          <span className="rounded-lg bg-brand-50/80 px-2 py-0.5 text-brand-800">
            {term(conflict.western_drug)}
          </span>
          <span className="text-ink-400">+</span>
          <span className="rounded-lg bg-teal-50/80 px-2 py-0.5 text-teal-800">
            {term(conflict.tcm_herb)}
          </span>
        </div>
        <SeverityBadge severity={conflict.severity} />
      </div>

      {!clinical && (
        // Patients / caretakers: severity only. No mechanism or clinical detail.
        <p className="mt-3 text-xs text-ink-400">{t("conflict.clinicianNote")}</p>
      )}

      {clinical && (
        <div className="mt-3 flex flex-col gap-3">
          {conflict.mechanism && (
            <Field label={t("conflict.mechanism")}>{conflict.mechanism}</Field>
          )}
          {conflict.clinical_effect && (
            <Field label={t("conflict.effect")}>{conflict.clinical_effect}</Field>
          )}
          {conflict.management && (
            <div className="rounded-2xl border border-brand-200/70 bg-brand-50/60 p-3">
              <Field label={t("conflict.management")}>{conflict.management}</Field>
            </div>
          )}

          {(conflict.effect_direction || conflict.evidence_level) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {conflict.effect_direction && (
                <Meta label={t("conflict.direction")} value={conflict.effect_direction} />
              )}
              {conflict.evidence_level && (
                <Meta label={t("conflict.evidence")} value={conflict.evidence_level} />
              )}
            </div>
          )}

          {sources.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                {t("conflict.references")} ({sources.length})
              </p>
              <ul className="mt-1.5 flex flex-col gap-1.5">
                {sources.map((s, i) => {
                  const href = sourceHref(s);
                  const label = `${s.type ?? ""} ${s.ref ?? ""}`.trim() || t("conflict.source");
                  return (
                    <li key={`${s.ref ?? i}`} className="text-xs text-ink-600">
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
                        >
                          {label}
                        </a>
                      ) : (
                        <span className="font-medium text-ink-700">{label}</span>
                      )}
                      {s.note && <span className="text-ink-500">: {s.note}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-ink-700">{children}</p>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-ink-600">
      <span className="font-medium text-ink-400">{label}:</span>
      <span className="font-semibold capitalize text-ink-700">{value}</span>
    </span>
  );
}
