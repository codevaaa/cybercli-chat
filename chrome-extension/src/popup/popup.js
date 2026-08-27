/**
 * Codeva Chrome Extension — Popup Script
 * Quick AI actions + mini chat interface
 */

const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
const AUTH_URL = 'https://cybermindcli.info/auth/login?from=extension'

let authToken = null

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  const result = await chrome.storage.local.get('authToken')
  authToken = result.authToken

  if (authToken) {
    document.getElementById('auth-screen').style.display = 'none'
    document.getElementById('main-screen').style.display = 'flex'
  } else {
    document.getElementById('auth-screen').style.display = 'flex'
    document.getElementById('main-screen').style.display = 'none'
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────

document.getElementById('login-btn')?.addEventListener('click', () => {
  chrome.tabs.create({ url: AUTH_URL })
  window.close()
})

// ── Quick Actions ────────────────────────────────────────────────────────────

document.querySelectorAll('.action-card').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (action === 'summarize' || action === 'security') {
      // Page-level action
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (response?.content) {
          const prompt = action === 'summarize'
            ? `Summarize this page in 5 bullet points:\n\n${response.content.slice(0, 5000)}`
            : `Security analysis of ${response.url}. Check headers, cookies, and common vulnerabilities.`
          sendPrompt(prompt)
        }
      })
    } else {
      // Selection-based action
      chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' }, (response) => {
        if (response?.text) {
          const prompts = {
            'grammar': `Check grammar and spelling errors:\n\n"${response.text}"`,
            'rewrite': `Rewrite this text professionally:\n\n"${response.text}"`,
            'translate': `Translate to English (or Hindi if already English):\n\n"${response.text}"`,
            'explain-code': `Explain this code:\n\n\`\`\`\n${response.text}\n\`\`\``,
          }
          sendPrompt(prompts[action] || `Help with: ${response.text}`)
        } else {
          document.getElementById('chat-input').focus()
          document.getElementById('chat-input').placeholder = `Select text on page first, or type here...`
        }
      })
    }
  })
})

// ── Chat Input ───────────────────────────────────────────────────────────────

document.getElementById('send-btn')?.addEventListener('click', () => {
  const input = document.getElementById('chat-input')
  if (input.value.trim()) {
    sendPrompt(input.value.trim())
    input.value = ''
  }
})

document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    document.getElementById('send-btn').click()
  }
})

// ── API Call ──────────────────────────────────────────────────────────────────

async function sendPrompt(prompt) {
  const responseArea = document.getElementById('response-area')
  const responseContent = document.getElementById('response-content')
  responseArea.style.display = 'block'
  responseContent.textContent = '⏳ Thinking...'

  try {
    const res = await fetch(`${API_BASE}/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'groq/llama-3.1-8b',
        stream: true,
      }),
    })

    if (!res.ok) {
      if (res.status === 401) {
        responseContent.textContent = '🔒 Session expired. Please sign in again.'
        chrome.storage.local.remove('authToken')
        return
      }
      throw new Error(`HTTP ${res.status}`)
    }

    // Stream SSE
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''
    responseContent.textContent = ''

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
            responseContent.textContent = fullText
          }
        } catch {}
      }
    }

    if (!fullText) responseContent.textContent = '(No response)'
  } catch (err) {
    responseContent.textContent = `❌ Error: ${err.message}`
  }
}

// ── Copy Response ────────────────────────────────────────────────────────────

document.getElementById('copy-btn')?.addEventListener('click', () => {
  const text = document.getElementById('response-content').textContent
  navigator.clipboard.writeText(text)
  document.getElementById('copy-btn').textContent = '✓'
  setTimeout(() => { document.getElementById('copy-btn').textContent = '📋' }, 1500)
})

// ── Settings ─────────────────────────────────────────────────────────────────

document.getElementById('settings-btn')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

// ── Run ──────────────────────────────────────────────────────────────────────
init()
