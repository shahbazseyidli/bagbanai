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
        // W2 redesign palette (approved mockup) — used by the marketing surface + app shell.
        paper: { DEFAULT: "#F6F4EF", 2: "#EFEAE2" },
        panel: { DEFAULT: "#FFFFFF", 2: "#F3EFE8" },
        line: { DEFAULT: "#E4DFD5", 2: "#D7D0C4" },
        teal: { DEFAULT: "#0B4040" },
        mint: { DEFAULT: "#8DE0A9", soft: "#E7F6EC" },
        grass: { DEFAULT: "#1E9852", deep: "#14663A" },
      },
      borderRadius: { xl2: "20px" },
      boxShadow: {
        soft: "0 1px 2px rgba(20,15,10,.05), 0 8px 26px rgba(20,15,10,.07)",
        lift: "0 20px 60px rgba(20,15,10,.14)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Display face for the redesign (headlines, brand). Body stays Inter.
        display: ["var(--font-display)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
