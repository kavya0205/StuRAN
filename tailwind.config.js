/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#14b8a6", // teal-500
        secondary: "#3b82f6", // blue-500
        accent: "#ec4899", // pink-500
        darkBase: "#0f172a", // slate-900
        darkCard: "#1e293b", // slate-800
      }
    },
  },
  plugins: [],
}
