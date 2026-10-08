/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.{js,jsx}'],
  // Tailwind's own variables (--tw-translate-x and fifty more) go only on the
  // elements whose classes use them, not on every element of the page: each
  // one an element carries is one more thing to work out every time the
  // page's styles change, and the showroom changes the room's colours on its
  // root with every piece.
  experimental: { optimizeUniversalDefaults: true },
  theme: {
    extend: {
      // a phone whose screen is short (an iPhone SE): the title tightens so
      // the way in to the photographs stays above the buy bar
      screens: {
        short: { raw: '(max-height: 620px) and (max-width: 1023px)' },
      },
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
