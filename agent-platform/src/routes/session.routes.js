import { Router } from 'express'
import { sessions } from '../ws/wsHandler.js'

const router = Router()

router.get('/', (req, res) => {
  const list = [...sessions.values()].map(o => o.getSnapshot())
  res.json({ sessions: list })
})

router.get('/:id/memory', (req, res) => {
  const orch = sessions.get(req.params.id)
  if (!orch) return res.status(404).json({ error: 'Session not found' })
  res.json(orch.memory.snapshot())
})

router.get('/:id/graph', (req, res) => {
  const orch = sessions.get(req.params.id)
  if (!orch) return res.status(404).json({ error: 'Session not found' })
  res.json(orch.graph?.snapshot() || { tasks: [] })
})

export { router as SessionRouter }
