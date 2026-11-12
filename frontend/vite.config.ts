import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Satu origin di dev: cookie sesi dan CSRF tidak perlu CORS.
    proxy: { '/public': 'http://localhost:8080', '/operational': 'http://localhost:8080', '/analytics': 'http://localhost:8080', '/customer': 'http://localhost:8080', '/media': 'http://localhost:8080', '/health': 'http://localhost:8080', '/csrf': 'http://localhost:8080' },
  },
})
