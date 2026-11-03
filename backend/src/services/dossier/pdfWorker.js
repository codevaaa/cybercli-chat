import { fileURLToPath } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

process.once('message', async data => {
const task = getDocument({ data: new Uint8Array(data), verbosity: 0, isEvalSupported: false, useSystemFonts: false, disableFontFace: true, standardFontDataUrl: fileURLToPath(new URL('../../../node_modules/pdfjs-dist/standard_fonts/', import.meta.url)).replace(/\\/g, '/') })
let result
try {
  const pdf = await task.promise
  if (pdf.numPages > 100) throw new Error('PDF exceeds 100 pages')
  const pages = []; let total = 0
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent()
    const text = content.items.map(i => i.str || '').join(' ')
    total += text.length
    if (total > 200000) throw new Error('Extracted PDF text exceeds limits')
    pages.push({ page, text })
  }
  result = { pages }
} catch { result = { error: 'PDF could not be read within the text limits; upload notes instead' } }
finally { await task.destroy() }
process.send(result, () => process.disconnect())
})
