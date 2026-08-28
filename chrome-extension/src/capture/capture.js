/**
 * Codeva — Full Page Screenshot stitcher.
 * Reads captured viewport segments from storage, draws them onto a single
 * canvas at the correct offsets, and offers PNG/JPG download + copy (GoFullPage-style).
 */

async function init() {
  const { fullPageCapture } = await chrome.storage.local.get('fullPageCapture')
  if (!fullPageCapture || !fullPageCapture.segments?.length) {
    document.getElementById('status').textContent = 'No capture data found.'
    return
  }

  const { segments, totalHeight, viewportWidth, devicePixelRatio, url, title } = fullPageCapture
  const dpr = devicePixelRatio || 1

  document.getElementById('meta').textContent = title || url || ''

  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = viewportWidth * dpr
  canvas.height = totalHeight * dpr

  // Load and draw each segment
  for (const seg of segments) {
    await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Draw at the segment's y offset (scaled by DPR)
        ctx.drawImage(img, 0, seg.y * dpr)
        resolve()
      }
      img.onerror = resolve
      img.src = seg.dataUrl
    })
  }

  // Show preview
  const preview = document.getElementById('preview')
  preview.src = canvas.toDataURL('image/png')
  preview.style.display = 'block'
  document.getElementById('status').style.display = 'none'

  // Download / copy handlers
  const download = (type, ext) => {
    const dataUrl = canvas.toDataURL(type, 0.92)
    const a = document.createElement('a')
    const safeName = (title || 'codeva-screenshot').replace(/[^a-z0-9]+/gi, '-').slice(0, 50)
    a.href = dataUrl
    a.download = `${safeName}.${ext}`
    a.click()
  }

  document.getElementById('btn-png').onclick = () => download('image/png', 'png')
  document.getElementById('btn-jpg').onclick = () => download('image/jpeg', 'jpg')
  document.getElementById('btn-copy').onclick = async () => {
    try {
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      document.getElementById('btn-copy').textContent = 'Copied ✓'
    } catch {
      document.getElementById('btn-copy').textContent = 'Copy failed'
    }
  }

  // Clean up storage
  chrome.storage.local.remove('fullPageCapture')
}

init()
