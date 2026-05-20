import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'

const router = Router()

router.post('/', requireAuth, async (req, res) => {
  const { messages, model, temperature = 0.7, stream = true } = req.body

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      const generator = await llmGateway.complete({ messages, model, temperature })
      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
      res.write('data: [DONE]\n\n')
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    }
    res.end()
  } else {
    try {
      const result = await llmGateway.completeNonStream({ messages, model, temperature })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
})

router.post('/council', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages } = req.body
  const models = ['openrouter/gpt-4o-mini', 'groq/llama-3.1-8b', 'gemini/gemini-2.5-flash']

  res.write('data: {"type":"council_start","models":' + JSON.stringify(models) + '}\n\n')

  setTimeout(() => {
    res.write('data: {"type":"debate","model":"gpt-4o-mini","content":"From a technical perspective..."}\n\n')
    setTimeout(() => {
      res.write('data: {"type":"debate","model":"llama-3.1-8b","content":"I would add that..."}\n\n')
      setTimeout(() => {
        res.write('data: {"type":"debate","model":"gemini-2.5-flash","content":"Considering the broader context..."}\n\n')
        setTimeout(() => {
          res.write('data: {"type":"synthesis","content":"Based on the discussion across all three models, the consensus is..."}\n\n')
          res.write('data: [DONE]\n\n')
          res.end()
        }, 500)
      }, 500)
    }, 500)
  }, 500)
})

router.post('/compare', requireAuth, (req, res) => {
  res.json({
    results: [
      { model: 'gpt-4o-mini', content: 'Answer from GPT-4o mini...', latency: 1200 },
      { model: 'llama-3.1-8b', content: 'Answer from Llama...', latency: 800 },
      { model: 'gemini-2.5-flash', content: 'Answer from Gemini...', latency: 1500 },
    ],
  })
})

export default router
