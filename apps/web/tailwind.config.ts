import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: { DEFAULT: "#0e6b46", deep: "#0a4f34", dark: "#082c1f" },
        chalk: "#f3f6f2",
        paper: "#eef1ec",
        card: "#ffffff",
        ink: "#13201a",
        muted: "#5f6f66",
        line: "#dde4dd",
        clay: { DEFAULT: "#c0492f", soft: "#fbeae5" },
        gold: { DEFAULT: "#b8860b", soft: "#f7efd6" },
        blue: "#256364",
      },
      fontFamily: {
        display: ["var(--font-oswald)", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "14px" },
      boxShadow: { card: "0 1px 2px rgba(8,44,31,.06), 0 8px 24px rgba(8,44,31,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
