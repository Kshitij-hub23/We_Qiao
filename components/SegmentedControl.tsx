"use client";

import { motion } from "framer-motion";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Optional id stem to keep the sliding highlight unique per instance. */
  layoutId?: string;
}

/**
 * Accessible segmented button group with a sliding highlight.
 * Used for the prescription-type choice (Western vs TCM) — no dropdown.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId = "segmented-highlight",
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      className="grid grid-cols-2 gap-2 rounded-3xl border border-white/60 bg-white/40 p-1.5 backdrop-blur-md"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-3
                        text-center transition-colors duration-200
                        ${active ? "text-white" : "text-ink-700 hover:text-ink-900"}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute inset-0 rounded-2xl bg-brand-500 shadow-soft"
              />
            )}
            <span className="relative z-10 text-sm font-semibold">{opt.label}</span>
            {opt.hint && (
              <span className={`relative z-10 text-[11px] ${active ? "text-white/80" : "text-ink-400"}`}>
                {opt.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
