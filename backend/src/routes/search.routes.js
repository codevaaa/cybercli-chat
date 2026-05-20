import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const { q } = req.query
  res.json({
    query: q,
    results: [
      { type: 'chat', id: '1', title: 'Python async patterns', snippet: 'async def fetch_data(): ...', updated: '2m ago' },
      { type: 'message', id: 'm1', chat_id: '1', content: 'async/await is Python\'s way of...', updated: '2m ago' },
    ],
    total: 2,
  })
})

export default router
