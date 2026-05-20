import { Router } from 'express'

const router = Router()

router.post('/user-created', (req, res) => {
  const { user } = req.body
  console.log('New user created webhook:', user?.id)
  // Create corresponding MongoDB user document
  res.json({ received: true, action: 'user_created' })
})

router.post('/user-deleted', (req, res) => {
  const { user } = req.body
  console.log('User deleted webhook:', user?.id)
  // Clean up MongoDB data
  res.json({ received: true, action: 'user_deleted' })
})

export default router
