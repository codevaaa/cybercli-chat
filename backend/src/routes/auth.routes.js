import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

router.post('/refresh', (req, res) => {
  res.json({ message: 'Token refresh endpoint' })
})

router.delete('/sessions/:id', requireAuth, (req, res) => {
  res.json({ message: 'Session revoked', id: req.params.id })
})

export default router
