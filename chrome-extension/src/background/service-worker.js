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
  meeting_notes: (t) => `From this meeting transcript/notes, extract:\n1. **Summary** (3-4 sentences)\n2. **Action Items** (bullet list with [Owner] if identifiable)\n3. **Key Decisions** (numbered)\n4. **Follow-ups**\n\nTranscript:\n"""${t}"""`,
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
    chrome.contextMenus.create({ id: 'screenshot_analyze', parentId: 'cv-root', title: 'Screenshot → AI Analysis', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'fullpage_screenshot', parentId: 'cv-root', title: 'Capture Full Page Screenshot', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'cite_apa', parentId: 'cv-root', title: 'Generate Citation (APA)', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'cite_mla', parentId: 'cv-root', title: 'Generate Citation (MLA)', contexts: ['page'] })
    chrome.contextMenus.create({ id: 'sep3', parentId: 'cv-root', type: 'separator', contexts: ['selection'] })
    sel('meeting_notes', 'Extract Meeting Notes & Action Items')
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

  if (info.menuItemId === 'screenshot_analyze') {
    chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 85 }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) return
      chrome.tabs.sendMessage(tab.id, { type: 'SCREENSHOT_ANALYSIS', imageData: dataUrl }, (resp) => {
        if (resp?.analysis) {
          openPanelWithPrompt(tab, `**Screenshot Analysis:**\n\n${resp.analysis}`)
        }
      })
    })
    return
  }

  if (info.menuItemId === 'fullpage_screenshot') {
    captureFullPage(tab)
    return
  }

  if (info.menuItemId === 'cite_apa' || info.menuItemId === 'cite_mla') {
    const style = info.menuItemId === 'cite_apa' ? 'apa' : 'mla'
    chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_CITATION', style }, (resp) => {
      if (resp?.citation) {
        openPanelWithPrompt(tab, `**${style.toUpperCase()} Citation:**\n\n${resp.citation}\n\n_(Copied to clipboard)_`)
      }
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
      // From content selection toolbar → check if it's a rewrite action
      const builder = PROMPTS[msg.action]
      const prompt = builder ? builder(msg.text) : msg.text
      const rewriteActions = ['rewrite_formal', 'rewrite_casual', 'rewrite_shorter', 'rewrite_longer', 'fix_tone']
      if (rewriteActions.includes(msg.action) && sender.tab) {
        // For rewrites: call API directly, then send diff back to content script
        handleRewriteDiff(sender.tab, msg.text, prompt, msg.action)
      } else if (sender.tab) {
        openPanelWithPrompt(sender.tab, prompt)
      }
      break
    }

    case 'CAPTURE_SCREENSHOT': {
      // Capture visible tab and send to content script for Gemini Vision analysis
      if (sender.tab) {
        chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 85 }, (dataUrl) => {
          if (chrome.runtime.lastError || !dataUrl) {
            sendResponse?.({ error: 'Screenshot capture failed' })
            return
          }
          // Send to content script for analysis
          chrome.tabs.sendMessage(sender.tab.id, {
            type: 'SCREENSHOT_ANALYSIS',
            imageData: dataUrl,
          }, (resp) => {
            if (resp?.analysis) {
              openPanelWithPrompt(sender.tab, `**Screenshot Analysis:**\n\n${resp.analysis}`)
            }
          })
        })
      }
      break
    }

    case 'GENERATE_CITATION_REQUEST': {
      // Forward to content script to extract meta, generate citation
      if (sender.tab) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: 'GENERATE_CITATION',
          style: msg.style || 'apa',
        }, (resp) => {
          if (resp?.citation) {
            navigator.clipboard?.writeText?.(resp.citation)
            sendResponse?.({ citation: resp.citation })
          }
        })
      }
      return true
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

// ── Icon click opens the side panel directly (Grammarly-style, no popup flash) ──
chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {})

// Fallback: explicit action click handler (works even if setPanelBehavior fails)
chrome.action.onClicked.addListener((tab) => {
  if (tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id }).catch((e) => {
      console.warn('[Codeva] sidePanel open failed:', e.message)
    })
  }
})

// ── Full Page Screenshot (GoFullPage-style) ───────────────────────────────────
async function captureFullPage(tab) {
  try {
    // 1. Ask content script for page dimensions + scroll plan
    const dims = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DIMENSIONS' })
    if (!dims) return

    const { totalHeight, viewportHeight, viewportWidth, devicePixelRatio } = dims
    const segments = []
    let y = 0

    // 2. Scroll + capture each viewport segment
    while (y < totalHeight) {
      await chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_TO', y })
      await new Promise(r => setTimeout(r, 350)) // wait for scroll + lazy content

      const dataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
          resolve(chrome.runtime.lastError ? null : url)
        })
      })
      if (dataUrl) segments.push({ y, dataUrl })
      y += viewportHeight
      // Rate limit: captureVisibleTab is limited to ~2/sec
      await new Promise(r => setTimeout(r, 550))
    }

    // 3. Restore scroll
    await chrome.tabs.sendMessage(tab.id, { type: 'SCROLL_TO', y: 0 })

    // 4. Open stitching page with the segments
    await chrome.storage.local.set({
      fullPageCapture: { segments, totalHeight, viewportWidth, viewportHeight, devicePixelRatio, url: tab.url, title: tab.title },
    })
    chrome.tabs.create({ url: chrome.runtime.getURL('src/capture/capture.html') })
  } catch (err) {
    console.error('[Codeva] Full page capture failed:', err)
  }
}

// ── Rewrite with Diff View ────────────────────────────────────────────────────
async function handleRewriteDiff(tab, originalText, prompt, action) {
  const token = await getToken()
  if (!token) { chrome.tabs.create({ url: AUTH_URL }); return }

  try {
    const res = await fetch('https://cybercli-api.onrender.com/api/v1/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'gemini/gemini-2.5-flash',
        stream: false,
      }),
    })

    if (!res.ok) {
      // Fallback to side panel
      openPanelWithPrompt(tab, prompt)
      return
    }

    // Parse response (may be SSE or JSON depending on backend)
    let rewritten = ''
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json()
      rewritten = data.content || data.choices?.[0]?.message?.content || ''
    } else {
      // SSE stream
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try { const p = JSON.parse(raw); if (p.type === 'token') rewritten += p.content } catch {}
        }
      }
    }

    if (rewritten.trim()) {
      // Send the diff back to the content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'REWRITE_RESULT',
        original: originalText,
        rewritten: rewritten.trim(),
        action,
      })
    } else {
      openPanelWithPrompt(tab, prompt)
    }
  } catch (err) {
    console.error('[Codeva] Rewrite diff failed:', err)
    openPanelWithPrompt(tab, prompt)
  }
}
