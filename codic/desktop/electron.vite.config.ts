import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { isLocalPreviewEnabled } from './src/shared/buildFlags.js'

const resolveFromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localPreviewEnabled = isLocalPreviewEnabled(command, env.VITE_CODIC_ALLOW_LOCAL_PREVIEW)

  return {
    main: {
      resolve: {
        alias: {
          '@cybermind/codic-runtime': resolveFromHere('../../cybercoder/packages/codic-runtime/src/index.ts'),
          '@cybermind/core': resolveFromHere('../../cybercoder/packages/core/src/index.ts'),
          '@cybermind/shared': resolveFromHere('../../cybercoder/packages/codic-runtime/src/shared-bridge.ts'),
          '@cybermind/tools': resolveFromHere('../../cybercoder/packages/tools/src/index.ts'),
          '@cybermind/providers': resolveFromHere('../../cybercoder/packages/providers/src/index.ts'),
        },
      },
      define: {
        'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
        __CODIC_LOCAL_PREVIEW_ENABLED__: JSON.stringify(localPreviewEnabled),
      },
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: 'dist/main',
        rollupOptions: {
          input: resolveFromHere('./src/main/index.ts'),
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: 'dist/preload',
        rollupOptions: {
          input: resolveFromHere('./src/preload/index.ts'),
          output: {
            format: 'cjs',
            entryFileNames: 'index.cjs',
          },
        },
      },
    },
    renderer: {
      plugins: [
        react(),
        {
          name: 'codic-production-csp',
          apply: 'build',
          transformIndexHtml(html: string) {
            return html.replace(' http://localhost:5173 ws://localhost:5173', '')
          },
        },
      ],
      root: resolveFromHere('./src/renderer'),
      build: {
        outDir: resolveFromHere('./dist/renderer'),
        emptyOutDir: true,
        rollupOptions: {
          input: resolveFromHere('./src/renderer/index.html'),
        },
      },
    },
  }
})
