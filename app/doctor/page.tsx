"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { GlassCard } from "@/components/GlassCard";
import { getSession, type SessionUser } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { getDoctorPatients, type RosterPatient } from "@/lib/patients";

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function DoctorPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [patients, setPatients] = useState<RosterPatient[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace("/login"); return; }
    if (session.role !== "practitioner") {
      router.replace(session.role === "caregiver" ? "/caregiver" : "/dashboard");
      return;
    }
    setUser(session);
    setPatients(getDoctorPatients(session.id));
    setMounted(true);
  }, [router]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-ink-400 animate-pulse">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <DashboardNav user={user} profileHref={null} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight">
            {t("doctor.title")}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {t("doctor.subtitle")} · {t("doctor.count", { n: patients.length })}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {patients.map((p, i) => (
            <motion.button
              key={p.userId}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => router.push(`/doctor/${p.userId}`)}
              className="text-left"
            >
              <GlassCard className="p-5 flex items-center gap-4 hover:bg-white/70 transition-colors">
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-full text-white text-sm font-bold shadow-soft shrink-0"
                  style={{ backgroundColor: p.avatarHex }}
                >
                  {p.initials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{p.name}</p>
                  <p className="text-xs text-ink-400 font-mono">{p.patientId}</p>
                  <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-ink-500">
                    <span>{t("dash.age")} {p.age}</span>
                    <span className="text-ink-300">·</span>
                    <span>{p.conditionCount} {t("stat.conditions")}</span>
                    <span className="text-ink-300">·</span>
                    <span>{p.medicineCount} {t("stat.total")}</span>
                  </div>
                </div>
                <span className="text-ink-300 shrink-0"><ChevronIcon /></span>
              </GlassCard>
            </motion.button>
          ))}

          {patients.length === 0 && (
            <p className="text-sm text-ink-400 italic">{t("doctor.empty")}</p>
          )}
        </div>

        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          {t("disclaimer.recon")}
        </p>
      </main>
    </>
  );
}
