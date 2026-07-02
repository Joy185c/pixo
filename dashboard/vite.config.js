import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // expose on all network interfaces (LAN access)
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // In production, API calls go directly to the Render backend URL.
  // VITE_API_BASE_URL is injected by Vercel from vercel.json env.
  define: {
    __PROD_API__: JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
})
