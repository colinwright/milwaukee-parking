/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        verdict: {
          odd: '#2563eb', // blue  – alternate-side, odd
          even: '#0891b2', // cyan – alternate-side, even
          either: '#16a34a', // green – exception street
          no: '#dc2626', // red   – no parking / tow risk
        },
      },
    },
  },
  plugins: [],
};
