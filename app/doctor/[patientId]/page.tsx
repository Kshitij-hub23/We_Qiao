"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { GlassCard } from "@/components/GlassCard";
import { MedListCard } from "@/components/MedListCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConflictCard } from "@/components/ConflictCard";
import { LoadingState } from "@/components/LoadingState";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { SEVERITY_RANK } from "@/components/SeverityBadge";
import { getSession, type SessionUser } from "@/lib/auth";
import { useT, useTerm } from "@/lib/i18n";
import { getProfile, type PatientProfile } from "@/lib/profile";
import { getItems, addItem, removeItem } from "@/lib/user-records";
import { ensurePatientSeeded, isPatientOfDoctor } from "@/lib/patients";
import { checkConflicts, ApiError } from "@/lib/api-client";
import type { ConflictDetail } from "@/lib/types";

type EditKind = "diseases" | "western" | "eastern" | "allergies";
type CheckStatus = "idle" | "loading" | "success" | "error";

export default function DoctorPatientPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = String(params.patientId);
  const t = useT();
  const term = useTerm();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  const [diseases, setDiseases] = useState<string[]>([]);
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  const [pendingDelete, setPendingDelete] = useState<{ kind: EditKind; item: string } | null>(null);

  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [checkError, setCheckError] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    if (session.role !== "practitioner") {
      router.replace(
        session.role === "caregiver" || session.role === "caretaker"
          ? "/caregiver"
          : "/dashboard",
      );
      return;
    }
    if (!isPatientOfDoctor(session.id, patientId)) {
      router.replace("/doctor");
      return;
    }
    ensurePatientSeeded(patientId);
    setUser(session);
    setProfile(getProfile(patientId));
    setDiseases(getItems(patientId, "diseases"));
    setWestern(getItems(patientId, "western"));
    setEastern(getItems(patientId, "eastern"));
    setAllergies(getItems(patientId, "allergies"));
    setMounted(true);
  }, [router, patientId]);

  function setList(kind: EditKind, items: string[]) {
    if (kind === "diseases") setDiseases(items);
    if (kind === "western") setWestern(items);
    if (kind === "eastern") setEastern(items);
    if (kind === "allergies") setAllergies(items);
  }

  // Writes go to the PATIENT's dataset (qiao:{patientId}:{kind}) — same data the patient sees.
  function handleAdd(kind: EditKind, value: string) {
    setList(kind, addItem(patientId, kind, value));
  }
  function confirmRemove() {
    if (!pendingDelete) return;
    setList(pendingDelete.kind, removeItem(patientId, pendingDelete.kind, pendingDelete.item));
    setPendingDelete(null);
  }

  const sorted = useMemo(
    () => [...conflicts].sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)),
    [conflicts],
  );

  async function runCheck() {
    setCheckStatus("loading");
    try {
      const result = await checkConflicts(
        { western_medicines: western, eastern_medicines: eastern },
        "clinical", // practitioner: full sourced detail
      );
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

  const canCheck = western.length > 0 && eastern.length > 0;

  return (
    <>
      <DashboardNav user={user} profileHref={null} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link href="/doctor" className="inline-block text-sm text-ink-500 hover:text-ink-800 transition-colors">
          {t("doctor.back")}
        </Link>

        {/* Patient header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
          <GlassCard strong className="p-6 sm:p-7">
            <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight">
              {profile.fullName}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              <span className="font-mono text-brand-800">{profile.patientId}</span>
              {profile.gender && <> · {term(profile.gender)}</>}
              {profile.bloodGroup && <> · {profile.bloodGroup}</>}
            </p>
            {/* Read-only details */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <Detail label={t("field.dob")} value={profile.dateOfBirth} />
              <Detail label={t("field.phone")} value={profile.phone} />
              <Detail label={t("cgv.emergency")}
                value={`${profile.emergencyContactName} · ${profile.emergencyContactPhone}`} />
            </div>
            <p className="mt-4 text-xs text-ink-400 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
              {t("doctor.editing")}
            </p>
          </GlassCard>
        </motion.div>

        {/* Editable clinical lists */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MedListCard
            title={t("card.conditions.title")} subtitle={t("card.conditions.subtitle")}
            items={diseases} placeholder={t("card.conditions.placeholder")}
            emptyLabel={t("card.conditions.empty")} localize={term}
            onAdd={(v) => handleAdd("diseases", v)}
            onRemove={(v) => setPendingDelete({ kind: "diseases", item: v })}
          />
          <MedListCard
            title={t("cgv.allergies")} subtitle="-"
            items={allergies} placeholder="e.g. Penicillin"
            emptyLabel={t("common.none")} localize={term}
            onAdd={(v) => handleAdd("allergies", v)}
            onRemove={(v) => setPendingDelete({ kind: "allergies", item: v })}
          />
          <MedListCard
            title={t("card.western.title")} subtitle={t("card.western.subtitle")}
            items={western} placeholder={t("card.western.placeholder")}
            emptyLabel={t("card.western.empty")} localize={term}
            onAdd={(v) => handleAdd("western", v)}
            onRemove={(v) => setPendingDelete({ kind: "western", item: v })}
          />
          <MedListCard
            title={t("card.tcm.title")} subtitle={t("card.tcm.subtitle")}
            items={eastern} placeholder={t("card.tcm.placeholder")}
            emptyLabel={t("card.tcm.empty")} localize={term}
            onAdd={(v) => handleAdd("eastern", v)}
            onRemove={(v) => setPendingDelete({ kind: "eastern", item: v })}
          />
        </div>

        {/* Point-of-prescribing interaction check */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}>
          <GlassCard className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-ink-800">{t("doctor.runCheck")}</p>
                <p className="text-xs text-ink-500 mt-0.5">{t("doctor.checkHint")}</p>
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
                          <ConflictCard key={`${c.western_drug}-${c.tcm_herb}-${i}`} conflict={c} index={i} detail="clinical" />
                        ))
                      : <EmptyState />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </GlassCard>
        </motion.div>

        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          {t("disclaimer.recon")}
        </p>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? t(`confirm.deleteNoun.${pendingDelete.kind}`) : ""}
        itemLabel={pendingDelete ? term(pendingDelete.item) : ""}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="text-sm font-medium text-ink-800 break-words">
        {value && value.trim() && value !== "-" ? value : <span className="text-ink-300">-</span>}
      </p>
    </div>
  );
}
