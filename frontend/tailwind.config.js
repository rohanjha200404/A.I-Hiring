/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-green': '#e5f4ed',
        'brand-dark-green': '#0b6b52',
      },
    },
  },
  plugins: [],
}
