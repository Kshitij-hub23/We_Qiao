"use client";

import { GlassCard } from "./GlassCard";
import { useT } from "@/lib/i18n";

/**
 * Shown when the engine returns no interactions. We deliberately do NOT say
 * "safe" — absence of a known interaction is not a safety guarantee (fail-safe
 * principle). The decision stays with a human.
 */
export function EmptyState() {
  const t = useT();
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-teal-600">
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-ink-900">{t("empty.title")}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
        {t("empty.body1")}
        <span className="font-medium text-ink-700">{t("empty.emphasis")}</span>
        {t("empty.body2")}
      </p>
    </GlassCard>
  );
}
