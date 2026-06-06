"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useT } from "@/lib/i18n";

type Tone = "danger" | "info";

interface Props {
  open: boolean;
  /** Short title, e.g. "Delete medication". */
  title: string;
  /** The exact item involved — shown prominently. */
  itemLabel: string;
  /** Optional extra context line under the item. */
  context?: string;
  confirmLabel?: string;
  /** "danger" (default) shows the medical-deletion safety warning + red confirm. */
  tone?: Tone;
  /**
   * Override the safety paragraph. For danger tone, omitting this shows the
   * default medical-deletion warning; pass "" to hide it. Ignored for info tone
   * unless provided.
   */
  warning?: string;
  /** Hide the Cancel button (e.g. an acknowledge-only info dialog). */
  hideCancel?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function WarningIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/**
 * Two-step confirmation / acknowledgement modal.
 * For medical deletions (danger tone) it surfaces the mandatory safety warning;
 * step 1 is the caller's control, this modal is the required step 2.
 */
export function ConfirmDialog({
  open,
  title,
  itemLabel,
  context,
  confirmLabel,
  tone = "danger",
  warning,
  hideCancel = false,
  onCancel,
  onConfirm,
}: Props) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const isDanger = tone === "danger";
  const warningText = warning ?? (isDanger ? t("confirm.medicalWarning") : "");
  const confirmText =
    confirmLabel ?? (isDanger ? t("confirm.deletePermanently") : t("confirm.ok"));

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
          <div
            className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
            onClick={onCancel}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="glass-strong relative w-full max-w-sm rounded-3xl p-6"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  isDanger
                    ? "bg-severity-major/15 text-severity-major"
                    : "bg-brand-100 text-brand-600"
                }`}
              >
                {isDanger ? <WarningIcon /> : <InfoIcon />}
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-ink-900">{title}</h3>
                {isDanger && (
                  <p className="mt-0.5 text-xs text-ink-500">{t("confirm.cannotUndo")}</p>
                )}
              </div>
            </div>

            {/* The item involved */}
            <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 px-4 py-3">
              <p className="text-sm font-semibold text-ink-800 break-words">{itemLabel}</p>
              {context && <p className="mt-1 text-xs leading-relaxed text-ink-500 break-words">{context}</p>}
            </div>

            {warningText && (
              <p className="mt-4 text-xs leading-relaxed text-ink-500">{warningText}</p>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {!hideCancel && (
                <button
                  onClick={onCancel}
                  className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm
                             font-semibold text-ink-700 backdrop-blur-md transition-colors
                             hover:bg-white/90"
                >
                  {t("common.cancel")}
                </button>
              )}
              <button
                onClick={onConfirm}
                className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors ${
                  isDanger ? "bg-severity-major hover:brightness-95" : "bg-brand-500 hover:bg-brand-600"
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
