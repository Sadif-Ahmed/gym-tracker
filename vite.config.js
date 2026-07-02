import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), basicSsl(), VitePWA({
    registerType: 'prompt',
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
  }), cloudflare()],
  server: {
    host: true,
  },
})