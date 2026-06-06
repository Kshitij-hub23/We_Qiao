import type { Config } from "tailwindcss";

/**
 * Qiáo design system — Apple "Liquid Glass" inspired, healthcare palette.
 * Soft blues + teal accents on white / off-white, light-gray neutrals.
 * Keep tokens here so every component stays on-system and the look is easy
 * to retune later.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — calm clinical blue.
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec5ff",
          400: "#59a4ff",
          500: "#3182f6",
          600: "#1f63db",
          700: "#1a4eb0",
          800: "#1c438c",
          900: "#1c3a72",
        },
        // Teal accent.
        teal: {
          50: "#edfcf7",
          100: "#d2f7ec",
          200: "#a8eedd",
          300: "#6fdec9",
          400: "#39c6b0",
          500: "#17aa97",
          600: "#0d8a7c",
          700: "#0f6e65",
          800: "#115852",
          900: "#124945",
        },
        // Neutral surfaces / text.
        ink: {
          50: "#f7f9fc",
          100: "#eef2f7",
          200: "#dfe5ee",
          300: "#c5cedd",
          400: "#94a1b8",
          500: "#647088",
          600: "#475066",
          700: "#343c4f",
          800: "#222838",
          900: "#141824",
        },
        // Severity scale for conflict cards.
        severity: {
          contraindicated: "#b4232a",
          major: "#e0552b",
          moderate: "#d6932a",
          minor: "#4a8fb3",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(28, 58, 114, 0.10), inset 0 1px 0 rgba(255,255,255,0.55)",
        "glass-lg": "0 20px 60px rgba(28, 58, 114, 0.16), inset 0 1px 0 rgba(255,255,255,0.6)",
        soft: "0 2px 12px rgba(28, 58, 114, 0.08)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "float-slow": "float-slow 12s ease-in-out infinite",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
