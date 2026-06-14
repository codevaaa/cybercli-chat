import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts'),
      },
    },
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/index.ts'),
      },
    },
  },
  renderer: {
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index:          resolve(__dirname, 'src/renderer/index.html'),
          landing:        resolve(__dirname, 'src/renderer/landing.html'),
          login:          resolve(__dirname, 'src/renderer/login.html'),
          'kalikal-hunter': resolve(__dirname, 'src/renderer/kalikal-hunter.html'),
        },
      },
    },
  },
})
