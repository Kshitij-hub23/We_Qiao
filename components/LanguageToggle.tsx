"use client";

import { motion } from "framer-motion";
import { useLang, type Lang } from "@/lib/i18n";

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
];

/** Compact EN / 中文 switch with a sliding highlight. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div
      role="radiogroup"
      aria-label="Language"
      className={`relative inline-flex items-center rounded-full border border-white/70 bg-white/50 p-0.5 backdrop-blur-md ${className}`}
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => setLang(opt.value)}
            className={`relative z-10 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200
              ${active ? "text-white" : "text-ink-500 hover:text-ink-800"}`}
          >
            {active && (
              <motion.span
                layoutId="lang-toggle-pill"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 -z-10 rounded-full bg-brand-500 shadow-soft"
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
