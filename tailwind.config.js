/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Assuming an Arabic font is linked in index.html
        sans: ['"Tajawal"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
