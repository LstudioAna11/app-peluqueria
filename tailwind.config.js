/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#2C2521',
          card: '#FFFFFF',
          'card-light': '#F4F1EA',
          linen: '#EFE9DF',
          gold: '#C99E52',
          'gold-light': '#D9B578',
          'gold-dark': '#B3823B',
          'gold-text': '#8F6D24',
          ivory: '#F4F1EA',
          cream: '#FDFBF7',
          charcoal: '#2C2521',
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
