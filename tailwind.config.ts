import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Dark surfaces (sidebar accents, code editor / video player).
        navy: {
          DEFAULT: "#0f172a", // slate-900
          soft: "#1e293b", // slate-800
          800: "#1e293b",
        },
        ink: { DEFAULT: "#0f172a", soft: "#1e293b" },
        // Indigo brand scale.
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        // Muted status accents (kept subtle for B2B).
        peach: { DEFAULT: "#ea580c", soft: "#ffedd5" },
        lemon: { DEFAULT: "#b45309", soft: "#fef3c7" },
        blush: { DEFAULT: "#e11d48", soft: "#ffe4e6" },
        mint: { DEFAULT: "#059669", soft: "#d1fae5" },
        sky: { DEFAULT: "#0284c7", soft: "#e0f2fe" },
      },
      backgroundImage: {
        "course-gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "3xl": "1rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        nav: "0 -1px 3px rgba(15,23,42,0.06)",
      },
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: { pop: "pop 0.18s ease-out" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
