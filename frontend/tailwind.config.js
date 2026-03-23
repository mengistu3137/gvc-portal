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
          ink: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
};
