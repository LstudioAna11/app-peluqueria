/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#29231F',
          card: '#EADCC7',
          'card-light': '#F3E8D7',
          linen: '#322A25',
          gold: '#C49A58',
          'gold-light': '#E4C687',
          'gold-dark': '#B3823B',
          'gold-text': '#8F6D24',
          ivory: '#FFF8EE',
          cream: '#EADCC7',
          charcoal: '#2C2521',
          'charcoal-light': '#5C5248',
          'charcoal-muted': '#4E443B',
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
