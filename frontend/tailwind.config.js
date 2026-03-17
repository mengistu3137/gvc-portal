/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f417c',
        accent: '#ffc428',
        brand: {
          blue: '#0f417c',
          yellow: '#ffc428',
          background: '#f9fafb',
          surface: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(2, 6, 23, 0.06)',
      },
    },
  },
  plugins: [],
};
