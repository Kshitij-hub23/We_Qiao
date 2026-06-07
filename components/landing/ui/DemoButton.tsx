"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { APP_LOGIN_URL } from "@/components/landing/config";
import { SPRING } from "@/components/landing/motion";

const SIZES = {
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
} as const;

/**
 * The most important CTA on the page. Points at NEXT_PUBLIC_APP_LOGIN_URL and opens in the
 * SAME tab, so the browser back button returns to the landing page mid-pitch (spec §7).
 */
export function DemoButton({
  size = "md",
  label = "See Live Demo",
  className = "",
}: {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  return (
    <motion.a
      href={APP_LOGIN_URL}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 font-semibold text-white shadow-soft transition-colors duration-200 hover:bg-brand-600 ${SIZES[size]} ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </motion.a>
  );
}
