import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Na GitHub Pages strona żyje pod /grochu-privates/; lokalnie pod /
const base = process.env.GITHUB_ACTIONS ? '/grochu-privates/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Grochu Privates',
        short_name: 'Grochu',
        description: 'Moje prywatne sprawy w kafelkach.',
        lang: 'pl',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#11110f',
        theme_color: '#11110f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // dane (Supabase) idą zawsze z sieci — service worker trzyma tylko pliki aplikacji
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/drive-snapshot.json'),
            handler: 'NetworkFirst',
          },
          {
            // czcionki Google — żeby aplikacja wyglądała tak samo offline
            urlPattern: ({ url }) =>
              url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
