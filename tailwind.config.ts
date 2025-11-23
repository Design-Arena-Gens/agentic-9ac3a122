import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b5dcff",
          300: "#7ec1ff",
          400: "#3ea0ff",
          500: "#117dff",
          600: "#005ff0",
          700: "#0048be",
          800: "#003a95",
          900: "#002f74",
          950: "#001b44"
        },
        accent: "#ff6b6b",
        graphite: "#0f172a"
      }
    }
  },
  plugins: []
};

export default config;
