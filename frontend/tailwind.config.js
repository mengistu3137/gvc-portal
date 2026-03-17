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
          background: '#f4f8fd',
          surface: '#ffffff',
          ink: '#0b2647',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 65, 124, 0.08), 0 8px 24px rgba(15, 65, 124, 0.06)',
      },
    },
  },
  plugins: [],
};
