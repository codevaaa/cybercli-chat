import { Router } from 'express'

const router = Router()

const ALL_MODELS = [
  { id: 'openrouter/gpt-4o-mini', name: 'Cyber-Mini', provider: 'Cyber Distributed Core', free: true },
  { id: 'openrouter/gpt-4o', name: 'Cyber-Pro', provider: 'Cyber Intelligence Hub', free: false },
  { id: 'groq/llama-3.1-8b', name: 'Cyber-Fast', provider: 'Cyber Speed Cluster', free: true },
  { id: 'groq/llama-3.1-70b', name: 'Cyber-Smart', provider: 'Cyber Reasoning Engine', free: true },
  { id: 'gemini/gemini-2.5-flash', name: 'Cyber-Balanced', provider: 'Cyber Distributed Core', free: true },
  { id: 'gemini/gemini-2.5-pro', name: 'Cyber-Pro', provider: 'Cyber Intelligence Hub', free: true },
  { id: 'cerebras/llama-3.1-8b', name: 'Cyber-UltraFast', provider: 'Cyber Edge Core', free: true },
  { id: 'cloudflare/@cf/meta/llama-3.1-8b-instruct', name: 'Cyber-Edge', provider: 'Cyber Geo-Network', free: true },
  { id: 'huggingface/meta-llama/Llama-3.1-8B-Instruct', name: 'Cyber-HuggingFace', provider: 'Cyber Distributed Core', free: true },
  { id: 'nvidia/llama-3.1-nemotron-70b', name: 'Cyber-Quantum', provider: 'Cyber Quantum Lab', free: true },
  { id: 'bytez/meta-llama/Llama-3.1-8B-Instruct', name: 'Cyber-Bytez', provider: 'Cyber Distributed Core', free: true },
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
