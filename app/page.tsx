"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { MedListInput } from "@/components/MedListInput";
import { FileAttach, type AttachedFile } from "@/components/FileAttach";
import { ConflictCard } from "@/components/ConflictCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SEVERITY_RANK } from "@/components/SeverityBadge";
import { checkConflicts, getEngineHealth, ApiError } from "@/lib/api-client";
import type { ConflictDetail } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Step = "intake" | "confirm" | "results";
type Status = "loading" | "success" | "error";

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intake");
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const [status, setStatus] = useState<Status>("loading");
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [error, setError] = useState("");

  const [engineUp, setEngineUp] = useState<boolean | null>(null);

  // Redirect to login if no active session.
  useEffect(() => {
    if (!getSession()) { router.replace("/login"); return; }
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

  function reset() {
    setStep("intake");
    setConflicts([]);
    setError("");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Header engineUp={engineUp} />

      <AnimatePresence mode="wait">
        {step === "intake" && (
          <motion.section key="intake" {...fade}>
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Enter the medicines</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Add each Western drug and each Chinese medicine (TCM) separately. Press Enter or comma
                  after each name.
                </p>
              </div>

              <MedListInput
                label="Western medicines"
                hint="e.g. warfarin"
                placeholder="Type a drug name…"
                accent="brand"
                items={western}
                onChange={setWestern}
              />
              <MedListInput
                label="Chinese medicines (TCM)"
                hint="e.g. danshen"
                placeholder="Type a herb or formula…"
                accent="teal"
                items={eastern}
                onChange={setEastern}
              />

              <FileAttach files={attachments} onChange={setAttachments} />

              <div className="flex flex-col gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-400">
                  {canCheck
                    ? "Ready to check."
                    : "Add at least one Western and one Chinese medicine to check for interactions."}
                </p>
                <Button onClick={() => setStep("confirm")} disabled={!canCheck}>
                  Review &amp; check →
                </Button>
              </div>
            </GlassCard>
          </motion.section>
        )}

        {step === "confirm" && (
          <motion.section key="confirm" {...fade}>
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">Confirm before checking</h2>
                <p className="mt-1 text-sm text-ink-500">
                  These two lists will be sent to the conflict engine.
                </p>
              </div>

              <SummaryList title="Western medicines" accent="brand" items={western} />
              <SummaryList title="Chinese medicines (TCM)" accent="teal" items={eastern} />

              {attachments.length > 0 && (
                <p className="text-xs text-ink-400">
                  {attachments.length} file{attachments.length > 1 ? "s" : ""} attached (kept for your
                  reference; not analysed).
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={() => setStep("intake")}>
                  ← Back to edit
                </Button>
                <Button onClick={runCheck}>Confirm &amp; check for conflicts</Button>
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
                <Button variant="secondary" onClick={reset}>
                  Check another patient
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

function SummaryList({
  title,
  accent,
  items,
}: {
  title: string;
  accent: "brand" | "teal";
  items: string[];
}) {
  const chip =
    accent === "brand"
      ? "bg-brand-50/80 text-brand-800 border-brand-200/70"
      : "bg-teal-50/80 text-teal-800 border-teal-200/70";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-700">{title}</span>
      {items.length === 0 ? (
        <span className="text-sm text-ink-400">None</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${chip}`}
            >
              {item}
            </span>
          ))}
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
