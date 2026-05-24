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
      const today = new Date().toISOString().split('T')[0]

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
          error: 'Daily limit of 5 free image generations reached. Please upgrade to Pro for unlimited image generation.' 
        })
      }
    }

    // Generate the Pollinations AI URL (unlimited, fast, high-quality)
    const sanitizedPrompt = encodeURIComponent(prompt.trim())
    const imageUrl = `https://image.pollinations.ai/p/${sanitizedPrompt}?width=1024&height=1024&nologo=true`

    return res.json({ url: imageUrl })
  } catch (error) {
    console.error('Image generation error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error during image generation' })
  }
})

export default router
