"use client";

import { motion } from "framer-motion";
import type { ConflictDetail, Severity } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";

const ACCENT_BAR: Record<Severity, string> = {
  contraindicated: "bg-severity-contraindicated",
  major: "bg-severity-major",
  moderate: "bg-severity-moderate",
  minor: "bg-severity-minor",
};

/** One detected interaction: the pair, its severity, and the mechanism (the "why"). */
export function ConflictCard({ conflict, index }: { conflict: ConflictDetail; index: number }) {
  const bar = ACCENT_BAR[conflict.severity] ?? "bg-ink-400";

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
            {conflict.western_drug}
          </span>
          <span className="text-ink-400">+</span>
          <span className="rounded-lg bg-teal-50/80 px-2 py-0.5 text-teal-800">
            {conflict.tcm_herb}
          </span>
        </div>
        <SeverityBadge severity={conflict.severity} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-ink-600">{conflict.mechanism}</p>
    </motion.article>
  );
}
