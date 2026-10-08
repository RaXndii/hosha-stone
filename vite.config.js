import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Two pages: the customer site (index.html) and the admin (admin/index.html).
// In development the API and uploaded photographs come from the Node server.
export default defineConfig({
  plugins: [react()],
  build: {
    // The phones still in people's hands, not only this year's: an iPhone that
    // cannot go past iOS 15 (a 6s, a 7, the first SE) is still a customer.
    // Vite's own default starts at iOS 16.4; this writes the script and the
    // stylesheet in forms those phones read too (the CSS's screen-size rules
    // in the older min-/max-width form), at no cost to newer ones.
    target: ['es2021', 'chrome100', 'edge100', 'firefox100', 'safari15', 'ios15'],
    // the map from each page's source to its built files: the server reads it
    // to have a page's own script fetched alongside the page (server/index.js)
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/media': 'http://localhost:8787',
    },
  },
})
