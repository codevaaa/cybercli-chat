import { Router } from 'express'

const router = Router()

const ALL_MODELS = [
  { id: 'madhav', name: 'MADHAV Power Engine', provider: 'Cybermind Infrastructure', free: true, description: '12-Agent Unified AI Architecture' },
  { id: 'council', name: 'Council Mode', provider: 'Cybermind Infrastructure', free: false, description: 'Multi-Agent Synthesis Engine' }
]

router.get('/', (req, res) => {
  res.json({ models: ALL_MODELS })
})

router.get('/:id', (req, res) => {
  const model = ALL_MODELS.find(m => m.id === req.params.id)
  if (!model) return res.status(404).json({ error: 'Model not found' })
  res.json(model)
})

export default router
