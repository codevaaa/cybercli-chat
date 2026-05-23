import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'

const router = Router()

router.post('/', optionalAuth, async (req, res) => {
  const { 
    messages, 
    model, 
    temperature = 0.7, 
    stream = true,
    webSearchEnabled = false,
    codeExecutionEnabled = false,
    imageGenerationEnabled = false,
    memoryEnabled = false,
    deepResearchEnabled = false
  } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const lastUserMsg = messages[messages.length - 1]

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      let extraSystemContent = ""

      // If user is authenticated, we can optionally fetch user settings
      if (req.user) {
        try {
          const UserSettings = (await import('../models/UserSettings.js')).default
          const settings = await UserSettings.findOne({ user_id: req.user.id })
          if (settings) {
            if (settings.custom_instructions) {
              extraSystemContent += `\n\n[USER CUSTOM INSTRUCTIONS]\nYou must follow these instructions:\n${settings.custom_instructions}`
            }
            if (memoryEnabled && settings.memories && settings.memories.length > 0) {
              extraSystemContent += `\n\n[USER PROFILE & MEMORIES]\nYou must remember these facts about the user:\n` + settings.memories.map(m => `- ${m}`).join('\n')
            }
          }
        } catch (settingsErr) {
          console.error('Error fetching settings for guest completions:', settingsErr)
        }
      }

      // Handle Deep Research
      if (deepResearchEnabled) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'info', content: '🔍 Running deep research across multiple sources…' })}\n\n`)
          const { performDeepResearch, formatDeepResearchContext } = await import('../utils/deepResearch.js')
          const research = await performDeepResearch(lastUserMsg.content)
          if (research.results.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'info', content: `📚 Analyzed ${research.totalSources} sources. Synthesizing response…` })}\n\n`)
            extraSystemContent += '\n\n' + formatDeepResearchContext(research)
          }
        } catch (researchErr) {
          console.error('Deep research error:', researchErr)
        }
      }

      // Handle Web Search
      if (webSearchEnabled && !deepResearchEnabled) {
        try {
          const { performWebSearch } = await import('../utils/webSearch.js')
          const results = await performWebSearch(lastUserMsg.content)
          if (results && results.length > 0) {
            extraSystemContent += `\n\n[WEB SEARCH RESULTS for "${lastUserMsg.content}"]\n` + 
              results.map((r, i) => `${i+1}. Title: ${r.title}\n   Link: ${r.link}\n   Snippet: ${r.snippet}`).join('\n\n') +
              `\n\nUse the search results above to provide up-to-date and accurate information. You must cite the links directly (e.g. [Title](url)) when using them.`
          }
        } catch (searchErr) {
          console.error('Web search error during guest completion:', searchErr)
        }
      }

      // Handle Image Generation
      if (imageGenerationEnabled) {
        extraSystemContent += `\n\n[IMAGE GENERATION CAPABILITY]\nYou have the real power to generate images. If the user asks you to generate, draw, or paint an image, you MUST formulate a detailed, high-quality, English image prompt and output it inside a markdown image tag using Pollinations AI, exactly like this:\n![description](https://image.pollinations.ai/p/{detailed_url_encoded_prompt}?width=512&height=512&nologo=true)\nDo not use placeholders. Generate a real descriptive prompt.`
      }

      // Handle Code Execution
      if (codeExecutionEnabled) {
        extraSystemContent += `\n\n[CODE EXECUTION CAPABILITY]\nJavaScript code execution is enabled. The user can execute JavaScript code blocks directly. If they ask you to run a calculation, verify some code, or write JavaScript, write standard JavaScript code blocks and remind them they can click the "Run" button on the top-right of your code blocks to execute the code in a sandboxed environment.`
      }

      const history = messages.map(m => ({ role: m.role, content: m.content }))
      if (extraSystemContent) {
        history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
      }

      const generator = await llmGateway.complete({ messages: history, model: model || 'auto', temperature })
      for await (const chunk of generator) {
        if (chunk.type === 'token') {
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'error') {
          res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'info') {
          res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
        } else if (chunk.type === 'done') {
          res.write('data: [DONE]\n\n')
        }
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
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
router.post('/council', optionalAuth, async (req, res) => {
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
router.post('/compare', optionalAuth, async (req, res) => {
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
