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
          bg: "#0B0D0F",
          surface: "#111417",
          surfaceSecondary: "#15191D",
          surfaceElevated: "#191E23",
          border: "#262C32",
          borderLight: "#353D46",
          textPrimary: "#F2F4F5",
          textSecondary: "#9AA3AD",
          textMuted: "#68727D",
          orange: "#FF6B2C",
          "orange-hover": "#FF7A3D",
          success: "#18C784",
          warning: "#F5A524",
          error: "#EF5350",
          info: "#4C8DFF",
          // backward compatibility aliases
          ink: "#0B0D0F",
          paper: "#F2F4F5",
          graphite: "#15191D",
          blue: "#4C8DFF",
          rule: "#262C32",
          surfaceActive: "#191E23",
          surfaceHover: "#15191D",
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
