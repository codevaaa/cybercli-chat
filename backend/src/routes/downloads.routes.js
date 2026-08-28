import { Router } from 'express'
import { Readable } from 'node:stream'
import { r2FileExists, getR2PublicUrl, isR2Available } from '../services/downloads/r2Service.js'

const router = Router()

const GITHUB_REPO = 'https://github.com/codevaaa/cybercli-chat/releases'
const GITHUB_RELEASE_BASE = `${GITHUB_REPO}/latest/download`

// Map of friendly names to { file, tag } — desktop app uses 'latest',
// Agent Platform uses its own 'agent-v1.0.0' tag.
const FILE_MAP = {
  'Codeva-win-x64.exe': { file: 'Codeva-win-x64.exe', tag: 'latest' },
  'Codeva-mac-universal.dmg': { file: 'Codeva-mac-universal.dmg', tag: 'latest' },
  'Codeva-linux-x64.AppImage': { file: 'Codeva-linux-x64.AppImage', tag: 'latest' },
  'Codeva-linux-x64.deb': { file: 'Codeva-linux-x64.deb', tag: 'latest' },
  // Agent Platform — separate release tag
  'CodeVaa-Agent-Platform-win-x64.exe': { file: 'CodeVaa-Agent-Platform-1.0.0-win-x64.exe', tag: 'agent-v1.0.0' },
  'CodeVaa-Agent-Platform-mac-x64.dmg': { file: 'CodeVaa-Agent-Platform-1.0.0-mac-x64.dmg', tag: 'agent-v1.0.0' },
  'CodeVaa-Agent-Platform-linux-x64.AppImage': { file: 'CodeVaa-Agent-Platform-1.0.0-linux-x64.AppImage', tag: 'agent-v1.0.0' },
}

const DOWNLOAD_META = {
  'Codeva-win-x64.exe': { platform: 'windows', name: 'Codeva for Windows', size: '~78 MB', arch: 'x64' },
  'Codeva-mac-universal.dmg': { platform: 'macos', name: 'Codeva for Mac', size: '~80 MB', arch: 'universal' },
  'Codeva-linux-x64.AppImage': { platform: 'linux', name: 'Codeva for Linux (AppImage)', size: '~75 MB', arch: 'x64' },
  'Codeva-linux-x64.deb': { platform: 'linux', name: 'Codeva for Linux (.deb)', size: '~70 MB', arch: 'amd64' },
  'CodeVaa-Agent-Platform-win-x64.exe': { platform: 'windows', name: 'Agent Platform for Windows', size: '~85 MB', arch: 'x64' },
  'CodeVaa-Agent-Platform-mac-x64.dmg': { platform: 'macos', name: 'Agent Platform for Mac', size: '~90 MB', arch: 'x64' },
  'CodeVaa-Agent-Platform-linux-x64.AppImage': { platform: 'linux', name: 'Agent Platform for Linux', size: '~80 MB', arch: 'x64' },
}

/**
 * Primary: R2 CDN redirect (fast, zero egress cost)
 * Fallback: GitHub proxy (streams through our server)
 */
router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params
    const entry = FILE_MAP[filename]

    if (!entry) {
      return res.status(404).json({ error: 'File not found' })
    }
    const githubFilename = entry.file
    const isAgentPlatform = entry.tag !== 'latest'

    // --- Try R2 CDN first (fastest, cheapest) ---
    if (isR2Available()) {
      const exists = await r2FileExists(githubFilename)
      if (exists) {
        const cdnUrl = getR2PublicUrl(githubFilename)
        console.log(`[Download] R2 redirect: ${filename} → ${cdnUrl}`)
        return res.redirect(302, cdnUrl)
      }
    }

    // --- GitHub: build URL from the correct release tag ---
    const githubUrl = entry.tag === 'latest'
      ? `${GITHUB_REPO}/latest/download/${githubFilename}`
      : `${GITHUB_REPO}/download/${entry.tag}/${githubFilename}`

    console.log(`[Download] Redirect to GitHub: ${githubUrl}`)

    // Check if the release asset actually exists (HEAD request)
    let head
    try {
      head = await fetch(githubUrl, { method: 'HEAD', redirect: 'follow' })
    } catch {
      head = { ok: false }
    }

    if (!head.ok) {
      // Asset not built/uploaded yet — give a helpful message instead of raw 404
      if (isAgentPlatform) {
        return res.status(503).json({
          error: 'Agent Platform installer is being built. Please check back shortly, or visit the releases page.',
          releasesUrl: `${GITHUB_REPO}`,
          building: true,
        })
      }
      return res.status(404).json({ error: 'Release file not found on GitHub', releasesUrl: `${GITHUB_REPO}` })
    }

    // Redirect the browser straight to GitHub's CDN (faster, no proxy load)
    return res.redirect(302, githubUrl)

    // (Legacy proxy path below is unreachable but kept for reference)
    // eslint-disable-next-line no-unreachable
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

/**
 * GET /api/v1/downloads/extension/version
 * Returns the latest extension version and update download URL.
 */
router.get('/extension/version', (req, res) => {
  res.json({
    version: '0.2.0',
    minCompatibleVersion: '0.1.0',
    downloadUrl: 'https://github.com/codevaaa/cybercoder/archive/refs/heads/master.zip'
  })
})

export default router
