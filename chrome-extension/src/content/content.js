/**
 * Codeva Extension — Content Script (self-contained, no imports)
 *
 * Grammarly-style experience:
 *  - Persistent floating circular icon anchored to the focused text field
 *  - Icon shows status: idle / checking / issue-count / all-good
 *  - Click icon → opens suggestion card with one-click fixes
 *  - Selection toolbar for quick AI actions on any highlighted text
 *  - Captures auth token when the user is on cybermindcli.info
 */

;(function () {
  'use strict'
  if (window.__codevaInjected) return
  window.__codevaInjected = true

  const API_BASE = 'https://cybercli-api.onrender.com/api/v1'
  const GRAMMAR_MODEL = 'groq/llama-3.1-8b'
  const DEBOUNCE_MS = 1400

  let settings = { grammar: true, toolbar: true, floatingIcon: true }
  let authToken = null

  // ── Load settings + token ──────────────────────────────────────────────────
  chrome.storage.local.get(['settings', 'authToken'], (r) => {
    settings = { grammar: true, toolbar: true, floatingIcon: true, ...(r.settings || {}) }
    authToken = r.authToken || null
  })
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) settings = { ...settings, ...changes.settings.newValue }
    if (changes.authToken) authToken = changes.authToken.newValue
  })

  // ── Auth capture on cybermindcli.info ───────────────────────────────────────
  if (location.hostname.includes('cybermindcli.info')) {
    const pushToken = () => {
      const t = localStorage.getItem('sb-access-token')
      const email = localStorage.getItem('user_email') || ''
      const name = localStorage.getItem('user_name') || ''
      if (t) chrome.runtime.sendMessage({ type: 'AUTH_TOKEN', token: t, user: { email, name } })
    }
    pushToken()
    setInterval(pushToken, 4000)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  function isEditable(el) {
    if (!el) return false
    const tag = el.tagName ? el.tagName.toLowerCase() : ''
    if (tag === 'textarea') return true
    if (tag === 'input') {
      const t = (el.type || 'text').toLowerCase()
      return ['text', 'search', 'email', 'url', ''].includes(t)
    }
    if (el.isContentEditable) return true
    return false
  }

  function getText(el) {
    return el.value !== undefined ? el.value : el.innerText || ''
  }

  async function callAI(prompt, model = GRAMMAR_MODEL) {
    if (!authToken) {
      const r = await chrome.storage.local.get('authToken')
      authToken = r.authToken
    }
    if (!authToken) throw { auth: true }
    const res = await fetch(`${API_BASE}/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model, stream: false }),
    })
    if (res.status === 401) { authToken = null; throw { auth: true } }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // Non-stream returns { content } or SSE fallback — handle both
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json()
      return data.content || data.choices?.[0]?.message?.content || ''
    }
    // SSE fallback
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = '', out = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') return out
        try { const p = JSON.parse(raw); if (p.type === 'token') out += p.content } catch {}
      }
    }
    return out
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FLOATING GRAMMAR ICON (Grammarly-style)
  // ═══════════════════════════════════════════════════════════════════════════

  const fab = document.createElement('div')
  fab.className = 'cv-fab'
  fab.style.display = 'none'
  fab.innerHTML = `<div class="cv-fab-ring"></div><div class="cv-fab-core"></div><div class="cv-fab-count"></div>`
  document.documentElement.appendChild(fab)

  let activeField = null
  let debounceTimer = null
  let lastCheckedText = ''
  let currentIssues = []
  let currentTone = 'neutral'
  let currentLanguage = 'English'
  let fabState = 'idle' // idle | checking | issues | clean

  function positionFab() {
    if (!activeField) { fab.style.display = 'none'; return }
    const rect = activeField.getBoundingClientRect()
    if (rect.width < 40 || rect.height < 20) { fab.style.display = 'none'; return }
    fab.style.display = 'flex'
    fab.style.top = `${window.scrollY + rect.bottom - 32}px`
    fab.style.left = `${window.scrollX + rect.right - 32}px`
  }

  function setFabState(state, count = 0) {
    fabState = state
    fab.className = `cv-fab cv-fab-${state}`
    const countEl = fab.querySelector('.cv-fab-count')
    if (state === 'issues' && count > 0) {
      countEl.textContent = count
      countEl.style.display = 'flex'
    } else {
      countEl.style.display = 'none'
    }
  }

  function onFieldFocus(e) {
    const el = e.target
    if (!isEditable(el) || !settings.floatingIcon) return
    activeField = el
    setFabState('idle')
    positionFab()
  }

  function onFieldInput(e) {
    const el = e.target
    if (el !== activeField || !settings.grammar) return
    positionFab()
    clearTimeout(debounceTimer)
    setFabState('idle')
    debounceTimer = setTimeout(() => runGrammarCheck(el), DEBOUNCE_MS)
  }

  async function runGrammarCheck(el) {
    const text = getText(el).trim()
    if (text.length < 12 || text.length > 4000) { setFabState('idle'); return }
    if (text === lastCheckedText) return
    lastCheckedText = text
    setFabState('checking')

    try {
      const prompt = `You are a multilingual grammar and tone analyzer. Analyze the text (detect language automatically — works for English, Hindi, Spanish, French, German, and more).

Return ONLY a JSON object (no markdown, no prose) in this exact format:
{"tone":"formal|casual|confident|friendly|neutral|aggressive","language":"detected language","issues":[{"original":"exact wrong substring","suggestion":"corrected substring","type":"grammar|spelling|punctuation|clarity","reason":"short reason"}]}

Rules:
- "tone" = the overall tone of the text (one word)
- "language" = detected language name (e.g. "English", "Hindi", "Spanish")
- "issues" = array of errors found. If text is perfect, use empty array []
- Check grammar rules appropriate for the detected language
- For Hindi/Devanagari, check spelling and sentence structure
- For Spanish/French/German, check gender agreement, accents, conjugation

Text:
"""${text}"""`
      const raw = await callAI(prompt, GRAMMAR_MODEL)
      // Parse the JSON response
      let parsed = null
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch {}

      if (parsed && parsed.issues) {
        currentIssues = Array.isArray(parsed.issues) ? parsed.issues : []
        currentTone = parsed.tone || 'neutral'
        currentLanguage = parsed.language || 'English'
      } else {
        // Fallback: try to parse as array (old format)
        const arrMatch = raw.match(/\[[\s\S]*\]/)
        currentIssues = arrMatch ? JSON.parse(arrMatch[0]) : []
        currentTone = 'neutral'
        currentLanguage = 'English'
      }

      if (Array.isArray(currentIssues) && currentIssues.length > 0) {
        setFabState('issues', currentIssues.length)
      } else {
        setFabState('clean')
      }
    } catch (err) {
      setFabState('idle')
      if (err.auth) currentIssues = [{ auth: true }]
    }
  }

  fab.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
  fab.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation()
    openGrammarCard()
  })

  window.addEventListener('scroll', positionFab, true)
  window.addEventListener('resize', positionFab)
  document.addEventListener('focusin', onFieldFocus, true)
  document.addEventListener('input', onFieldInput, true)
  document.addEventListener('focusout', (e) => {
    // keep fab if focus moves into our own UI
    setTimeout(() => {
      const active = document.activeElement
      if (!isEditable(active) && !active?.closest?.('.cv-card')) {
        // Delay hide so the user can click the fab
      }
    }, 50)
  }, true)

  // ═══════════════════════════════════════════════════════════════════════════
  //  GRAMMAR SUGGESTION CARD
  // ═══════════════════════════════════════════════════════════════════════════

  let card = null

  function openGrammarCard() {
    closeCard()
    card = document.createElement('div')
    card.className = 'cv-card'
    const rect = fab.getBoundingClientRect()
    card.style.top = `${window.scrollY + rect.bottom + 8}px`
    card.style.left = `${Math.max(12, window.scrollX + rect.right - 340)}px`

    if (currentIssues[0]?.auth) {
      card.innerHTML = authCardHTML()
    } else if (fabState === 'checking') {
      card.innerHTML = cardShell('Checking…', `<div class="cv-card-empty">Analyzing your text…</div>`)
    } else if (currentIssues.length === 0) {
      card.innerHTML = cardShell('Codeva', `
        <div class="cv-card-clean">
          <div class="cv-check-big">✓</div>
          <div>Looks great! No issues found.</div>
          <div class="cv-tone-row">
            <span class="cv-tone-chip cv-tone-${currentTone}">${currentTone}</span>
            <span class="cv-lang-chip">${currentLanguage}</span>
          </div>
        </div>`)
    } else {
      const toneBar = `<div class="cv-tone-row"><span class="cv-tone-chip cv-tone-${currentTone}">Tone: ${currentTone}</span><span class="cv-lang-chip">${currentLanguage}</span></div>`
      const items = currentIssues.map((iss, i) => `
        <div class="cv-issue" data-i="${i}">
          <div class="cv-issue-top">
            <span class="cv-issue-tag cv-tag-${iss.type}">${iss.type}</span>
            <span class="cv-issue-reason">${esc(iss.reason || '')}</span>
          </div>
          <div class="cv-issue-diff">
            <span class="cv-old">${esc(iss.original)}</span>
            <span class="cv-arrow">→</span>
            <span class="cv-new">${esc(iss.suggestion)}</span>
          </div>
          <button class="cv-apply" data-i="${i}">Apply</button>
        </div>`).join('')
      card.innerHTML = cardShell(`${currentIssues.length} suggestion${currentIssues.length > 1 ? 's' : ''}`, toneBar + items, true)
    }

    document.documentElement.appendChild(card)

    card.querySelector('.cv-card-close')?.addEventListener('click', closeCard)
    card.querySelector('.cv-signin')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_AUTH' })
    })
    card.querySelector('.cv-fixall')?.addEventListener('click', applyAllFixes)
    card.querySelectorAll('.cv-apply').forEach(btn => {
      btn.addEventListener('click', () => {
        applyFix(parseInt(btn.dataset.i))
        btn.textContent = '✓ Applied'
        btn.disabled = true
      })
    })
  }

  function cardShell(title, body, showFixAll) {
    return `
      <div class="cv-card-head">
        <div class="cv-card-brand">
          <span class="cv-logo-dot"></span>
          <span>${title}</span>
        </div>
        <div class="cv-card-head-actions">
          ${showFixAll ? '<button class="cv-fixall">Fix all</button>' : ''}
          <button class="cv-card-close" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="cv-card-body">${body}</div>
      <div class="cv-card-foot">Powered by Codeva AI</div>`
  }

  function authCardHTML() {
    return `
      <div class="cv-card-head">
        <div class="cv-card-brand"><span class="cv-logo-dot"></span><span>Codeva</span></div>
        <button class="cv-card-close">✕</button>
      </div>
      <div class="cv-card-body">
        <div class="cv-card-auth">
          <p>Sign in to use Codeva's writing assistant.</p>
          <button class="cv-signin">Sign in to Codeva</button>
        </div>
      </div>`
  }

  function applyFix(i) {
    const iss = currentIssues[i]
    if (!iss || !activeField) return
    if (activeField.value !== undefined) {
      activeField.value = activeField.value.replace(iss.original, iss.suggestion)
      activeField.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      activeField.innerText = activeField.innerText.replace(iss.original, iss.suggestion)
      activeField.dispatchEvent(new Event('input', { bubbles: true }))
    }
    lastCheckedText = '' // allow re-check
  }

  function applyAllFixes() {
    if (!activeField) return
    let val = getText(activeField)
    currentIssues.forEach(iss => { if (iss.original) val = val.replace(iss.original, iss.suggestion) })
    if (activeField.value !== undefined) {
      activeField.value = val
    } else {
      activeField.innerText = val
    }
    activeField.dispatchEvent(new Event('input', { bubbles: true }))
    currentIssues = []
    setFabState('clean')
    closeCard()
  }

  function closeCard() {
    if (card) { card.remove(); card = null }
  }

  document.addEventListener('mousedown', (e) => {
    if (card && !e.target.closest('.cv-card') && !e.target.closest('.cv-fab')) closeCard()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  SELECTION TOOLBAR
  // ═══════════════════════════════════════════════════════════════════════════

  const toolbar = document.createElement('div')
  toolbar.className = 'cv-toolbar'
  toolbar.innerHTML = `
    <button data-act="explain"  title="Explain">Explain</button>
    <button data-act="rewrite_formal" title="Improve writing">Improve</button>
    <button data-act="rewrite_shorter" title="Shorten">Shorten</button>
    <button data-act="summarize" title="Summarize">Summarize</button>
    <button data-act="translate" title="Translate">Translate</button>
    <span class="cv-toolbar-brand">Codeva</span>`
  document.documentElement.appendChild(toolbar)

  let selectedText = ''

  document.addEventListener('mouseup', (e) => {
    if (!settings.toolbar) return
    if (e.target.closest('.cv-toolbar') || e.target.closest('.cv-card')) return
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel.toString().trim()
      if (text.length > 4 && text.length < 8000) {
        selectedText = text
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        toolbar.style.display = 'flex'
        toolbar.style.top = `${window.scrollY + rect.top - 46}px`
        toolbar.style.left = `${Math.max(8, window.scrollX + rect.left)}px`
      } else if (!e.target.closest('.cv-toolbar')) {
        toolbar.style.display = 'none'
      }
    }, 60)
  })

  toolbar.addEventListener('mousedown', (e) => e.preventDefault())
  toolbar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      toolbar.style.display = 'none'
      chrome.runtime.sendMessage({ type: 'RUN_ACTION', action: btn.dataset.act, text: selectedText })
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  MESSAGE HANDLERS (from background/popup)
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SELECTION') {
      sendResponse({ text: window.getSelection().toString().trim() })
    }
    if (msg.type === 'GET_PAGE_CONTENT') {
      sendResponse({ content: extractPage(), title: document.title, url: location.href })
    }
    if (msg.type === 'TRIGGER_GRAMMAR' && activeField) {
      runGrammarCheck(activeField)
    }
    return true
  })

  function extractPage() {
    const clone = document.body.cloneNode(true)
    clone.querySelectorAll('script,style,nav,footer,header,aside,noscript,svg,.cv-toolbar,.cv-fab,.cv-card').forEach(n => n.remove())
    const main = clone.querySelector('main,article,[role="main"]') || clone
    return (main.innerText || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 15000)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DIFF VIEW (Original vs Rewritten — before applying)
  // ═══════════════════════════════════════════════════════════════════════════

  function showDiffView(original, rewritten, onApply) {
    closeDiffView()
    const backdrop = document.createElement('div')
    backdrop.className = 'cv-diff-backdrop'
    const diffCard = document.createElement('div')
    diffCard.className = 'cv-diff-card'
    diffCard.innerHTML = `
      <div class="cv-diff-head">
        <h3>Review Changes</h3>
        <button class="cv-diff-close">✕</button>
      </div>
      <div class="cv-diff-body">
        <div class="cv-diff-col">
          <span class="cv-diff-label">Original</span>
          ${esc(original)}
        </div>
        <div class="cv-diff-col">
          <span class="cv-diff-label">Improved</span>
          ${esc(rewritten)}
        </div>
      </div>
      <div class="cv-diff-foot">
        <button class="cv-diff-btn secondary cv-diff-cancel">Cancel</button>
        <button class="cv-diff-btn primary cv-diff-apply">Apply Changes</button>
      </div>`

    document.documentElement.appendChild(backdrop)
    document.documentElement.appendChild(diffCard)

    const close = () => { backdrop.remove(); diffCard.remove() }
    backdrop.addEventListener('click', close)
    diffCard.querySelector('.cv-diff-close').addEventListener('click', close)
    diffCard.querySelector('.cv-diff-cancel').addEventListener('click', close)
    diffCard.querySelector('.cv-diff-apply').addEventListener('click', () => {
      onApply?.(rewritten)
      close()
    })
  }

  function closeDiffView() {
    document.querySelectorAll('.cv-diff-backdrop, .cv-diff-card').forEach(el => el.remove())
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PROMPT LIBRARY (slash commands: /email, /blog, /code, /review, /tweet)
  // ═══════════════════════════════════════════════════════════════════════════

  const PROMPT_LIBRARY = {
    '/email': 'Write a professional email about: ',
    '/blog': 'Write a blog post introduction about: ',
    '/code': 'Write clean code for: ',
    '/review': 'Review this for quality, clarity, and improvements: ',
    '/tweet': 'Write a compelling tweet about: ',
    '/explain': 'Explain this simply: ',
    '/fix': 'Fix the grammar and improve: ',
    '/translate': 'Translate to English: ',
    '/formal': 'Rewrite in a formal professional tone: ',
    '/casual': 'Rewrite in a casual friendly tone: ',
  }

  let slashMenu = null

  function showSlashMenu(el, filter = '') {
    closeSlashMenu()
    const commands = Object.entries(PROMPT_LIBRARY).filter(([cmd]) =>
      cmd.toLowerCase().startsWith(filter.toLowerCase())
    )
    if (commands.length === 0) return

    slashMenu = document.createElement('div')
    slashMenu.className = 'cv-slash-menu'
    const rect = el.getBoundingClientRect()
    slashMenu.style.bottom = `${window.innerHeight - rect.top + 6}px`
    slashMenu.style.left = `${rect.left}px`
    slashMenu.innerHTML = `
      <div class="cv-slash-head">Prompt Library</div>
      ${commands.map(([cmd, desc]) => `
        <button class="cv-slash-item" data-cmd="${cmd}">
          <span class="cv-slash-cmd">${cmd}</span>
          <span class="cv-slash-desc">${desc.slice(0, 35)}…</span>
        </button>`).join('')}`

    document.documentElement.appendChild(slashMenu)

    slashMenu.querySelectorAll('.cv-slash-item').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const cmd = btn.dataset.cmd
        const prefix = PROMPT_LIBRARY[cmd]
        const currentVal = getText(el)
        const newVal = currentVal.replace(/\/\w*$/, '') + prefix
        if (el.value !== undefined) { el.value = newVal } else { el.innerText = newVal }
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.focus()
        closeSlashMenu()
      })
    })
  }

  function closeSlashMenu() {
    if (slashMenu) { slashMenu.remove(); slashMenu = null }
  }

  // Listen for slash commands in editable fields
  document.addEventListener('input', (e) => {
    const el = e.target
    if (!isEditable(el)) return
    const text = getText(el)
    const slashMatch = text.match(/\/(\w*)$/)
    if (slashMatch) {
      showSlashMenu(el, '/' + slashMatch[1])
    } else {
      closeSlashMenu()
    }
  }, true)

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSlashMenu()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  ENHANCED TOOLBAR → DIFF VIEW for rewrites
  // ═══════════════════════════════════════════════════════════════════════════

  // Override RUN_ACTION to show diff view for rewrite actions
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'REWRITE_RESULT' && msg.original && msg.rewritten) {
      showDiffView(msg.original, msg.rewritten, (accepted) => {
        // Replace selection with accepted text
        const sel = window.getSelection()
        if (sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          range.deleteContents()
          range.insertNode(document.createTextNode(accepted))
        }
      })
    }
    return true
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  SMART COMPOSE — Ghost-text autocomplete (Tab to accept)
  //  Shows faint predicted text ahead of cursor. Press Tab to accept.
  // ═══════════════════════════════════════════════════════════════════════════

  let ghostOverlay = null
  let ghostText = ''
  let composeTimer = null
  let lastComposeText = ''
  const COMPOSE_DEBOUNCE = 1200
  const COMPOSE_MIN_CHARS = 20

  function createGhostOverlay(field) {
    removeGhostOverlay()
    if (field.tagName.toLowerCase() !== 'textarea' && field.tagName.toLowerCase() !== 'input') return null // only works on textarea/input for now

    ghostOverlay = document.createElement('div')
    ghostOverlay.className = 'cv-ghost-overlay'
    ghostOverlay.setAttribute('aria-hidden', 'true')

    // Position overlay exactly over the field
    const style = window.getComputedStyle(field)
    ghostOverlay.style.cssText = `
      position: absolute; pointer-events: none; white-space: pre-wrap; word-break: break-word;
      font-family: ${style.fontFamily}; font-size: ${style.fontSize}; line-height: ${style.lineHeight};
      padding: ${style.padding}; border: ${style.borderWidth} solid transparent;
      box-sizing: border-box; overflow: hidden; color: transparent;
    `
    field.parentElement.style.position = field.parentElement.style.position || 'relative'
    field.parentElement.appendChild(ghostOverlay)
    positionGhost(field)
    return ghostOverlay
  }

  function positionGhost(field) {
    if (!ghostOverlay) return
    const rect = field.getBoundingClientRect()
    const parentRect = field.parentElement.getBoundingClientRect()
    ghostOverlay.style.top = `${rect.top - parentRect.top}px`
    ghostOverlay.style.left = `${rect.left - parentRect.left}px`
    ghostOverlay.style.width = `${rect.width}px`
    ghostOverlay.style.height = `${rect.height}px`
  }

  function removeGhostOverlay() {
    if (ghostOverlay) { ghostOverlay.remove(); ghostOverlay = null }
    ghostText = ''
  }

  function renderGhost(field, suggestion) {
    if (!suggestion || !field) { removeGhostOverlay(); return }
    if (!ghostOverlay) createGhostOverlay(field)
    if (!ghostOverlay) return

    ghostText = suggestion
    const currentText = getText(field)
    // Show current text as invisible + suggestion as visible ghost
    ghostOverlay.innerHTML = `<span style="color:transparent">${esc(currentText)}</span><span class="cv-ghost-text">${esc(suggestion)}</span>`
    positionGhost(field)
  }

  async function triggerSmartCompose(field) {
    if (!settings.smartCompose) return
    const text = getText(field).trim()
    if (text.length < COMPOSE_MIN_CHARS) return
    if (text === lastComposeText) return
    lastComposeText = text

    // Get writing goals
    const goals = await getWritingGoals()
    const goalsCtx = goals ? `\nWriting style: ${goals.formality} tone, audience: ${goals.audience}, intent: ${goals.intent}.` : ''

    try {
      const prompt = `You are an autocomplete engine. Given the text so far, predict the next 5-15 words the user is likely to type. Return ONLY the predicted continuation (no quotes, no explanation, no preamble).${goalsCtx}\n\nText so far: "${text.slice(-200)}"\n\nContinuation:`
      const suggestion = await callAI(prompt, 'groq/llama-3.1-8b')
      const clean = suggestion.trim().replace(/^["']|["']$/g, '').slice(0, 80)
      if (clean.length > 3) {
        renderGhost(field, clean)
      }
    } catch {
      // Silent fail — compose is non-critical
    }
  }

  // Accept ghost text with Tab
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && ghostText && activeField && !e.shiftKey) {
      e.preventDefault()
      const current = getText(activeField)
      if (activeField.value !== undefined) {
        activeField.value = current + ghostText
      } else {
        activeField.innerText = current + ghostText
      }
      activeField.dispatchEvent(new Event('input', { bubbles: true }))
      // Move cursor to end
      if (activeField.setSelectionRange) {
        const len = activeField.value.length
        activeField.setSelectionRange(len, len)
      }
      removeGhostOverlay()
      lastComposeText = getText(activeField).trim()
    }
    // Escape dismisses ghost
    if (e.key === 'Escape' && ghostText) {
      removeGhostOverlay()
    }
  }, true)

  // Trigger compose on typing (debounced)
  document.addEventListener('input', (e) => {
    const el = e.target
    if (el !== activeField || !isEditable(el)) return
    if (!settings.smartCompose) return

    // Remove ghost when user types (they may type something different)
    removeGhostOverlay()
    clearTimeout(composeTimer)
    composeTimer = setTimeout(() => triggerSmartCompose(el), COMPOSE_DEBOUNCE)
  }, true)

  // Remove ghost on blur
  document.addEventListener('focusout', () => { removeGhostOverlay() }, true)

  // ═══════════════════════════════════════════════════════════════════════════
  //  REPLY GENERATOR — Gmail / LinkedIn compose box detection
  //  Shows a "Generate Reply" button when user is in a reply context.
  // ═══════════════════════════════════════════════════════════════════════════

  let replyBtn = null
  const GMAIL_COMPOSE_SELECTOR = 'div[aria-label="Message Body"], div.Am.Al.editable, div[g_editable="true"]'
  const LINKEDIN_COMPOSE_SELECTOR = 'div.msg-form__contenteditable, div[data-artdeco-is-focused]'

  function detectReplyContext() {
    const isGmail = location.hostname.includes('mail.google.com')
    const isLinkedIn = location.hostname.includes('linkedin.com')
    if (!isGmail && !isLinkedIn) return

    // Check periodically for compose boxes
    setInterval(() => {
      const selector = isGmail ? GMAIL_COMPOSE_SELECTOR : LINKEDIN_COMPOSE_SELECTOR
      const composeBoxes = document.querySelectorAll(selector)

      composeBoxes.forEach(box => {
        if (box.dataset.cvReply) return // already processed
        box.dataset.cvReply = '1'

        // Create "Generate Reply" button
        const btn = document.createElement('button')
        btn.className = 'cv-reply-btn'
        btn.innerHTML = `<span class="cv-reply-icon">✨</span> Generate Reply`
        btn.title = 'Let Codeva AI draft a reply based on the conversation'

        btn.addEventListener('click', async (e) => {
          e.preventDefault()
          e.stopPropagation()
          btn.disabled = true
          btn.innerHTML = `<span class="cv-reply-spinner"></span> Writing…`

          // Extract conversation context
          let context = ''
          if (isGmail) {
            const thread = document.querySelectorAll('.a3s.aiL, .gmail_quote, .gs')
            thread.forEach(el => { context += el.innerText?.slice(0, 500) + '\n' })
          } else if (isLinkedIn) {
            const msgs = document.querySelectorAll('.msg-s-event-listitem__body, .msg-s-message-group__meta')
            msgs.forEach(el => { context += el.innerText?.slice(0, 300) + '\n' })
          }

          const goals = await getWritingGoals()
          const goalsCtx = goals ? `\nTone: ${goals.formality}. Audience: ${goals.audience}. Intent: ${goals.intent}.` : '\nTone: professional and helpful.'

          try {
            const prompt = `You are a reply assistant. Based on the email/message thread below, write a thoughtful, well-structured reply. Keep it concise (2-4 sentences for messages, 4-6 for emails). ${goalsCtx}\n\nConversation:\n"""${context.slice(0, 2000)}"""\n\nReply:`
            const reply = await callAI(prompt, 'gemini/gemini-2.5-flash')
            if (reply.trim()) {
              // Insert reply into compose box
              if (box.isContentEditable) {
                box.innerHTML = `<div>${reply.trim().replace(/\n/g, '<br>')}</div>`
              } else if (box.value !== undefined) {
                box.value = reply.trim()
              }
              box.dispatchEvent(new Event('input', { bubbles: true }))
            }
          } catch (err) {
            console.warn('[Codeva] Reply generation failed:', err)
          }

          btn.disabled = false
          btn.innerHTML = `<span class="cv-reply-icon">✨</span> Generate Reply`
        })

        // Position the button above the compose box
        box.parentElement.style.position = box.parentElement.style.position || 'relative'
        box.parentElement.insertBefore(btn, box)
      })
    }, 2000)
  }

  // Start reply detection for Gmail/LinkedIn
  if (location.hostname.includes('mail.google.com') || location.hostname.includes('linkedin.com')) {
    detectReplyContext()
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WRITING GOALS — read from storage, inject into prompts
  // ═══════════════════════════════════════════════════════════════════════════

  async function getWritingGoals() {
    try {
      const { writingGoals } = await chrome.storage.local.get('writingGoals')
      return writingGoals || null
    } catch {
      return null
    }
  }

  // Load initial settings including smartCompose
  chrome.storage.local.get(['settings'], (r) => {
    const s = r.settings || {}
    settings.smartCompose = s.smartCompose !== false // default on
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  YOUTUBE SUMMARIZER — extract transcript, generate TL;DR + timestamps
  // ═══════════════════════════════════════════════════════════════════════════

  if (location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be')) {
    let ytSumBtn = null

    function injectYouTubeSummarizer() {
      if (ytSumBtn) return
      // Wait for the video title/actions to load
      const interval = setInterval(() => {
        const actionsBar = document.querySelector('#actions #top-level-buttons-computed, #menu-container, ytd-menu-renderer')
        if (!actionsBar) return
        clearInterval(interval)

        ytSumBtn = document.createElement('button')
        ytSumBtn.className = 'cv-yt-btn'
        ytSumBtn.innerHTML = `<span>📋</span> Summarize`
        ytSumBtn.title = 'Summarize this video with Codeva AI'
        ytSumBtn.addEventListener('click', handleYouTubeSummarize)
        actionsBar.prepend(ytSumBtn)
      }, 1500)
    }

    async function handleYouTubeSummarize() {
      ytSumBtn.disabled = true
      ytSumBtn.innerHTML = `<span class="cv-reply-spinner"></span> Extracting…`

      try {
        // Extract transcript from YouTube's internal data
        const transcript = await extractYouTubeTranscript()
        if (!transcript) {
          ytSumBtn.innerHTML = `<span>⚠</span> No captions`
          setTimeout(() => { ytSumBtn.innerHTML = `<span>📋</span> Summarize`; ytSumBtn.disabled = false }, 3000)
          return
        }

        ytSumBtn.innerHTML = `<span class="cv-reply-spinner"></span> Summarizing…`
        const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1')?.textContent || 'Video'

        const prompt = `Summarize this YouTube video transcript. Provide:
1. **TL;DR** (2-3 sentences)
2. **Key Points** (5-7 bullet points)
3. **Timestamps** (list notable moments with approximate timestamps if visible in transcript)

Video title: "${title}"
Transcript:
"""${transcript.slice(0, 8000)}"""`

        const summary = await callAI(prompt, 'gemini/gemini-2.5-flash')
        // Send to side panel
        chrome.runtime.sendMessage({ type: 'RUN_ACTION', action: 'custom', text: summary })
        ytSumBtn.innerHTML = `<span>✓</span> Done`
      } catch (err) {
        ytSumBtn.innerHTML = `<span>⚠</span> Failed`
        console.warn('[Codeva] YT summary failed:', err)
      }
      setTimeout(() => { ytSumBtn.innerHTML = `<span>📋</span> Summarize`; ytSumBtn.disabled = false }, 4000)
    }

    async function extractYouTubeTranscript() {
      // Method 1: Try to get from YouTube's internal player response
      try {
        const scripts = document.querySelectorAll('script')
        for (const script of scripts) {
          const text = script.textContent
          if (text.includes('captionTracks')) {
            const match = text.match(/"captionTracks":\s*(\[[\s\S]*?\])/)
            if (match) {
              const tracks = JSON.parse(match[1])
              if (tracks.length > 0) {
                const url = tracks[0].baseUrl
                const res = await fetch(url)
                const xml = await res.text()
                // Parse XML transcript
                const lines = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || []
                return lines.map(l => l.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).join(' ')
              }
            }
          }
        }
      } catch {}

      // Method 2: Try to open transcript panel and scrape
      try {
        const transcriptBtn = document.querySelector('[aria-label="Show transcript"], button[aria-label*="transcript"]')
        if (transcriptBtn) {
          transcriptBtn.click()
          await new Promise(r => setTimeout(r, 1500))
          const segments = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text, .ytd-transcript-segment-renderer')
          if (segments.length > 0) {
            const text = Array.from(segments).map(s => s.textContent.trim()).join(' ')
            return text
          }
        }
      } catch {}

      return null
    }

    // Inject on page load and navigation (YouTube is SPA)
    injectYouTubeSummarizer()
    const ytObserver = new MutationObserver(() => {
      if (!document.querySelector('.cv-yt-btn')) { ytSumBtn = null; injectYouTubeSummarizer() }
    })
    ytObserver.observe(document.body, { childList: true, subtree: true })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PDF READER — detect PDF viewer, extract text, offer summarize/query
  // ═══════════════════════════════════════════════════════════════════════════

  if (location.pathname.endsWith('.pdf') || document.contentType === 'application/pdf') {
    // Chrome's built-in PDF viewer embeds content in a shadow DOM
    // We inject a floating action bar for PDF actions
    setTimeout(() => {
      const pdfBar = document.createElement('div')
      pdfBar.className = 'cv-pdf-bar'
      pdfBar.innerHTML = `
        <span class="cv-pdf-brand"><span class="cv-logo-dot"></span> Codeva</span>
        <button class="cv-pdf-action" data-act="summarize">📋 Summarize PDF</button>
        <button class="cv-pdf-action" data-act="keypoints">🔑 Key Points</button>
        <button class="cv-pdf-action" data-act="ask">❓ Ask about PDF</button>`
      document.body.appendChild(pdfBar)

      pdfBar.querySelectorAll('.cv-pdf-action').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.act
          btn.disabled = true
          const origText = btn.innerHTML
          btn.innerHTML = `<span class="cv-reply-spinner"></span>`

          // Try to extract PDF text
          let pdfText = ''
          try {
            // Method: select all text in the viewer
            document.execCommand('selectAll')
            pdfText = window.getSelection()?.toString() || ''
            window.getSelection()?.removeAllRanges()
          } catch {}

          if (!pdfText) {
            pdfText = document.body.innerText || ''
          }

          if (pdfText.length < 50) {
            btn.innerHTML = '⚠ Cannot read PDF'
            setTimeout(() => { btn.innerHTML = origText; btn.disabled = false }, 3000)
            return
          }

          let prompt = ''
          if (action === 'summarize') {
            prompt = `Summarize this PDF document in 5-7 bullet points:\n\n${pdfText.slice(0, 10000)}`
          } else if (action === 'keypoints') {
            prompt = `Extract the 7 most important key points from this PDF:\n\n${pdfText.slice(0, 10000)}`
          } else {
            prompt = `Provide a comprehensive overview of this PDF document — what is it about, key findings, and conclusions:\n\n${pdfText.slice(0, 10000)}`
          }

          try {
            const result = await callAI(prompt, 'gemini/gemini-2.5-flash')
            chrome.runtime.sendMessage({ type: 'RUN_ACTION', action: 'custom', text: result })
          } catch {}

          btn.innerHTML = origText
          btn.disabled = false
        })
      })
    }, 1000)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CITATION GENERATOR — generate APA/MLA/Chicago for current page
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GENERATE_CITATION') {
      const meta = extractPageMeta()
      generateCitation(meta, msg.style || 'apa').then(citation => {
        sendResponse({ citation })
      })
      return true
    }
  })

  function extractPageMeta() {
    const getMeta = (name) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content || ''
    return {
      title: document.title,
      url: location.href,
      author: getMeta('author') || getMeta('article:author') || getMeta('og:article:author') || '',
      date: getMeta('date') || getMeta('article:published_time') || getMeta('og:article:published_time') || '',
      siteName: getMeta('og:site_name') || location.hostname.replace('www.', ''),
      description: getMeta('description') || getMeta('og:description') || '',
    }
  }

  async function generateCitation(meta, style) {
    const prompt = `Generate a ${style.toUpperCase()} format citation for this webpage. Return ONLY the formatted citation string.

Title: ${meta.title}
URL: ${meta.url}
Author: ${meta.author || 'Unknown'}
Published: ${meta.date || 'n.d.'}
Site: ${meta.siteName}
Accessed: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Format: ${style.toUpperCase()}`
    try {
      return await callAI(prompt, 'groq/llama-3.1-8b')
    } catch {
      return `[Citation generation failed — please sign in]`
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREENSHOT → VISION (triggered from background via message)
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SCREENSHOT_ANALYSIS' && msg.imageData) {
      analyzeScreenshot(msg.imageData).then(analysis => {
        sendResponse({ analysis })
      })
      return true
    }
  })

  async function analyzeScreenshot(base64Image) {
    if (!authToken) {
      const r = await chrome.storage.local.get('authToken')
      authToken = r.authToken
    }
    if (!authToken) return 'Please sign in to use screenshot analysis.'

    try {
      // Send base64 image to Gemini Vision via our completions endpoint
      const prompt = `Analyze this screenshot. Describe what you see, identify any text, UI elements, errors, or notable content. Be detailed and helpful.`
      const messages = [
        { role: 'user', content: `${prompt}\n\n![screenshot](${base64Image})` }
      ]
      const res = await fetch(`${API_BASE}/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ messages, model: 'gemini/gemini-2.5-flash', stream: false }),
      })
      if (!res.ok) return 'Analysis failed (HTTP ' + res.status + ')'

      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await res.json()
        return data.content || 'No analysis available'
      }
      // SSE fallback
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = '', out = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') return out
          try { const p = JSON.parse(raw); if (p.type === 'token') out += p.content } catch {}
        }
      }
      return out || 'No analysis available'
    } catch (err) {
      return `Analysis failed: ${err.message}`
    }
  }

  console.log('[Codeva] Content script ready v1.4 — youtube, pdf, vision, citations')
})()
