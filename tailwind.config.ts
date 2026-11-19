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
        primary: "rgb(var(--bg-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--bg-secondary-rgb) / <alpha-value>)",
        tertiary: "rgb(var(--bg-tertiary-rgb) / <alpha-value>)",
        elevated: "rgb(var(--bg-elevated-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-high": "rgb(var(--accent-high-rgb) / <alpha-value>)",
        success: "rgb(var(--success-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        warning: "rgb(var(--warning-rgb) / <alpha-value>)",
        text: {
          primary: "rgb(var(--text-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--text-tertiary-rgb) / <alpha-value>)",
          disabled: "rgb(var(--text-disabled-rgb) / <alpha-value>)",
        },
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          active: "var(--border-active)",
        },
        bg: {
          primary: "rgb(var(--bg-primary-rgb) / <alpha-value>)",
          secondary: "rgb(var(--bg-secondary-rgb) / <alpha-value>)",
          tertiary: "rgb(var(--bg-tertiary-rgb) / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated-rgb) / <alpha-value>)",
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
