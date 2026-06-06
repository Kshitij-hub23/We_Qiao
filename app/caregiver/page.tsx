"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { GlassCard } from "@/components/GlassCard";
import { getSession, type SessionUser } from "@/lib/auth";
import { getProfile, type PatientProfile } from "@/lib/profile";
import { getItems } from "@/lib/user-records";
import {
  getCaregivers,
  type CaregiverPermissions,
} from "@/lib/caregivers";

export default function CaregiverPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [perms, setPerms] = useState<CaregiverPermissions | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [diseases, setDiseases] = useState<string[]>([]);
  const [western, setWestern] = useState<string[]>([]);
  const [eastern, setEastern] = useState<string[]>([]);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    // Only caregivers belong here; everyone else has their own dashboard.
    if (session.role !== "caregiver" || !session.linkedPatientId) {
      router.replace("/dashboard");
      return;
    }

    const patientId = session.linkedPatientId;
    // Resolve this caregiver's permissions from the patient's caregiver list.
    const me = getCaregivers(patientId).find((c) => c.email === session.email);
    setPerms(me?.permissions ?? null);

    setProfile(getProfile(patientId));
    setAllergies(getItems(patientId, "allergies"));
    setDiseases(getItems(patientId, "diseases"));
    setWestern(getItems(patientId, "western"));
    setEastern(getItems(patientId, "eastern"));
    setUser(session);
    setMounted(true);
  }, [router]);

  if (!mounted || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-ink-400 animate-pulse">Loading…</span>
      </div>
    );
  }

  const can = (k: keyof CaregiverPermissions) => perms?.[k] ?? false;

  return (
    <>
      <DashboardNav user={user} profileHref={null} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Context banner */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard strong className="p-6 sm:p-7">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
              Viewing patient record as caregiver
            </p>
            <h1 className="font-display text-3xl font-bold text-ink-900 tracking-tight mt-1">
              {profile.fullName}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              <span className="font-mono text-brand-800">{profile.patientId}</span>
              {profile.dateOfBirth && <> · DOB {profile.dateOfBirth}</>}
              {profile.bloodGroup && <> · {profile.bloodGroup}</>}
            </p>
            <p className="mt-3 text-xs text-ink-400">
              You have read-only access to the sections permitted by {profile.fullName.split(" ")[0]}.
            </p>
          </GlassCard>
        </motion.div>

        {/* Profile & contact */}
        {can("profile") && (
          <ReadSection title="Profile & contact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <ReadField label="Gender" value={profile.gender} />
              <ReadField label="Phone" value={profile.phone} />
              <ReadField label="Email" value={profile.email} />
              <ReadField label="Address" value={profile.address} className="sm:col-span-2" />
              <ReadField label="Emergency contact"
                value={`${profile.emergencyContactName} (${profile.emergencyContactRelation}) · ${profile.emergencyContactPhone}`} />
            </div>
          </ReadSection>
        )}

        {/* Medication schedule */}
        {can("medications") && (
          <ReadSection title="Current medications">
            <ChipList label="Western medicines" items={western} />
            <ChipList label="Chinese medicines (TCM)" items={eastern} />
          </ReadSection>
        )}

        {/* Prescriptions */}
        {can("prescriptions") && (
          <ReadSection title="Prescriptions">
            <p className="text-sm text-ink-400 italic">
              No uploaded prescription files on record. Medication lists are shown under
              “Current medications”.
            </p>
          </ReadSection>
        )}

        {/* Medical history */}
        {can("history") && (
          <ReadSection title="Medical history">
            <ChipList label="Allergies" items={allergies} />
            <ChipList label="Conditions" items={diseases} />
          </ReadSection>
        )}

        {!can("profile") && !can("medications") && !can("prescriptions") && !can("history") && (
          <GlassCard className="p-6">
            <p className="text-sm text-ink-500">
              You don’t currently have permission to view any sections of this record.
              Please ask the patient to grant access.
            </p>
          </GlassCard>
        )}

        <p className="text-center text-[11px] text-ink-400 leading-relaxed max-w-md mx-auto pb-4">
          Read-only caregiver access. Qiáo is a reconciliation tool — not a diagnosis,
          and not medical advice.
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
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400 mb-1.5">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400 italic">None recorded.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={item}
              className="inline-flex items-center gap-1.5 bg-white/70 border border-white/80 text-ink-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-900" />
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
