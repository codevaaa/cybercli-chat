import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Feedback from '../models/Feedback.js'

const router = Router()

// GET /api/v1/feedback
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ is_public: true }).sort({ createdAt: -1 })
    res.json(feedbacks)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// POST /api/v1/feedback
router.post('/', requireAuth, async (req, res) => {
  const { quote, stars, role = 'Developer', company = '', name } = req.body

  if (!quote || quote.trim().length < 10) {
    return res.status(400).json({ error: 'Feedback message must be at least 10 characters long.' })
  }

  const rating = Number(stars)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' })
  }

  try {
    const userEmail = req.user.email
    const resolvedName = name || userEmail.split('@')[0]
    
    // Generate initials
    const initials = resolvedName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'

    // Choose a random accent color
    const accentColors = ['#D97757', '#7C3AED', '#06B6D4', '#10B981', '#F59E0B']
    const randomColor = accentColors[Math.floor(Math.random() * accentColors.length)]

    const newFeedback = new Feedback({
      user_id: req.user.id,
      name: resolvedName,
      initials,
      quote: quote.trim(),
      role,
      company,
      stars: rating,
      accentColor: randomColor,
      is_public: true
    })

    await newFeedback.save()
    res.status(201).json(newFeedback)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
