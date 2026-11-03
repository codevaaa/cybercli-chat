import { initTheme } from '../lib/theme.js'
const $ = id => document.getElementById(id)
async function renderCapture() {
  await initTheme()
  const id = new URL(location.href).searchParams.get('id')
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('No capture found. Capture a page from the Codeva context menu.')
  const key = `capture:${id}`, capture = (await chrome.storage.session.get(key))[key]
  if (!capture?.segments?.length) throw new Error('This capture has expired. Capture the page again.')
  $('source').textContent = `${capture.title || 'Webpage'} · ${capture.url || ''}`
  const canvas = $('canvas'), first = new Image()
  first.src = capture.segments[0].dataUrl; await first.decode()
  const scale = first.naturalWidth / capture.viewportWidth
  canvas.width = first.naturalWidth; canvas.height = Math.ceil(capture.totalHeight * scale)
  if (canvas.width * canvas.height > 60000000 || canvas.height > 32767) throw new Error('This capture exceeds the image size limit.')
  const context = canvas.getContext('2d')
  for (const segment of capture.segments) {
    const image = new Image(); image.src = segment.dataUrl; await image.decode()
    context.drawImage(image, 0, Math.round(segment.y * scale))
  }
  const url = canvas.toDataURL('image/png')
  if (url === 'data:,') throw new Error('Could not assemble this image. Try a smaller page.')
  $('download').href = url; $('download').download = 'codeva-page.png'; $('download').hidden = false
  canvas.hidden = false; $('status').textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} pixels · saved only for this browser session`
}
renderCapture().catch(error => { $('status').textContent = error.message })
