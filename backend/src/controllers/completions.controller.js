import { llmGateway } from '../services/llm/gateway.js'

export const complete = async (req, res) => {
  const { messages, model, temperature = 0.7, stream = true } = req.body
  const plan = req.user?.plan || 'free'

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      const generator = await llmGateway.complete({ messages, model, temperature, plan })
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
      const result = await llmGateway.completeNonStream({ messages, model, temperature, plan })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}

export const council = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.write('data: {"type":"council_start"}\n\n')
  res.write('data: {"type":"done"}\n\n')
  res.end()
}

export const compare = (req, res) => {
  res.json({ results: [] })
}
