/**
 * Codeva Popup — controller
 */
import { ICONS, icon } from '../lib/icons.js'
import { streamCompletion, getToken, getUser, fetchMe, AUTH_URL } from '../lib/config.js'
import { PROMPTS, ACTIONS } from '../lib/prompts.js'
import { TASK_MODELS } from '../lib/config.js'

const $ = (id) => document.getElementById(id)

let busy = false

async function init() {
  // Brand logos
  $('brand-logo').innerHTML = ICONS.logo
  $('brand-mini').innerHTML = ICONS.logo
  $('settings-btn').innerHTML = ICONS.settings
  $('ask-send').innerHTML = ICONS.send
  $('copy-btn').innerHTML = ICONS.copy
  $('clear-btn').innerHTML = ICONS.trash

  const token = await getToken()
  if (!token) return showAuth()

  // Verify token is still valid
  const me = await fetchMe()
  if (!me) return showAuth()

  showMain(me)
}

function showAuth() {
  $('auth-view').hidden = false
  $('main-view').hidden = true
  $('signin-btn').onclick = () => chrome.tabs.create({ url: AUTH_URL })
}

async function showMain(me) {
  $('auth-view').hidden = true
  $('main-view').hidden = false

  // User info
  const user = await getUser()
  const email = me?.email || user?.email || 'user@codeva.ai'
  const plan = (me?.plan || 'free')
  $('user-email').textContent = email
  $('user-avatar').textContent = (email[0] || 'U').toUpperCase()
  $('user-plan').textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' plan'

  // Usage stats
  const { usageStats = {} } = await chrome.storage.local.get('usageStats')
  $('stat-prompts').textContent = usageStats.promptsRun || 0
  $('stat-words').textContent = usageStats.wordsImproved || 0
  $('stat-errors').textContent = usageStats.errorsFixed || 0

  // Build action grid
  const grid = $('actions-grid')
  grid.innerHTML = ACTIONS.slice(0, 6).map(a => `
    <button class="action-btn" data-action="${a.id}">
      <span class="ic">${ICONS[a.icon] || ''}</span>
      <span class="lbl">${a.label}</span>
    </button>`).join('')

  grid.querySelectorAll('.action-btn').forEach(btn => {
    btn.onclick = () => runQuickAction(btn.dataset.action)
  })

  $('ask-send').onclick = () => {
    const text = $('ask-input').value.trim()
    if (text) { runPrompt(text, TASK_MODELS.chat); $('ask-input').value = '' }
  }
  $('ask-input').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('ask-send').click() }
  }
  $('open-panel').onclick = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.sidePanel.open({ tabId: tab.id })
    window.close()
  }
  $('settings-btn').onclick = () => chrome.runtime.openOptionsPage()
  $('copy-btn').onclick = () => {
    navigator.clipboard.writeText($('response-body').textContent)
    $('copy-btn').innerHTML = ICONS.check
    setTimeout(() => { $('copy-btn').innerHTML = ICONS.copy }, 1400)
  }
  $('clear-btn').onclick = () => { $('response-wrap').hidden = true; $('response-body').textContent = '' }
}

async function runQuickAction(actionId) {
  const action = ACTIONS.find(a => a.id === actionId)
  if (!action) return

  // Get selected text from active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let selected = ''
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' })
    selected = resp?.text || ''
  } catch {}

  if (!selected) {
    // No selection — focus the ask box with a hint
    $('ask-input').placeholder = `Select text on the page, then tap "${action.label}"`
    $('ask-input').focus()
    return
  }

  const prompt = PROMPTS[action.promptKey](selected)
  const model = TASK_MODELS[action.group] || TASK_MODELS.chat
  runPrompt(prompt, model, action.label)
}

async function runPrompt(prompt, model, label = 'Response') {
  if (busy) return
  busy = true

  $('response-wrap').hidden = false
  $('response-model').textContent = label
  const body = $('response-body')
  body.textContent = ''
  body.innerHTML = `<span class="cv-typing">Thinking…</span>`

  let full = ''
  await streamCompletion({
    messages: [{ role: 'user', content: prompt }],
    model,
    onToken: (t) => { full += t; body.textContent = full },
    onError: (err) => {
      if (err.auth) { showAuth(); return }
      body.textContent = `⚠ ${err.message}`
    },
    onDone: () => { if (!full) body.textContent = '(No response)' },
  })
  busy = false
}

init()
