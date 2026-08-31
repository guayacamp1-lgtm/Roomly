import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Deja que el plugin genere el Service Worker automáticamente
      strategies: 'generateSW',

      // Registra el SW automáticamente sin código extra en main.jsx
      registerType: 'autoUpdate',

      // Incluir el SW en el build
      injectRegister: 'auto',

      // Manifiesto de la PWA
      manifest: {
        name: 'Roomly',
        short_name: 'Roomly',
        description: 'Sistema de gestión de reservas y caja para alojamientos.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },

      // Opciones de Workbox para precaché
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Rutas de navegación → siempre devuelve index.html (SPA)
        navigateFallback: 'index.html',

        // Cache en tiempo de ejecución para peticiones a Supabase
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },

      // Muestra en consola qué archivos se precachean durante el build
      devOptions: {
        enabled: true,       // activa el SW también en dev (útil para probar)
        type: 'module',
      },
    }),
  ],
});
