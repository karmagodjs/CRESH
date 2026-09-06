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
          ink: "#101214",
          paper: "#F6F5F0",
          graphite: "#25282B",
          orange: "#D86A3A",
          "orange-hover": "#C0582B",
          blue: "#4169E1",
          rule: "#D8D5CE",
          surface: "#16181A",
          surfaceActive: "#1A1C1E",
          surfaceHover: "#1F2225",
          border: "#25282B",
          borderLight: "#383D43",
          textMuted: "#8E9298",
          textSecondary: "#60646C",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
