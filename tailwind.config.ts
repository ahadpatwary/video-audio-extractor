import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#10131A",
        surface: "#161B24",
        "surface-raised": "#1D2430",
        border: "#29313F",
        ink: {
          primary: "#EDEFF3",
          secondary: "#8D97A8",
          muted: "#5B6472",
        },
        signal: {
          DEFAULT: "#E8A23D",
          strong: "#F5B25C",
        },
        success: "#4FD1C5",
        danger: "#E8604C",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      maxWidth: {
        content: "760px",
      },
      keyframes: {
        "bar-pulse": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "bar-pulse": "bar-pulse 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
