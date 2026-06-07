"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useT } from "@/lib/i18n";
import {
  getCaregivers,
  linkCaregiver,
  removeCaregiver,
  updateCaregiverPermissions,
  DEFAULT_PERMISSIONS,
  PERMISSION_LABELS,
  type Caregiver,
  type CaregiverPermissions,
} from "@/lib/caregivers";

const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as (keyof CaregiverPermissions)[];

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="2" y1="7" x2="12" y2="7" />
    </svg>
  );
}

export function CaregiverSection({
  patientUserId,
  patientName,
}: {
  patientUserId: string;
  patientName: string;
}) {
  const t = useT();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Caregiver | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [perms, setPerms] = useState<CaregiverPermissions>({ ...DEFAULT_PERMISSIONS });
  const [linkError, setLinkError] = useState<"not_found" | "already_linked" | null>(null);

  useEffect(() => {
    setCaregivers(getCaregivers(patientUserId));
  }, [patientUserId]);

  function resetForm() {
    setEmail("");
    setRelationship("");
    setPerms({ ...DEFAULT_PERMISSIONS });
    setLinkError(null);
  }

  function submitAdd() {
    if (!email.trim()) return;
    const result = linkCaregiver(patientUserId, patientName, {
      email,
      relationship,
      permissions: perms,
    });
    if (!result.ok) {
      setLinkError(result.error);
      return;
    }
    setCaregivers(getCaregivers(patientUserId));
    setAdding(false);
    resetForm();
  }

  function togglePermission(cg: Caregiver, key: keyof CaregiverPermissions) {
    const next = { ...cg.permissions, [key]: !cg.permissions[key] };
    setCaregivers(updateCaregiverPermissions(patientUserId, cg.id, next));
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    setCaregivers(removeCaregiver(patientUserId, pendingRemove.id));
    setPendingRemove(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <GlassCard className="p-6 sm:p-7">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-900 shrink-0" />
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("cg.title")}</h2>
              <p className="text-xs text-ink-400 mt-0.5">{t("cg.subtitle")}</p>
            </div>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-brand-600"
            >
              <PlusIcon />
              {t("cg.add")}
            </button>
          )}
        </div>

        {/* Add form */}
        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mb-4 rounded-2xl border border-white/70 bg-white/50 p-4">
                <p className="mb-3 text-xs text-ink-500">{t("cg.linkHint")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={email} type="email"
                    onChange={(e) => { setEmail(e.target.value); setLinkError(null); }}
                    placeholder={t("cg.form.email")} className="glass-input px-3 py-2 text-sm" />
                  <input value={relationship} onChange={(e) => setRelationship(e.target.value)}
                    placeholder={t("cg.form.relationship")} className="glass-input px-3 py-2 text-sm" />
                </div>

                {linkError && (
                  <p className="mt-2 text-xs font-medium text-severity-major">
                    {linkError === "not_found" ? t("cg.notFound") : t("cg.alreadyLinked")}
                  </p>
                )}

                {/* Permissions */}
                <p className="mt-3 mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                  {t("cg.permissions")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {PERMISSION_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => setPerms({ ...perms, [key]: !perms[key] })}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors border
                        ${perms[key]
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white/60 text-ink-600 border-white/80 hover:bg-white/80"}`}
                    >
                      {t(`perm.${key}`)}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setAdding(false); resetForm(); }}
                    className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-white/90"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={submitAdd}
                    disabled={!email.trim()}
                    className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed"
                  >
                    {t("cg.inviteLink")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Caregiver list */}
        {caregivers.length === 0 && !adding ? (
          <p className="text-sm text-ink-400 italic">{t("cg.empty")}</p>
        ) : (
          <div className="space-y-3">
            {caregivers.map((cg) => (
              <div key={cg.id} className="rounded-2xl border border-white/70 bg-white/55 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-white text-xs font-bold shrink-0">
                      {initials(cg.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{cg.name}</p>
                      <p className="text-xs text-ink-500 truncate">
                        {cg.relationship || t("cg.fallbackRole")} · {cg.email}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5">{t("cg.linked", { date: cg.addedAt })}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingRemove(cg)}
                    className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-medium text-severity-major transition-colors hover:bg-severity-major/10"
                  >
                    {t("cg.remove")}
                  </button>
                </div>

                {/* Permission toggles */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {PERMISSION_KEYS.map((key) => (
                    <button
                      key={key}
                      onClick={() => togglePermission(cg, key)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border
                        ${cg.permissions[key]
                          ? "bg-brand-100 text-brand-700 border-brand-200"
                          : "bg-white/40 text-ink-400 border-white/70 line-through"}`}
                    >
                      {t(`perm.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Remove confirmation */}
      <ConfirmDialog
        open={pendingRemove !== null}
        title={t("cg.revoke.title")}
        itemLabel={pendingRemove ? `${pendingRemove.name} · ${pendingRemove.email}` : ""}
        context={t("cg.revoke.context")}
        warning=""
        confirmLabel={t("cg.revoke.confirm")}
        onCancel={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </motion.div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
