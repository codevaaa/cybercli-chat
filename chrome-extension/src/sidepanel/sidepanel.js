/**
 * Codeva Side Panel — full chat with streaming + selection-action handoff
 */
import { ICONS } from '../lib/icons.js'
import { streamCompletion, getToken, fetchMe, AUTH_URL } from '../lib/config.js'

const $ = (id) => document.getElementById(id)
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

let messages = []
let busy = false

async function init() {
  $('sp-logo').innerHTML = ICONS.logo
  $('sp-auth-logo').innerHTML = ICONS.logo
  $('sp-welcome-logo').innerHTML = ICONS.logo
  $('sp-new').innerHTML = ICONS.trash
  $('sp-settings').innerHTML = ICONS.settings
  $('sp-send').innerHTML = ICONS.send

  const token = await getToken()
  if (!token) return showAuth()
  const me = await fetchMe()
  if (!me) return showAuth()

  bindEvents()
  checkPending()
}

function showAuth() {
  $('sp-auth').hidden = false
  $('sp-chat').hidden = true
  $('sp-footer')?.setAttribute('hidden', '')
  document.querySelector('.sp-footer')?.setAttribute('hidden', '')
  $('sp-signin').onclick = () => chrome.tabs.create({ url: AUTH_URL })
}

function bindEvents() {
  $('sp-send').onclick = send
  $('sp-input').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }
  $('sp-input').oninput = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }
  $('sp-new').onclick = () => {
    messages = []
    renderWelcome()
  }
  $('sp-settings').onclick = () => chrome.runtime.openOptionsPage()

  document.querySelectorAll('#sp-chips button').forEach(btn => {
    btn.onclick = () => { $('sp-input').value = btn.dataset.q; send() }
  })

  // Listen for prompts pushed while panel is open
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'EXECUTE_PROMPT' && msg.prompt) {
      runPrompt(msg.prompt)
    }
  })
}

// Check for queued prompt from context menu / selection toolbar
async function checkPending() {
  const { pendingPrompt, pendingAt } = await chrome.storage.local.get(['pendingPrompt', 'pendingAt'])
  if (pendingPrompt && pendingAt && Date.now() - pendingAt < 15000) {
    chrome.storage.local.remove(['pendingPrompt', 'pendingAt'])
    runPrompt(pendingPrompt)
  }
  // Keep polling briefly in case panel opened before storage was set
  let tries = 0
  const poll = setInterval(async () => {
    tries++
    const { pendingPrompt: p, pendingAt: at } = await chrome.storage.local.get(['pendingPrompt', 'pendingAt'])
    if (p && at && Date.now() - at < 15000) {
      chrome.storage.local.remove(['pendingPrompt', 'pendingAt'])
      clearInterval(poll)
      runPrompt(p)
    }
    if (tries > 10) clearInterval(poll)
  }, 500)
}

function renderWelcome() {
  $('sp-chat').innerHTML = `
    <div class="sp-welcome">
      <span class="sp-welcome-logo">${ICONS.logo}</span>
      <h2>How can I help?</h2>
      <p>Select text on any page for instant actions, or ask below.</p>
    </div>`
}

function send() {
  const text = $('sp-input').value.trim()
  if (!text || busy) return
  $('sp-input').value = ''
  $('sp-input').style.height = 'auto'
  runPrompt(text)
}

function addMessage(role, content) {
  // Clear welcome
  const welcome = $('sp-chat').querySelector('.sp-welcome')
  if (welcome) welcome.remove()

  const el = document.createElement('div')
  el.className = `sp-msg ${role}`
  el.innerHTML = `<div class="sp-bubble">${esc(content)}</div>`
  $('sp-chat').appendChild(el)
  $('sp-chat').scrollTop = $('sp-chat').scrollHeight
  return el
}

async function runPrompt(prompt) {
  if (busy) return
  busy = true

  messages.push({ role: 'user', content: prompt })
  addMessage('user', prompt)

  const assistantEl = addMessage('assistant', '')
  const bubble = assistantEl.querySelector('.sp-bubble')
  bubble.innerHTML = `<span class="sp-typing">Thinking…</span>`

  const model = $('sp-model').value
  let full = ''

  await streamCompletion({
    messages: messages.slice(-12),
    model,
    onToken: (t) => {
      full += t
      bubble.textContent = full
      $('sp-chat').scrollTop = $('sp-chat').scrollHeight
    },
    onError: (err) => {
      if (err.auth) { showAuth(); return }
      bubble.textContent = `⚠ ${err.message}`
    },
    onDone: () => {
      if (!full) { bubble.textContent = '(No response)'; return }
      messages.push({ role: 'assistant', content: full })
      // Add copy button
      const actions = document.createElement('div')
      actions.className = 'sp-msg-actions'
      actions.innerHTML = `<button class="sp-mini-btn sp-copy">Copy</button>`
      assistantEl.appendChild(actions)
      actions.querySelector('.sp-copy').onclick = () => {
        navigator.clipboard.writeText(full)
        actions.querySelector('.sp-copy').textContent = 'Copied ✓'
      }
    },
  })

  busy = false
}

init()
