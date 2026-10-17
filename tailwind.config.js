/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#2B2825',
          card: '#3D3833',
          'card-light': '#4A443D',
          gold: '#D4AF37',
          'gold-light': '#E8C766',
          'gold-dark': '#A8862B',
          ivory: '#FDFBF7',
          cream: '#FDFBF7',
          charcoal: '#2B2825',
          'charcoal-light': '#3D3833',
          'charcoal-muted': '#A89F91',
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
