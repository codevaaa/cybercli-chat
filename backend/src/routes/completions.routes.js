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

// Real Council Mode: parallel debates + synthesis stream
router.post('/council', requireAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'messages is required' })}\n\n`)
    res.end()
    return
  }

  const councilModels = [
    { id: 'openrouter/gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'groq/llama-3.1-8b', label: 'Llama 3.1 8B' },
    { id: 'gemini/gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ]

  res.write(`data: ${JSON.stringify({ type: 'council_start', models: councilModels })}\n\n`)

  let replies = {
    'openrouter/gpt-4o-mini': '',
    'groq/llama-3.1-8b': '',
    'gemini/gemini-2.5-flash': ''
  }

  try {
    // 1. Run all three model streams in parallel
    const promises = councilModels.map(async ({ id, label }) => {
      try {
        const generator = await llmGateway.complete({ messages, model: id, temperature: 0.7 })
        for await (const chunk of generator) {
          if (chunk.type === 'token') {
            replies[id] += chunk.content
            res.write(`data: ${JSON.stringify({ type: 'debate_token', model: id, content: chunk.content })}\n\n`)
          } else if (chunk.type === 'error') {
            res.write(`data: ${JSON.stringify({ type: 'debate_error', model: id, content: chunk.content })}\n\n`)
          }
        }
      } catch (err) {
        res.write(`data: ${JSON.stringify({ type: 'debate_error', model: id, content: err.message })}\n\n`)
      }
    })

    await Promise.all(promises)

    // 2. Perform Synthesis
    const debateTranscript = `
Here is the debate transcript from three expert models on the user's query:

Model 1 (GPT-4o Mini):
"${replies['openrouter/gpt-4o-mini']}"

Model 2 (Llama 3.1 8B):
"${replies['groq/llama-3.1-8b']}"

Model 3 (Gemini 2.5 Flash):
"${replies['gemini/gemini-2.5-flash']}"

Please analyze their responses, identify areas of consensus, resolve contradictions, and synthesize the single best comprehensive answer. Make sure it directly addresses the user query.
`

    const synthesisMessages = [
      ...messages,
      { role: 'system', content: 'You are the Synthesis Engine of the AI Council. Your job is to read a debate between three models, combine their strengths, resolve any contradictions, and produce a single definitive response.' },
      { role: 'user', content: debateTranscript }
    ]

    res.write(`data: ${JSON.stringify({ type: 'synthesis_start' })}\n\n`)

    const synthesisGenerator = await llmGateway.complete({
      messages: synthesisMessages,
      model: 'gemini/gemini-2.5-flash', // Use Gemini as synthesis engine
      temperature: 0.5
    })

    for await (const chunk of synthesisGenerator) {
      if (chunk.type === 'token') {
        res.write(`data: ${JSON.stringify({ type: 'synthesis_token', content: chunk.content })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
  } finally {
    res.end()
  }
})

// Compare Mode: return non-stream responses from 3 models with real latencies
router.post('/compare', requireAuth, async (req, res) => {
  const { messages } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const models = [
    { id: 'openrouter/gpt-4o-mini', label: 'gpt-4o-mini' },
    { id: 'groq/llama-3.1-8b', label: 'llama-3.1-8b' },
    { id: 'gemini/gemini-2.5-flash', label: 'gemini-2.5-flash' }
  ]

  try {
    const results = await Promise.all(models.map(async ({ id, label }) => {
      const start = Date.now()
      const result = await llmGateway.completeNonStream({ messages, model: id, temperature: 0.7 })
      const end = Date.now()
      
      return {
        model: label,
        content: result.content || result.error || 'Failed to generate response.',
        latency: end - start
      }
    }))

    res.json({ results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
