"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  patient: "Patient",
  caretaker: "Caretaker",
  practitioner: "Practitioner",
};

const ROLE_COLOURS: Record<SessionUser["role"], string> = {
  patient: "bg-brand-100 text-brand-700",
  caretaker: "bg-teal-100 text-teal-700",
  practitioner: "bg-ink-100 text-ink-600",
};

export function DashboardNav({ user }: { user: SessionUser }) {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 w-full glass border-b border-white/50"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="font-display text-xl font-bold text-ink-900 tracking-tight leading-none">
            Qiáo <span className="text-brand-500">·</span> 橋
          </span>
        </Link>

        {/* Right side — user pill + logout */}
        <div className="flex items-center gap-3">
          {/* Role badge */}
          <span
            className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLOURS[user.role]}`}
          >
            {ROLE_LABEL[user.role]}
          </span>

          {/* Avatar + name */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shadow-soft shrink-0"
              style={{ backgroundColor: user.avatarHex }}
            >
              {user.initials}
            </span>
            <span className="hidden sm:block text-sm font-medium text-ink-700 max-w-[140px] truncate">
              {user.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors px-2 py-1 rounded-lg hover:bg-white/50"
          >
            Sign out
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
