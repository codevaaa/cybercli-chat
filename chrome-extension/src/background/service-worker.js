/**
 * Codeva Chrome Extension — Background Service Worker
 * 
 * Handles:
 * - Context menu registration (right-click actions)
 * - Auth state management (token from cybermindcli.info)
 * - API calls to Codeva backend
 * - Side panel toggle
 * - Keyboard shortcut commands
 * - Badge updates
 */

const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
const AUTH_URL = 'https://cybermindcli.info/auth/login?from=extension'

// ── Context Menus ────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'codeva-parent',
    title: 'Codeva AI',
    contexts: ['selection', 'page', 'editable'],
  })

  // Writing & Grammar (Grammarly-level)
  chrome.contextMenus.create({ id: 'grammar-check', parentId: 'codeva-parent', title: '✍️ Check Grammar & Spelling', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'rewrite-formal', parentId: 'codeva-parent', title: '📝 Rewrite → Formal', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'rewrite-casual', parentId: 'codeva-parent', title: '💬 Rewrite → Casual', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'rewrite-shorter', parentId: 'codeva-parent', title: '✂️ Make Shorter', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'rewrite-longer', parentId: 'codeva-parent', title: '📖 Expand / Elaborate', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'fix-tone', parentId: 'codeva-parent', title: '🎯 Fix Tone (Professional)', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'separator-1', parentId: 'codeva-parent', type: 'separator', contexts: ['selection'] })

  // Understanding & Research
  chrome.contextMenus.create({ id: 'explain', parentId: 'codeva-parent', title: '💡 Explain This', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'summarize', parentId: 'codeva-parent', title: '📋 Summarize', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'translate', parentId: 'codeva-parent', title: '🌐 Translate', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'define', parentId: 'codeva-parent', title: '📚 Define Word/Term', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'separator-2', parentId: 'codeva-parent', type: 'separator', contexts: ['selection'] })

  // Code
  chrome.contextMenus.create({ id: 'explain-code', parentId: 'codeva-parent', title: '🔍 Explain Code', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'improve-code', parentId: 'codeva-parent', title: '⚡ Improve Code', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'convert-code', parentId: 'codeva-parent', title: '🔄 Convert to Another Language', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'debug-code', parentId: 'codeva-parent', title: '🐛 Find Bugs', contexts: ['selection'] })
  chrome.contextMenus.create({ id: 'separator-3', parentId: 'codeva-parent', type: 'separator', contexts: ['selection'] })

  // Page-level actions
  chrome.contextMenus.create({ id: 'summarize-page', parentId: 'codeva-parent', title: '📄 Summarize This Page', contexts: ['page'] })
  chrome.contextMenus.create({ id: 'extract-key-points', parentId: 'codeva-parent', title: '🔑 Extract Key Points', contexts: ['page'] })
  chrome.contextMenus.create({ id: 'ask-about-page', parentId: 'codeva-parent', title: '❓ Ask About This Page', contexts: ['page'] })

  // Security (unique to Codeva)
  chrome.contextMenus.create({ id: 'security-scan', parentId: 'codeva-parent', title: '🔒 Security Quick Scan (Headers)', contexts: ['page'] })

  console.log('[Codeva Extension] Context menus registered')
})

