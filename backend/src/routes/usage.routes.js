import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Message from '../models/Message.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments({ user_id: req.user.id })
    res.json({
      total_messages: totalMessages,
      total_tokens_in: 0,
      total_tokens_out: 0,
      current_plan: req.user.plan || 'free',
      rate_limit_remaining: req.user.plan === 'pro' ? 423 : 38,
      rate_limit_total: req.user.plan === 'pro' ? 500 : 50,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/history', requireAuth, async (req, res) => {
  try {
    const pipeline = [
      { $match: { user_id: req.user.id, role: 'assistant' } },
      { 
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            model: "$model"
          },
          requests: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]
    const results = await Message.aggregate(pipeline)
    
    const formatted = results.map(r => ({
      date: r._id.date,
      model: r._id.model,
      requests: r.requests,
      tokens_in: 0,
      tokens_out: 0
    }))
    
    res.json({ history: formatted })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
