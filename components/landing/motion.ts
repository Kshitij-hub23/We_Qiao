import type { Transition } from "framer-motion";

/** Custom ease-out from STYLE_GUIDE.md §7, quiet, premium entrances. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Spring used by buttons/pills on hover/tap (STYLE_GUIDE.md §7). */
export const SPRING: Transition = { type: "spring", stiffness: 400, damping: 25 };
