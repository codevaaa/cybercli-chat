const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Stub out optional dependencies that Supabase references but doesn't need at runtime.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@opentelemetry/api': require.resolve('./shims/empty.js'),
}

// Some packages ship .cjs/.mjs — make sure Metro resolves them.
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs']

module.exports = config
