import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { llmGateway } from '../services/llm/gateway.js'
import Thread from '../models/Thread.js'
import Message from '../models/Message.js'

const router = Router()

// Create a new chat thread
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, model_id, folder_id } = req.body
    const thread = new Thread({
      user_id: req.user.id,
      title: title || 'New Chat',
      model_id: model_id || 'auto',
      folder_id: folder_id || null,
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
    const thread = await Thread.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body },
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

// Delete thread and its messages
router.delete('/:id', requireAuth, async (req, res) => {
  try {
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

// Retrieve messages of a thread
router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
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
  const { 
    messages, 
    model, 
    temperature,
    webSearchEnabled = false,
    codeExecutionEnabled = false,
    imageGenerationEnabled = false,
    memoryEnabled = false
  } = req.body
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' })
  }

  const thread = await Thread.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // 1. Save user's prompt to DB
    const lastUserMsg = messages[messages.length - 1]
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
      console.error('Error fetching settings for chat system prompt:', settingsErr)
    }

    // 3. Handle Web Search
    if (webSearchEnabled) {
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

    // 4. Handle Image Generation Instructions
    if (imageGenerationEnabled) {
      extraSystemContent += `\n\n[IMAGE GENERATION CAPABILITY]\nYou have the real power to generate images. If the user asks you to generate, draw, or paint an image, you MUST formulate a detailed, high-quality, English image prompt and output it inside a markdown image tag using Pollinations AI, exactly like this:
![description](https://image.pollinations.ai/p/{detailed_url_encoded_prompt}?width=512&height=512&nologo=true)
Do not use placeholders. Generate a real descriptive prompt.`
    }

    // 5. Handle Code Execution Instructions
    if (codeExecutionEnabled) {
      extraSystemContent += `\n\n[CODE EXECUTION CAPABILITY]\nJavaScript code execution is enabled. The user can execute JavaScript code blocks directly. If they ask you to run a calculation, verify some code, or write JavaScript, write standard JavaScript code blocks and remind them they can click the "Run" button on the top-right of your code blocks to execute the code in a sandboxed environment.`
    }

    // 6. Enrich messages history
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    if (extraSystemContent) {
      history.push({ role: 'system', content: extraSystemContent, _skip_inject: true })
    }

    // 7. Call LLM Gateway
    let generator
    if (model === 'council') {
      const councilModels = [
        { id: 'openrouter/gpt-4o-mini', label: 'GPT-4o Mini' },
        { id: 'groq/llama-3.1-8b', label: 'Llama 3.1 8B' },
        { id: 'gemini/gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
      ]
      
      let replies = {
        'openrouter/gpt-4o-mini': '',
        'groq/llama-3.1-8b': '',
        'gemini/gemini-2.5-flash': ''
      }

      await Promise.all(councilModels.map(async ({ id }) => {
        try {
          const gen = await llmGateway.complete({ messages: history, model: id, temperature: 0.7 })
          for await (const chunk of gen) {
            if (chunk.type === 'token') {
              replies[id] += chunk.content
            }
          }
        } catch (err) {
          console.error(`Council model ${id} failed:`, err)
        }
      }))

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
        ...history,
        { role: 'system', content: 'You are the Synthesis Engine of the AI Council. Your job is to read a debate between three models, combine their strengths, resolve any contradictions, and produce a single definitive response.' },
        { role: 'user', content: debateTranscript }
      ]

      generator = await llmGateway.complete({
        messages: synthesisMessages,
        model: 'gemini/gemini-2.5-flash',
        temperature: 0.5
      })
    } else {
      generator = await llmGateway.complete({ messages: history, model: model || thread.model_id, temperature })
    }
    
    let assistantReply = ''
    let chosenProvider = ''

    for await (const chunk of generator) {
      if (chunk.type === 'token') {
        assistantReply += chunk.content
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`)
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`)
        res.end()
        return
      } else if (chunk.type === 'info') {
        if (chunk.provider) chosenProvider = chunk.provider
        res.write(`data: ${JSON.stringify({ type: 'info', content: chunk.content })}\n\n`)
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
