import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative base so assets load under file:// in the packaged Electron app
  base: './',
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:4000',  ws: true },
    }
  },
  build: { outDir: '../ui-dist' }
})
