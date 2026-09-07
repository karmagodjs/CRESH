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
          bg: "#101214",
          surface: "#171A1D",
          surfaceSecondary: "#1A1E22",
          surfaceElevated: "#1C2024",
          headerBg: "#15171A",
          headerBorder: "#292D32",
          border: "#2A2F35",
          borderLight: "#373D44",
          textPrimary: "#F4F5F6",
          textSecondary: "#A2A9B1",
          textMuted: "#727A84",
          orange: "#FF6B2C",
          "orange-hover": "#FF7A3D",
          success: "#18C784",
          warning: "#F5A524",
          error: "#EF5350",
          info: "#4C8DFF",
          // backward compatibility aliases
          ink: "#101214",
          paper: "#F4F5F6",
          graphite: "#1A1E22",
          blue: "#4C8DFF",
          rule: "#2A2F35",
          surfaceActive: "#1C2024",
          surfaceHover: "#1A1E22",
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
