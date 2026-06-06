"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { MedListCard } from "@/components/MedListCard";
import { GlassCard } from "@/components/GlassCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getSession, type SessionUser } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import {
  getItems,
  addItem,
  removeItem,
  seedIfEmpty,
} from "@/lib/user-records";

/* ── Seed data shown for the hero demo user ───────────────────────── */
const ELEANOR_SEED = {
  diseases: ["Atrial fibrillation", "Type 2 diabetes", "Hypertension"],
  western: ["Warfarin", "Metformin", "Amlodipine"],
  eastern: ["Danshen", "Dong quai"],
};

type ListKind = "diseases" | "western" | "eastern";

/* ── Inline SVG icons ─────────────────────────────────────────────── */
function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const [diseases, setDiseases] = useState<string[]>([]);
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);

  // Pending deletion (drives the two-step confirmation modal).
  const [pendingDelete, setPendingDelete] = useState<{ kind: ListKind; item: string } | null>(null);

  // Auth guard — redirect to login if no session; caregivers go to their own view.
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role === "caregiver") {
      router.replace("/caregiver");
      return;
    }

    // Seed demo data for Eleanor on first login.
    if (session.id === "u1") seedIfEmpty(session.id, ELEANOR_SEED);

    setUser(session);
    setDiseases(getItems(session.id, "diseases"));
    setWestern(getItems(session.id, "western"));
    setEastern(getItems(session.id, "eastern"));
    setMounted(true);
  }, [router]);

  function setList(kind: ListKind, items: string[]) {
    if (kind === "diseases") setDiseases(items);
    if (kind === "western") setWestern(items);
    if (kind === "eastern") setEastern(items);
  }

  function handleAdd(kind: ListKind, value: string) {
    if (!user) return;
    setList(kind, addItem(user.id, kind, value));
  }

  // Step 1: request removal → open the confirmation modal.
  function requestRemove(kind: ListKind, value: string) {
    setPendingDelete({ kind, item: value });
  }

  // Step 2: confirmed → actually delete.
  function confirmRemove() {
    if (!user || !pendingDelete) return;
    setList(pendingDelete.kind, removeItem(user.id, pendingDelete.kind, pendingDelete.item));
    setPendingDelete(null);
  }

  // Store prefill in sessionStorage so the conflict checker can pick it up.
  function goCheck() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "qiao:prefill",
        JSON.stringify({ western, eastern }),
      );
    }
    router.push("/");
  }

  // Render a minimal loading screen server-side / before hydration.
  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-ink-400 animate-pulse">{t("common.loading")}</span>
      </div>
    );
  }

  const totalMeds = western.length + eastern.length;

  return (
    <>
      <DashboardNav user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Profile hero card ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard strong className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                <span
                  className="flex items-center justify-center w-20 h-20 rounded-full
                             text-white text-2xl font-bold shadow-glass-lg"
                  style={{ backgroundColor: user.avatarHex }}
                >
                  {user.initials}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight">
                    {user.name}
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ink-100 text-ink-500">
                    {t(`role.${user.role}`)}
                  </span>
                </div>
                <p className="text-sm text-ink-500">
                  {t("dash.age")} <span className="font-semibold text-ink-700">{user.age}</span>
                  {" · "}
                  <span className="text-ink-500">{user.email}</span>
                </p>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Stat label={t("stat.conditions")} value={diseases.length} />
                  <Stat label={t("stat.western")} value={western.length} />
                  <Stat label={t("stat.tcm")} value={eastern.length} />
                  <Stat label={t("stat.total")} value={totalMeds} />
                </div>
              </div>

              {/* Check CTA */}
              <div className="shrink-0 self-start sm:self-center">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  onClick={goCheck}
                  disabled={western.length === 0 || eastern.length === 0}
                  className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-ink-300
                             text-white font-semibold text-sm px-5 py-3 rounded-2xl shadow-soft
                             transition-colors disabled:cursor-not-allowed"
                >
                  <ShieldIcon />
                  {t("dash.checkInteractions")}
                  <ArrowRightIcon />
                </motion.button>
                {(western.length === 0 || eastern.length === 0) && (
                  <p className="text-[11px] text-ink-400 mt-1.5 text-center max-w-[180px]">
                    {t("dash.checkHint")}
                  </p>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Three-column list grid ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <MedListCard
            title={t("card.conditions.title")}
            subtitle={t("card.conditions.subtitle")}
            items={diseases}
            placeholder={t("card.conditions.placeholder")}
            emptyLabel={t("card.conditions.empty")}
            onAdd={(v) => handleAdd("diseases", v)}
            onRemove={(v) => requestRemove("diseases", v)}
          />

          <MedListCard
            title={t("card.western.title")}
            subtitle={t("card.western.subtitle")}
            items={western}
            placeholder={t("card.western.placeholder")}
            emptyLabel={t("card.western.empty")}
            onAdd={(v) => handleAdd("western", v)}
            onRemove={(v) => requestRemove("western", v)}
          />

          <MedListCard
            title={t("card.tcm.title")}
            subtitle={t("card.tcm.subtitle")}
            items={eastern}
            placeholder={t("card.tcm.placeholder")}
            emptyLabel={t("card.tcm.empty")}
            onAdd={(v) => handleAdd("eastern", v)}
            onRemove={(v) => requestRemove("eastern", v)}
          />
        </motion.div>

        {/* ── Add prescription banner ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/" className="block group">
            <div className="glass rounded-3xl p-5 flex items-center justify-between gap-4
                            hover:bg-white/65 transition-colors duration-200 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-ink-800">
                  {t("dash.addRx.title")}
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  {t("dash.addRx.subtitle")}
                </p>
              </div>
              <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                               bg-brand-100 text-brand-600 group-hover:bg-brand-500
                               group-hover:text-white transition-colors">
                <ArrowRightIcon />
              </span>
            </div>
          </Link>
        </motion.div>

        {/* ── Disclaimer ──────────────────────────────────────────── */}
        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          {t("disclaimer.recon")}
        </p>
      </main>

      {/* Two-step delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete ? t(`confirm.deleteNoun.${pendingDelete.kind}`) : ""}
        itemLabel={pendingDelete?.item ?? ""}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
}

/* ── Stat chip — single standardized dark-brown indicator ─────────── */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/60 border border-white/70
                    px-3 py-1.5 rounded-full shadow-soft">
      <span className="w-2 h-2 rounded-full shrink-0 bg-brand-900" />
      <span className="text-xs font-semibold text-ink-800">{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  );
}
