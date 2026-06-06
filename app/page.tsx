"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { FileAttach, type AttachedFile } from "@/components/FileAttach";
import { LanguageToggle } from "@/components/LanguageToggle";
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
import { getSession, type SessionUser } from "@/lib/auth";
import { addItem, getItems, removeItem } from "@/lib/user-records";
import { useT, useTerm } from "@/lib/i18n";

type Step = "intake" | "results";
type Status = "loading" | "success" | "error";

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
  const router = useRouter();
  const t = useT();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("intake");

  // The patient's profile lists — backed by per-user records (lib/user-records).
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

  // Auth guard + load the user's stored medicine lists. Caregivers get their
  // own read-only view. Picks up any prefill handed over from the dashboard.
  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (s.role === "caregiver") {
      router.replace("/caregiver");
      return;
    }
    if (s.role === "practitioner") {
      router.replace("/doctor");
      return;
    }
    setUser(s);

    let w = getItems(s.id, "western");
    let e = getItems(s.id, "eastern");
    try {
      const raw = sessionStorage.getItem("qiao:prefill");
      if (raw) {
        const p = JSON.parse(raw) as { western?: string[]; eastern?: string[] };
        if (Array.isArray(p.western)) w = mergeUnique(w, p.western);
        if (Array.isArray(p.eastern)) e = mergeUnique(e, p.eastern);
        sessionStorage.removeItem("qiao:prefill");
      }
    } catch {
      /* ignore malformed prefill */
    }
    setWestern(w);
    setEastern(e);
    setMounted(true);

    getEngineHealth().then(setEngineUp);
  }, [router]);

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
        setIntakeNotice(t("intake.ocrEmpty"));
        return;
      }
      setDraft((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text));
      setIntakeNotice(t("intake.ocrDone"));
    } catch (err) {
      setIntakeError(err instanceof ApiError ? err.message : t("intake.ocrError"));
    } finally {
      setOcrBusy(false);
    }
  }

  // Confirmed text → standardize → persist into the profile (deduped, additive).
  async function handleAddToProfile() {
    if (!draft.trim() || !user) return;
    setIntakeError("");
    setIntakeNotice("");
    setAddBusy(true);
    try {
      const meds = await standardizeText(draft);
      let w = western;
      let e = eastern;
      for (const name of meds.western_medicines) w = addItem(user.id, "western", name);
      for (const name of meds.eastern_medicines) e = addItem(user.id, "eastern", name);
      const added = w.length - western.length + (e.length - eastern.length);
      setWestern(w);
      setEastern(e);
      setDraft("");
      setIntakeNotice(added > 0 ? t("intake.added", { n: added }) : t("intake.noNew"));
    } catch (err) {
      setIntakeError(err instanceof ApiError ? err.message : t("intake.stdError"));
    } finally {
      setAddBusy(false);
    }
  }

  function removeWestern(item: string) {
    if (!user) return;
    setWestern(removeItem(user.id, "western", item));
  }
  function removeEastern(item: string) {
    if (!user) return;
    setEastern(removeItem(user.id, "eastern", item));
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

  // Avoid an auth/hydration flash before the session check resolves.
  if (!mounted || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="animate-pulse text-sm text-ink-400">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Header engineUp={engineUp} />

      <AnimatePresence mode="wait">
        {step === "intake" && (
          <motion.section key="intake" {...fade} className="flex flex-col gap-6">
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{t("intake.addTitle")}</h2>
                <p className="mt-1 text-sm text-ink-500">{t("intake.ocrInstructions")}</p>
              </div>

              <FileAttach
                files={attachments}
                onChange={setAttachments}
                onImageUpload={handleImageUpload}
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="intake-text" className="text-sm font-semibold text-ink-700">
                  {t("intake.rxText")}
                  {ocrBusy && (
                    <span className="ml-2 font-normal text-ink-400">{t("intake.extracting")}</span>
                  )}
                </label>
                <textarea
                  id="intake-text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={5}
                  placeholder={t("intake.rxPlaceholder")}
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
                  {addBusy ? t("intake.adding") : t("intake.addToProfile")}
                </Button>
              </div>
            </GlassCard>

            <GlassCard className="flex flex-col gap-5 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-ink-900">{t("intake.myMeds")}</h2>

              <ProfileGroup
                title={t("intake.western")}
                accent="brand"
                items={western}
                onRemove={removeWestern}
              />
              <ProfileGroup
                title={t("intake.tcm")}
                accent="teal"
                items={eastern}
                onRemove={removeEastern}
              />

              <div className="flex flex-col gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-400">
                  {canCheck ? t("intake.ready") : t("intake.needMeds")}
                </p>
                <Button onClick={runCheck} disabled={!canCheck}>
                  {t("intake.check")}
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
                          {t("results.found", { n: sorted.length })}
                        </p>
                        <p className="text-xs text-ink-500">{t("results.sortedBy")}</p>
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
                  {t("results.back")}
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
  const t = useT();
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">
          Qiáo <span className="text-brand-500">·</span> 橋
        </h1>
        <p className="text-sm text-ink-500">{t("brand.tagline")}</p>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle />
        <EngineStatus engineUp={engineUp} />
      </div>
    </header>
  );
}

function EngineStatus({ engineUp }: { engineUp: boolean | null }) {
  const t = useT();
  const label =
    engineUp === null ? t("engine.checking") : engineUp ? t("engine.online") : t("engine.offline");
  const dot = engineUp === null ? "bg-ink-300" : engineUp ? "bg-teal-500" : "bg-severity-major";
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
  onRemove: (item: string) => void;
}) {
  const t = useT();
  const term = useTerm();
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
        <span className="text-sm text-ink-400">{t("common.none")}</span>
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
                {term(item)}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => onRemove(item)}
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
  const t = useT();
  return (
    <p className="mx-auto max-w-md pt-2 text-center text-xs leading-relaxed text-ink-400">
      {t("disclaimer.recon")}
    </p>
  );
}
