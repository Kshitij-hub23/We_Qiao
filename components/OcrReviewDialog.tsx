"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";

function ScanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

/**
 * OCR review modal — pops up the moment a prescription scan finishes. Shows the
 * extracted text in an editable box. The user confirms (text flows into the
 * intake box) or retries the scan on the same image.
 */
export function OcrReviewDialog({
  open,
  text,
  onTextChange,
  busy,
  onRetry,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  text: string;
  onTextChange: (next: string) => void;
  /** True while a (re)scan is in flight — disables actions and shows a spinner. */
  busy: boolean;
  onRetry: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const empty = !busy && !text.trim();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm" onClick={onCancel} />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass-strong relative w-full max-w-md rounded-3xl p-6"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
                <ScanIcon />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink-900">{t("ocr.title")}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{t("ocr.subtitle")}</p>
              </div>
            </div>

            <div className="mt-4">
              {busy ? (
                <div className="flex min-h-[8rem] items-center justify-center rounded-2xl border border-white/70 bg-white/50">
                  <span className="animate-pulse text-sm text-ink-400">{t("ocr.reading")}</span>
                </div>
              ) : (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    rows={6}
                    autoFocus
                    className="glass-input min-h-[8rem] w-full resize-y p-3 text-sm outline-none placeholder:text-ink-400"
                  />
                  {empty && (
                    <p className="mt-2 text-xs text-severity-major">{t("ocr.empty")}</p>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={onRetry}
                disabled={busy}
                className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm
                           font-semibold text-ink-700 backdrop-blur-md transition-colors
                           hover:bg-white/90 disabled:opacity-50"
              >
                {t("ocr.retry")}
              </button>
              <button
                onClick={onConfirm}
                disabled={busy || empty}
                className="rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white
                           shadow-soft transition-colors hover:bg-brand-600 disabled:opacity-50"
              >
                {t("ocr.confirm")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