// ── Context Menu Click Handler ───────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const token = await getAuthToken()
  if (!token) {
    chrome.tabs.create({ url: AUTH_URL })
    return
  }

  const selectedText = info.selectionText || ''
  let prompt = ''
  let action = info.menuItemId

  switch (action) {
    case 'grammar-check':
      prompt = `Check the following text for grammar, spelling, punctuation, and style errors. For each error found, show the original → corrected version. Then provide the fully corrected text.\n\nText: "${selectedText}"`
      break
    case 'rewrite-formal':
      prompt = `Rewrite the following text in a formal, professional tone. Keep the meaning identical.\n\nText: "${selectedText}"`
      break
    case 'rewrite-casual':
      prompt = `Rewrite the following text in a casual, friendly tone. Keep the meaning identical.\n\nText: "${selectedText}"`
      break
    case 'rewrite-shorter':
      prompt = `Make the following text significantly shorter while preserving all key information.\n\nText: "${selectedText}"`
      break
    case 'rewrite-longer':
      prompt = `Expand and elaborate on the following text. Add more detail, examples, and context.\n\nText: "${selectedText}"`
      break
    case 'fix-tone':
      prompt = `Rewrite this text to have a professional, confident, and clear tone suitable for business communication.\n\nText: "${selectedText}"`
      break
    case 'explain':
      prompt = `Explain the following in simple, clear language:\n\n"${selectedText}"`
      break
    case 'summarize':
      prompt = `Summarize the following text in 2-3 concise bullet points:\n\n"${selectedText}"`
      break
    case 'translate':
      prompt = `Translate the following text to English (if not English) or to Hindi (if already English). Provide the translation only.\n\n"${selectedText}"`
      break
    case 'define':
      prompt = `Define this word/term clearly with examples:\n\n"${selectedText}"`
      break
    case 'explain-code':
      prompt = `Explain this code step by step. What does it do? Any potential issues?\n\n\`\`\`\n${selectedText}\n\`\`\``
      break
    case 'improve-code':
      prompt = `Improve this code for better performance, readability, and best practices. Show the improved version with comments explaining changes.\n\n\`\`\`\n${selectedText}\n\`\`\``
      break
    case 'convert-code':
      prompt = `Convert this code to Python (or if it's Python, convert to JavaScript). Show the equivalent code.\n\n\`\`\`\n${selectedText}\n\`\`\``
      break
    case 'debug-code':
      prompt = `Find bugs, potential errors, and security issues in this code. List each issue with severity and fix.\n\n\`\`\`\n${selectedText}\n\`\`\``
      break
    case 'summarize-page':
    case 'extract-key-points':
    case 'ask-about-page':
      // Get page content via content script
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' }, (response) => {
        if (response?.content) {
          const pagePrompt = action === 'summarize-page'
            ? `Summarize this webpage content in 5-7 bullet points:\n\n${response.content.slice(0, 5000)}`
            : action === 'extract-key-points'
            ? `Extract the 5 most important key points from this page:\n\n${response.content.slice(0, 5000)}`
            : `What is this page about? Provide a comprehensive overview:\n\n${response.content.slice(0, 5000)}`
          sendToSidePanel(pagePrompt, token, tab.id)
        }
      })
      return
    case 'security-scan':
      prompt = `Analyze the security headers and potential vulnerabilities of this URL: ${tab.url}\n\nCheck for: HSTS, CSP, X-Frame-Options, CORS policy, cookie flags, and common misconfigurations.`
      break
    default:
      return
  }

  if (prompt) {
    sendToSidePanel(prompt, token, tab.id)
  }
})

// ── Side Panel Communication ─────────────────────────────────────────────────

async function sendToSidePanel(prompt, token, tabId) {
  // Open side panel and send the prompt
  try {
    await chrome.sidePanel.open({ tabId })
    // Small delay to ensure panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'EXECUTE_PROMPT', prompt, token })
    }, 500)
  } catch (err) {
    // Fallback: send to popup
    chrome.storage.local.set({ pendingPrompt: prompt })
    chrome.action.openPopup()
  }
}

// ── Auth Token Management ────────────────────────────────────────────────────

async function getAuthToken() {
  const result = await chrome.storage.local.get('authToken')
  return result.authToken || null
}

// Listen for auth token from content script (when user logs in on cybermindcli.info)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN') {
    chrome.storage.local.set({ authToken: message.token })
    chrome.action.setBadgeText({ text: '' })
    chrome.action.setBadgeBackgroundColor({ color: '#10B981' })
    sendResponse({ success: true })
  }

  if (message.type === 'GET_AUTH_TOKEN') {
    getAuthToken().then(token => sendResponse({ token }))
    return true // async
  }

  if (message.type === 'LOGOUT') {
    chrome.storage.local.remove('authToken')
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#EF4444' })
    sendResponse({ success: true })
  }

  if (message.type === 'API_CALL') {
    handleAPICall(message.endpoint, message.options, message.token)
      .then(data => sendResponse({ data }))
      .catch(err => sendResponse({ error: err.message }))
    return true // async
  }
})

async function handleAPICall(endpoint, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Commands (Keyboard Shortcuts) ────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle_sidepanel') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.sidePanel.open({ tabId: tab.id })
    })
  }
  if (command === 'grammar_check') {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_GRAMMAR_CHECK' })
    })
  }
})

// ── Badge for unauthenticated state ──────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const token = await getAuthToken()
  if (!token) {
    chrome.action.setBadgeText({ text: '!' })
    chrome.action.setBadgeBackgroundColor({ color: '#F59E0B' })
  }
})
