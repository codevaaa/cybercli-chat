import { Router } from 'express'
import { sessions } from '../ws/wsHandler.js'
import { Orchestrator } from '../orchestrator/Orchestrator.js'
import { v4 as uuid } from 'uuid'

const router = Router()

// GET /api/platform/status
router.get('/status', (req, res) => {
  res.json({
    status:   'running',
    sessions: [...sessions.values()].map(o => o.getSnapshot()),
    count:    sessions.size,
  })
})

// POST /api/platform/run — HTTP (non-WS) trigger for a session
router.post('/run', async (req, res) => {
  const { goal, projectPath, projectContext, maxParallel, sessionId: reqSId } = req.body
  if (!goal) return res.status(400).json({ error: 'goal is required' })

  const sessionId = reqSId || uuid()
  const orch      = new Orchestrator({ sessionId, projectPath, projectContext, maxParallel })
  sessions.set(sessionId, orch)

  // Run async — return session ID immediately
  res.json({ sessionId, status: 'started' })

  orch.run(goal).catch(err => {
    console.error(`[Platform] Session ${sessionId} failed: ${err.message}`)
  })
})

// GET /api/platform/sessions/:id
router.get('/sessions/:id', (req, res) => {
  const orch = sessions.get(req.params.id)
  if (!orch) return res.status(404).json({ error: 'Session not found' })
  res.json(orch.getSnapshot())
})

// DELETE /api/platform/sessions/:id
router.delete('/sessions/:id', (req, res) => {
  const orch = sessions.get(req.params.id)
  if (!orch) return res.status(404).json({ error: 'Session not found' })
  orch.cancel()
  sessions.delete(req.params.id)
  res.json({ cancelled: req.params.id })
})

export { router as PlatformRouter }
