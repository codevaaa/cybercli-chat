import { Router } from 'express'
import { Readable } from 'node:stream'

const router = Router()

const GITHUB_RELEASE_BASE = 'https://github.com/stilcybermindcli/cybercli-chat/releases/latest/download'

// Map of friendly names to actual GitHub release filenames
const FILE_MAP = {
  'CyberCli-win-x64.exe': 'CyberCli-win-x64.exe',
  'CyberCli-mac-universal.dmg': 'CyberCli-mac-universal.dmg',
  'CyberCli-linux-x64.AppImage': 'CyberCli-linux-x64.AppImage',
  'CyberCli-linux-x64.deb': 'CyberCli-linux-x64.deb',
}

/**
 * GET /api/v1/downloads/:filename
 * Proxies the download from GitHub releases so the user sees the website URL
 * but gets the file from GitHub behind the scenes.
 */
router.get('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params
    const githubFilename = FILE_MAP[filename]

    if (!githubFilename) {
      return res.status(404).json({ error: 'File not found' })
    }

    const githubUrl = `${GITHUB_RELEASE_BASE}/${githubFilename}`

    // Fetch from GitHub and stream back to client
    const response = await fetch(githubUrl, {
      headers: {
        'Accept': 'application/octet-stream',
      },
    })

    if (!response.ok) {
      return res.status(404).json({ error: 'Release file not found on GitHub' })
    }

    // Set headers to force download with the original filename
    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }

    // Stream the response body directly to client
    // response.body is a Web ReadableStream, convert to Node stream and pipe
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
 * Returns available downloads info
 */
router.get('/', (req, res) => {
  res.json({
    downloads: [
      {
        platform: 'windows',
        name: 'CyberCli for Windows',
        filename: 'CyberCli-win-x64.exe',
        url: '/api/v1/downloads/CyberCli-win-x64.exe',
        size: '~78 MB',
        arch: 'x64',
      },
      {
        platform: 'macos',
        name: 'CyberCli for Mac',
        filename: 'CyberCli-mac-universal.dmg',
        url: '/api/v1/downloads/CyberCli-mac-universal.dmg',
        size: '~80 MB',
        arch: 'universal',
      },
      {
        platform: 'linux',
        name: 'CyberCli for Linux (AppImage)',
        filename: 'CyberCli-linux-x64.AppImage',
        url: '/api/v1/downloads/CyberCli-linux-x64.AppImage',
        size: '~75 MB',
        arch: 'x64',
      },
      {
        platform: 'linux',
        name: 'CyberCli for Linux (.deb)',
        filename: 'CyberCli-linux-x64.deb',
        url: '/api/v1/downloads/CyberCli-linux-x64.deb',
        size: '~70 MB',
        arch: 'amd64',
      },
    ],
  })
})

export default router
