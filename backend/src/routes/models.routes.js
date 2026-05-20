import { Router } from 'express'

const router = Router()

const ALL_MODELS = [
  { id: 'openrouter/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenRouter', free: true },
  { id: 'openrouter/gpt-4o', name: 'GPT-4o', provider: 'OpenRouter', free: false },
  { id: 'groq/llama-3.1-8b', name: 'Llama 3.1 8B', provider: 'Groq', free: true },
  { id: 'groq/llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Groq', free: true },
  { id: 'gemini/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Gemini', free: true },
  { id: 'gemini/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Gemini', free: true },
  { id: 'cerebras/llama-3.1-8b', name: 'Llama 3.1 8B (Cerebras)', provider: 'Cerebras', free: true },
  { id: 'cloudflare/@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Cloudflare', free: true },
  { id: 'huggingface/meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', provider: 'HuggingFace', free: true },
  { id: 'nvidia/llama-3.1-nemotron-70b', name: 'Llama 3.1 Nemotron 70B', provider: 'NVIDIA', free: true },
  { id: 'bytez/meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', provider: 'Bytez', free: true },
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
