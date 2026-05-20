import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'

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

router.post('/:id/messages', requireAuth, async (req, res) => {
  const { messages, model, temperature } = req.body
  
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const generator = await llmGateway.complete({ messages, model, temperature })
    
    for await (const chunk of generator) {
      if (chunk.type === 'token') {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        res.end()
        return
      } else if (chunk.type === 'info') {
        res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'done') {
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
    res.end()
  }
})

router.get('/:id/messages', requireAuth, (req, res) => {
  res.json({ messages: [] })
})

export default router
