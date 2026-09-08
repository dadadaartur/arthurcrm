/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-blue': '#0B1E3F',
        'gold': '#C5A04E',
        'light-blue': '#1E3A5F',
      },
    },
  },
  plugins: [],
}
