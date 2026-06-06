"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import type { SessionUser, Role } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "./LanguageToggle";

const ROLE_COLOURS: Record<Role, string> = {
  patient: "bg-brand-100 text-brand-700",
  caretaker: "bg-teal-100 text-teal-700",
  practitioner: "bg-ink-100 text-ink-600",
  caregiver: "bg-teal-100 text-teal-700",
};

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DashboardNav({
  user,
  /** When false, the profile pill is not a link (e.g. caregivers have no own profile page). */
  profileHref = "/profile",
}: {
  user: SessionUser;
  profileHref?: string | null;
}) {
  const router = useRouter();
  const t = useT();
  const roleLabel = t(`role.${user.role}`);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const profileInner = (
    <>
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shadow-soft shrink-0"
        style={{ backgroundColor: user.avatarHex }}
      >
        {user.initials}
      </span>
      <span className="hidden sm:flex flex-col leading-tight min-w-0">
        <span className="text-sm font-semibold text-ink-800 max-w-[140px] truncate">
          {user.name}
        </span>
        <span className="text-[11px] text-ink-400">{roleLabel}</span>
      </span>
      {profileHref && (
        <span className="hidden sm:block text-ink-300 group-hover:text-brand-500 transition-colors">
          <ChevronIcon />
        </span>
      )}
    </>
  );

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

        {/* Right side — language, pretty profile button + sign out */}
        <div className="flex items-center gap-2">
          <LanguageToggle />

          {/* Role badge (mobile-only, since the pill shows the role on desktop) */}
          <span
            className={`sm:hidden inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLOURS[user.role]}`}
          >
            {roleLabel}
          </span>

          {/* Profile pill — the clickable profile button */}
          {profileHref ? (
            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
              <Link
                href={profileHref}
                className="group flex items-center gap-2.5 rounded-full border border-white/70 bg-white/60
                           pl-1.5 pr-2 sm:pr-3 py-1.5 shadow-soft backdrop-blur-md
                           hover:bg-white/85 hover:shadow-glass transition-all duration-200"
              >
                {profileInner}
              </Link>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-full border border-white/70 bg-white/60 pl-1.5 pr-2 sm:pr-3 py-1.5 shadow-soft">
              {profileInner}
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors px-2.5 py-2 rounded-xl hover:bg-white/60"
          >
            {t("common.signOut")}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
