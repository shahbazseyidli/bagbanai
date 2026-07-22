import type { Config } from "tailwindcss";

// D1.1 — sunlight-safe token layer. Overriding emerald-600 lifts EVERY existing bg-emerald-600 /
// text-emerald-700 usage to the accessible brand green (5:1 for white text) in one place, without
// touching each component. Semantic status tokens (700-weight) back the StatusChip + severity UI.
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          600: "#15803D", // was #059669 (3.9:1 — too low for text) → brand green 5.0:1
        },
        brand: {
          DEFAULT: "#15803D",
          dark: "#14532D",
          light: "#DCFCE7",
        },
        ink: "#0F172A",         // primary text — ~17:1 on white
        "ink-soft": "#475569",  // lightest allowed content text — 7.5:1
        warn: { DEFAULT: "#B45309", tint: "#FEF3C7" },
        bad: { DEFAULT: "#B91C1C", tint: "#FEE2E2" },
        good: { DEFAULT: "#15803D", tint: "#DCFCE7" },
        info: { DEFAULT: "#0369A1", tint: "#E0F2FE" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
