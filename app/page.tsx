"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { FileAttach, type AttachedFile } from "@/components/FileAttach";
import { ConflictCard } from "@/components/ConflictCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SEVERITY_RANK } from "@/components/SeverityBadge";
import {
  checkConflicts,
  getEngineHealth,
  ocrImage,
  standardizeText,
  ApiError,
} from "@/lib/api-client";
import type { ConflictDetail } from "@/lib/types";

type Step = "intake" | "results";
type Status = "loading" | "success" | "error";

const PROFILE_KEY = "qiao.profile";

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

/** Append `incoming` to `existing`, skipping case-insensitive duplicates. */
function mergeUnique(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const out = [...existing];
  for (const name of incoming) {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

export default function Home() {
  const [step, setStep] = useState<Step>("intake");

  // The patient's profile — accumulated across uploads, persisted locally.
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);

  // The single intake text box (typed or filled by OCR) + attachments.
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const [ocrBusy, setOcrBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [intakeError, setIntakeError] = useState("");
  const [intakeNotice, setIntakeNotice] = useState("");

  const [status, setStatus] = useState<Status>("loading");
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [error, setError] = useState("");

  const [engineUp, setEngineUp] = useState<boolean | null>(null);

  // Load the persisted profile once on mount, then keep it in sync.
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { western?: string[]; eastern?: string[] };
        setWestern(Array.isArray(p.western) ? p.western : []);
        setEastern(Array.isArray(p.eastern) ? p.eastern : []);
      }
    } catch {
      /* ignore corrupt storage */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ western, eastern }));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [western, eastern]);

  useEffect(() => {
    getEngineHealth().then(setEngineUp);
  }, []);

  const canCheck = western.length > 0 && eastern.length > 0;

  const sorted = useMemo(
    () =>
      [...conflicts].sort(
        (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
      ),
    [conflicts],
  );

  // Upload → OCR → drop the transcribed text into the box for review/edit.
  async function handleImageUpload(file: File) {
    setIntakeError("");
    setIntakeNotice("");
    setOcrBusy(true);
    try {
      const text = await ocrImage(file);
      if (!text.trim()) {
        setIntakeNotice("No text was found in that image.");
        return;
      }
      setDraft((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
      setIntakeNotice("Text extracted — review and edit it below, then add it.");
    } catch (err) {
      setIntakeError(err instanceof ApiError ? err.message : "Could not read that image.");
    } finally {
      setOcrBusy(false);
    }
  }

  // Confirmed text → standardize → merge into the profile (deduped, additive).
  async function handleAddToProfile() {
    if (!draft.trim()) return;
    setIntakeError("");
    setIntakeNotice("");
    setAddBusy(true);
    try {
      const meds = await standardizeText(draft);
      const nextW = mergeUnique(western, meds.western_medicines);
      const nextE = mergeUnique(eastern, meds.eastern_medicines);
      const added = nextW.length - western.length + (nextE.length - eastern.length);
      setWestern(nextW);
      setEastern(nextE);
      setDraft("");
      setIntakeNotice(
        added > 0
          ? `Added ${added} medicine${added > 1 ? "s" : ""} to your profile.`
          : "No new recognized medicines to add.",
      );
    } catch (err) {
      setIntakeError(err instanceof ApiError ? err.message : "Could not standardize that text.");
    } finally {
      setAddBusy(false);
    }
  }

  function removeWestern(index: number) {
    setWestern((list) => list.filter((_, i) => i !== index));
  }
  function removeEastern(index: number) {
    setEastern((list) => list.filter((_, i) => i !== index));
  }
  function clearProfile() {
    setWestern([]);
    setEastern([]);
    setIntakeNotice("");
  }

  async function runCheck() {
    setStep("results");
    setStatus("loading");
    try {
      const result = await checkConflicts({
        western_medicines: western,
        eastern_medicines: eastern,
      });
      setConflicts(result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Header engineUp={engineUp} />

      <AnimatePresence mode="wait">
        {step === "intake" && (
          <motion.section key="intake" {...fade} className="flex flex-col gap-6">
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Add medicines</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Upload a photo of a prescription, or type the medicines below. We&apos;ll read the
                  text so you can confirm it, then sort it into Western and Chinese (TCM) medicines.
                </p>
              </div>

              <FileAttach
                files={attachments}
                onChange={setAttachments}
                onImageUpload={handleImageUpload}
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="intake-text" className="text-sm font-semibold text-ink-700">
                  Prescription text
                  {ocrBusy && (
                    <span className="ml-2 font-normal text-ink-400">extracting…</span>
                  )}
                </label>
                <textarea
                  id="intake-text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  placeholder="e.g. warfarin 5mg daily, 丹参茶, dong quai — or upload a photo above"
                  className="glass-input min-h-[7rem] w-full resize-y p-3 text-sm outline-none placeholder:text-ink-400"
                />
              </div>

              {(intakeError || intakeNotice) && (
                <p className={`text-xs ${intakeError ? "text-severity-major" : "text-ink-500"}`}>
                  {intakeError || intakeNotice}
                </p>
              )}

              <div className="flex justify-end border-t border-white/60 pt-5">
                <Button onClick={handleAddToProfile} disabled={!draft.trim() || addBusy || ocrBusy}>
                  {addBusy ? "Adding…" : "Confirm & add to profile"}
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col gap-5 p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-900">My medicines</h2>
                {western.length + eastern.length > 0 && (
                  <button
                    type="button"
                    onClick={clearProfile}
                    className="text-xs font-medium text-ink-400 transition hover:text-severity-major"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <ProfileGroup
                title="Western medicines"
                accent="brand"
                items={western}
                onRemove={removeWestern}
              />
              <ProfileGroup
                title="Chinese medicines (TCM)"
                accent="teal"
                items={eastern}
                onRemove={removeEastern}
              />

              <div className="flex flex-col gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-400">
                  {canCheck
                    ? "Ready to check for interactions."
                    : "Add at least one Western and one Chinese medicine to check for interactions."}
                </p>
                <Button onClick={runCheck} disabled={!canCheck}>
                  Check for conflicts →
                </Button>
              </div>
            </GlassCard>
          </motion.section>
        )}

        {step === "results" && (
          <motion.section key="results" {...fade} className="flex flex-col gap-4">
            {status === "loading" && <LoadingState />}

            {status === "error" && <ErrorState message={error} onRetry={runCheck} />}

            {status === "success" && (
              <>
                {sorted.length > 0 ? (
                  <>
                    <GlassCard className="flex items-center gap-3 p-5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-severity-major/15 text-severity-major">
                        !
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">
                          {sorted.length} interaction{sorted.length > 1 ? "s" : ""} found
                        </p>
                        <p className="text-xs text-ink-500">
                          Sorted by severity. Share these with a pharmacist or clinician.
                        </p>
                      </div>
                    </GlassCard>
                    {sorted.map((c, i) => (
                      <ConflictCard key={`${c.western_drug}-${c.tcm_herb}-${i}`} conflict={c} index={i} />
                    ))}
                  </>
                ) : (
                  <EmptyState />
                )}
              </>
            )}

            {status !== "loading" && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => setStep("intake")}>
                  ← Back to my medicines
                </Button>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <Disclaimer />
    </main>
  );
}

function Header({ engineUp }: { engineUp: boolean | null }) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Qiáo <span className="text-brand-500">·</span> 橋
        </h1>
        <p className="text-sm text-ink-500">Medication safety bridge — TCM × Western</p>
      </div>
      <EngineStatus engineUp={engineUp} />
    </header>
  );
}

function EngineStatus({ engineUp }: { engineUp: boolean | null }) {
  const label = engineUp === null ? "Checking…" : engineUp ? "Engine online" : "Engine offline";
  const dot =
    engineUp === null ? "bg-ink-300" : engineUp ? "bg-teal-500" : "bg-severity-major";
  return (
    <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-ink-600">
      <span className={`h-2 w-2 rounded-full ${dot} ${engineUp ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

function ProfileGroup({
  title,
  accent,
  items,
  onRemove,
}: {
  title: string;
  accent: "brand" | "teal";
  items: string[];
  onRemove: (index: number) => void;
}) {
  const dot = accent === "brand" ? "bg-brand-500" : "bg-teal-500";
  const chip =
    accent === "brand"
      ? "bg-brand-50/80 text-brand-800 border-brand-200/70"
      : "bg-teal-50/80 text-teal-800 border-teal-200/70";
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {title}
        <span className="font-normal text-ink-400">({items.length})</span>
      </span>
      {items.length === 0 ? (
        <span className="text-sm text-ink-400">None yet</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {items.map((item, i) => (
              <motion.span
                key={`${item}-${i}`}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${chip}`}
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => onRemove(i)}
                  className="rounded-full text-current/60 transition hover:text-current"
                >
                  ×
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="mx-auto max-w-md pt-2 text-center text-xs leading-relaxed text-ink-400">
      Qiáo surfaces known, sourced interactions and hands the decision to a human. It is a
      reconciliation and conflict-detection tool — not a diagnosis, and not medical advice.
    </p>
  );
}
