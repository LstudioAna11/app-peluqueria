/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#8C827A',
          card: '#F2ECE4',
          'card-light': '#F2ECE4',
          linen: '#E2D9CD',
          gold: '#D4AF37',
          'gold-light': '#E5C158',
          'gold-dark': '#B8972E',
          'gold-text': '#8F6D24',
          ivory: '#241E1A',
          cream: '#FDFBF7',
          charcoal: '#241E1A',
          'charcoal-light': '#6E645B',
          'charcoal-muted': '#6E645B',
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
