import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import Message from '../models/Message.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const totalMessages = await Message.countDocuments({ user_id: req.user.id })
    
    // Sum tokens_in and tokens_out
    const tokenStats = await Message.aggregate([
      { $match: { user_id: req.user.id } },
      {
        $group: {
          _id: null,
          total_tokens_in: { $sum: '$tokens_in' },
          total_tokens_out: { $sum: '$tokens_out' }
        }
      }
    ])

    const totalTokensIn = tokenStats[0]?.total_tokens_in || 0
    const totalTokensOut = tokenStats[0]?.total_tokens_out || 0
    const currentPlan = req.user.plan || 'free'
    
    // Limits
    const limitTotal = currentPlan === 'pro' ? 500 : 50
    const limitRemaining = Math.max(0, limitTotal - totalMessages)

    res.json({
      total_messages: totalMessages,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      current_plan: currentPlan,
      rate_limit_remaining: limitRemaining,
      rate_limit_total: limitTotal,
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
          requests: { $sum: 1 },
          tokens_in: { $sum: "$tokens_in" },
          tokens_out: { $sum: "$tokens_out" }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]
    const results = await Message.aggregate(pipeline)
    
    const formatted = results.map(r => ({
      date: r._id.date,
      model: r._id.model || 'Unknown',
      requests: r.requests,
      tokens_in: r.tokens_in || 0,
      tokens_out: r.tokens_out || 0
    }))
    
    res.json({ history: formatted })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

