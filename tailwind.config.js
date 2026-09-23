/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#F7F5F0',
          card: '#FFFFFF',
          'card-light': '#EFECE6',
          gold: '#D4AF37',
          'gold-light': '#E8C766',
          'gold-dark': '#A8862B',
          ivory: '#1A1A1A',
          cream: '#1A1A1A',
          charcoal: '#1A1A1A',
          'charcoal-light': '#3A3A3A',
          'charcoal-muted': '#6A6A6A',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
