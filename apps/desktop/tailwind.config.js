/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: "#0f1117",
          panel: "#161922",
          card: "#1e222d",
          hover: "#282d3c",
          border: "#2b3040",
          accent: "#6366f1",
          accentHover: "#4f46e5",
          text: "#f3f4f6",
          muted: "#9ca3af"
        }
      }
    },
  },
  plugins: [],
}

