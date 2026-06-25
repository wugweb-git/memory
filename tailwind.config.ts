import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: "var(--bg-primary)",
        secondary: "var(--bg-secondary)",
        tertiary: "var(--bg-tertiary)",
        elevated: "var(--bg-elevated)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        success: "var(--success)",
        danger: "var(--danger)",
        warning: "var(--warning)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          disabled: "var(--text-disabled)",
        },
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          active: "var(--border-active)",
        },
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          elevated: "var(--bg-elevated)",
        }
      },
      fontSize: {
        "2xs": ["var(--font-2xs)", { lineHeight: "1.3" }],
        xs: ["var(--font-xs)", { lineHeight: "1.4" }],
        sm: ["var(--font-sm)", { lineHeight: "1.5" }],
        base: ["var(--font-base)", { lineHeight: "1.6" }],
        md: ["var(--font-md)", { lineHeight: "1.6" }],
        lg: ["var(--font-lg)", { lineHeight: "1.4" }],
        xl: ["var(--font-xl)", { lineHeight: "1.3" }],
        "2xl": ["var(--font-2xl)", { lineHeight: "1.2" }],
        "3xl": ["var(--font-3xl)", { lineHeight: "1.15" }],
        "4xl": ["var(--font-4xl)", { lineHeight: "1.1" }],
        "5xl": ["var(--font-5xl)", { lineHeight: "1.05" }],
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
