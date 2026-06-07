"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { GlassCard } from "@/components/GlassCard";
import { CaregiverSection } from "@/components/CaregiverSection";
import { getSession, type SessionUser } from "@/lib/auth";
import { useT, useTerm } from "@/lib/i18n";
import {
  getProfile,
  updateProfile,
  type PatientProfile,
  type EditableProfile,
} from "@/lib/profile";

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const term = useTerm();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableProfile | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role === "caregiver" || session.role === "caretaker") {
      router.replace("/caregiver");
      return;
    }
    if (session.role === "practitioner") {
      router.replace("/doctor");
      return;
    }

    const p = getProfile(session.id, { email: session.email, name: session.name });
    setUser(session);
    setProfile(p);
    setMounted(true);
  }, [router]);

  function startEdit() {
    if (!profile) return;
    const { patientId, registrationDate, ...editable } = profile;
    void patientId;
    void registrationDate;
    setDraft(editable);
    setEditing(true);
  }

  function saveEdit() {
    if (!user || !draft) return;
    setProfile(updateProfile(user.id, draft));
    setEditing(false);
  }

  if (!mounted || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-ink-400 animate-pulse">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <DashboardNav user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── Identity header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard strong className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <span
                className="flex items-center justify-center w-20 h-20 rounded-full text-white text-2xl font-bold shadow-glass-lg shrink-0"
                style={{ backgroundColor: user.avatarHex }}
              >
                {user.initials}
              </span>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight">
                  {profile.fullName}
                </h1>
                {/* Patient ID — prominent, immutable */}
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-900" />
                  <span className="text-xs font-medium text-ink-500">{t("profile.patientId")}</span>
                  <span className="font-mono text-sm font-semibold text-brand-800 tracking-wide">
                    {profile.patientId}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ink-400">
                  {t("profile.registered", {
                    date: formatDate(profile.registrationDate),
                    role: t(`role.${user.role}`),
                  })}
                </p>
              </div>
              <div className="shrink-0 self-start">
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-ink-700 backdrop-blur-md transition-colors hover:bg-white/90"
                  >
                    {t("profile.edit")}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(false)}
                      className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-white/90"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={saveEdit}
                      className="rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-600"
                    >
                      {t("common.save")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Personal details ────────────────────────────────────── */}
        <Section title={t("section.personal")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <Field label={t("field.dob")} value={profile.dateOfBirth} editing={editing}
              type="date" draftKey="dateOfBirth" draft={draft} setDraft={setDraft} render={formatDate} />
            <Field label={t("field.gender")} value={profile.gender} editing={editing}
              draftKey="gender" draft={draft} setDraft={setDraft} render={term} />
            <Field label={t("field.blood")} value={profile.bloodGroup} editing={editing}
              draftKey="bloodGroup" draft={draft} setDraft={setDraft} />
            <Field label={t("field.email")} value={profile.email} editing={editing}
              draftKey="email" draft={draft} setDraft={setDraft} />
            <Field label={t("field.phone")} value={profile.phone} editing={editing}
              draftKey="phone" draft={draft} setDraft={setDraft} />
            <Field label={t("field.address")} value={profile.address} editing={editing}
              draftKey="address" draft={draft} setDraft={setDraft} className="sm:col-span-2 lg:col-span-3" />
          </div>
        </Section>

        {/* ── Emergency contact ───────────────────────────────────── */}
        <Section title={t("section.emergency")}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label={t("field.name")} value={profile.emergencyContactName} editing={editing}
              draftKey="emergencyContactName" draft={draft} setDraft={setDraft} />
            <Field label={t("field.phone")} value={profile.emergencyContactPhone} editing={editing}
              draftKey="emergencyContactPhone" draft={draft} setDraft={setDraft} />
            <Field label={t("field.relationship")} value={profile.emergencyContactRelation} editing={editing}
              draftKey="emergencyContactRelation" draft={draft} setDraft={setDraft} render={term} />
          </div>
        </Section>

        {/* ── Insurance ───────────────────────────────────────────── */}
        <Section title={t("section.insurance")} subtitle={t("section.insurance.sub")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label={t("field.provider")} value={profile.insuranceProvider} editing={editing}
              draftKey="insuranceProvider" draft={draft} setDraft={setDraft} />
            <Field label={t("field.policyNo")} value={profile.insurancePolicyNo} editing={editing}
              draftKey="insurancePolicyNo" draft={draft} setDraft={setDraft} />
          </div>
        </Section>

        {/* ── Caregivers ──────────────────────────────────────────── */}
        <CaregiverSection patientUserId={user.id} patientName={profile.fullName} />

        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          {t("profile.disclaimer")}
        </p>
      </main>
    </>
  );
}

/* ── helpers & subcomponents ──────────────────────────────────────── */

function formatDate(iso: string): string {
  if (!iso || iso === "-") return iso || "-";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className="p-6 sm:p-7">
        <div className="mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-900 shrink-0" />
          <h2 className="text-base font-semibold text-ink-800">{title}</h2>
          {subtitle && <span className="text-xs text-ink-400">· {subtitle}</span>}
        </div>
        {children}
      </GlassCard>
    </motion.div>
  );
}

function Field({
  label,
  value,
  editing,
  draftKey,
  draft,
  setDraft,
  type = "text",
  className = "",
  render,
}: {
  label: string;
  value: string;
  editing: boolean;
  draftKey: keyof EditableProfile;
  draft: EditableProfile | null;
  setDraft: React.Dispatch<React.SetStateAction<EditableProfile | null>>;
  type?: string;
  className?: string;
  render?: (v: string) => string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-400 mb-1">
        {label}
      </label>
      {editing && draft ? (
        <input
          type={type}
          value={draft[draftKey]}
          onChange={(e) => setDraft({ ...draft, [draftKey]: e.target.value })}
          className="glass-input w-full px-3 py-2 text-sm"
        />
      ) : (
        <p className="text-sm font-medium text-ink-800 break-words">
          {value ? (render ? render(value) : value) : <span className="text-ink-300">-</span>}
        </p>
      )}
    </div>
  );
}
