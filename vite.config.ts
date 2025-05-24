import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'
import svgr from '@svgr/rollup'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    svgr({ icon: true }),
    VitePWA({
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
  define: {
    __BUILD_DATE__: JSON.stringify(formatBuildDate()),
  },
})

function formatBuildDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');

  const year = now.getFullYear() % 100;
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  const second = pad(now.getSeconds());

  return `${year}${month}${day}-${hour}${minute}${second}`;
}
