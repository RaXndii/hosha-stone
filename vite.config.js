import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Two pages: the customer site (index.html) and the admin (admin/index.html).
// In development the API and uploaded photographs come from the Node server.
export default defineConfig({
  plugins: [react()],
  build: {
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
