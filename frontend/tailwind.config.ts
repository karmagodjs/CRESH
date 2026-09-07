import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cri: {
          bg: "var(--bg)",
          surface: "var(--surface)",
          surfaceSecondary: "var(--surface-secondary)",
          surfaceElevated: "var(--surface-elevated)",
          headerBg: "var(--surface-header)",
          headerBorder: "var(--border)",
          border: "var(--border)",
          borderLight: "var(--border-subtle)",
          textPrimary: "var(--text-primary)",
          textSecondary: "var(--text-secondary)",
          textMuted: "var(--text-muted)",
          orange: "var(--accent)",
          "orange-hover": "var(--accent-hover)",
          success: "var(--success)",
          warning: "var(--warning)",
          error: "var(--error)",
          info: "var(--info)",
          ink: "var(--bg)",
          paper: "var(--text-primary)",
          graphite: "var(--surface-secondary)",
          blue: "var(--info)",
          rule: "var(--border)",
          surfaceActive: "var(--surface-elevated)",
          surfaceHover: "var(--surface-hover)",
        },
      },
      borderRadius: {
        control: "8px",
        input: "10px",
        card: "12px",
        container: "16px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
