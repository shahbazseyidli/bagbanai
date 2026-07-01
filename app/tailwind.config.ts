import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#059669", // emerald-600
          dark: "#047857",
          light: "#d1fae5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
