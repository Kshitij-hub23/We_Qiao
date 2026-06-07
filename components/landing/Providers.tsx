"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Wraps the app so all Framer Motion respects the user's reduced-motion preference
 * (STYLE_GUIDE.md §7). CSS keyframes are handled separately in globals.css.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
