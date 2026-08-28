import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          500: "#1d6fe0",
          600: "#1657b3",
          700: "#0f4287"
        },
        warn: {
          500: "#e0a51d",
          600: "#b3830f"
        },
        danger: {
          500: "#e0341d",
          600: "#b32213"
        }
      },
      fontSize: {
        // Tresen-taugliche, große Schrift für Tablet-Bedienung
        "tresen-lg": ["1.375rem", { lineHeight: "1.9rem" }],
        "tresen-xl": ["1.75rem", { lineHeight: "2.2rem" }]
      },
      minHeight: {
        touch: "3.5rem"
      }
    }
  },
  plugins: []
};

export default config;
