import { Router } from 'express'
import { agentRegistry } from '../agents/AgentRegistry.js'

const router = Router()

// GET /api/agents — list all agent types
router.get('/', (req, res) => {
  res.json({ agents: agentRegistry.getAll() })
})

// GET /api/agents/:type — get agent definition
router.get('/:type', (req, res) => {
  try {
    const agent = agentRegistry.get(req.params.type)
    res.json(agent)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

export { router as AgentRouter }
