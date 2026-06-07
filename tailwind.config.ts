import type { Config } from "tailwindcss";

/**
 * Qiáo design system — warm "coffee house" palette, Apple-inspired restraint.
 * Espresso text, mocha + terracotta accents, cream/latte surfaces.
 *
 * Token names are kept stable (brand / teal / ink / severity) so every existing
 * component restyles automatically — only the values changed from the old
 * blue/teal scheme to warm tones. Keep all colour decisions here so the whole
 * app stays on-system and the look is easy to retune later.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — warm coffee / mocha.
        brand: {
          50: "#faf4ee",
          100: "#f2e6d8",
          200: "#e6cfb5",
          300: "#d4ad84",
          400: "#bd8553",
          500: "#a3673a",
          600: "#8a5530",
          700: "#6f4327",
          800: "#5a3722",
          900: "#4a2f1f",
        },
        // Secondary accent — terracotta / burnt caramel (the "highlight" colour).
        teal: {
          50: "#fdf2ea",
          100: "#fbe1cf",
          200: "#f5c19e",
          300: "#ec9b69",
          400: "#e07a3e",
          500: "#cf6326",
          600: "#b04f1d",
          700: "#8d3f1a",
          800: "#71341a",
          900: "#5d2d18",
        },
        // Neutral surfaces / text — warm taupe → espresso.
        ink: {
          50: "#f7f2ec",
          100: "#efe7dc",
          200: "#e0d3c3",
          300: "#c8b6a0",
          400: "#a3917c",
          500: "#7d6c59",
          600: "#5f5142",
          700: "#463b30",
          800: "#2f2820",
          900: "#1f1a15",
        },
        // Severity scale for conflict cards — traffic-light coded so danger reads
        // at a glance: most severe = red, moderate = orange, minor = green.
        severity: {
          contraindicated: "#b91c1c", // deep red (most severe)
          major: "#dc2626", // red
          moderate: "#ea7c0c", // orange
          minor: "#16a34a", // green
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        // Warm brown-tinted shadows (was blue) so depth matches the palette.
        glass: "0 8px 32px rgba(74, 47, 31, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        "glass-lg": "0 20px 60px rgba(74, 47, 31, 0.18), inset 0 1px 0 rgba(255,255,255,0.65)",
        soft: "0 2px 12px rgba(74, 47, 31, 0.10)",
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
        // Elegant serif for wordmark + hero headings (BrewHub-style display type).
        display: [
          "ui-serif",
          "New York",
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
