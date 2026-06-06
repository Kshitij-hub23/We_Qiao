"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState, type DragEvent } from "react";
import { useT } from "@/lib/i18n";

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string | null; // object URL for images; null for PDFs
}

const ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,application/pdf";

function isAllowed(file: File): boolean {
  return file.type.startsWith("image/") || file.type === "application/pdf";
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Fully working attach control (drag-drop, multi-file, type validation, preview,
 * remove). Files are held client-side and intentionally NOT processed yet — this
 * is the seam where OCR/extraction plugs in later.
 */
export function FileAttach({
  files,
  onChange,
}: {
  files: AttachedFile[];
  onChange: (next: AttachedFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const t = useT();

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: AttachedFile[] = [];
    for (const file of Array.from(list)) {
      if (!isAllowed(file)) continue;
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      });
    }
    if (accepted.length) onChange([...files, ...accepted]);
  }

  function remove(id: string) {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onChange(files.filter((f) => f.id !== id));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-ink-700">
        {t("attach.title")} <span className="font-normal text-ink-400">{t("attach.optional")}</span>
      </span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed
          px-6 py-7 text-center transition-all duration-200
          ${dragging ? "border-brand-400 bg-brand-50/60" : "border-ink-300/70 bg-white/40 hover:bg-white/60"}`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand-500">
          <path
            d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-medium text-ink-700">{t("attach.drop")}</span>
        <span className="text-xs text-ink-400">{t("attach.types")}</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          <AnimatePresence initial={false}>
            {files.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative flex w-28 flex-col gap-1 rounded-2xl border border-white/70 bg-white/60 p-2 backdrop-blur-md"
              >
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => remove(f.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink-700 text-xs text-white shadow"
                >
                  ×
                </button>
                <div className="flex h-16 items-center justify-center overflow-hidden rounded-xl bg-ink-100">
                  {f.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-ink-500">PDF</span>
                  )}
                </div>
                <span className="truncate text-xs text-ink-700" title={f.name}>
                  {f.name}
                </span>
                <span className="text-[10px] text-ink-400">{prettySize(f.size)}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
