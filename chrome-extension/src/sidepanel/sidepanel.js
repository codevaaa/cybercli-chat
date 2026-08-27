/**
 * Codeva Chrome Extension — Side Panel
 * Full chat interface with streaming, context-aware assistance
 */

const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
let messages = []
let authToken = null
let isStreaming = false

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const result = await chrome.storage.local.get('authToken')
  authToken = result.authToken

  // Listen for prompts from background (context menu actions)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'EXECUTE_PROMPT' && msg.prompt) {
      authToken = msg.token || authToken
      addMessage('user', msg.prompt)
      streamResponse(msg.prompt)
    }
  })

  // Check for pending prompt
  const pending = await chrome.storage.local.get('pendingPrompt')
  if (pending.pendingPrompt) {
    addMessage('user', pending.pendingPrompt)
    streamResponse(pending.pendingPrompt)
    chrome.storage.local.remove('pendingPrompt')
  }
}

// ── UI Helpers ───────────────────────────────────────────────────────────────

function addMessage(role, content) {
  messages.push({ role, content })
  renderMessage(role, content)
}

function renderMessage(role, content, streaming = false) {
  const area = document.getElementById('chat-area')
  // Remove welcome message
  const welcome = area.querySelector('.welcome-msg')
  if (welcome) welcome.remove()

  const el = document.createElement('div')
  el.className = `msg msg-${role}`
  el.id = streaming ? 'streaming-msg' : ''
  el.innerHTML = `
    <div class="msg-content">${escapeHtml(content)}</div>
    ${role === 'assistant' && !streaming ? '<button class="copy-msg-btn" title="Copy">📋</button>' : ''}
  `
  area.appendChild(el)
  area.scrollTop = area.scrollHeight

  // Copy button
  el.querySelector('.copy-msg-btn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(content)
  })

  return el
}

function updateStreamingMessage(content) {
  let el = document.getElementById('streaming-msg')
  if (!el) {
    el = renderMessage('assistant', '', true)
  }
  el.querySelector('.msg-content').textContent = content
  document.getElementById('chat-area').scrollTop = document.getElementById('chat-area').scrollHeight
}

function finalizeStreamingMessage(content) {
  const el = document.getElementById('streaming-msg')
  if (el) {
    el.id = ''
    el.querySelector('.msg-content').textContent = content
    const btn = document.createElement('button')
    btn.className = 'copy-msg-btn'
    btn.title = 'Copy'
    btn.textContent = '📋'
    btn.onclick = () => navigator.clipboard.writeText(content)
    el.appendChild(btn)
  }
}

// ── Stream Response ──────────────────────────────────────────────────────────

async function streamResponse(prompt) {
  if (isStreaming) return
  isStreaming = true

  const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))

  try {
    const res = await fetch(`${API_BASE}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        messages: history,
        model: 'codeva-ravan-v1',
        stream: true,
      }),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') break
        try {
          const parsed = JSON.parse(raw)
          if (parsed.type === 'token') {
            fullText += parsed.content
            updateStreamingMessage(fullText)
          }
        } catch {}
      }
    }

    finalizeStreamingMessage(fullText)
    messages.push({ role: 'assistant', content: fullText })
  } catch (err) {
    updateStreamingMessage(`❌ Error: ${err.message}`)
  } finally {
    isStreaming = false
  }
}

// ── Input Handling ───────────────────────────────────────────────────────────

document.getElementById('send-btn')?.addEventListener('click', () => {
  const input = document.getElementById('input')
  const text = input.value.trim()
  if (!text || isStreaming) return
  input.value = ''
  input.style.height = 'auto'
  addMessage('user', text)
  streamResponse(text)
})

document.getElementById('input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    document.getElementById('send-btn').click()
  }
})

// Auto-resize textarea
document.getElementById('input')?.addEventListener('input', (e) => {
  e.target.style.height = 'auto'
  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
})

// Clear
document.getElementById('clear-btn')?.addEventListener('click', () => {
  messages = []
  const area = document.getElementById('chat-area')
  area.innerHTML = `<div class="welcome-msg"><p>👋 How can I help?</p><p class="welcome-sub">Select text on any page and I'll assist, or just ask anything below.</p></div>`
})

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

init()
