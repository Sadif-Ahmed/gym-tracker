import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    basicSsl(),
    VitePWA({
      registerType: 'prompt',
      // We register the service worker ourselves (utils/swUpdateListener.js)
      // instead of the plugin's auto-injected script, so a new version can
      // show an in-app "New version available" toast instead of just
      // silently sitting there until every tab closes — see Section 15 of
      // the architecture plan.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      manifest: {
        name: 'WorkoutTracker',
        short_name: 'WorkoutTracker',
        description: 'Workout & calorie tracker for you and your gym friends',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
})
