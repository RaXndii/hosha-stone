/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#05041a',
        abyss: '#03020d',
        navy: '#0b0926',
        panel: '#14112e',
        haze: '#7d5cc6',
        lilac: '#b9a0dd',
        ash: '#4a4a55',
        bone: '#f4f2f7',
        aqua: '#7fd4d8',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        ultra: '0.42em',
      },
    },
  },
  plugins: [],
}
