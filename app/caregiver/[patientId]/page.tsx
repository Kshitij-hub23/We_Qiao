"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { GlassCard } from "@/components/GlassCard";
import { ConflictCard } from "@/components/ConflictCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SEVERITY_RANK } from "@/components/SeverityBadge";
import { getSession, type SessionUser } from "@/lib/auth";
import { useT, useTerm } from "@/lib/i18n";
import { getProfile, type PatientProfile } from "@/lib/profile";
import { getItems } from "@/lib/user-records";
import { ensurePatientSeeded, isPatientOfCaretaker } from "@/lib/patients";
import { getCaretakerPermissions, type CaregiverPermissions } from "@/lib/caregivers";
import { checkConflicts, ApiError } from "@/lib/api-client";
import type { ConflictDetail } from "@/lib/types";

type CheckStatus = "idle" | "loading" | "success" | "error";

export default function CaretakerPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = String(params.patientId);
  const t = useT();
  const term = useTerm();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [perms, setPerms] = useState<CaregiverPermissions | null>(null);

  const [diseases, setDiseases] = useState<string[]>([]);
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [checkError, setCheckError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    if (session.role !== "caretaker" && session.role !== "caregiver") {
      router.replace(session.role === "practitioner" ? "/doctor" : "/dashboard");
      return;
    }
    if (!isPatientOfCaretaker(session.email, patientId)) {
      router.replace("/caregiver");
      return;
    }
    ensurePatientSeeded(patientId);
    setUser(session);
    setPerms(getCaretakerPermissions(patientId, session.email));
    setProfile(getProfile(patientId));
    setDiseases(getItems(patientId, "diseases"));
    setWestern(getItems(patientId, "western"));
    setEastern(getItems(patientId, "eastern"));
    setAllergies(getItems(patientId, "allergies"));
    setMounted(true);
  }, [router, patientId]);

  const sorted = useMemo(
    () => [...conflicts].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)),
    [conflicts],
  );

  async function runCheck() {
    setCheckStatus("loading");
    try {
      const result = await checkConflicts({ western_medicines: western, eastern_medicines: eastern });
      setConflicts(result);
      setCheckStatus("success");
    } catch (err) {
      setCheckError(err instanceof ApiError ? err.message : "Something went wrong.");
      setCheckStatus("error");
    }
  }

  if (!mounted || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-ink-400 animate-pulse">{t("common.loading")}</span>
      </div>
    );
  }

  const can = (k: keyof CaregiverPermissions) => perms?.[k] ?? false;
  const canCheck = can("medications") && western.length > 0 && eastern.length > 0;

  return (
    <>
      <DashboardNav user={user} profileHref={null} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href="/caregiver" className="inline-block text-sm text-ink-500 hover:text-ink-800 transition-colors">
          {t("care.back")}
        </Link>

        {/* Patient header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <GlassCard strong className="p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              {t("cgv.viewingAs")}
            </p>
            <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight mt-1">
              {profile.fullName}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              <span className="font-mono text-brand-800">{profile.patientId}</span>
              {profile.dateOfBirth && <> · DOB {profile.dateOfBirth}</>}
              {profile.bloodGroup && <> · {profile.bloodGroup}</>}
            </p>
            <p className="mt-3 text-xs text-ink-400 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
              {t("care.readonly", { name: profile.fullName.split(" ")[0] })}
            </p>
          </GlassCard>
        </motion.div>

        {/* Profile & contact */}
        {can("profile") && (
          <ReadSection title={t("cgv.section.profile")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <ReadField label={t("field.gender")} value={term(profile.gender)} />
              <ReadField label={t("field.phone")} value={profile.phone} />
              <ReadField label={t("field.email")} value={profile.email} />
              <ReadField label={t("field.address")} value={profile.address} className="sm:col-span-2" />
              <ReadField label={t("cgv.emergency")}
                value={`${profile.emergencyContactName} (${term(profile.emergencyContactRelation)}) · ${profile.emergencyContactPhone}`} />
            </div>
          </ReadSection>
        )}

        {/* Medication schedule (read-only) */}
        {can("medications") && (
          <ReadSection title={t("cgv.section.meds")}>
            <ChipList label={t("cgv.western")} items={western} />
            <ChipList label={t("cgv.tcm")} items={eastern} />
          </ReadSection>
        )}

        {/* Medical history (read-only) */}
        {can("history") && (
          <ReadSection title={t("cgv.section.history")}>
            <ChipList label={t("cgv.allergies")} items={allergies} />
            <ChipList label={t("cgv.conditions")} items={diseases} />
          </ReadSection>
        )}

        {!can("profile") && !can("medications") && !can("history") && (
          <GlassCard className="p-6">
            <p className="text-sm text-ink-500">{t("cgv.noPerms")}</p>
          </GlassCard>
        )}

        {/* Interaction check — read-only on the lists, but the caretaker can run it */}
        {can("medications") && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}>
            <GlassCard className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{t("doctor.runCheck")}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{t("care.checkHint")}</p>
                </div>
                <button
                  onClick={runCheck}
                  disabled={!canCheck || checkStatus === "loading"}
                  className="shrink-0 rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed"
                >
                  {t("doctor.runCheck")}
                </button>
              </div>

              <div className="mt-4">
                <AnimatePresence mode="wait">
                  {checkStatus === "loading" && <motion.div key="l"><LoadingState /></motion.div>}
                  {checkStatus === "error" && <motion.div key="e"><ErrorState message={checkError} onRetry={runCheck} /></motion.div>}
                  {checkStatus === "success" && (
                    <motion.div key="s" className="flex flex-col gap-3">
                      {sorted.length > 0
                        ? sorted.map((c, i) => (
                            <ConflictCard key={`${c.western_drug}-${c.tcm_herb}-${i}`} conflict={c} index={i} />
                          ))
                        : <EmptyState />}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          {t("cgv.disclaimer")}
        </p>
      </main>
    </>
  );
}

/* ── read-only subcomponents ──────────────────────────────────────── */
function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className="p-6 sm:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-900 shrink-0" />
          <h2 className="text-base font-semibold text-ink-800">{title}</h2>
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

function ReadField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-ink-800 break-words">
        {value && value.trim() && value !== "—" ? value : <span className="text-ink-300">—</span>}
      </p>
    </div>
  );
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  const t = useT();
  const term = useTerm();
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400 mb-1.5">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400 italic">{t("common.none")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item}
              className="inline-flex items-center gap-1.5 bg-white/70 border border-white/80 text-ink-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-900" />
              {term(item)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
