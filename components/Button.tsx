"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-white shadow-soft hover:bg-brand-600 disabled:bg-ink-300 disabled:shadow-none",
  secondary:
    "bg-white/70 text-ink-800 border border-white/80 backdrop-blur-md hover:bg-white/90 disabled:opacity-50",
  ghost: "text-ink-600 hover:bg-white/50 disabled:opacity-50",
};

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      whileHover={disabled ? undefined : { y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
        transition-colors duration-200 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
