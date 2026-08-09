import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Supply VITE_BASE_PATH=/repository-name/ for GitHub Pages; '/' also works locally.
const base = process.env.VITE_BASE_PATH ?? '/drone-exam-app/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: '無人機考照衝刺', short_name: '無人機考照', lang: 'zh-TW',
        display: 'standalone', theme_color: '#eef6ec', background_color: '#eef6ec',
        icons: [{ src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        // questions.json intentionally stays out of precache. NetworkFirst checks GitHub Pages
        // for a real update on every launch and still falls back to the last offline copy.
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [{
          urlPattern: /\/data\/questions\.json$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'question-bank-v1',
            networkTimeoutSeconds: 5,
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 2, maxAgeSeconds: 30 * 24 * 60 * 60 }
          }
        }]
      },
      devOptions: { enabled: false }
    })
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] }
});
