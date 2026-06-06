"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { MedListInput } from "@/components/MedListInput";
import { FileAttach, type AttachedFile } from "@/components/FileAttach";
import { SegmentedControl } from "@/components/SegmentedControl";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ConflictCard } from "@/components/ConflictCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SEVERITY_RANK } from "@/components/SeverityBadge";
import { checkConflicts, getEngineHealth, ApiError } from "@/lib/api-client";
import type { ConflictDetail } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useT, useTerm } from "@/lib/i18n";

type Step = "intake" | "confirm" | "results";
type Status = "loading" | "success" | "error";
type PrescriptionType = "western" | "eastern";

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export default function Home() {
  const router = useRouter();
  const t = useT();
  const rxTypeOptions = [
    { value: "western" as const, label: t("rx.western"), hint: t("rx.westernHint") },
    { value: "eastern" as const, label: t("rx.tcm"), hint: t("rx.tcmHint") },
  ];
  const [step, setStep] = useState<Step>("intake");
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [rxType, setRxType] = useState<PrescriptionType | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [error, setError] = useState("");

  const [engineUp, setEngineUp] = useState<boolean | null>(null);

  // Redirect to login if no active session; caregivers use their own view.
  useEffect(() => {
    const s = getSession();
    if (!s) { router.replace("/login"); return; }
    if (s.role === "caregiver") { router.replace("/caregiver"); return; }

    // Pick up medicine lists handed over from the dashboard, if any.
    try {
      const raw = sessionStorage.getItem("qiao:prefill");
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.western)) setWestern(p.western);
        if (Array.isArray(p.eastern)) setEastern(p.eastern);
        sessionStorage.removeItem("qiao:prefill");
      }
    } catch {
      /* ignore malformed prefill */
    }

    getEngineHealth().then(setEngineUp);
  }, [router]);

  const canCheck = western.length > 0 && eastern.length > 0;
  // If files are attached, a prescription type must be chosen first.
  const needsRxType = attachments.length > 0 && rxType === null;

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
    setRxType(null);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Header engineUp={engineUp} />

      <AnimatePresence mode="wait">
        {step === "intake" && (
          <motion.section key="intake" {...fade}>
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{t("intake.title")}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {t("intake.instructions")}
                </p>
              </div>

              <MedListInput
                label={t("intake.western")}
                hint={t("intake.westernHint")}
                placeholder={t("intake.westernPh")}
                accent="brand"
                items={western}
                onChange={setWestern}
              />
              <MedListInput
                label={t("intake.tcm")}
                hint={t("intake.tcmHint")}
                placeholder={t("intake.tcmPh")}
                accent="teal"
                items={eastern}
                onChange={setEastern}
              />

              {/* Prescription type — chosen before upload so files are categorised. */}
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink-800">{t("intake.rxType")}</span>
                  <span className="text-xs text-ink-400">{t("intake.rxTypeReq")}</span>
                </div>
                <SegmentedControl
                  options={rxTypeOptions}
                  value={rxType}
                  onChange={setRxType}
                  layoutId="rx-type"
                />
              </div>

              <FileAttach files={attachments} onChange={setAttachments} />

              <div className="flex flex-col gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-400">
                  {needsRxType
                    ? t("intake.needType")
                    : canCheck
                      ? t("intake.ready")
                      : t("intake.needMeds")}
                </p>
                <Button onClick={() => setStep("confirm")} disabled={!canCheck || needsRxType}>
                  {t("intake.review")}
                </Button>
              </div>
            </GlassCard>
          </motion.section>
        )}

        {step === "confirm" && (
          <motion.section key="confirm" {...fade}>
            <GlassCard strong className="flex flex-col gap-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">{t("confirm.title")}</h2>
                <p className="mt-1 text-sm text-ink-500">
                  {t("confirm.subtitle")}
                </p>
              </div>

              <SummaryList title={t("intake.western")} accent="brand" items={western} />
              <SummaryList title={t("intake.tcm")} accent="teal" items={eastern} />

              {attachments.length > 0 && (
                <p className="text-xs text-ink-400">
                  {t("confirm.filesAttached", { n: attachments.length })}
                  {rxType &&
                    t("confirm.filesAs", {
                      type: rxType === "western" ? t("rx.western") : t("rx.tcm"),
                    })}
                  {t("confirm.filesKept")}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-white/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={() => setStep("intake")}>
                  {t("confirm.back")}
                </Button>
                <Button onClick={runCheck}>{t("confirm.run")}</Button>
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
                        <p className="text-xs text-ink-500">
                          {t("results.sortedBy")}
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
                  {t("results.checkAnother")}
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
  const t = useT();
  const term = useTerm();
  const chip =
    accent === "brand"
      ? "bg-brand-50/80 text-brand-800 border-brand-200/70"
      : "bg-teal-50/80 text-teal-800 border-teal-200/70";
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-ink-700">{title}</span>
      {items.length === 0 ? (
        <span className="text-sm text-ink-400">{t("common.none")}</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${chip}`}
            >
              {term(item)}
            </span>
          ))}
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
