"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useT } from "@/lib/i18n";

/**
 * Front door. For now the root path always sends the user to the login screen —
 * it clears any existing session first so the demo always starts at sign-in.
 * (To go back to "stay signed in" behaviour, replace the body with a redirect to
 * landingFor(getSession()) when a session exists.) The checker tool is /check.
 */
export default function Home() {
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    logout();
    router.replace("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="animate-pulse text-sm text-ink-400">{t("common.loading")}</span>
    </div>
  );
}
