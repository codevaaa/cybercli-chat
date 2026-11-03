import { Router } from 'express'
import { APINEX_MODELS, APINEX_SUBSCRIPTION_MODELS, apinexId } from '../services/llm/apinex.js'
import { hasKeys } from '../services/llm/keyPool.js'

const router = Router()

const ALL_MODELS = [
  { id: 'madhav', name: 'MADHAV Power Engine', provider: 'Cybermind Infrastructure', free: true, description: '12-Agent Unified AI Architecture' },
  { id: 'council', name: 'Council Mode', provider: 'Cybermind Infrastructure', free: false, description: 'Multi-Agent Synthesis Engine' },
  { id: 'brahma-v1', name: 'Brahma V1', provider: 'CodeVaa Local', free: true, localOnly: true, description: 'Local vision and coding model fine-tuned by the CodeVaa team' }
]

router.get('/', (req, res) => {
  res.json({ models: [...ALL_MODELS, ...(hasKeys('apinex') ? APINEX_MODELS.map(id => ({ id: apinexId(id), name: id.slice(5), provider: 'APINEX', free: !APINEX_SUBSCRIPTION_MODELS.has(id), requiresSubscription: APINEX_SUBSCRIPTION_MODELS.has(id), description: 'APINEX service catalog route' })) : [])] })
})

router.get('/:id', (req, res) => {
  const requested = req.params.id
  const apinex = APINEX_MODELS.find(id => apinexId(id) === requested)
  const model = ALL_MODELS.find(m => m.id === requested) || (apinex && hasKeys('apinex') ? { id: requested, name: apinex.slice(5), provider: 'APINEX', free: !APINEX_SUBSCRIPTION_MODELS.has(apinex), requiresSubscription: APINEX_SUBSCRIPTION_MODELS.has(apinex), description: 'APINEX service catalog route' } : null)
  if (!model) return res.status(404).json({ error: 'Model not found' })
  res.json(model)
})

export default router
