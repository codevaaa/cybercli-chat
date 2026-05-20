import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json({
    total_messages: 1247,
    total_tokens_in: 45600,
    total_tokens_out: 38900,
    current_plan: req.user.plan || 'free',
    rate_limit_remaining: req.user.plan === 'pro' ? 423 : 38,
    rate_limit_total: req.user.plan === 'pro' ? 500 : 50,
  })
})

router.get('/history', requireAuth, (req, res) => {
  res.json({
    history: [
      { date: '2026-05-20', tokens_in: 1200, tokens_out: 980, requests: 24 },
      { date: '2026-05-19', tokens_in: 3400, tokens_out: 2100, requests: 56 },
      { date: '2026-05-18', tokens_in: 2100, tokens_out: 1800, requests: 42 },
    ],
  })
})

export default router
