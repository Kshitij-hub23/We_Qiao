"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { MedListCard } from "@/components/MedListCard";
import { GlassCard } from "@/components/GlassCard";
import { getSession, type SessionUser } from "@/lib/auth";
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
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const [diseases, setDiseases] = useState<string[]>([]);
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);

  // Auth guard — redirect to login if no session.
  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
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

  // List mutation helpers
  function handleAdd(kind: "diseases" | "western" | "eastern", value: string) {
    if (!user) return;
    const updated = addItem(user.id, kind, value);
    if (kind === "diseases") setDiseases(updated);
    if (kind === "western") setWestern(updated);
    if (kind === "eastern") setEastern(updated);
  }

  function handleRemove(kind: "diseases" | "western" | "eastern", value: string) {
    if (!user) return;
    const updated = removeItem(user.id, kind, value);
    if (kind === "diseases") setDiseases(updated);
    if (kind === "western") setWestern(updated);
    if (kind === "eastern") setEastern(updated);
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
        <span className="text-sm text-ink-400 animate-pulse">Loading…</span>
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
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ink-100 text-ink-500 capitalize">
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-ink-500">
                  Age <span className="font-semibold text-ink-700">{user.age}</span>
                  {" · "}
                  <span className="text-ink-500">{user.email}</span>
                </p>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Stat label="Conditions" value={diseases.length} colour="#8a5530" />
                  <Stat label="Western meds" value={western.length} colour="#b04f1d" />
                  <Stat label="TCM medicines" value={eastern.length} colour="#c98a2b" />
                  <Stat label="Total medicines" value={totalMeds} colour="#7d6c59" />
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
                  Check interactions
                  <ArrowRightIcon />
                </motion.button>
                {(western.length === 0 || eastern.length === 0) && (
                  <p className="text-[11px] text-ink-400 mt-1.5 text-center max-w-[180px]">
                    Add both WM and TCM medicines to run a check
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
            title="Medical conditions"
            subtitle="Diagnoses and ongoing conditions"
            accentClass="bg-brand-100 text-brand-700"
            dotColour="#8a5530"
            items={diseases}
            placeholder="e.g. Hypertension"
            emptyLabel="No conditions recorded yet."
            onAdd={(v) => handleAdd("diseases", v)}
            onRemove={(v) => handleRemove("diseases", v)}
          />

          <MedListCard
            title="Western medicines"
            subtitle="Conventional pharmaceutical drugs"
            accentClass="bg-teal-100 text-teal-700"
            dotColour="#b04f1d"
            items={western}
            placeholder="e.g. Warfarin"
            emptyLabel="No Western medicines recorded yet."
            onAdd={(v) => handleAdd("western", v)}
            onRemove={(v) => handleRemove("western", v)}
          />

          <MedListCard
            title="Chinese medicines (TCM)"
            subtitle="Herbs, formulas and supplements"
            accentClass="bg-brand-100 text-brand-700"
            dotColour="#c98a2b"
            items={eastern}
            placeholder="e.g. Danshen"
            emptyLabel="No TCM medicines recorded yet."
            onAdd={(v) => handleAdd("eastern", v)}
            onRemove={(v) => handleRemove("eastern", v)}
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
                  Add a new prescription
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Upload or paste a prescription — OCR extraction coming soon. Run a full
                  conflict check with your updated medicine list.
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
          Qiáo surfaces known, sourced interactions and hands the decision to a human.
          It is a reconciliation tool — not a diagnosis, and not medical advice.
        </p>
      </main>
    </>
  );
}

/* ── Stat chip ────────────────────────────────────────────────────── */
function Stat({
  label,
  value,
  colour,
}: {
  label: string;
  value: number;
  colour: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-white/60 border border-white/70
                    px-3 py-1.5 rounded-full shadow-soft">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: colour }}
      />
      <span className="text-xs font-semibold text-ink-800">{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  );
}
