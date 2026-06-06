"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type KeyboardEvent } from "react";
import { useT, useTerm } from "@/lib/i18n";

type Accent = "brand" | "teal";

const ACCENT: Record<Accent, { chip: string; dot: string; ring: string }> = {
  brand: {
    chip: "bg-brand-50/80 text-brand-800 border-brand-200/70",
    dot: "bg-brand-500",
    ring: "focus-within:ring-brand-300/70",
  },
  teal: {
    chip: "bg-teal-50/80 text-teal-800 border-teal-200/70",
    dot: "bg-teal-500",
    ring: "focus-within:ring-teal-300/70",
  },
};

/**
 * Chip/tag entry for one medicine list. The chips map directly to one of the
 * engine's arrays (western_medicines / eastern_medicines). Enter or comma adds;
 * Backspace on an empty field removes the last; click × to remove any.
 */
export function MedListInput({
  label,
  hint,
  placeholder,
  accent,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  accent: Accent;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const a = ACCENT[accent];
  const t = useT();
  const term = useTerm();

  function commit(raw: string) {
    const value = raw.trim().replace(/,$/, "").trim();
    if (!value) return;
    const exists = items.some((i) => i.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...items, value]);
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <span className={`h-2 w-2 rounded-full ${a.dot}`} />
          {label}
        </label>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>

      <div
        className={`glass-input flex min-h-[3.25rem] flex-wrap items-center gap-2 p-2.5 ${a.ring}`}
      >
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.span
              key={`${item}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${a.chip}`}
            >
              {term(item)}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => remove(i)}
                className="rounded-full text-current/60 transition hover:text-current"
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={items.length === 0 ? placeholder : t("intake.addAnother")}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-ink-400"
        />
      </div>
    </div>
  );
}
