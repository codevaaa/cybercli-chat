import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { IDE_PRODUCT_NAME, IDE_PRODUCTION_API, IDE_PRODUCTION_WEB, publicApiUrl } from '../shared/editor-release.mjs'

const root = path.dirname(fileURLToPath(import.meta.url)), checkout = path.join(root, 'code-oss')
const base = '2242ebbb54efeeb0129e08e919e7e8d43033cd83'
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: checkout, encoding: 'utf8' }).trim() !== base || execFileSync('git', ['rev-parse', '1.139.0^{commit}'], { cwd: checkout, encoding: 'utf8' }).trim() !== base) throw new Error('Only the exact 1.139.0 base commit may be prepared')
const original = JSON.parse(execFileSync('git', ['show', 'HEAD:product.json'], { cwd: checkout, encoding: 'utf8' }))
const branding = { nameShort: IDE_PRODUCT_NAME, nameLong: IDE_PRODUCT_NAME, applicationName: 'mrcodevaa', dataFolderName: '.mrcodevaa', win32MutexName: 'mrcodevaa', urlProtocol: 'mrcodevaa', extensionEnabledApiProposals: { ...(original.extensionEnabledApiProposals || {}), 'codeva.codeva-studio': ['defaultChatParticipant', 'chatParticipantAdditions', 'terminalSelection'] }, extensionsGallery: { serviceUrl: 'https://open-vsx.org/vscode/gallery', itemUrl: 'https://open-vsx.org/vscode/item', resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}', extensionUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest' } }
// The installer request extends the original branding allowlist with identities
// and the existing API's update feed. These are not new workbench features.
const api = publicApiUrl(process.env.CODEVA_IDE_API_BASE_URL || IDE_PRODUCTION_API)
export const installerBranding = { quality: 'stable', updateUrl: `${api}/editor-updates`, downloadUrl: `${IDE_PRODUCTION_WEB}/downloads`, win32DirName: 'MrCodevaa', win32NameVersion: IDE_PRODUCT_NAME, win32RegValueName: 'MrCodevaa', win32ShellNameShort: 'MrCodevaa', win32AppUserModelId: 'Codeva.Editor', win32x64AppId: '{{C6BDACD3-21A9-46ED-BDDE-FEF8086287C2}', win32arm64AppId: '{{E8973924-E25D-431D-A306-9A7662F14E46}', win32x64UserAppId: '{{B7C4B297-8A41-4B96-A7FC-42A0DD57085D}', win32arm64UserAppId: '{{CD10811A-59C7-457B-9CFE-7B587D83C8E3}', darwinBundleIdentifier: 'com.codeva.mrcodevaa', linuxDesktopName: 'com.codeva.Editor', linuxIconName: 'mrcodevaa' }
const ownProduct = { ...original, ...branding, ...installerBranding }
// GitHub's entitlement/setup service is unrelated to Codeva account auth.
// Native Chat remains enabled and discovers the bundled Codeva participant.
delete ownProduct.defaultChatAgent
ownProduct.builtInExtensionsEnabledWithAutoUpdates = (original.builtInExtensionsEnabledWithAutoUpdates || []).filter(id => id.toLowerCase() !== 'github.copilot-chat')
ownProduct.trustedExtensionAuthAccess = Object.fromEntries(Object.entries(original.trustedExtensionAuthAccess || {}).map(([provider, ids]) => [provider, ids.filter(id => id.toLowerCase() !== 'github.copilot-chat')]))
fs.writeFileSync(path.join(checkout, 'product.json'), JSON.stringify(ownProduct, null, '\t') + '\n')
fs.writeFileSync(path.join(checkout, 'BASE.txt'), '1.139.0')
fs.cpSync(path.join(root, 'studio-client'), path.join(checkout, 'extensions/codeva-studio'), { recursive: true, filter: source => !source.endsWith('.test.cjs') })
const manifestPath = path.join(checkout, 'extensions/codeva-studio/package.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest.contributes.configuration.properties['codeva.apiBaseUrl'].default = api
manifest.contributes.configuration.properties['codeva.webUrl'].default = IDE_PRODUCTION_WEB
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t') + '\n')
for (const rel of ['resources/win32/code.ico', 'resources/win32/code_70x70.png', 'resources/win32/code_150x150.png', 'resources/linux/code.png', 'resources/darwin/code.icns', 'resources/server/code-192.png', 'resources/server/code-512.png', 'resources/server/favicon.ico', 'src/vs/workbench/browser/media/code-icon.svg']) {
  const asset = path.join(root, 'branding', path.basename(rel))
  fs.copyFileSync(asset, path.join(checkout, rel))
}
// Reuse upstream Inno Setup rather than introducing another Windows installer.
let iss = execFileSync('git', ['show', 'HEAD:build/win32/code.iss'], { cwd: checkout, encoding: 'utf8' })
iss = iss.replace('AppPublisher=Microsoft Corporation', 'AppPublisher=Codeva').replace(/https:\/\/code\.visualstudio\.com\//g, `${IDE_PRODUCTION_WEB}/`)
fs.writeFileSync(path.join(checkout, 'build/win32/code.iss'), iss)
// The same DMG advertised on Downloads is a manual update. Squirrel.Mac requires
// ZIP, so retain the stock update state/UI and open the feed's DMG explicitly.
let darwin = execFileSync('git', ['show', 'HEAD:src/vs/platform/update/electron-main/updateService.darwin.ts'], { cwd: checkout, encoding: 'utf8' })
darwin = darwin.replace('const headers = getUpdateRequestHeaders(this.productService.version);\n\t\ttry {', "if (this.productService.updateUrl?.endsWith('/api/v1/editor-updates')) { return url; }\n\t\tconst headers = getUpdateRequestHeaders(this.productService.version);\n\t\ttry {")
darwin = darwin.replace('\t\t// When connection is metered', "\t\tif (this.productService.updateUrl?.endsWith('/api/v1/editor-updates')) {\n\t\t\tvoid this.checkForUpdateNoDownload(url, true);\n\t\t\treturn;\n\t\t}\n\n\t\t// When connection is metered")
darwin = darwin.replace('\t\t// Rebuild feed URL and trigger download', "\t\tif (this.productService.updateUrl?.endsWith('/api/v1/editor-updates')) {\n\t\t\tif (state.update.url) { await electron.shell.openExternal(state.update.url); }\n\t\t\tthis.setState(State.Idle(UpdateType.Archive));\n\t\t\treturn;\n\t\t}\n\t\t// Rebuild feed URL and trigger download")
if ((darwin.match(/endsWith\('\/api\/v1\/editor-updates'\)/g) || []).length !== 3) throw new Error('Pinned Darwin update adapter no longer matches the expected upstream source')
fs.writeFileSync(path.join(checkout, 'src/vs/platform/update/electron-main/updateService.darwin.ts'), darwin)
// Standard certificate environment, handled without logging secret arguments.
fs.mkdirSync(path.join(checkout, 'build/codeva'), { recursive: true })
fs.copyFileSync(path.join(root, '../scripts/ide/sign-win32.mjs'), path.join(checkout, 'build/codeva/sign-win32.mjs'))
let win32 = execFileSync('git', ['show', 'HEAD:build/gulpfile.vscode.win32.ts'], { cwd: checkout, encoding: 'utf8' })
win32 = win32.replace("'azure-pipelines', 'common', 'sign-win32.ts'", "'codeva', 'sign-win32.mjs'")
win32 = win32.replace('const sourcePath = buildPath(arch);', 'const sourcePath = process.env.CODEVA_IDE_INNO_SOURCE_DIR || buildPath(arch);')
const contextMenuGate = "if ((quality === 'stable' || quality === 'insider') && (product as { win32ContextMenu?: Record<string, { clsid: string }> }).win32ContextMenu?.[arch]) {"
win32 = win32.replace("if (quality === 'stable' || quality === 'insider') {", contextMenuGate)
fs.writeFileSync(path.join(checkout, 'build/gulpfile.vscode.win32.ts'), win32)
let packageSource = execFileSync('git', ['show', 'HEAD:build/gulpfile.vscode.ts'], { cwd: checkout, encoding: 'utf8' })
packageSource = packageSource.replace('prepareBuiltInCopilotRipgrepShim(platform, arch, builtInCopilotExtensionDir, appNodeModulesDir);', "if (product.applicationName !== 'mrcodevaa') { prepareBuiltInCopilotRipgrepShim(platform, arch, builtInCopilotExtensionDir, appNodeModulesDir); }")
packageSource = packageSource.replace("if (quality === 'stable' || quality === 'insider') {", contextMenuGate)
packageSource = packageSource.replace(".pipe(filter(sourceFilterPattern, { dot: true }));", ".pipe(filter(sourceFilterPattern, { dot: true }))\n\t\t\t.pipe(filter(getCopilotTgrepExcludeFilter(platform, arch), { dot: true }))\n\t\t\t.pipe(filter(getRipgrepExcludeFilter(platform, arch), { dot: true }))\n\t\t\t.pipe(filter(['**', `!**/node_modules/@github/copilot/sdk/prebuilds/!(${platform}-${arch})/**`], { dot: true }));")
fs.writeFileSync(path.join(checkout, 'build/gulpfile.vscode.ts'), packageSource)
// Collect the Copilot SDK using vsce's real dependency enumeration and its
// existing .vscodeignore. Adding node_modules after that filter bypassed the
// upstream exclusions and bundled incompatible Linux/Mac optional binaries.
let extensionPackaging = execFileSync('git', ['show', 'HEAD:build/lib/extensions.ts'], { cwd: checkout, encoding: 'utf8' })
extensionPackaging = extensionPackaging.replace('packageManager: vsce.PackageManager.None });', "packageManager: extensionName === 'copilot' ? vsce.PackageManager.Npm : vsce.PackageManager.None });")
// Keep the upstream MIT source and native chat framework, but ship our API
// participant instead of activating GitHub's account/service participant.
extensionPackaging = extensionPackaging.replace('export function packageCopilotExtensionStream(): Stream {', "export function packageCopilotExtensionStream(): Stream {\n\tif (productJson.applicationName === 'mrcodevaa') { return es.readArray([]); }")
fs.writeFileSync(path.join(checkout, 'build/lib/extensions.ts'), extensionPackaging)
execFileSync(process.execPath, [path.join(root, 'phase3-workbench.mjs')], { cwd: checkout, stdio: 'inherit' })
for (const name of fs.readdirSync(path.join(root, 'brand')).filter(name => /^inno-.*\.bmp$/.test(name))) fs.copyFileSync(path.join(root, 'brand', name), path.join(checkout, 'resources/win32', name))
console.log('Prepared Codeva client and permitted branding on the exact 1.139.0 base; no newer refs merged.')
