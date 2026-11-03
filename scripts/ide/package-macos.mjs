// Only packages/signs the compiled upstream app; it does not build another app.
import path from 'node:path'
import { IDE_PRODUCT_NAME } from '../../shared/editor-release.mjs'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { TmpDir } from 'builder-util'
import { createKeychain, findIdentity, removeKeychain, sign } from 'app-builder-lib/out/codeSign/macCodeSign.js'
import { notarize } from '@electron/notarize'
const directory = path.dirname(fileURLToPath(import.meta.url)), app = process.argv[2], config = process.argv[3]
if (process.platform !== 'darwin' || !app?.endsWith(`/${IDE_PRODUCT_NAME}.app`) || !config) throw new Error('A compiled Codeva.app on macOS is required')
const tmpDir = new TmpDir(), signing = Boolean(process.env.CSC_LINK || process.env.CSC_NAME)
let keychainFile
try {
  let identity
  if (signing) {
    if (process.env.CSC_LINK) {
      if (process.env.CSC_KEY_PASSWORD === undefined) throw new Error('CSC_KEY_PASSWORD is required for the Apple certificate')
      ;({ keychainFile } = await createKeychain({ tmpDir, cscLink: process.env.CSC_LINK, cscKeyPassword: process.env.CSC_KEY_PASSWORD, currentDir: directory }))
    }
    identity = await findIdentity('Developer ID Application', process.env.CSC_NAME, keychainFile)
    if (!identity) throw new Error('Provided Apple credentials have no Developer ID Application identity')
    await sign({ app, platform: 'darwin', identity: identity.name, keychain: keychainFile, preAutoEntitlements: false, preEmbedProvisioningProfile: false, optionsForFile: file => {
      const name = file.includes(' Helper (GPU).app') ? 'helper-gpu' : file.includes(' Helper (Renderer).app') ? 'helper-renderer' : file.includes(' Helper (Plugin).app') ? 'helper-plugin' : file.includes(' Helper.app') ? 'helper' : 'app'
      return { hardenedRuntime: true, entitlements: path.join(directory, `../../editors/code-oss/build/azure-pipelines/darwin/${name}-entitlements.plist`) }
    } })
    const verified = spawnSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'ignore' })
    if (verified.status !== 0) throw new Error('Apple app signature verification failed')
    if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID) await notarize({ appPath: app, appleId: process.env.APPLE_ID, appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD, teamId: process.env.APPLE_TEAM_ID })
    else console.log('Signed app; notarization secrets APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID are not all present')
  }
  const result = spawnSync(process.execPath, [path.join(directory, 'node_modules/electron-builder/out/cli/cli.js'), '--mac', 'dmg', '--universal', '--prepackaged', app, '--config', config, '--publish', 'never'], { cwd: directory, env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }, stdio: 'inherit' })
  if (result.error || result.status !== 0) throw new Error('Codeva DMG packaging failed')
  if (identity) {
    const dmg = path.join(directory, '../../artifacts/codeva-editor/MrCodevaa-mac-universal.dmg')
    const args = ['--force', '--sign', identity.name, ...(keychainFile ? ['--keychain', keychainFile] : []), dmg]
    if (spawnSync('codesign', args, { stdio: 'ignore' }).status !== 0 || spawnSync('codesign', ['--verify', dmg], { stdio: 'ignore' }).status !== 0) throw new Error('Apple DMG signing failed')
  }
} finally { if (keychainFile) await removeKeychain(keychainFile); await tmpDir.cleanup() }
