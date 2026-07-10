/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Semantic colors live in src/lib/palette.js (used by both React and Leaflet).
  theme: { extend: {} },
  plugins: [],
};
