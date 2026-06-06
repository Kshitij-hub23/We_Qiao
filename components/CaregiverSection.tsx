"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  getCaregivers,
  addCaregiver,
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
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Caregiver | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [perms, setPerms] = useState<CaregiverPermissions>({ ...DEFAULT_PERMISSIONS });

  // The credential to reveal once after creating a caregiver.
  const [newCredential, setNewCredential] = useState<Caregiver | null>(null);

  useEffect(() => {
    setCaregivers(getCaregivers(patientUserId));
  }, [patientUserId]);

  function resetForm() {
    setName("");
    setEmail("");
    setRelationship("");
    setPerms({ ...DEFAULT_PERMISSIONS });
  }

  function submitAdd() {
    if (!name.trim() || !email.trim()) return;
    const created = addCaregiver(patientUserId, patientName, {
      name,
      email,
      relationship,
      permissions: perms,
    });
    setCaregivers(getCaregivers(patientUserId));
    setNewCredential(created);
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
              <h2 className="text-base font-semibold text-ink-800">Caregivers</h2>
              <p className="text-xs text-ink-400 mt-0.5">
                Trusted people who can view your record
              </p>
            </div>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-brand-600"
            >
              <PlusIcon />
              Add caregiver
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Full name" className="glass-input px-3 py-2 text-sm" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (login)" className="glass-input px-3 py-2 text-sm" />
                  <input value={relationship} onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Relationship" className="glass-input px-3 py-2 text-sm" />
                </div>

                {/* Permissions */}
                <p className="mt-3 mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                  Access permissions
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
                      {PERMISSION_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => { setAdding(false); resetForm(); }}
                    className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-white/90"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitAdd}
                    disabled={!name.trim() || !email.trim()}
                    className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-600 disabled:bg-ink-300 disabled:cursor-not-allowed"
                  >
                    Invite & link
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Caregiver list */}
        {caregivers.length === 0 && !adding ? (
          <p className="text-sm text-ink-400 italic">No caregivers linked yet.</p>
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
                        {cg.relationship || "Caregiver"} · {cg.email}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-0.5">Linked {cg.addedAt}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingRemove(cg)}
                    className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-medium text-severity-major transition-colors hover:bg-severity-major/10"
                  >
                    Remove
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
                      {PERMISSION_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* One-time credential reveal */}
      <ConfirmDialog
        open={newCredential !== null}
        tone="info"
        hideCancel
        title="Caregiver invited & linked"
        itemLabel={newCredential ? `${newCredential.name} · ${newCredential.email}` : ""}
        context={
          newCredential
            ? `Temporary password: ${newCredential.password} — share this securely. They sign in at the login page with their email and this password.`
            : ""
        }
        confirmLabel="Done"
        onCancel={() => setNewCredential(null)}
        onConfirm={() => setNewCredential(null)}
      />

      {/* Remove confirmation */}
      <ConfirmDialog
        open={pendingRemove !== null}
        title="Revoke caregiver access"
        itemLabel={pendingRemove ? `${pendingRemove.name} · ${pendingRemove.email}` : ""}
        context="They will immediately lose access and will no longer be able to sign in to view this record."
        warning=""
        confirmLabel="Revoke access"
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
