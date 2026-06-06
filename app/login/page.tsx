"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { login, getSession } from "@/lib/auth";
import { DEMO_USERS } from "@/lib/demo-users";

/* ── Inline SVG icons (no external dep) ─────────────────────────── */
function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
/* ─────────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, skip straight to dashboard.
  useEffect(() => {
    if (getSession()) router.replace("/dashboard");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Brief artificial delay so the loading state is perceptible.
    await new Promise((r) => setTimeout(r, 350));

    const user = login(email, password);
    setLoading(false);

    if (!user) {
      setError("Incorrect email or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo lockup */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-ink-900 tracking-tight">
            Qiáo <span className="text-brand-500">·</span> 橋
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Medication safety bridge — TCM × Western
          </p>
        </div>

        {/* Login card */}
        <GlassCard strong className="p-8">
          <h2 className="text-xl font-semibold text-ink-800">Sign in</h2>
          <p className="text-sm text-ink-500 mt-1 mb-6">
            Access your health record
          </p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-ink-600 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="glass-input w-full px-4 py-3 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-ink-600 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full px-4 py-3 pr-12 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400
                             hover:text-ink-600 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium"
                style={{ color: "#c0561f" }}
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full mt-1"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </Button>
          </form>
        </GlassCard>

        {/* Demo credentials */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 p-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-white/60"
        >
          <p className="text-xs font-semibold text-ink-500 mb-3 uppercase tracking-wide">
            Demo accounts
          </p>
          <div className="space-y-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setEmail(u.email);
                  setPassword(u.password);
                  setError("");
                }}
                className="w-full text-left flex items-center gap-2.5 py-1 px-1 rounded-lg
                           hover:bg-white/50 transition-colors"
              >
                <span
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full
                             text-white font-bold text-[10px] shrink-0"
                  style={{ backgroundColor: u.avatarHex }}
                >
                  {u.initials}
                </span>
                <span className="text-xs text-ink-700 font-medium">{u.name}</span>
                <span className="text-xs text-ink-400 ml-auto capitalize">{u.role}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-3 border-t border-white/60 pt-2.5">
            Password for all accounts:{" "}
            <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded-md">
              demo123
            </code>
            {" "}· Click a name to auto-fill.
          </p>
        </motion.div>

        {/* Disclaimer */}
        <p className="text-center text-[11px] text-ink-400 mt-6 leading-relaxed max-w-xs mx-auto">
          Qiáo uses synthetic demo data only. Not a diagnostic tool.
        </p>
      </motion.div>
    </main>
  );
}
