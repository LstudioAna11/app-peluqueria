/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#F4F1EA',
          card: '#FFFFFF',
          'card-light': '#FDFBF7',
          gold: '#C99E52',
          'gold-light': '#E8C88B',
          'gold-dark': '#B98A3E',
          ivory: '#2C2521',
          cream: '#F4F1EA',
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
