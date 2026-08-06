import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Feedback from '../models/Feedback.js'

const router = Router()

// GET /api/v1/feedback — returns all public feedback, newest first
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ is_public: true })
      .sort({ createdAt: -1 })
      .limit(50) // cap to 50 so the page doesn't load hundreds of entries
    res.json(feedbacks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/v1/feedback — authenticated users only
router.post('/', requireAuth, async (req, res) => {
  const { quote, stars, role = 'Developer', company = '', name } = req.body

  if (!quote || quote.trim().length < 10) {
    return res.status(400).json({ error: 'Feedback message must be at least 10 characters long.' })
  }

  if (quote.trim().length > 500) {
    return res.status(400).json({ error: 'Feedback message cannot exceed 500 characters.' })
  }

  const rating = Number(stars)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' })
  }

  try {
    // Prevent spam — one submission per user per 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = await Feedback.findOne({ user_id: req.user.id, createdAt: { $gte: yesterday } })
    if (recent) {
      return res.status(429).json({ error: 'You have already submitted feedback recently. Please wait 24 hours before submitting again.' })
    }

    const userEmail = req.user.email || ''
    const resolvedName = (name || userEmail.split('@')[0] || 'Anonymous').slice(0, 60)
    
    const initials = resolvedName
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

    const accentColors = ['#D97757', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B']
    const randomColor = accentColors[Math.floor(Math.random() * accentColors.length)]

    const newFeedback = new Feedback({
      user_id: req.user.id,
      name: resolvedName,
      initials,
      quote: quote.trim(),
      role: (role || 'Developer').slice(0, 80),
      company: (company || '').slice(0, 80),
      stars: rating,
      accentColor: randomColor,
      is_public: true,
    })

    await newFeedback.save()
    res.status(201).json(newFeedback)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
