import { llmGateway, classifyTier, resolveModelForPlan } from '../services/llm/gateway.js'

export const complete = async (req, res) => {
  const { messages, model, temperature = 0.7, stream = true, generateFollowups = true } = req.body
  const plan = req.user?.plan || 'free'

  // Classify the request tier for smart routing indicator
  const lastUserText = [...(messages || [])].reverse().find(m => m.role === 'user')?.content || ''
  const tier = classifyTier(lastUserText)
  const resolvedModel = resolveModelForPlan(model || 'auto', plan, lastUserText)

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // Send routing metadata as the first event
    res.write(`data: ${JSON.stringify({ type: 'routing', tier, model: resolvedModel })}\n\n`)

    try {
      let fullText = ''
      const generator = await llmGateway.complete({ messages, model, temperature, plan })
      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        if (chunk.type === 'token') fullText += chunk.content
      }

      // Generate follow-up suggestions after the main response
      if (generateFollowups && fullText.length > 50) {
        try {
          const followups = await generateFollowUpQuestions(messages, fullText, plan)
          res.write(`data: ${JSON.stringify({ type: 'followups', suggestions: followups })}\n\n`)
        } catch { /* don't fail the whole response for followups */ }
      }

      res.write('data: [DONE]\n\n')
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    }
    res.end()
  } else {
    try {
      const result = await llmGateway.completeNonStream({ messages, model, temperature, plan })

      // Generate follow-ups for non-stream too
      let followups = []
      if (generateFollowups && result.content && result.content.length > 50) {
        try {
          followups = await generateFollowUpQuestions(messages, result.content, plan)
        } catch { /* ignore */ }
      }

      res.json({ ...result, tier, followups })
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}

/**
 * Generate 3 smart follow-up questions based on the conversation context.
 * Uses the fastest available model (Groq llama-3.1-8b) to keep latency minimal.
 */
async function generateFollowUpQuestions(messages, lastResponse, plan) {
  const lastUserMsg = [...(messages || [])].reverse().find(m => m.role === 'user')?.content || ''

  const followupPrompt = [
    {
      role: 'system',
      content: `You generate exactly 3 brief follow-up questions a user might ask next based on the conversation. Rules:
- Each question max 8 words
- Make them diverse (one deeper, one related topic, one practical)
- Output ONLY a JSON array of 3 strings, nothing else
- Example: ["How does this compare to X?","Can you show an example?","What are the downsides?"]`
    },
    { role: 'user', content: `User asked: "${lastUserMsg.slice(0, 200)}"\n\nAssistant replied (summary): "${lastResponse.slice(0, 300)}"\n\nGenerate 3 follow-up questions:` }
  ]

  const result = await llmGateway.completeNonStream({
    messages: followupPrompt,
    model: 'groq/llama-3.1-8b',
    temperature: 0.8,
    plan,
  })

  try {
    const parsed = JSON.parse(result.content.trim())
    if (Array.isArray(parsed) && parsed.length >= 2) return parsed.slice(0, 3)
  } catch {
    // Try to extract from malformed response
    const matches = result.content.match(/"([^"]{5,60})"/g)
    if (matches && matches.length >= 2) return matches.slice(0, 3).map(m => m.replace(/"/g, ''))
  }
  return []
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
