"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/landing/ui/Wordmark";
import { DemoButton } from "@/components/landing/ui/DemoButton";

/** Sticky frosted nav (STYLE_GUIDE.md §6). The demo CTA is always reachable mid-pitch. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`border-b border-white/50 bg-[rgba(253,250,244,0.65)] backdrop-blur-xl transition-shadow duration-300 ${
          scrolled ? "shadow-soft" : ""
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a
            href="#top"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
            aria-label="Qiáo, back to top"
          >
            <Wordmark />
          </a>
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#how-it-works"
              className="hidden rounded-lg px-2 py-1 text-sm text-ink-600 transition-colors hover:text-ink-900 sm:inline-block"
            >
              How it works
            </a>
            <DemoButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
