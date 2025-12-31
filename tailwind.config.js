/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,js,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope"', '"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        midnight: '#0f172a',
        lagoon: '#0ea5e9',
        blush: '#f43f5e',
      },
    },
  },
  plugins: [],
}
