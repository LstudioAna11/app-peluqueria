/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#1C1A18',
          card: '#2E2A26',
          'card-light': '#3D3833',
          gold: '#E6C687',
          'gold-light': '#F0D9A8',
          'gold-dark': '#C49A45',
          ivory: '#F5F0EB',
          cream: '#F5F0EB',
          charcoal: '#1C1A18',
          'charcoal-light': '#2E2A26',
          'charcoal-muted': '#D1C7BD',
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
