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
    let identifier = req.ip // Guest fallback identifier is IP address

    if (req.user) {
      isFree = req.user.plan === 'free'
      identifier = req.user.id
    }

    if (isFree) {
      const today = new Date().toISOString().split('T')[0]
      let usage = await ImageUsage.findOne({ identifier })

      if (usage) {
        if (usage.date === today) {
          if (usage.count >= 5) {
            return res.status(429).json({ 
              error: 'Daily limit of 5 free image generations reached. Please upgrade to Pro for unlimited image generation.' 
            })
          }
          usage.count += 1
        } else {
          usage.date = today
          usage.count = 1
        }
        await usage.save()
      } else {
        usage = new ImageUsage({ identifier, date: today, count: 1 })
        await usage.save()
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
