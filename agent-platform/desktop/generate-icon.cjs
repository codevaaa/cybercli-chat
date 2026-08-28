/**
 * Generates a 512x512 PNG icon for the Agent Platform desktop app.
 * electron-builder auto-derives .ico/.icns from a 512px PNG named icon.png.
 * Run: node generate-icon.cjs
 */
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const t = Buffer.from(type)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function png(size) {
  const px = Buffer.alloc(size * size * 4)
  const cx = size / 2, cy = size / 2, outer = size * 0.42, inner = size * 0.26
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy)
    const ang = Math.atan2(dy, dx)
    const ring = dist >= inner && dist <= outer
    const gap = ang > -0.55 && ang < 0.55
    if (ring && !gap) { px[i]=217; px[i+1]=119; px[i+2]=87; px[i+3]=255 }
    else if (dist <= outer + 2) { px[i]=15; px[i+1]=15; px[i+2]=21; px[i+3]=255 }
    else { px[i+3]=0 }
  }
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) { raw[y*(size*4+1)] = 0; px.copy(raw, y*(size*4+1)+1, y*size*4, (y+1)*size*4) }
  const comp = zlib.deflateSync(raw)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8]=8; ihdr[9]=6
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', comp), chunk('IEND', Buffer.alloc(0)),
  ])
}

const dir = path.join(__dirname, 'assets')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'icon.png'), png(512))
// Linux needs a set of sizes in an 'icons' dir
const iconsDir = path.join(dir, 'icons')
fs.mkdirSync(iconsDir, { recursive: true })
for (const s of [512, 256, 128, 64, 48, 32, 16]) {
  fs.writeFileSync(path.join(iconsDir, `${s}x${s}.png`), png(s))
}
console.log('Generated agent-platform desktop icons in assets/')
