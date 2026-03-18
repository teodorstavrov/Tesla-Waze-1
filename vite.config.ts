import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy Waze in dev to avoid CORS
      '/waze-proxy': {
        target: 'https://www.waze.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/waze-proxy/, ''),
        secure: true,
      },
    },
  },
  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks: {
          leaflet: ['leaflet'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
