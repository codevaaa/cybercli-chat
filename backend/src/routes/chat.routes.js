import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/', requireAuth, (req, res) => {
  res.json({ id: 'thread_' + Date.now(), title: 'New Chat', created_at: new Date().toISOString() })
})

router.get('/', requireAuth, (req, res) => {
  res.json({ threads: [] })
})

router.get('/:id', requireAuth, (req, res) => {
  res.json({ id: req.params.id, title: 'Demo Thread', messages: [] })
})

router.patch('/:id', requireAuth, (req, res) => {
  res.json({ id: req.params.id, ...req.body })
})

router.delete('/:id', requireAuth, (req, res) => {
  res.json({ deleted: req.params.id })
})

router.post('/:id/fork', requireAuth, (req, res) => {
  res.json({ original_id: req.params.id, forked_id: 'thread_fork_' + Date.now() })
})

router.post('/:id/messages', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('data: {"type":"start"}\n\n')
  setTimeout(() => {
    res.write('data: {"type":"token","content":"Demo "}\n\n')
    setTimeout(() => {
      res.write('data: {"type":"token","content":"response."}\n\n')
      res.write('data: {"type":"done"}\n\n')
      res.end()
    }, 300)
  }, 300)
})

router.get('/:id/messages', requireAuth, (req, res) => {
  res.json({ messages: [] })
})

export default router
