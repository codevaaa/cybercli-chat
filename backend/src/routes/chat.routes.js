import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import Thread from '../models/Thread.js'
import Message from '../models/Message.js'
import { useFallbackMode } from '../utils/fallbackDb.js'

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) || useFallbackMode()


const router = Router()

// Create a new chat thread
router.post('/', requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().optional(),
      model_id: z.string().optional(),
      folder_id: z.string().nullable().optional(),
      project_id: z.string().nullable().optional(),
      style_id: z.string().nullable().optional(),
      is_pinned: z.boolean().optional(),
      is_archived: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      mode: z.enum(['standard', 'kalikal', 'kali_kal']).optional(),
    })
    const data = schema.parse(req.body)
    const thread = new Thread({
      user_id: req.user.id,
      title: data.title || 'New Chat',
      model_id: data.model_id || 'auto',
      mode: data.mode || 'standard',
      folder_id: data.folder_id || null,
      project_id: data.project_id || null,
      style_id: data.style_id || null
    })
    await thread.save()
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all threads for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    const threads = await Thread.find({ user_id: req.user.id, is_archived: false })
      .sort({ last_message_at: -1 })
    res.json({ threads })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get a single thread
router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update thread metadata (title, pinned status, folder)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    // Only allow specific fields to be updated (prevent mass assignment)
    const allowedFields = ['title', 'is_pinned', 'is_archived', 'folder_id', 'project_id', 'style_id', 'tags', 'mode']
    const updateData = {}
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key]
      }
    }
    const thread = await Thread.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: updateData },
      { new: true }
    )
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    res.json(thread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Clear all threads and messages for the user
router.delete('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    await Thread.deleteMany({ user_id: userId })
    await Message.deleteMany({ user_id: userId })
    res.json({ success: true, message: 'All conversations and messages cleared successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete thread and its messages
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOneAndDelete({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    await Message.deleteMany({ thread_id: req.params.id })
    res.json({ deleted: req.params.id })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Fork/Branch conversation
router.post('/:id/fork', requireAuth, async (req, res) => {
  try {
    const { message_id } = req.body
    if (!message_id) {
      return res.status(400).json({ error: 'message_id is required to fork a thread' })
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }

    // Verify original thread ownership
    const originalThread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!originalThread) {
      return res.status(404).json({ error: 'Original thread not found' })
    }

    // Verify target message belongs to the thread
    const targetMsg = await Message.findOne({ _id: message_id, thread_id: req.params.id })
    if (!targetMsg) {
      return res.status(404).json({ error: 'Message not found in this thread' })
    }

    // Mark the message as a fork point
    targetMsg.is_fork_point = true
    await targetMsg.save()

    // Retrieve all messages in original thread up to the target message (inclusive)
    const messagesToCopy = await Message.find({
      thread_id: req.params.id,
      createdAt: { $lte: targetMsg.createdAt }
    }).sort({ createdAt: 1 })

    // Create a new branched thread
    const branchedThread = new Thread({
      user_id: req.user.id,
      title: `${originalThread.title} (Branched)`,
      model_id: originalThread.model_id,
      folder_id: originalThread.folder_id,
      project_id: originalThread.project_id,
      style_id: originalThread.style_id
    })
    await branchedThread.save()

    // Clone the messages into the new thread
    const clonedMessages = messagesToCopy.map(m => ({
      thread_id: branchedThread._id,
      user_id: req.user.id,
      role: m.role,
      content: m.content,
      model: m.model,
      provider: m.provider,
    }))
    
    if (clonedMessages.length > 0) {
      await Message.insertMany(clonedMessages)
    }

    // Link the target message with the new branched thread
    targetMsg.forked_thread_id = branchedThread._id
    await targetMsg.save()

    // Update count in branched thread
    branchedThread.message_count = clonedMessages.length
    await branchedThread.save()

    res.json(branchedThread)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Truncate messages in a thread after a specific message
router.delete('/:id/messages/after/:messageId', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.messageId)) {
      return res.status(400).json({ error: 'Invalid ID format' })
    }

    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }

    const targetMsg = await Message.findOne({ _id: req.params.messageId, thread_id: req.params.id })
    if (!targetMsg) {
      return res.status(404).json({ error: 'Message not found in this thread' })
    }

    // Delete all messages in the thread created after the target message
    const deleteResult = await Message.deleteMany({
      thread_id: req.params.id,
      createdAt: { $gt: targetMsg.createdAt }
    })

    // Optionally delete the target message itself if we want to "revert" the user's message as well
    // Wait, the user wants the message back in their input box. We should delete the target message too!
    await Message.deleteOne({ _id: req.params.messageId })
    const totalDeleted = deleteResult.deletedCount + 1

    // Update count
    thread.message_count = Math.max(0, thread.message_count - totalDeleted)
    await thread.save()

    res.json({ deletedCount: totalDeleted })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Sync message from frontend (used for client-side generated assets like images)
router.post('/:id/messages/sync', requireAuth, async (req, res) => {
  const { role, content, model } = req.body
  if (!role || !content) return res.status(400).json({ error: 'role and content required' })
  
  try {
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) return res.status(404).json({ error: 'Thread not found' })

    const isImage = (model && model.includes('image')) || (/^(draw|generate image|create an image|make an image|paint)/i.test(content) && role === 'user') || (content.includes('![Generated Image]') && role === 'assistant')
    
    const newMsg = new Message({
      thread_id: thread._id,
      user_id: req.user.id,
      role,
      content,
      model: model || thread.model_id,
      ...(isImage ? { expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) } : {})
    })
    await newMsg.save()

    // Optionally auto-generate title if it's the very first user message
    if (role === 'user' && thread.title === 'New Chat') {
      const llmGateway = (await import('../services/llm/gateway.js')).llmGateway
      try {
        const titleGen = await llmGateway.completeNonStream({
          messages: [{ role: 'user', content: `Summarize this in 3 to 5 words for a chat title:\n\n"${content}"` }],
          model: 'openrouter/gpt-4o-mini',
          temperature: 0.5
        })
        if (titleGen && titleGen.content) {
          let newTitle = titleGen.content.replace(/["']/g, '').trim()
          thread.title = newTitle.slice(0, 50)
          await thread.save()
        }
      } catch (e) {
        console.error('Auto-title error during sync:', e)
      }
    }

    res.json({ success: true, message: newMsg })
  } catch (err) {
    console.error('Error syncing message:', err)
    res.status(500).json({ error: 'Failed to sync message' })
  }
})

// Retrieve messages of a thread
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid thread ID format' })
    }
    const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' })
    }
    const messages = await Message.find({ thread_id: req.params.id }).sort({ createdAt: 1 })
    res.json({ messages })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Stream response and persist message history
// Stream response and persist message history
router.post('/:id/messages', requireAuth, async (req, res) => {
  let { 
    messages, 
    model, 
    temperature,
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

  if (!isValidId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid thread ID format' })
  }

  const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' })
  }

  // --- Kali_Kal Mode Usage Enforcement (daily reset, plan-based limits) ---
  if (thread.mode === 'kali_kal' || thread.mode === 'kalikal') {
    const { checkAndIncrementKali } = await import('../utils/usageHelper.js')
    const usage = await checkAndIncrementKali(req.user.id, req.user.plan)
    if (!usage.allowed) {
      return res.status(403).json({
        error: `Kali_Kal daily limit reached (${usage.limit} requests). Upgrade your plan for more.`,
        usage: { used: usage.used, limit: usage.limit, remaining: 0 },
      })
    }
  }


  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // 1. Save user's prompt to DB
    const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user') || { content: '' }
    
    // Auto-enable OSINT/Research for Kali models
    if (thread.mode === 'kali_kal' || thread.mode === 'kalikal') {
      const p = lastUserMsg.content.toLowerCase()
      if (p.includes('dork') || p.includes('osint') || p.includes('deep research') || p.includes('scrape the internet') || p.includes('deep search') || p.includes('find all') || p.includes('thoroughly search')) {
        deepResearchEnabled = true
      } else if (p.includes('search') || p.includes('scrape') || p.includes('latest') || p.includes('news') || p.includes('github repo') || p.includes('find') || p.includes('research')) {
        webSearchEnabled = true
      }
    }

    const userMsg = new Message({
      thread_id: thread._id,
      user_id: req.user.id,
      role: 'user',
      content: lastUserMsg.content,
      model: model || thread.model_id,
    })
    await userMsg.save()

    // 2. Fetch UserSettings and construct system prompt additions
    let extraSystemContent = ""
    try {
      // Fetch User Settings
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

      // Fetch Project Instructions
      if (thread.project_id) {
        const Project = (await import('../models/Project.js')).default
        const project = await Project.findById(thread.project_id)
        if (project && project.custom_instructions) {
          extraSystemContent += `\n\n[PROJECT CONTEXT: ${project.name}]\n${project.custom_instructions}`
        }
      }

      // Fetch Style Instructions
      if (thread.style_id) {
        const Style = (await import('../models/Style.js')).default
        const style = await Style.findById(thread.style_id)
        if (style && style.instructions) {
          extraSystemContent += `\n\n[WRITING STYLE: ${style.name}]\n${style.instructions}`
        }
      }
    } catch (settingsErr) {
      console.error('Error fetching context for chat system prompt:', settingsErr)
    }

    // 3. Handle Deep Research (multi-angle web search like Perplexity)
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

    // 4. Handle Web Search (quick mode)
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
        console.error('Web search error during chat:', searchErr)
      }
    }

    // 5. Handle Image Generation Instructions
    if (imageGenerationEnabled) {
      extraSystemContent += `\n\n[IMAGE GENERATION CAPABILITY]\nYou have the real power to generate images. If the user asks you to generate, draw, or paint an image, you MUST formulate a detailed, high-quality, English image prompt and output it inside a markdown image tag using the backend direct generation URL exactly like this:\n![description](https://cybercli-api.onrender.com/api/v1/images/generate-direct?prompt={url_encoded_prompt})\nCRITICAL: When generating an image, you MUST ONLY output the markdown image tag. DO NOT provide any tips, explanations, or conversational filler. Just the markdown tag.`
    }

    // 6. Handle Code Execution Instructions
    if (codeExecutionEnabled) {
      extraSystemContent += `\n\n[CODE EXECUTION CAPABILITY]\nJavaScript code execution is enabled. The user can execute JavaScript code blocks directly. If they ask you to run a calculation, verify some code, or write JavaScript, write standard JavaScript code blocks and remind them they can click the "Run" button on the top-right of your code blocks to execute the code in a sandboxed environment.`
    }



    // 7. Enrich messages history
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    if (extraSystemContent) {
      history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
    }

    // 7.5 Slash command detection (/recon, /hunt, /validate)
    const slashMatch = lastUserMsg.content.trim().match(/^\/(recon|hunt|validate)\s*(.*)/i)
    if (slashMatch) {
      const [, command, args] = slashMatch
      const target = args.trim()

      try {
        const { HuntOrchestrator } = await import('../services/hunt/HuntOrchestrator.js')
        
        res.write(`data: ${JSON.stringify({ type: 'info', content: `🔒 Security command: /${command} ${target}` })}\n\n`)
        res.write(`data: ${JSON.stringify({ type: 'info', content: `⚡ Initializing hunter engine...` })}\n\n`)

        const orchestrator = new HuntOrchestrator(
          `chat-${Date.now()}`,
          target || 'unknown',
          req.user.id,
          req.user?.plan || 'free',
          (type, data) => {
            if (!res.writableEnded) {
              if (type === 'progress' || type === 'phase') {
                res.write(`data: ${JSON.stringify({ type: 'info', content: data.message || JSON.stringify(data) })}\n\n`)
              } else if (type === 'finding') {
                res.write(`data: ${JSON.stringify({ type: 'info', content: `🎯 Finding: [${data.severity}] ${data.title || data.summary}` })}\n\n`)
              }
            }
          }
        )

        let result = ''
        if (command.toLowerCase() === 'recon') {
          res.write(`data: ${JSON.stringify({ type: 'info', content: `🌐 Running reconnaissance on ${target}...` })}\n\n`)
          result = await orchestrator.runRecon()
        } else if (command.toLowerCase() === 'hunt') {
          res.write(`data: ${JSON.stringify({ type: 'info', content: `💀 Starting vulnerability scan on ${target}...` })}\n\n`)
          result = await orchestrator.runScan()
        } else if (command.toLowerCase() === 'validate') {
          res.write(`data: ${JSON.stringify({ type: 'info', content: `✅ Running full autopilot (recon → scan → validate) on ${target}...` })}\n\n`)
          result = await orchestrator.runAutopilot()
        }

        // Format the result as terminal-style output
        const formatted = `## 🔒 /${command} ${target}\n\n\`\`\`\n${result || 'Command completed. Check info messages above for details.'}\n\`\`\``
        
        // Stream it as tokens
        const words = formatted.split(/(\s+)/)
        for (let i = 0; i < words.length; i += 5) {
          const chunk = words.slice(i, i + 5).join('')
          res.write(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`)
        }

        // Save to DB
        const assistantMsg = new Message({
          thread_id: thread._id,
          user_id: req.user.id,
          role: 'assistant',
          content: formatted,
          model: 'hunter-engine',
        })
        await assistantMsg.save()
        thread.message_count += 2
        thread.last_message_at = new Date()
        await thread.save()

        res.write('data: [DONE]\n\n')
        res.end()
        return

      } catch (huntErr) {
        // If hunter engine isn't available, fall through to LLM with context
        res.write(`data: ${JSON.stringify({ type: 'info', content: `⚠️ Hunter engine unavailable: ${huntErr.message}. Falling back to AI analysis...` })}\n\n`)
        // Add context about the slash command for the LLM
        history.push({
          role: 'system',
          content: `The user issued a security slash command: /${command} ${target}. Provide a detailed security analysis, methodology, or guidance for this command as if you were a bug bounty hunter.`,
          _skip_inject: true
        })
      }
    }

    // 8. Call LLM Gateway
    let generator
    const isKaliKal = (thread.mode === 'kalikal' || thread.mode === 'kali_kal')
    
    if (model === 'council') {
      const { runCouncilStream } = await import('../services/llm/councilEngine.js')
      generator = runCouncilStream(history)
    } else {
      generator = await llmGateway.complete({ messages: history, model: model || thread.model_id, temperature, effort, thinking, isKaliKal })
    }
    
    let assistantReply = ''
    let chosenProvider = ''
    let isExecuting = false

    // Heartbeat: send keepalive every 5s so client knows we're still processing
    let firstTokenReceived = false
    const heartbeatInterval = setInterval(() => {
      if (!firstTokenReceived && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', elapsed: Date.now() })}\n\n`)
      }
    }, 5000)

    for await (const chunk of generator) {
      if (chunk.type === 'token') {
        firstTokenReceived = true
        assistantReply += chunk.content
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        res.end()
        return
      } else if (chunk.type === 'info') {
        if (chunk.provider) chosenProvider = chunk.provider
        res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'council_responses') {
        // Forward council individual responses for visualization
        res.write(`data: ${JSON.stringify({ type: 'council_responses', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'done') {
        
        // Save assistant response to DB
        const assistantMsg = new Message({
          thread_id: thread._id,
          user_id: req.user.id,
          role: 'assistant',
          content: assistantReply,
          model: model || thread.model_id,
          provider: chosenProvider,
        })
        await assistantMsg.save()

        // Auto-update thread title if it was default
        if (thread.title === 'New Chat') {
          const generatedTitle = lastUserMsg.content.substring(0, 30) + (lastUserMsg.content.length > 30 ? '...' : '')
          thread.title = generatedTitle
        }

        // Update thread stats
        thread.message_count += 2
        thread.last_message_at = new Date()
        await thread.save()

        // Generate follow-up suggestions (fire-and-forget, non-blocking)
        try {
          if (assistantReply.length > 50) {
            const followUpPrompt = `Based on this conversation, suggest exactly 3 brief follow-up questions the user might ask next. Return ONLY a JSON array of 3 short strings (max 60 chars each). No explanation, just the JSON array.

User asked: "${lastUserMsg.content.slice(0, 200)}"
Assistant replied: "${assistantReply.slice(0, 400)}"

Output format: ["question 1", "question 2", "question 3"]`

            const followUpResult = await Promise.race([
              llmGateway.completeNonStream({
                messages: [{ role: 'user', content: followUpPrompt }],
                model: 'groq/llama-3.1-8b',
                temperature: 0.6,
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
            ])

            if (followUpResult?.content) {
              // Parse JSON array from response
              const match = followUpResult.content.match(/\[[\s\S]*?\]/)
              if (match) {
                try {
                  const suggestions = JSON.parse(match[0])
                  if (Array.isArray(suggestions) && suggestions.length > 0) {
                    res.write(`data: ${JSON.stringify({ type: 'suggestions', content: suggestions.slice(0, 3) })}\n\n`)
                  }
                } catch {}
              }
            }
          }
        } catch (e) {
          // Suggestions are optional — don't block the response
        }

        clearInterval(heartbeatInterval)
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`)
    res.end()
  }
})

export default router
