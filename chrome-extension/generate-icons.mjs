import { chromium } from '../backend/node_modules/playwright/index.mjs'
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { BRAND_LOGO } from './src/lib/brand.js'

const destination = fileURLToPath(new URL('./assets/icons/', import.meta.url))
await mkdir(destination, { recursive: true })
await writeFile(new URL('./assets/icons/codeva-mark.svg', import.meta.url), BRAND_LOGO + '\n')
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 })
  for (const size of [16, 32, 48, 128, 256, 512]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{width:100%;height:100%;display:block}</style>${BRAND_LOGO}`)
    await page.screenshot({ path: `${destination}/icon-${size}.png`, omitBackground: true, scale: 'css' })
  }
} finally { await browser.close() }
console.log('Generated Codeva SVG and 16–512px toolbar icons.')
