import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import ImageUsage from '../models/ImageUsage.js'

const router = Router()

router.post('/generate', optionalAuth, async (req, res) => {
  const { prompt } = req.body

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required and must be a non-empty string' })
  }

  try {
    let isFree = true
    let identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown_ip'
    if (Array.isArray(identifier)) {
      identifier = identifier[0]
    }

    if (req.user) {
      isFree = req.user.plan === 'free'
      identifier = req.user.id
    }

    if (isFree) {
      let tz = req.headers['x-timezone'] || 'UTC'
      let today
      try {
        today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
      } catch (e) {
        today = new Date().toISOString().split('T')[0]
      }

      // 1. Try to increment count if the document already exists for today
      let usage = await ImageUsage.findOneAndUpdate(
        { identifier, date: today },
        { $inc: { count: 1 } },
        { new: true }
      )

      // 2. If it doesn't exist for today, upsert/reset it to today with count 1
      if (!usage) {
        usage = await ImageUsage.findOneAndUpdate(
          { identifier },
          { $set: { date: today, count: 1 } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      }

      // 3. Enforce the limit of 5 images per day
      if (usage.count > 5) {
        // Caps it at 5 so it doesn't keep increasing
        await ImageUsage.updateOne({ identifier, date: today }, { $set: { count: 5 } })
        return res.status(429).json({ 
          error: 'Daily limit of 5 free image generations reached. Please upgrade to Pro for unlimited image generation.',
          resetAt: 'midnight' // Signal to frontend to show local midnight timer
        })
      }
    }

    let imageUrl = null

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiKey = process.env.CLOUDFLARE_API_KEY1

    if (accountId && apiKey) {
      try {
        const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt: prompt.trim() })
        })
        
        if (cfResponse.ok) {
          const buffer = await cfResponse.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          imageUrl = `data:image/jpeg;base64,${base64}`
        } else {
          console.error('Cloudflare image generation failed, falling back to Pollinations:', await cfResponse.text())
        }
      } catch (e) {
        console.error('Cloudflare fetch error:', e)
      }
    }

    if (!imageUrl) {
      // Fallback to Pollinations (proxied via backend to fix desktop client issues)
      const sanitizedPrompt = encodeURIComponent(prompt.trim())
      const pollUrl = `https://image.pollinations.ai/p/${sanitizedPrompt}?width=1024&height=1024&nologo=true`
      
      try {
        const pollResponse = await fetch(pollUrl)
        if (pollResponse.ok) {
          const buffer = await pollResponse.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          imageUrl = `data:image/jpeg;base64,${base64}`
        } else {
          // If fetch fails, fallback to direct URL
          imageUrl = pollUrl
        }
      } catch (e) {
        console.error('Pollinations fetch error:', e)
        imageUrl = pollUrl
      }
    }

    return res.json({ url: imageUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error during image generation' })
  }
})

router.get('/usage', optionalAuth, async (req, res) => {
  try {
    let identifier = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown_ip'
    if (Array.isArray(identifier)) {
      identifier = identifier[0]
    }
    let isFree = true

    if (req.user) {
      isFree = req.user.plan === 'free'
      identifier = req.user.id
    }

    if (!isFree) {
      return res.json({ limit: 'unlimited', count: 0, isPro: true })
    }

    let tz = req.headers['x-timezone'] || 'UTC'
    let today
    try {
      today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
    } catch (e) {
      today = new Date().toISOString().split('T')[0]
    }

    const usage = await ImageUsage.findOne({ identifier, date: today })
    const count = usage ? usage.count : 0

    return res.json({ limit: 5, count, isPro: false })
  } catch (error) {
    console.error('Image usage fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch image usage' })
  }
})
router.get('/generate-direct', async (req, res) => {
  const { prompt } = req.query
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).send('Prompt is required')
  }

  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiKey = process.env.CLOUDFLARE_API_KEY1

    if (accountId && apiKey) {
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt.trim() })
      })
      
      if (cfResponse.ok) {
        const json = await cfResponse.json()
        if (json.success && json.result && json.result.image) {
          const buffer = Buffer.from(json.result.image, 'base64')
          res.setHeader('Content-Type', 'image/jpeg')
          return res.send(buffer)
        }
      }
    }

    // Fallback to Pollinations
    const sanitizedPrompt = encodeURIComponent(prompt.trim())
    const pollUrl = `https://image.pollinations.ai/p/${sanitizedPrompt}?width=1024&height=1024&nologo=true`
    const pollResponse = await fetch(pollUrl)
    if (pollResponse.ok) {
      const buffer = await pollResponse.arrayBuffer()
      res.setHeader('Content-Type', 'image/jpeg')
      return res.send(Buffer.from(buffer))
    }

    res.status(500).send('Failed to generate image')
  } catch (error) {
    console.error('Image generation error:', error)
    res.status(500).send('Internal server error')
  }
})

export default router
