import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
  shims: false,
  // Bundle only our workspace packages; leave every third-party dep as an
  // external import so Node resolves them from node_modules at runtime. This
  // avoids issues bundling packages that use dynamic require (e.g. whatwg-url
  // pulled in by @anthropic-ai/sdk via node-fetch).
  noExternal: [/^@cybermind\//],
  skipNodeModulesBundle: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
