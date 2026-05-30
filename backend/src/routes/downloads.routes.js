import { Router } from 'express'
import { Readable } from 'node:stream'
import { r2FileExists, getR2PublicUrl, isR2Available } from '../services/downloads/r2Service.js'

const router = Router()

const GITHUB_RELEASE_BASE = 'https://github.com/codevaaa/codeva/releases/latest/download'

// Map of friendly names to actual GitHub release filenames
const FILE_MAP = {
  'Codeva-win-x64.exe': 'Codeva-win-x64.exe',
  'Codeva-mac-universal.dmg': 'Codeva-mac-universal.dmg',
  'Codeva-linux-x64.AppImage': 'Codeva-linux-x64.AppImage',
  'Codeva-linux-x64.deb': 'Codeva-linux-x64.deb',
}

const DOWNLOAD_META = {
  'Codeva-win-x64.exe': { platform: 'windows', name: 'Codeva for Windows', size: '~78 MB', arch: 'x64' },
  'Codeva-mac-universal.dmg': { platform: 'macos', name: 'Codeva for Mac', size: '~80 MB', arch: 'universal' },
  'Codeva-linux-x64.AppImage': { platform: 'linux', name: 'Codeva for Linux (AppImage)', size: '~75 MB', arch: 'x64' },
  'Codeva-linux-x64.deb': { platform: 'linux', name: 'Codeva for Linux (.deb)', size: '~70 MB', arch: 'amd64' },
}

/**
 * Primary: R2 CDN redirect (fast, zero egress cost)
 * Fallback: GitHub proxy (streams through our server)
 */
router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params
    const githubFilename = FILE_MAP[filename]

    if (!githubFilename) {
      return res.status(404).json({ error: 'File not found' })
    }

    // --- Try R2 CDN first (fastest, cheapest) ---
    if (isR2Available()) {
      const exists = await r2FileExists(githubFilename)
      if (exists) {
        const cdnUrl = getR2PublicUrl(githubFilename)
        console.log(`[Download] R2 redirect: ${filename} → ${cdnUrl}`)
        // 302 redirect to CDN — user gets file directly from edge
        return res.redirect(302, cdnUrl)
      }
    }

    // --- Fallback: GitHub proxy ---
    console.log(`[Download] GitHub proxy: ${filename}`)
    const githubUrl = `${GITHUB_RELEASE_BASE}/${githubFilename}`

    const response = await fetch(githubUrl, {
      headers: { 'Accept': 'application/octet-stream' },
    })

    if (!response.ok) {
      return res.status(404).json({ error: 'Release file not found on GitHub' })
    }

    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }

    const nodeStream = Readable.fromWeb(response.body)
    nodeStream.pipe(res)

    nodeStream.on('error', (err) => {
      console.error('Download stream error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download failed' })
      }
    })

  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/v1/downloads
 * Returns available downloads with current source info
 */
router.get('/', (req, res) => {
  const r2Enabled = isR2Available()
  const downloads = Object.entries(DOWNLOAD_META).map(([filename, meta]) => ({
    ...meta,
    filename,
    url: `/api/v1/downloads/${filename}`,
    source: r2Enabled ? 'r2-cdn' : 'github-proxy',
  }))

  res.json({
    source: r2Enabled ? 'r2-cdn' : 'github-proxy',
    downloads,
  })
})

export default router
