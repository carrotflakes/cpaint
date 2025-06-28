import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'
import svgr from '@svgr/rollup'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr({ icon: true }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "cpaint",
        short_name: "cpaint",
        description: "A simple paint app",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#000000",
        icons: [
          {
            src: "/icon_full_512.svg",
            sizes: "512x512",
            purpose: "any"
          },
          {
            src: "/icon_mask_512.svg",
            sizes: "512x512",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __BUILD_DATE__: JSON.stringify(formatBuildDate()),
  },
})

function formatBuildDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = now.getUTCFullYear() % 100;
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());
  const second = pad(now.getUTCSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}
