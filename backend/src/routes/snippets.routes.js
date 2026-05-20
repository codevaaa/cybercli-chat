import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json({ snippets: [
    { id: '1', title: 'Debug my code', content: 'Find and fix bugs in the following code...', shortcut: '/debug' },
    { id: '2', title: 'Explain like I am 5', content: 'Explain the following concept in simple terms...', shortcut: '/eli5' },
    { id: '3', title: 'Write a tweet thread', content: 'Create a Twitter thread about...', shortcut: '/tweet' },
  ]})
})

router.post('/', requireAuth, (req, res) => {
  res.json({ id: 'snippet_' + Date.now(), ...req.body })
})

router.patch('/:id', requireAuth, (req, res) => {
  res.json({ id: req.params.id, ...req.body })
})

router.delete('/:id', requireAuth, (req, res) => {
  res.json({ deleted: req.params.id })
})

export default router
