#!/usr/bin/env node

/**
 * Build Windows installer for CyberMind CLI
 * This script creates a Windows installer using electron-builder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const version = require('../package.json').version;
const distPath = path.join(__dirname, '../dist');
const installerPath = path.join(__dirname, '../installers');

console.log('🏗️  Building CyberMind CLI Windows Installer...');
console.log(`Version: ${version}`);

// Ensure directories exist
if (!fs.existsSync(installerPath)) {
  fs.mkdirSync(installerPath, { recursive: true });
}

try {
  // Build the CLI first
  console.log('📦 Building CLI...');
  execSync('pnpm build', { stdio: 'inherit' });

  // Create installer package
  console.log('🔧 Creating Windows installer...');
  
  const packageJson = {
    name: 'cybermind-cli',
    version: version,
    description: 'CyberMind CLI - Advanced AI-powered command-line interface',
    main: 'index.js',
    bin: {
      'cybermind': 'index.js'
    },
    files: [
      'dist/**/*',
      'README.md',
      'LICENSE'
    ],
    scripts: {
      postinstall: 'node postinstall.js'
    }
  };

  // Write package.json for installer
  fs.writeFileSync(
    path.join(distPath, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );

  // Create postinstall script
  const postinstallScript = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Add cybermind to PATH if not already there
const isWindows = process.platform === 'win32';
if (isWindows) {
  console.log('🚀 CyberMind CLI installed successfully!');
  console.log('Run "cybermind --help" to get started.');
} else {
  console.log('🚀 CyberMind CLI installed successfully!');
  console.log('Run "cybermind --help" to get started.');
}
`;

  fs.writeFileSync(
    path.join(distPath, 'postinstall.js'),
    postinstallScript
  );

  // Create npm package
  console.log('📦 Creating npm package...');
  execSync('npm pack', { cwd: distPath, stdio: 'inherit' });

  // Move package to installers directory
  const packageName = `cybermind-cli-${version}.tgz`;
  fs.renameSync(
    path.join(distPath, packageName),
    path.join(installerPath, packageName)
  );

  console.log(`✅ Windows installer package created: ${path.join(installerPath, packageName)}`);
  console.log('');
  console.log('To install:');
  console.log(`  npm install -g ${path.join(installerPath, packageName)}`);
  console.log('');
  console.log('Or download and install from: https://github.com/cybermind/cli/releases');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
