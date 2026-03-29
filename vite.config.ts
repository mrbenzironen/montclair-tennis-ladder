import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA / service worker disabled — re-enable with vite-plugin-pwa when the app is stable
// (see git history for prior VitePWA({ manifest, workbox, ... }) config).

export default defineConfig({
  plugins: [react()],
})
