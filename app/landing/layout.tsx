import type { Metadata } from "next";
import "./landing.css";
import { Providers } from "@/components/landing/Providers";
import { BackgroundOrbs } from "@/components/landing/ui/BackgroundOrbs";

export const metadata: Metadata = {
  title: "Qiáo · 橋, the safety bridge between Eastern and Western care",
  description:
    "Qiáo reconciles a patient's Traditional Chinese Medicine and Western Medicine records and flags dangerous herb-drug interactions the two siloed systems miss.",
};

/**
 * Nested layout for the marketing landing page (route: /landing). The app's root
 * layout already provides <html>/<body>, the warm background, and LanguageProvider;
 * this only adds the landing's decorative orbs + Framer reduced-motion config.
 */
export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <BackgroundOrbs />
      {children}
    </Providers>
  );
}
