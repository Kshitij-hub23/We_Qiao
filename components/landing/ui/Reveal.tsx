"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/components/landing/motion";

/**
 * Deterministic static render for the screenshot harness (Next inlines this at dev startup).
 * Real users never set it, so they always get the scroll-reveal path.
 */
const STATIC_REVEAL = process.env.NEXT_PUBLIC_STATIC_REVEAL === "1";

/**
 * Quiet fade + rise on scroll-into-view (STYLE_GUIDE.md §7). Runs once.
 * Renders content immediately visible under reduced-motion (and for screenshots).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();

  if (STATIC_REVEAL || reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
