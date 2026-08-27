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
      const prompt = `You are a grammar checker. Analyze the text and return ONLY a JSON array (no markdown, no prose). Each item: {"original":"exact wrong substring","suggestion":"corrected substring","type":"grammar|spelling|punctuation|clarity","reason":"short reason"}. If perfect, return []. Text:\n"""${text}"""`
      const raw = await callAI(prompt, GRAMMAR_MODEL)
      const match = raw.match(/\[[\s\S]*\]/)
      currentIssues = match ? JSON.parse(match[0]) : []
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
      card.innerHTML = cardShell('Codeva', `<div class="cv-card-clean"><div class="cv-check-big">✓</div><div>Looks great! No issues found.</div></div>`)
    } else {
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
      card.innerHTML = cardShell(`${currentIssues.length} suggestion${currentIssues.length > 1 ? 's' : ''}`, items, true)
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

  console.log('[Codeva] Content script ready v1.1')
})()
