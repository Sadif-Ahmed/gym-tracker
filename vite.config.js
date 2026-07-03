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
      // clientsClaim so the *manual* skipWaiting our toast triggers
      // (see swUpdateListener.js) actually takes control of the already-
      // open tab immediately — without it, activating the new worker
      // never fires the 'controlling' event on the current page, so the
      // reload-after-tapping-Refresh never happens and the toast just
      // sits there. Safe to pair with prompt-based skipWaiting per
      // Workbox's own guidance, since it still only activates on request.
      workbox: {
        clientsClaim: true,
      },
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
