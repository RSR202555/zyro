import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Cores customizadas do Zyro
        zyro: {
          darkest: "#0b0c10",
          dark: "#1f2833",
          gray: "#c5c6c7",
          cyan: "#66fcf1",
          teal: "#45f3ff",
        }
      }
    },
  },
  plugins: [],
};
export default config;
