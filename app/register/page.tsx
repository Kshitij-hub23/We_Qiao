"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { login, landingFor } from "@/lib/auth";
import { registerAccount, type AccountRole } from "@/lib/accounts";
import { DEMO_USERS } from "@/lib/demo-users";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

const ROLES: { role: AccountRole; titleKey: string; descKey: string; hex: string }[] = [
  { role: "patient", titleKey: "register.role.patient", descKey: "register.role.patientDesc", hex: "#a3673a" },
  { role: "caretaker", titleKey: "register.role.caretaker", descKey: "register.role.caretakerDesc", hex: "#cf6326" },
  { role: "practitioner", titleKey: "register.role.practitioner", descKey: "register.role.practitionerDesc", hex: "#7d6c59" },
];

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();

  const [role, setRole] = useState<AccountRole | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setAge(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 350));

    const lower = email.trim().toLowerCase();
    const clash = DEMO_USERS.some((u) => u.email.toLowerCase() === lower);
    const result = clash
      ? ({ ok: false, error: "email_taken" } as const)
      : registerAccount({
          name,
          email,
          password,
          role,
          age: role === "patient" && age ? Number(age) : undefined,
        });

    if (!result.ok) {
      setLoading(false);
      setError(t("register.emailTaken"));
      return;
    }

    // Auto sign-in with the new credentials and land on the right home page.
    const user = login(email, password);
    setLoading(false);
    if (user) {
      router.push(landingFor(user));
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-4 flex justify-end">
          <LanguageToggle />
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-ink-900 tracking-tight">
            Qiáo <span className="text-brand-500">·</span> 橋
          </h1>
          <p className="mt-2 text-sm text-ink-500">{t("register.subtitle")}</p>
        </div>

        <GlassCard strong className="p-8">
          <AnimatePresence mode="wait">
            {!role ? (
              /* Step 1 — role chooser */
              <motion.div
                key="roles"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-xl font-semibold text-ink-800">{t("register.title")}</h2>
                <p className="text-sm text-ink-500 mt-1 mb-6">{t("register.subtitle")}</p>

                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => { resetForm(); setRole(r.role); }}
                      className="w-full text-left flex items-center gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 transition-colors hover:bg-white/80"
                    >
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                        style={{ backgroundColor: r.hex }}
                      >
                        {t(`role.${r.role}`).slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink-800">{t(r.titleKey)}</span>
                        <span className="block text-xs text-ink-500">{t(r.descKey)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* Step 2 — role-specific form */
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  type="button"
                  onClick={() => setRole(null)}
                  className="text-sm text-ink-500 hover:text-ink-800 transition-colors"
                >
                  {t("register.back")}
                </button>
                <h2 className="mt-2 text-xl font-semibold text-ink-800">{t(`register.role.${role}`)}</h2>
                <p className="text-sm text-ink-500 mt-1 mb-6">{t("register.title")}</p>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <Field label={t("register.name")} value={name} onChange={setName}
                    type="text" autoComplete="name" required />
                  <Field label={t("register.email")} value={email} onChange={setEmail}
                    type="email" autoComplete="email" required />
                  <Field label={t("register.password")} value={password} onChange={setPassword}
                    type="password" autoComplete="new-password" required />
                  {role === "patient" && (
                    <Field label={t("register.age")} value={age} onChange={setAge}
                      type="number" autoComplete="off" />
                  )}

                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-medium" style={{ color: "#c0561f" }}>
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim() || !password}
                    className="w-full mt-1"
                  >
                    {loading ? t("register.submitting") : t("register.submit")}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <p className="text-center text-sm text-ink-500 mt-5">
          {t("register.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            {t("register.signIn")}
          </Link>
        </p>
      </motion.div>
    </main>
  );
}

function Field({
  label, value, onChange, type, autoComplete, required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600 mb-1.5">{label}</label>
      <input
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="glass-input w-full px-4 py-3 text-sm"
      />
    </div>
  );
}
