#!/usr/bin/env node
// CyberMind CLI launcher — thin bin shim that forwards to the compiled entry.
// In dev (`pnpm dev`), tsx executes src/index.tsx directly and this file is unused.
import('../dist/index.js').catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[cybermind] failed to start:', err);
  process.exit(1);
});
