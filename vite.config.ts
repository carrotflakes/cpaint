import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      manifest: {
        "name": "cpaint",
        "short_name": "cpaint",
        "description": "A simple paint app",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#000000",
        "icons": [
          {
            "src": "/icon_full_512.svg",
            "sizes": "512x512",
            "purpose": "any"
          },
          {
            "src": "/icon_mask_512.svg",
            "sizes": "512x512",
            "purpose": "maskable"
          }
        ]
      }
    })
  ],
})
