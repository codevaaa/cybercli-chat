/**
 * Generate Chrome Extension icon PNGs from SVG.
 * Run: node generate-icons.js
 * 
 * If you don't have canvas/sharp installed, this creates placeholder icons
 * using raw PNG byte generation (no dependencies needed).
 */

const fs = require('fs')
const path = require('path')

// Minimal valid PNG generator (creates a solid colored square with a "C" shape)
// This generates real PNG files without any npm dependencies

function createPNG(size, bgR, bgG, bgB) {
  // PNG file structure
  const width = size
  const height = size

  // Create raw pixel data (RGBA)
  const pixels = Buffer.alloc(width * height * 4)
  
  const centerX = width / 2
  const centerY = height / 2
  const outerR = width * 0.4
  const innerR = width * 0.25
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const dx = x - centerX
      const dy = y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      // Draw a "C" shape (circle with gap on right)
      const angle = Math.atan2(dy, dx)
      const isInRing = dist >= innerR && dist <= outerR
      const isNotGap = !(angle > -0.6 && angle < 0.6) // Gap on right side
      
      if (isInRing && isNotGap) {
        // Accent color (#D97757)
        pixels[idx] = 217     // R
        pixels[idx + 1] = 119 // G
        pixels[idx + 2] = 87  // B
        pixels[idx + 3] = 255 // A
      } else if (dist <= outerR + 2) {
        // Dark background
        pixels[idx] = 15      // R
        pixels[idx + 1] = 15  // G
        pixels[idx + 2] = 21  // B
        pixels[idx + 3] = 255 // A
      } else {
        // Transparent
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
      }
    }
  }

  // Encode as PNG
  return encodePNG(width, height, pixels)
}

function encodePNG(width, height, pixels) {
  const zlib = require('zlib')
  
  // Add filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0 // Filter: None
    pixels.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  
  const compressed = zlib.deflateSync(rawData)
  
  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type (RGBA)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = createChunk('IHDR', ihdr)
  
  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed)
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0))
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  
  const typeBuffer = Buffer.from(type)
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData))
  
  return Buffer.concat([length, typeBuffer, data, crc])
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// Generate all sizes
const sizes = [16, 32, 48, 128]
const outDir = path.join(__dirname, 'assets', 'icons')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true })
}

for (const size of sizes) {
  const png = createPNG(size)
  const outPath = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(outPath, png)
  console.log(`✓ Generated ${outPath} (${png.length} bytes)`)
}

console.log('\nAll icons generated! You can now load the extension in Chrome.')
