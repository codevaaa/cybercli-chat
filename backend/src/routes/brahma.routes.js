import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const isLoopbackBase = value => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
  } catch {
    return false
  }
}

export function createBrahmaRouter({ auth = requireAuth, fetchImpl = globalThis.fetch } = {}) {
  const router = Router()
  router.post('/build', auth, async (req, res) => {
    const { prompt, image_data_url, max_repairs = 2 } = req.body || {}
    if (typeof prompt !== 'string' || prompt.trim().length < 20 || prompt.length > 6000) {
      return res.status(400).json({ error: 'prompt must contain 20 to 6000 characters' })
    }
    if (image_data_url != null && (typeof image_data_url !== 'string' || image_data_url.length > 9_800_000 || !/^data:image\/(png|jpeg|webp);base64,/.test(image_data_url))) {
      return res.status(400).json({ error: 'image_data_url must be an inline PNG, JPEG, or WebP below the request-size limit' })
    }
    if (!Number.isInteger(max_repairs) || max_repairs < 0 || max_repairs > 2) {
      return res.status(400).json({ error: 'max_repairs must be an integer between 0 and 2' })
    }
    const baseURL = (process.env.BRAHMA_BASE_URL || 'http://127.0.0.1:8765/v1').replace(/\/+$/, '')
    const apiKey = process.env.BRAHMA_API_KEY
    if (!apiKey || !isLoopbackBase(baseURL)) {
      return res.status(503).json({ error: 'Brahma local API is not configured on loopback' })
    }
    try {
      const response = await fetchImpl(`${baseURL}/builder/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ prompt: prompt.trim(), ...(image_data_url ? { image_data_url } : {}), max_repairs }),
        signal: AbortSignal.timeout(15 * 60 * 1000),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return res.status(response.status).json({ error: payload.detail || 'Brahma local builder request failed' })
      return res.status(payload.success ? 200 : 422).json(payload)
    } catch (error) {
      const code = error?.name === 'TimeoutError' ? 504 : 503
      return res.status(code).json({ error: code === 504 ? 'Brahma local build exceeded its time limit' : 'Brahma local API is unavailable' })
    }
  })
  return router
}

export default createBrahmaRouter()
