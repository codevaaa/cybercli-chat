/**
 * Codeva Extension — Background Service Worker (Manifest V3)
 *
 * Responsibilities:
 *  - Context menu registration + routing
 *  - Auth token capture & storage (from cybermindcli.info)
 *  - Opening the side panel with a queued prompt
 *  - Badge state (signed-in / signed-out)
 */

const SITE_URL = 'https://cybermindcli.info'
const AUTH_URL = `${SITE_URL}/auth/login?from=extension`

// Prompt builders (kept inline — service workers can't import from content libs easily)
const PROMPTS = {
  grammar: (t) => `You are a professional editor. Fix grammar, spelling, punctuation, and clarity. Return the corrected text, then a short bullet list of changes.\n\n"""${t}"""`,
  rewrite_formal: (t) => `Rewrite in a polished, formal, professional tone. Return ONLY the rewritten text.\n\n"""${t}"""`,
  rewrite_casual: (t) => `Rewrite in a friendly, casual tone. Return ONLY the rewritten text.\n\n"""${t}"""`,
  rewrite_shorter: (t) => `Make this more concise while keeping key info. Return ONLY the shortened text.\n\n"""${t}"""`,
  rewrite_longer: (t) => `Expand with more detail and examples. Return ONLY the expanded text.\n\n"""${t}"""`,
  fix_tone: (t) => `Rewrite with a confident, professional business tone. Return ONLY the text.\n\n"""${t}"""`,
  explain: (t) => `Explain this clearly and simply:\n\n"""${t}"""`,
  summarize: (t) => `Summarize in 3-5 concise bullet points:\n\n"""${t}"""`,
  translate: (t) => `Detect the language. If English, translate to Hindi; else translate to English. Give only the translation.\n\n"""${t}"""`,
  define: (t) => `Define the term "${t}" with a definition, explanation, and one example.`,
  explain_code: (t) => `Explain this code step by step, noting any issues:\n\n\`\`\`\n${t}\n\`\`\``,
  improve_code: (t) => `Improve this code (performance, readability, best practices). Show improved code + what changed.\n\n\`\`\`\n${t}\n\`\`\``,
  debug_code: (t) => `Find bugs and security issues. List each with severity and fix.\n\n\`\`\`\n${t}\n\`\`\``,
  convert_code: (t) => `Convert this code to another popular language. Show the equivalent code.\n\n\`\`\`\n${t}\n\`\`\``,
}

// ── Context Menus ────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'cv-root', title: 'Codeva AI', contexts: ['selection', 'page', 'editable'] })

    const sel = (id, title) => chrome.contextMenus.create({ id, parentId: 'cv-root', title, contexts: ['selection'] })
    sel('grammar', 'Fix grammar & spelling')
    sel('rewrite_formal', 'Rewrite - Formal')
    sel('rewrite_casual', 'Rewrite - Casual')
    sel('rewrite_shorter', 'Make shorter')
    sel('rewrite_longer', 'Expand')
    chrome.contextMenus.create({ id: 'sep1', parentId: 'cv-root', type: 'separator', contexts: ['selection'] })
    sel('explain', 'Explain this')
    sel('summarize', 'Summarize')
    sel('translate', 'Translate')
    sel('define', 'Define term')
    chrome.contextMenus.create({ id: 'sep2', parentId: 'cv-root', type: 'separator', contexts: ['selection'] })
    sel('explain_code', 'Explain code')
    sel('improve_code', 'Improve code')
    sel('debug_code', 'Find bugs')

    chrome.contextMenus.create({ id: 'summarize_page', parentId: 'cv-root', title: 'Summarize this page', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'ask_page', parentId: 'cv-root', title: 'Ask about this page', contexts: ['page'] })
  })
  refreshBadge()
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const token = await getToken()
  if (!token) { chrome.tabs.create({ url: AUTH_URL }); return }

  if (info.menuItemId === 'summarize_page' || info.menuItemId === 'ask_page') {
    chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' }, (resp) => {
      if (!resp?.content) return
      const prompt = info.menuItemId === 'summarize_page'
        ? `Summarize this page in 5-7 bullet points:\n\n${resp.content.slice(0, 6000)}`
        : `Give a comprehensive overview of this page:\n\n${resp.content.slice(0, 6000)}`
      openPanelWithPrompt(tab, prompt)
    })
    return
  }

  const builder = PROMPTS[info.menuItemId]
  if (builder && info.selectionText) {
    openPanelWithPrompt(tab, builder(info.selectionText))
  }
})

// ── Message Router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'AUTH_TOKEN':
      chrome.storage.local.set({
        authToken: msg.token,
        userInfo: msg.user || null,
      })
      refreshBadge(true)
      sendResponse?.({ ok: true })
      break

    case 'GET_AUTH_TOKEN':
      getToken().then(token => sendResponse({ token }))
      return true

    case 'LOGOUT':
      chrome.storage.local.remove(['authToken', 'userInfo'])
      refreshBadge(false)
      sendResponse?.({ ok: true })
      break

    case 'OPEN_AUTH':
      chrome.tabs.create({ url: AUTH_URL })
      break

    case 'RUN_ACTION': {
      // From content selection toolbar → open panel with the built prompt
      const builder = PROMPTS[msg.action]
      const prompt = builder ? builder(msg.text) : msg.text
      if (sender.tab) openPanelWithPrompt(sender.tab, prompt)
      break
    }
  }
  return true
})

// ── Commands (keyboard shortcuts) ─────────────────────────────────────────────
chrome.commands?.onCommand.addListener((command, tab) => {
  if (command === 'toggle_sidepanel' && tab) {
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {})
  }
  if (command === 'grammar_check' && tab) {
    chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_GRAMMAR' })
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────────
async function getToken() {
  const { authToken } = await chrome.storage.local.get('authToken')
  return authToken || null
}

async function openPanelWithPrompt(tab, prompt) {
  await chrome.storage.local.set({ pendingPrompt: prompt, pendingAt: Date.now() })
  try {
    await chrome.sidePanel.open({ tabId: tab.id })
  } catch (e) {
    // Side panel requires a user gesture on some Chrome versions; fall back to popup storage
    console.warn('[Codeva] sidePanel.open failed:', e.message)
  }
}

async function refreshBadge(signedIn) {
  if (signedIn === undefined) {
    signedIn = !!(await getToken())
  }
  if (signedIn) {
    chrome.action.setBadgeText({ text: '' })
  } else {
    chrome.action.setBadgeText({ text: '•' })
    chrome.action.setBadgeBackgroundColor({ color: '#D97757' })
  }
}

// Allow the side panel to open on action click
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch(() => {})
