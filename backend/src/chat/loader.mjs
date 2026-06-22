/**
 * loader.mjs
 * ESM loader hook that remaps `.js` specifiers to `.ts` when the `.ts` file
 * exists but the `.js` file does not. This lets TypeScript source files import
 * each other using the conventional `.js` extension (as required by the TS
 * compiler) while being run directly with `--experimental-strip-types`.
 */

import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve as pathResolve, dirname } from 'node:path'

export async function resolve(specifier, context, nextResolve) {
  // Only remap relative imports ending in .js
  if (specifier.startsWith('.') && specifier.endsWith('.js')) {
    const parentDir = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : process.cwd()

    const jsPath = pathResolve(parentDir, specifier)
    const tsPath = jsPath.replace(/\.js$/, '.ts')

    if (!existsSync(jsPath) && existsSync(tsPath)) {
      const tsSpecifier = specifier.replace(/\.js$/, '.ts')
      return nextResolve(tsSpecifier, context)
    }
  }

  return nextResolve(specifier, context)
}
