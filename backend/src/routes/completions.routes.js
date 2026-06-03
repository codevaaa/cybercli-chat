import { Router } from 'express'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import { getDaemon } from '../utils/daemonBridge.js'

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
    deepResearchEnabled = false,
    effort = 'low',
    thinking = false
  } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user') || { content: '' }

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

      // Smart Implicit Search Detection
      const timeKeywords = /\b(2024|2025|2026|latest|recent|current|who is|what is the current|today|news|update|price|weather|stock|score)\b/i
      const needsImplicitSearch = !deepResearchEnabled && !webSearchEnabled && timeKeywords.test(lastUserMsg.content)

      // Handle Web Search
      if ((webSearchEnabled || needsImplicitSearch) && !deepResearchEnabled) {
        try {
          if (needsImplicitSearch) {
             res.write(`data: ${JSON.stringify({ type: 'info', content: '🔍 Implicit search triggered for latest information...' })}\n\n`)
          }
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

      // Handle Daemon Connection / Workspace Editing Instructions
      const hasDaemon = req.user && !!getDaemon(req.user.id)
      if (hasDaemon) {
        extraSystemContent += `\n\n[LOCAL WORKSPACE EDITING (CLI DAEMON CONNECTED)]
You are connected to the user's local workspace via a secure CLI daemon. You have the ability to read files, create/edit files, and run terminal commands to help them build, run, and debug their code.
To invoke these workspace tools, you MUST output specific XML-like tags in your response. The frontend will intercept these tags, execute them via the daemon, and display the results to the user.
Available tools:
1. Read a file:
<read_file path="path/to/file.js" />

2. Write or create a file:
<write_file path="path/to/file.js">
// File contents here
</write_file>

3. Run a terminal command (e.g. build, compile, tests, install):
<run_command cmd="npm run build" />

Rules:
- Specify paths relative to the project root.
- You can explain what you are doing before or after using these tags.
- Always use the exact tags above to perform local operations. When you output these tags, they will be executed on the user's system after their confirmation in the terminal.`
      }

      const history = messages.map(m => ({ role: m.role, content: m.content }))
      if (extraSystemContent) {
        history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
      }

      let generator
      if (model === 'council') {
        const { runCouncilStream } = await import('../services/llm/councilEngine.js')
        generator = runCouncilStream(history)
      } else {
        generator = await llmGateway.complete({ messages: history, model: model || 'auto', temperature, effort, thinking })
      }

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
      const result = await llmGateway.completeNonStream({ messages, model, temperature, effort, thinking })
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
})

// Council Mode: 4-model ensemble with prompt routing + synthesis
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

  try {
    const { runCouncilStream } = await import('../services/llm/councilEngine.js')
    for await (const chunk of runCouncilStream(messages)) {
      if (chunk.type === 'done') {
        res.write('data: [DONE]\n\n')
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
  } finally {
    res.end()
  }
})

// Deep Research Mode: Multi-agent (Jay, Vijay, Deva, Abhay, Kushi, Arjun, Meera, Veer + Codic Manager)
router.post('/research', optionalAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const { messages, withCouncil = false } = req.body
  if (!messages || !Array.isArray(messages)) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'messages is required' })}\n\n`)
    res.end()
    return
  }

  try {
    const { runDeepResearch } = await import('../services/llm/researchEngine.js')
    const plan = req.user?.plan || 'free'
    for await (const chunk of runDeepResearch({ messages, plan, withCouncil })) {
      if (chunk.type === 'research_done') {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        res.write('data: [DONE]\n\n')
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`)
      }
    }
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
