import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        primary: "#A88A5A",
        dark: "#292722",
        secondary: "#D8C8AD",
        card: "#FFFFFF",
        text: "#3A3834",
        muted: "#8B877F",
        // Extra tokens for the Room Detail page (availability calendar,
        // panel backgrounds, dark CTA buttons) - kept separate from the
        // core earth-tone palette above so existing pages are unaffected.
        panel: "#EEF0F2",
        outline: "#E3E6EA",
        booked: "#F97316",
        booked2: "#EF4444",
        cta: "#14141A",
      },
      borderRadius: {
        card: "20px",
        control: "12px",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(41, 39, 34, 0.08)",
      },
      fontFamily: {
        heading: ["var(--font-active)", "sans-serif"],
        body: ["var(--font-active)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
