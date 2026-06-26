import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');
const vscodeDir = path.join(rootDir, 'editor-builder/vscode-oss');

// Configs for branding Codeva Editor
const config = {
  nameShort: 'Codeva',
  nameLong: 'Codeva AI Editor',
  applicationName: 'codeva',
  dataFolderName: '.codeva',
  win32AppId: '{{C0D3VA-AI-ED1T0R-BUILD-ID}}',
  urlName: 'codeva',
  win32DirName: 'Codeva',
  win32MutexName: 'codevaeditor',
  version: '1.0.0',
};

function run(cmd, args, cwd = rootDir) {
  console.log(`> Running: ${cmd} ${args.join(' ')} (in ${cwd})`);
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    console.error(`Command failed with status ${res.status}`);
    process.exit(res.status || 1);
  }
}

async function setup() {
  console.log('--- Phase 1: Cloning VS Code OSS ---');
  if (fs.existsSync(vscodeDir)) {
    console.log('VS Code OSS repository already exists, skipping clone.');
  } else {
    run('git', [
      'clone',
      '--depth', '1',
      '--branch', '1.96.0',
      'https://github.com/microsoft/vscode.git',
      'vscode-oss'
    ], path.join(rootDir, 'editor-builder'));
  }

  console.log('Installing dependencies inside VS Code OSS...');
  run('npm', ['install'], vscodeDir);
}

async function patch() {
  console.log('--- Phase 2: Branding & Patching product.json ---');
  const productJsonPath = path.join(vscodeDir, 'product.json');
  if (!fs.existsSync(productJsonPath)) {
    console.error('product.json not found! Clone VS Code first.');
    process.exit(1);
  }

  const product = fs.readJsonSync(productJsonPath);

  // Apply Codeva branding
  product.nameShort = config.nameShort;
  product.nameLong = config.nameLong;
  product.applicationName = config.applicationName;
  product.dataFolderName = config.dataFolderName;
  product.win32AppId = config.win32AppId;
  product.win32DirName = config.win32DirName;
  product.win32MutexName = config.win32MutexName;
  product.urlProtocol = config.urlName;
  product.win32NameVersion = 'Codeva Editor';
  product.win32RegValueName = 'Codeva';
  product.win32AppUserModelId = 'Codeva.AI';
  product.win32ShellNameShort = 'Codeva';
  product.darwinBundleIdentifier = 'com.codeva.editor';
  product.linuxIconName = 'codeva';
  product.reportIssueUrl = 'https://github.com/codevaaa/codeva/issues';

  // Configure extension marketplace - Omitted at build-time to avoid built-in download 404s
  delete product.extensionsGallery;

  // Embed our custom vscode-extension as a built-in extension
  product.builtInExtensions = product.builtInExtensions || [];
  const extensionBundlePath = path.join(rootDir, 'cybercoder/packages/vscode-extension');
  const extensionDest = path.join(vscodeDir, 'extensions/codeva-vscode');

  console.log(`Copying vscode-extension bundle to ${extensionDest}...`);
  fs.copySync(extensionBundlePath, extensionDest, {
    dereference: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('.git')
  });

  // Inject into product.json extensions config
  if (!product.builtInExtensions.some(ext => ext.name === 'codeva-vscode')) {
    product.builtInExtensions.push({
      name: 'codeva-vscode',
      version: '0.6.2',
      publisher: 'codeva',
    });
  }

  // Remove any stale cybercoder registrations
  product.builtInExtensions = product.builtInExtensions.filter(ext => ext.name !== 'cybercoder');

  fs.writeJsonSync(productJsonPath, product, { spaces: 2 });
  console.log('product.json successfully patched.');

  // Replace default app icons (placeholder icons in real setup)
  const resourceSrc = path.join(rootDir, 'icon.png');
  const resourceDest = path.join(vscodeDir, 'resources/win32/code.ico'); // Example path
  if (fs.existsSync(resourceSrc)) {
    console.log('Copying logo assets to VS Code resources...');
    // real packaging step would convert icon.png to .ico/.icns formats
  }
}

async function compile() {
  console.log('--- Phase 3: Compiling Codeva Editor ---');
  // Run build command via npm/gulp
  run('npm', ['run', 'gulp', 'vscode-win32-x64-min'], vscodeDir);
  console.log('Compilation complete.');

  console.log('--- Phase 4: Post-Build Patching ---');
  // Find built product.json paths (check both vscode-oss parent and nested locations)
  const possibleBuiltProductPaths = [
    path.join(rootDir, 'editor-builder/VSCode-win32-x64/resources/app/product.json'),
    path.join(vscodeDir, 'VSCode-win32-x64/resources/app/product.json'),
    path.join(vscodeDir, '../VSCode-win32-x64/resources/app/product.json'),
  ];

  let patchedCount = 0;
  for (const builtProductPath of possibleBuiltProductPaths) {
    if (fs.existsSync(builtProductPath)) {
      console.log(`Found built product.json at ${builtProductPath}. Injecting extensionsGallery...`);
      try {
        const builtProduct = fs.readJsonSync(builtProductPath);
        builtProduct.extensionsGallery = {
          serviceUrl: 'https://open-vsx.org/api',
          itemUrl: 'https://open-vsx.org/item',
          resourceUrlTemplate: 'https://open-vsx.org/api/v1/file/{publisher}/{name}/{version}/file',
        };
        fs.writeJsonSync(builtProductPath, builtProduct, { spaces: 2 });
        console.log(`Successfully patched built product.json at ${builtProductPath}`);
        patchedCount++;
      } catch (err) {
        console.error(`Error patching built product.json at ${builtProductPath}:`, err);
      }
    }
  }

  if (patchedCount === 0) {
    console.warn('Warning: Could not find any built product.json to patch. Compilation might have failed or built to a different path.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--setup')) {
    await setup();
  } else if (args.includes('--patch')) {
    await patch();
  } else if (args.includes('--compile')) {
    await compile();
  } else {
    // Run full pipeline
    await setup();
    await patch();
    await compile();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
