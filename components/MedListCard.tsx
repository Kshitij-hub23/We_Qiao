"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  title: string;
  subtitle: string;
  items: string[];
  placeholder: string;
  emptyLabel: string;
  onAdd: (value: string) => void;
  /** Request removal of an item — the parent shows a confirmation before deleting. */
  onRemove: (value: string) => void;
}

/** Single standardized dark-brown bullet colour used for every indicator. */
const BULLET = "bg-brand-900";

/** Inline SVG × icon — no external dependency. */
function XIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
      <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
    </svg>
  );
}

/** Inline SVG + icon. */
function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="6" y1="1" x2="6" y2="11" />
      <line x1="1" y1="6" x2="11" y2="6" />
    </svg>
  );
}

export function MedListCard({
  title,
  subtitle,
  items,
  placeholder,
  emptyLabel,
  onAdd,
  onRemove,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function commit() {
    const val = draft.trim();
    if (val) onAdd(val);
    setDraft("");
    setAdding(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(""); setAdding(false); }
  }

  return (
    <div className="glass rounded-3xl p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${BULLET}`} />
          <div>
            <h3 className="text-sm font-semibold text-ink-800 leading-tight">{title}</h3>
            <p className="text-xs text-ink-400 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700
                     bg-brand-50 hover:bg-brand-100 transition-colors px-2.5 py-1.5 rounded-xl"
        >
          <PlusIcon />
          Add
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 min-h-[80px]">
        {items.length === 0 && !adding ? (
          <p className="text-xs text-ink-400 italic">{emptyLabel}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.span
                  key={item}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1.5 bg-white/70 border border-white/80
                             text-ink-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-soft"
                >
                  {item}
                  <button
                    onClick={() => onRemove(item)}
                    className="text-ink-400 hover:text-ink-700 transition-colors ml-0.5"
                    aria-label={`Remove ${item}`}
                  >
                    <XIcon />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Inline add input */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pt-1">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKey}
                onBlur={commit}
                placeholder={placeholder}
                className="glass-input flex-1 px-3 py-2 text-xs"
              />
              <button
                onMouseDown={(e) => { e.preventDefault(); commit(); }}
                className="px-3 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold
                           hover:bg-brand-600 transition-colors"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-ink-400 mt-1.5 pl-0.5">
              Press Enter to add · Esc to cancel
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
