/**
 * Codeva Chrome Extension — Content Script
 * 
 * Injected into every page. Handles:
 * - Real-time grammar checking (Grammarly-style underlines)
 * - Floating toolbar on text selection
 * - Inline writing suggestions
 * - Page content extraction
 * - Auth token capture from cybermindcli.info
 */

;(function() {
  'use strict'

  const CODEVA_API = 'https://cybercli-api.onrender.com/api/v1'
  let isEnabled = true
  let grammarEnabled = true
  let floatingToolbar = null
  let currentSelection = ''

  // ── Auth Token Capture (from cybermindcli.info) ────────────────────────────

  if (window.location.hostname.includes('cybermindcli.info')) {
    const observer = new MutationObserver(() => {
      const token = localStorage.getItem('sb-access-token')
      if (token) {
        chrome.runtime.sendMessage({ type: 'AUTH_TOKEN', token })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Initial check
    const token = localStorage.getItem('sb-access-token')
    if (token) {
      chrome.runtime.sendMessage({ type: 'AUTH_TOKEN', token })
    }
  }

  // ── Floating Selection Toolbar ─────────────────────────────────────────────

  function createFloatingToolbar() {
    if (floatingToolbar) return floatingToolbar

    const toolbar = document.createElement('div')
    toolbar.id = 'codeva-floating-toolbar'
    toolbar.innerHTML = `
      <div class="codeva-toolbar-inner">
        <button data-action="grammar-check" title="Check Grammar">✍️</button>
        <button data-action="rewrite-formal" title="Make Formal">📝</button>
        <button data-action="rewrite-shorter" title="Make Shorter">✂️</button>
        <button data-action="explain" title="Explain">💡</button>
        <button data-action="summarize" title="Summarize">📋</button>
        <button data-action="translate" title="Translate">🌐</button>
        <button data-action="improve-code" title="Improve Code">⚡</button>
        <span class="codeva-toolbar-brand">Codeva</span>
      </div>
    `
    document.body.appendChild(toolbar)
    floatingToolbar = toolbar

    // Event delegation
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      const action = btn.dataset.action
      if (action && currentSelection) {
        chrome.runtime.sendMessage({
          type: 'CONTEXT_MENU_ACTION',
          action,
          text: currentSelection,
        })
        hideToolbar()
      }
    })

    return toolbar
  }

  function showToolbar(x, y) {
    const toolbar = createFloatingToolbar()
    toolbar.style.left = `${Math.min(x, window.innerWidth - 340)}px`
    toolbar.style.top = `${y - 50}px`
    toolbar.classList.add('codeva-toolbar-visible')
  }

  function hideToolbar() {
    if (floatingToolbar) {
      floatingToolbar.classList.remove('codeva-toolbar-visible')
    }
  }

  // Show toolbar on text selection
  document.addEventListener('mouseup', (e) => {
    if (!isEnabled) return
    if (e.target.closest('#codeva-floating-toolbar')) return

    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel.toString().trim()
      if (text.length > 3 && text.length < 10000) {
        currentSelection = text
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        showToolbar(rect.left + window.scrollX, rect.top + window.scrollY)
      } else {
        hideToolbar()
        currentSelection = ''
      }
    }, 100)
  })

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#codeva-floating-toolbar')) {
      hideToolbar()
    }
  })

  // ── Real-time Grammar Checking (Grammarly-style) ───────────────────────────

  let grammarTimeout = null
  const GRAMMAR_DEBOUNCE = 2000 // 2 seconds after user stops typing

  function setupGrammarChecking() {
    document.addEventListener('input', (e) => {
      if (!grammarEnabled) return
      const target = e.target
      if (!isEditableElement(target)) return

      clearTimeout(grammarTimeout)
      grammarTimeout = setTimeout(() => {
        checkGrammar(target)
      }, GRAMMAR_DEBOUNCE)
    }, true)
  }

  function isEditableElement(el) {
    if (!el) return false
    const tag = el.tagName?.toLowerCase()
    if (tag === 'textarea' || tag === 'input') return true
    if (el.contentEditable === 'true') return true
    if (el.getAttribute('role') === 'textbox') return true
    return false
  }

  async function checkGrammar(element) {
    const text = element.value || element.innerText || ''
    if (text.length < 10 || text.length > 5000) return

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'API_CALL',
        endpoint: '/completions',
        options: {
          method: 'POST',
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `Check this text for grammar/spelling errors. Return ONLY a JSON array of errors in format: [{"original": "wrong text", "corrected": "right text", "type": "grammar|spelling|punctuation|style", "explanation": "brief reason"}]. If no errors, return []. Text: "${text.slice(0, 2000)}"`
            }],
            model: 'groq/llama-3.1-8b',
            stream: false,
          }),
        },
      })

      if (response?.data?.content) {
        const match = response.data.content.match(/\[[\s\S]*?\]/)
        if (match) {
          const errors = JSON.parse(match[0])
          if (errors.length > 0) {
            showGrammarErrors(element, errors)
          }
        }
      }
    } catch (err) {
      // Silent fail — grammar checking is non-critical
    }
  }

  function showGrammarErrors(element, errors) {
    // Show error count badge near the element
    let badge = element.parentElement?.querySelector('.codeva-grammar-badge')
    if (!badge) {
      badge = document.createElement('div')
      badge.className = 'codeva-grammar-badge'
      element.parentElement?.appendChild(badge)
    }
    badge.textContent = `${errors.length} issue${errors.length > 1 ? 's' : ''}`
    badge.title = errors.map(e => `${e.type}: "${e.original}" → "${e.corrected}"`).join('\n')
    badge.onclick = () => {
      // Show detailed error panel
      showGrammarPanel(element, errors)
    }
  }

  function showGrammarPanel(element, errors) {
    let panel = document.getElementById('codeva-grammar-panel')
    if (!panel) {
      panel = document.createElement('div')
      panel.id = 'codeva-grammar-panel'
      document.body.appendChild(panel)
    }

    panel.innerHTML = `
      <div class="codeva-panel-header">
        <span>✍️ Writing Assistant</span>
        <button onclick="this.closest('#codeva-grammar-panel').remove()">✕</button>
      </div>
      <div class="codeva-panel-body">
        ${errors.map(e => `
          <div class="codeva-error-item codeva-error-${e.type}">
            <div class="codeva-error-type">${e.type}</div>
            <div class="codeva-error-text">
              <span class="codeva-error-original">${e.original}</span>
              <span class="codeva-error-arrow">→</span>
              <span class="codeva-error-corrected">${e.corrected}</span>
            </div>
            <div class="codeva-error-explain">${e.explanation}</div>
            <button class="codeva-fix-btn" data-original="${escapeHtml(e.original)}" data-corrected="${escapeHtml(e.corrected)}">Apply Fix</button>
          </div>
        `).join('')}
      </div>
    `
    panel.classList.add('codeva-panel-visible')

    // Fix buttons
    panel.querySelectorAll('.codeva-fix-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const original = btn.dataset.original
        const corrected = btn.dataset.corrected
        applyFix(element, original, corrected)
        btn.textContent = '✓ Fixed'
        btn.disabled = true
      })
    })
  }

  function applyFix(element, original, corrected) {
    if (element.value !== undefined) {
      element.value = element.value.replace(original, corrected)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      element.innerHTML = element.innerHTML.replace(escapeHtml(original), escapeHtml(corrected))
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  // ── Page Content Extraction ────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_PAGE_CONTENT') {
      const content = extractPageContent()
      sendResponse({ content, title: document.title, url: window.location.href })
    }

    if (message.type === 'TRIGGER_GRAMMAR_CHECK') {
      const active = document.activeElement
      if (isEditableElement(active)) {
        checkGrammar(active)
      }
    }

    if (message.type === 'TOGGLE_EXTENSION') {
      isEnabled = message.enabled
      if (!isEnabled) hideToolbar()
    }

    if (message.type === 'TOGGLE_GRAMMAR') {
      grammarEnabled = message.enabled
    }
  })

  function extractPageContent() {
    // Remove scripts, styles, nav, footer for cleaner extraction
    const clone = document.cloneNode(true)
    const remove = clone.querySelectorAll('script, style, nav, footer, header, aside, .sidebar, .ad, .advertisement, [role="navigation"]')
    remove.forEach(el => el.remove())

    const main = clone.querySelector('main, article, [role="main"], .content, .post-body, .article-body')
    const text = (main || clone.body)?.innerText || ''
    
    // Clean up whitespace
    return text.replace(/\n{3,}/g, '\n\n').trim().slice(0, 15000)
  }

  // ── Initialize ─────────────────────────────────────────────────────────────

  setupGrammarChecking()
  console.log('[Codeva Extension] Content script loaded')
})()
