import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { IDE_ARTIFACTS, IDE_BASE_COMMIT, IDE_BASE_TAG, IDE_PRODUCT_NAME, IDE_PRODUCTION_API, publicApiUrl } from '../shared/editor-release.mjs'

export const root = fileURLToPath(new URL('../', import.meta.url))
const checkout = path.join(root, 'editors/code-oss'), tools = path.join(root, 'scripts/ide')
export const output = path.join(root, 'artifacts/codeva-editor')
export const targets = { windows: { platform: 'win32', architectures: ['x64'] }, macos: { platform: 'darwin', architectures: ['x64', 'arm64'] }, linux: { platform: 'linux', architectures: ['x64'] } }
function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit', windowsHide: true })
  if (result.error || result.status !== 0) throw new Error(`Release step failed: ${path.basename(command)} ${args[0]} (exit ${result.status ?? 'spawn'})`)
}
function npm(args, cwd, env) {
  if (process.platform === 'win32') run(process.execPath, [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), ...args], cwd, env)
  else run('npm', args, cwd, env)
}
export function identity(buildNumber) {
  if (!/^[0-9]{1,18}$/.test(buildNumber)) throw new Error('CODEVA_IDE_BUILD_NUMBER must contain 1–18 digits')
  // The base Git commit stays pinned. This identifies a rebuilt Codeva overlay,
  // not a newer upstream revision, so updates can distinguish successive builds.
  return { release_id: createHash('sha1').update(`${IDE_BASE_COMMIT}:${buildNumber}`).digest('hex'), version: `${IDE_BASE_TAG}-codeva.${buildNumber}`, build_number: buildNumber }
}
export async function hashes(filename) {
  const sha256 = createHash('sha256'), sha1 = createHash('sha1')
  for await (const bytes of createReadStream(filename)) { sha256.update(bytes); sha1.update(bytes) }
  return { sha256: sha256.digest('hex'), sha1: sha1.digest('hex') }
}
export async function validateArtifact(filename) {
  const name = path.basename(filename), meta = IDE_ARTIFACTS[name]
  if (!meta) throw new Error('Unexpected release artifact filename')
  const file = await fsp.open(filename)
  try {
    const stat = await file.stat(), header = Buffer.alloc(12), tail = Buffer.alloc(4)
    await file.read(header, 0, header.length, 0)
    if (stat.size < 1024) throw new Error('Installer is too small')
    if (meta.format === 'setup' && header.subarray(0, 2).toString() !== 'MZ') throw new Error('Windows artifact is not an executable')
    if (meta.format === 'deb' && header.subarray(0, 8).toString() !== '!<arch>\n') throw new Error('Linux artifact is not a Debian archive')
    if (meta.format === 'AppImage' && (header.subarray(0, 4).toString('hex') !== '7f454c46' || header.subarray(8, 11).toString('hex') !== '414902')) throw new Error('Linux artifact is not a type-2 AppImage')
    if (meta.format === 'dmg') { await file.read(tail, 0, 4, stat.size - 512); if (tail.toString() !== 'koly') throw new Error('Mac artifact is not a DMG') }
    return stat.size
  } finally { await file.close() }
}
export async function verifyApp(appDirectory, platform, releaseId) {
  const app = platform === 'darwin' ? path.join(appDirectory, `${IDE_PRODUCT_NAME}.app/Contents/Resources/app`) : path.join(appDirectory, 'resources/app')
  const product = JSON.parse(await fsp.readFile(path.join(app, 'product.json'), 'utf8'))
  if (product.nameLong !== IDE_PRODUCT_NAME || product.commit !== releaseId || !product.updateUrl?.endsWith('/api/v1/editor-updates')) throw new Error('Built editor branding/release/update identity does not match')
  if ((product.builtInExtensionsEnabledWithAutoUpdates || []).some(id => id.toLowerCase() === 'github.copilot-chat')) throw new Error('GitHub Copilot Chat cannot auto-install in MrCodevaa')
  const manifest = JSON.parse(await fsp.readFile(path.join(app, 'extensions/codeva-studio/package.json'), 'utf8'))
  if (product.defaultChatAgent || fs.existsSync(path.join(app, 'extensions/copilot'))) throw new Error('MrCodevaa must use its Codeva participant, without GitHub service setup')
  for (const required of ['auth.cjs', 'session.cjs', 'chat.cjs']) if (!fs.existsSync(path.join(app, 'extensions/codeva-studio', required))) throw new Error('Required Codeva account/chat integration missing from the app')
  if (manifest.contributes.configuration.properties['codeva.apiBaseUrl'].default !== publicApiUrl(process.env.CODEVA_IDE_API_BASE_URL || IDE_PRODUCTION_API)) throw new Error('Built sidebar must default to the Codeva API')
  const secrets = Object.entries(process.env).filter(([name, value]) => /(?:API_KEY|SECRET_KEY|SERVICE_KEY|ACCESS_TOKEN)/.test(name) && value?.length >= 12).map(([, value]) => Buffer.from(value))
  async function scan(directory) {
    for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name)
      if (entry.isSymbolicLink()) throw new Error('Unexpected application symlink')
      if (entry.isDirectory()) { await scan(filename); continue }
      if (/^\.env(?:$|\.)/.test(entry.name) || /\.(?:pfx|p12)$/.test(entry.name)) throw new Error('Credential file cannot be packaged')
      if (!secrets.length) continue
      let previous = Buffer.alloc(0), overlap = Math.max(...secrets.map(value => value.length))
      for await (const part of createReadStream(filename)) {
        const bytes = Buffer.concat([previous, part])
        if (secrets.some(value => bytes.includes(value))) throw new Error('A configured server credential was found in the application')
        previous = bytes.subarray(Math.max(0, bytes.length - overlap))
      }
    }
  }
  await scan(app)
}
export async function publishManifest(platform, release, signed = false, directory = output) {
  const artifacts = []
  for (const [filename, meta] of Object.entries(IDE_ARTIFACTS)) if (meta.os === platform) artifacts.push({ filename, size: await validateArtifact(path.join(directory, filename)), ...await hashes(path.join(directory, filename)), signed })
  const manifest = { base_tag: IDE_BASE_TAG, base_commit: IDE_BASE_COMMIT, ...release, created_at: new Date().toISOString(), artifacts }
  const filename = path.join(directory, `release-${platform}.json`), temporary = filename + '.tmp'
  await fsp.writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n')
  await fsp.rename(temporary, filename)
  return manifest
}
async function packageEditor(target) {
  const config = targets[target]
  if (!config || process.platform !== config.platform) throw new Error('Run windows on Windows, macos on macOS, or linux on Linux; native artifacts are required')
  if (!fs.existsSync(checkout)) run('git', ['clone', '--depth', '1', '--single-branch', '--branch', IDE_BASE_TAG, 'https://github.com/microsoft/vscode.git', checkout], root)
  run(process.execPath, [path.join(root, 'editors/prepare.mjs')], root)
  run(process.execPath, [path.join(root, 'editors/verify.mjs')], root)
  const release = identity(process.env.CODEVA_IDE_BUILD_NUMBER || String(Date.now()))
  const env = { ...process.env, BUILD_SOURCEVERSION: release.release_id, VSCODE_QUALITY: 'stable', npm_config_python: process.env.CODEVA_BUILD_PYTHON || 'python', ...(process.platform === 'win32' ? { npm_config_msvs_version: '2022', GYP_MSVS_VERSION: '2022', npm_package_config_node_gyp_msvs_version: '2022' } : {}) }
  if (process.platform === 'win32') {
    const sdk = path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Windows Kits/10/bin')
    const bin = fs.readdirSync(sdk).filter(name => /^10\./.test(name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map(name => path.join(sdk, name, 'x64')).find(dir => fs.existsSync(path.join(dir, 'signtool.exe')))
    if (!bin) throw new Error('Install the Windows SDK signing tools; upstream packaging needs signtool even for an unsigned Codeva installer')
    const pathKeys = Object.keys(env).filter(key => key.toLowerCase() === 'path'), inheritedPath = env[pathKeys[0]] || ''
    for (const key of pathKeys) delete env[key]
    env.PATH = `${bin}${path.delimiter}${inheritedPath}`
  }
  fs.mkdirSync(output, { recursive: true })
  npm(['ci', '--no-audit', '--no-fund'], tools, env)
  for (const arch of config.architectures) {
    const archEnv = { ...env, npm_config_arch: arch, VSCODE_ARCH: arch }
    npm(['ci', '--no-audit', '--no-fund'], checkout, archEnv)
    npm(['run', 'gulp', '--', `vscode-${config.platform}-${arch}`], checkout, archEnv)
  }
  const signed = config.platform === 'win32' ? Boolean(process.env.WIN_CSC_LINK || process.env.CSC_LINK) : config.platform === 'darwin' && Boolean(process.env.CSC_LINK || process.env.CSC_NAME)
  if (!signed && config.platform !== 'linux') console.log(config.platform === 'win32' ? 'Unsigned release: missing WIN_CSC_LINK (and WIN_CSC_KEY_PASSWORD for a certificate).' : 'Unsigned release: missing CSC_LINK / CSC_NAME (and CSC_KEY_PASSWORD for a certificate).')
  if (config.platform === 'win32') {
    const app = path.join(root, 'editors/VSCode-win32-x64')
    await verifyApp(app, 'win32', release.release_id)
    if (signed) run(process.execPath, [path.join(tools, 'sign-win32.mjs'), path.join(app, `${IDE_PRODUCT_NAME}.exe`)], root, env)
    npm(['run', 'gulp', '--', 'vscode-win32-x64-inno-updater'], checkout, env)
    // Keep the same native Inno package path, but shorten its SourceDir. Node
    // supports paths beyond MAX_PATH; the pinned Inno file compressor does not.
    const temporary = await fsp.mkdtemp(path.join(os.tmpdir(), 'mr-'))
    const source = path.join(temporary, 'a')
    await fsp.symlink(app, source, 'junction')
    try { npm(['run', 'gulp', '--', 'vscode-win32-x64-user-setup', ...(signed ? ['--sign'] : [])], checkout, { ...env, CODEVA_IDE_INNO_SOURCE_DIR: source }) }
    finally { if (path.dirname(temporary) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('mr-')) throw new Error('Unsafe installer temporary path'); await fsp.unlink(source); await fsp.rmdir(temporary) }
    fs.copyFileSync(path.join(checkout, '.build/win32-x64/user-setup/VSCodeSetup.exe'), path.join(output, 'MrCodevaa-win-x64-setup.exe'))
  } else {
    const builder = path.join(tools, 'node_modules/electron-builder/out/cli/cli.js')
    const electronVersion = fs.readFileSync(path.join(checkout, '.npmrc'), 'utf8').match(/^target="([^"]+)"/m)?.[1]
    if (!electronVersion) throw new Error('Pinned Electron version is missing')
    const common = { productName: IDE_PRODUCT_NAME, appId: 'com.codeva.mrcodevaa', electronVersion, directories: { output }, publish: null, extraMetadata: { name: 'mrcodevaa', version: IDE_BASE_TAG } }
    if (config.platform === 'darwin') {
      run(process.execPath, [path.join(checkout, 'build/darwin/create-universal-app.ts'), path.join(root, 'editors')], checkout, { ...env, VSCODE_ARCH: 'universal' })
      const app = path.join(root, 'editors/VSCode-darwin-universal')
      await verifyApp(app, 'darwin', release.release_id)
      const file = path.join(output, 'builder-macos.json')
      fs.writeFileSync(file, JSON.stringify({ ...common, mac: { target: 'dmg', artifactName: 'MrCodevaa-mac-universal.dmg', icon: path.join(root, 'editors/branding/code.icns') }, dmg: { title: IDE_PRODUCT_NAME, sign: false, contents: [{ x: 140, y: 180, type: 'file', path: path.join(app, `${IDE_PRODUCT_NAME}.app`) }, { x: 420, y: 180, type: 'link', path: '/Applications' }] } }))
      run(process.execPath, [path.join(tools, 'package-macos.mjs'), path.join(app, `${IDE_PRODUCT_NAME}.app`), file], tools, env)
    } else {
      const app = path.join(root, 'editors/VSCode-linux-x64')
      await verifyApp(app, 'linux', release.release_id)
      const file = path.join(output, 'builder-linux.json')
      fs.writeFileSync(file, JSON.stringify({ ...common, linux: { target: ['deb', 'AppImage'], executableName: 'mrcodevaa', category: 'Development', icon: path.join(root, 'editors/branding/code.png'), maintainer: 'Codeva', description: 'Codeva editor: pinned Code-OSS workbench with the existing Codeva project API', artifactName: 'MrCodevaa-linux-x64.${ext}' }, deb: { depends: ['libgtk-3-0', 'libnss3', 'libxss1', 'libxtst6', 'libgbm1', 'libasound2'] } }))
      run(process.execPath, [builder, '--linux', 'deb', 'AppImage', '--x64', '--prepackaged', app, '--config', file, '--publish', 'never'], tools, env)
    }
  }
  const manifest = await publishManifest(config.platform, release, signed)
  console.log(`Release ${manifest.version}: ${manifest.artifacts.map(item => item.filename).join(', ')}; manifest written automatically`)
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) packageEditor(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1 })
