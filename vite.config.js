import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ironlog/',
  plugins: [
    react(),
    // PWA: instalável na tela inicial e abre offline. O service worker só
    // guarda os arquivos do app — dados (api.github.com) nunca passam por cache.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Iron Log — Diário de Hipertrofia',
        short_name: 'Iron Log',
        lang: 'pt-BR',
        start_url: '/ironlog/',
        scope: '/ironlog/',
        display: 'standalone',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/ironlog/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
