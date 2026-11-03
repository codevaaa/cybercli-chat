// Codeva signing hook for the pinned upstream Inno Setup pipeline.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const link = process.env.WIN_CSC_LINK || process.env.CSC_LINK
if (!link) throw new Error('WIN_CSC_LINK is required when signing is requested')
const password = process.env.WIN_CSC_KEY_PASSWORD ?? process.env.CSC_KEY_PASSWORD
if (password === undefined) throw new Error('WIN_CSC_KEY_PASSWORD is required when signing is requested')
const filename = process.argv[2]
if (!filename || !fs.statSync(filename).isFile()) throw new Error('An existing release binary is required')
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'codeva-sign-'))
const certificate = path.join(directory, 'certificate.pfx')
try {
  if (/^https:\/\//.test(link)) {
    const result = await fetch(link, { signal: AbortSignal.timeout(30000), redirect: 'error' })
    if (!result.ok) throw new Error('Certificate download failed')
    const data = Buffer.from(await result.arrayBuffer())
    if (data.length > 1000000) throw new Error('Certificate exceeds limits')
    fs.writeFileSync(certificate, data)
  } else if (link.startsWith('file://') || fs.existsSync(link)) fs.copyFileSync(link.startsWith('file://') ? fileURLToPath(link) : link, certificate)
  else fs.writeFileSync(certificate, Buffer.from(link, 'base64'))
  const sdk = path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Windows Kits/10/bin')
  const candidates = fs.readdirSync(sdk).filter(name => /^10\./.test(name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map(name => path.join(sdk, name, 'x64/signtool.exe'))
  const tool = process.env.CODEVA_SIGNTOOL || candidates.find(file => fs.existsSync(file))
  if (!tool) throw new Error('Windows SDK signtool is required')
  const result = spawnSync(tool, ['sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', 'http://timestamp.digicert.com', '/f', certificate, '/p', password, filename], { stdio: 'ignore', windowsHide: true })
  if (result.error || result.status !== 0) throw new Error('Windows release signing failed; secret arguments were suppressed')
  console.log('Signed release binary')
} finally { if (fs.existsSync(certificate)) fs.unlinkSync(certificate); fs.rmdirSync(directory) }
