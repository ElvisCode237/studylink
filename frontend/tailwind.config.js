/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101828',
        slate: {
          950: '#0B1220',
        },
        brand: {
          50: '#EEF4FF',
          100: '#DCE8FF',
          200: '#B8D0FF',
          300: '#8AB0FF',
          400: '#5A8CFF',
          500: '#3366FF',
          600: '#254DE0',
          700: '#1C3AB3',
          800: '#182F8C',
          900: '#152A72',
        },
        coral: {
          400: '#FF8B6B',
          500: '#FF6B45',
          600: '#EA4E27',
        },
        mint: {
          400: '#3ECF8E',
          500: '#22B573',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
        pop: '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
