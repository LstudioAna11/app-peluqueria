/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#D8D0C5',
          card: '#F9F8F6',
          'card-light': '#FFFFFF',
          gold: '#D4AF37',
          'gold-light': '#E5C158',
          'gold-dark': '#B8972E',
          ivory: '#2B2521',
          cream: '#F9F8F6',
          charcoal: '#2B2521',
          'charcoal-light': '#7A7067',
          'charcoal-muted': '#7A7067',
        },
      },
      fontFamily: {
        serif: ['"Royal Hefana"', '"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Garet"', '"Poppins"', '"Inter"', '"Helvetica Neue"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
