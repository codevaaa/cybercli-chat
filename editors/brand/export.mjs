// Raster exports of the repository-native SVG; no imported marketing artwork.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = path.join(root, 'editors/brand'), output = path.join(root, 'editors/branding')
const require = createRequire(path.join(root, 'backend/package.json'))
const { chromium } = require('playwright')
const master = await fs.readFile(path.join(directory, 'prism-m.svg'), 'utf8')
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const icons = []
  for (const size of [16, 32, 48, 64, 70, 128, 150, 192, 256, 512, 1024]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:100vw;height:100vh}</style>${master}`)
    const png = await page.screenshot({ omitBackground: true })
    await fs.writeFile(path.join(directory, `prism-m-${size}.png`), png)
    if ([16, 32, 48, 64, 128, 256].includes(size)) icons.push({ size, png })
    const names = { 70: 'code_70x70.png', 150: 'code_150x150.png', 192: 'code-192.png', 512: 'code-512.png', 1024: 'code.png' }
    if (names[size]) await fs.writeFile(path.join(output, names[size]), png)
  }
  const header = Buffer.alloc(6 + 16 * icons.length); header.writeUInt16LE(1, 2); header.writeUInt16LE(icons.length, 4)
  let offset = header.length
  for (const [i, { size, png }] of icons.entries()) { const at = 6 + i * 16; header[at] = header[at + 1] = size === 256 ? 0 : size; header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6); header.writeUInt32LE(png.length, at + 8); header.writeUInt32LE(offset, at + 12); offset += png.length }
  const ico = Buffer.concat([header, ...icons.map(icon => icon.png)])
  for (const name of ['code.ico', 'favicon.ico']) await fs.writeFile(path.join(output, name), ico)
  await fs.writeFile(path.join(output, 'code-icon.svg'), master)
  for (const scale of [100, 125, 150, 175, 200, 225, 250]) for (const kind of ['big', 'small']) {
    const width = Math.round((kind === 'big' ? 164 : 55) * scale / 100), height = Math.round((kind === 'big' ? 314 : 55) * scale / 100)
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>html,body{margin:0;background:#0B0C0F;color:#F6F1E7;font:600 ${14 * scale / 100}px "Segoe UI",sans-serif;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center}svg{width:${kind === 'big' ? 90 : 46}%;height:auto}p{margin:10px 0}</style>${master}${kind === 'big' ? '<p>MrCodevaa</p>' : ''}`)
    await page.screenshot({ path: path.join(directory, `inno-${kind}-${scale}.png`) })
  }
} finally { await browser.close() }
const conversion = spawnSync(process.env.CODEVA_BUILD_PYTHON || 'python', ['-c', "from PIL import Image; from pathlib import Path; import sys; b=Path(sys.argv[1]); o=Path(sys.argv[2]); Image.open(b/'prism-m-1024.png').save(o/'code.icns'); [Image.open(f).convert('RGB').save(f.with_suffix('.bmp')) for f in b.glob('inno-*.png')]", directory, output], { stdio: 'inherit', windowsHide: true })
if (conversion.error || conversion.status !== 0) throw new Error('Install Pillow for PNG to ICNS/BMP build exports')
console.log('Exported the original Prism M SVG to platform icons and Inno branding')
