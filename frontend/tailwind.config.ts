import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        background: "#050914",
        surface: {
          DEFAULT: "#0A1220",
          hover: "#0F1928",
          border: "#1B3045",
          elevated: "#0F1928",
        },
        border: {
          DEFAULT: "#1B3045",
          subtle: "#142333",
        },
        primary: {
          DEFAULT: "#00D9FF",
          hover: "#00B8D9",
          dim: "#003D4D",
        },
        success: "#20E0A0",
        warning: "#FFB020",
        danger: "#FF3D5A",
        forecast: "#8B5CF6",
        text: {
          primary: "#F4F8FC",
          secondary: "#91A4B8",
          muted: "#5E7187",
        },
        status: {
          normal: "#20E0A0",
          watch: "#FFB020",
          congested: "#FF7A00",
          severe: "#FF3D5A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
