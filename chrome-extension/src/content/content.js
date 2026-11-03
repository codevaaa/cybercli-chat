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

  const { normalizeIssues, filterDictionary, isSitePaused, dictionaryWords } = globalThis.CodevaWriting

  // Active agent persona (from the curated /agents registry). Only the validated
  // agentId is ever sent to the backend; the system prompt lives server-side.
  let activeAgentId = null
  let agentsCache = null // { personas, divisions } — fetched lazily, cached
  chrome.storage.local.get('activeAgentId', (r) => { activeAgentId = r.activeAgentId || null })
  const GRAMMAR_MODEL = 'groq/llama-3.1-8b'
  const DEBOUNCE_MS = 900 // faster now that local check is instant

  // ═══════════════════════════════════════════════════════════════════════════
  //  LOCAL GRAMMAR ENGINE (Layer 1 — instant, <5ms, no network)
  //  Inlined here because content scripts can't import ES modules.
  // ═══════════════════════════════════════════════════════════════════════════
  const CV_MISSPELLINGS = {
    teh:'the',recieve:'receive',seperate:'separate',occured:'occurred',untill:'until',wich:'which',
    becuase:'because',definately:'definitely',accomodate:'accommodate',acheive:'achieve',beleive:'believe',
    calender:'calendar',collegue:'colleague',concious:'conscious',embarass:'embarrass',enviroment:'environment',
    existance:'existence',foriegn:'foreign',goverment:'government',grammer:'grammar',gaurd:'guard',harrass:'harass',
    independant:'independent',liason:'liaison',maintainance:'maintenance',neccessary:'necessary',noticable:'noticeable',
    occassion:'occasion',persistant:'persistent',privelege:'privilege',publically:'publicly',reccomend:'recommend',
    refered:'referred',relevent:'relevant',succesful:'successful',tommorow:'tomorrow',truely:'truly',
    unfortunatly:'unfortunately',wierd:'weird',writen:'written',alot:'a lot',thier:'their',youre:"you're",
    wont:"won't",cant:"can't",dont:"don't",isnt:"isn't",didnt:"didn't",wouldnt:"wouldn't",couldnt:"couldn't",
    shouldnt:"shouldn't",hasnt:"hasn't",havent:"haven't",wasnt:"wasn't",werent:"weren't",arent:"aren't",
    doesnt:"doesn't",wanna:'want to',gonna:'going to',gotta:'got to',cuz:'because',tho:'though',thru:'through',
    ur:'your',pls:'please',plz:'please',thx:'thanks',ppl:'people',bcz:'because',bcoz:'because',
  }
  const CV_WORDS = new Set(['the','be','to','of','and','a','in','that','have','it','for','not','on','with','he','as','you','do','at','this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there','their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time','no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than','then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first','well','way','even','new','want','because','any','these','give','day','most','us','is','was','are','been','has','had','were','said','did','made','find','here','thing','many','hello','hi','hey','thanks','thank','please','yes','okay','cool','nice','great','sure','maybe','search','cyber','security','code','coding','number','name','email','password','login','submit','cancel'])

  window.__cvLocalGrammar = function(text) {
    const issues = []
    for (const match of text.matchAll(/\b[a-zA-Z']+\b/g)) {
      const word = match[0], correction = CV_MISSPELLINGS[word.toLowerCase()]
      if (correction) issues.push({ original: word, suggestion: word[0] === word[0].toUpperCase() ? correction[0].toUpperCase() + correction.slice(1) : correction,
        start: match.index, type: 'spelling', reason: 'Common misspelling' })
    }
    for (const match of text.matchAll(/\b(\w+)\s+\1\b/gi)) issues.push({ original: match[0], suggestion: match[1], start: match.index, type: 'grammar', reason: 'Repeated word' })
    for (const match of text.matchAll(/\bi\b(?!['’])/g)) issues.push({ original: 'i', suggestion: 'I', start: match.index, type: 'grammar', reason: 'Capitalize the pronoun “I”' })
    return filterDictionary(normalizeIssues(text, issues), settings.dictionary || [])
  }

  window.__cvLocalTone = function(text) {
    const l = text.toLowerCase()
    if (/\b(hereby|pursuant|regards|sincerely|furthermore|therefore|kindly)\b/.test(l)) return 'formal'
    if (/\b(lol|haha|gonna|wanna|yeah|cool|awesome|dude|hey)\b/.test(l)) return 'casual'
    if (/\b(must|will|definitely|certainly|guarantee|absolutely|ensure)\b/.test(l)) return 'confident'
    if (/\b(thanks|please|appreciate|happy|glad|love|wonderful)\b/.test(l)) return 'friendly'
    if (/[!]{2,}|\b(stupid|hate|terrible|awful|ridiculous)\b/.test(l)) return 'aggressive'
    return 'neutral'
  }

  let settings = { grammar: true, toolbar: true, floatingIcon: true }
  let authToken = null

  // ── Load settings + token ──────────────────────────────────────────────────
  chrome.storage.local.get(['settings', 'authToken'], (r) => {
    settings = { grammar: true, toolbar: true, floatingIcon: true, ...(r.settings || {}) }
    authToken = r.authToken || null
    document.documentElement.dataset.codevaTheme = settings.theme || 'system'
    document.documentElement.dataset.codevaPaused = String(isSitePaused(location.hostname, settings.disabledSites))
  })
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings) {
      settings = { ...settings, ...changes.settings.newValue }
      document.documentElement.dataset.codevaTheme = settings.theme || 'system'
      document.documentElement.dataset.codevaPaused = String(isSitePaused(location.hostname, settings.disabledSites))
      grammarSequence++; lastCheckedText = ''; currentIssues = filterDictionary(currentIssues, settings.dictionary || []); closeCard(); removeInlineUnderlines()
      if (!settings.grammar) { grammarSequence++; currentIssues = []; closeCard(); removeInlineUnderlines() }
      if (!settings.smartCompose) removeGhostOverlay()
      if (!settings.inlineUnderlines) removeInlineUnderlines()
      positionFab()
    }
    if (changes.authToken) authToken = changes.authToken.newValue
  })

  // ── Auth capture on cybermindcli.info ───────────────────────────────────────
  if (['https://cybermindcli.info', 'https://www.cybermindcli.info'].includes(location.origin)) {
    let lastToken, lastAttempt = 0
    const pushToken = async (payload, requestId) => {
      const token = payload ? payload.token : localStorage.getItem('sb-access-token')
      if (!requestId && (token === lastToken || (lastToken === undefined && !token && !payload) || Date.now() - lastAttempt < 15000)) return
      lastAttempt = Date.now()
      if (token && !payload && localStorage.getItem('codeva-account-ready') === 'false') {
        if (requestId) window.postMessage({ type: 'CODEVA_EXTENSION_AUTH_RESULT', requestId, ok: false, error: 'Account setup is still finishing. Please try again shortly.' }, location.origin)
        return
      }
      const user = payload?.user || { email: localStorage.getItem('user_email') || '', name: localStorage.getItem('user_name') || '' }
      let refreshToken, expiresAt
      // Read only the SDK session whose access token matches the authenticated
      // website session. Tokens never enter a URL or a page acknowledgement.
      for (let i = 0; token && i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!/^sb-.+-auth-token$/.test(key)) continue
        try {
          const session = JSON.parse(localStorage.getItem(key))
          if (session.access_token === token) { refreshToken = session.refresh_token; expiresAt = session.expires_at; break }
        } catch { /* Ignore unrelated storage. */ }
      }
      let result
      try {
        result = await chrome.runtime.sendMessage({ type: 'AUTH_TOKEN', token: token || null, user, refreshToken, expiresAt })
        if (result?.ok) lastToken = token
      } catch { result = { error: 'Reload the extension and this page, then try again.' } }
      if (requestId) window.postMessage({ type: 'CODEVA_EXTENSION_AUTH_RESULT', requestId, ok: !!result?.ok, error: result?.error || '' }, location.origin)
    }
    window.addEventListener('message', event => {
      if (event.source !== window || event.origin !== location.origin) return
      if (event.data?.type === 'CYBERCLI_AUTH_SYNC') pushToken(event.data)
      if (event.data?.type === 'CODEVA_EXTENSION_REQUEST_SYNC' && typeof event.data.requestId === 'string' && event.data.requestId.length <= 64) pushToken(null, event.data.requestId)
    })
    window.addEventListener('storage', event => { if (event.key === 'sb-access-token') pushToken() })
    pushToken()
    setInterval(() => pushToken(), 4000)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  // Cross-origin requests run in the extension worker using manifest host permissions.
  async function apiRequest(endpoint, body) {
    if (isSitePaused(location.hostname, settings.disabledSites)) throw new Error('Codeva writing assistance is paused on this website.')
    const result = await chrome.runtime.sendMessage({ type: 'API_REQUEST', endpoint, body })
    if (!result || result.error) throw new Error(result?.error || 'Extension API connection failed')
    return new Response(result.body, { status: result.status, headers: { 'Content-Type': result.contentType } })
  }
  const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  function isEditable(el) {
    if (isSitePaused(location.hostname, settings.disabledSites) || !el || el.disabled || el.readOnly || el.closest?.('.cv-card,.cv-result-card,.cv-diff-card')) return false
    if (/password|one-time-code|cc-|credit|card.?number|cvc|cvv|secret|token/i.test(`${el.autocomplete || ''} ${el.name || ''} ${el.id || ''}`)) return false
    const tag = el.tagName ? el.tagName.toLowerCase() : ''
    if (tag === 'textarea') return true
    if (tag === 'input') {
      const t = (el.type || 'text').toLowerCase()
      return ['text', 'search', ''].includes(t)
    }
    if (el.isContentEditable) return true
    return false
  }

  function getText(el) {
    return el.value !== undefined ? el.value : el.textContent || ''
  }

  function fieldRange(field, start, end) {
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT)
    let node, offset = 0, first = null, last = null
    while ((node = walker.nextNode())) {
      const next = offset + node.textContent.length
      if (!first && start <= next) first = [node, start - offset]
      if (end <= next) { last = [node, end - offset]; break }
      offset = next
    }
    if (!first || !last) return null
    const range = document.createRange(); range.setStart(...first); range.setEnd(...last); return range
  }
  function replaceFieldRange(field, start, end, replacement) {
    field.focus()
    if (field.value !== undefined) {
      const old = field.value, value = old.slice(0, start) + replacement + old.slice(end)
      const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value)
      field.setSelectionRange?.(start + replacement.length, start + replacement.length)
    } else {
      const range = fieldRange(field, start, end)
      if (!range) return false
      range.deleteContents(); range.insertNode(document.createTextNode(replacement))
    }
    field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: replacement }))
    return true
  }
  function captureRewriteTarget(text) {
    const field = activeField
    if (!isEditable(field)) return null
    const snapshot = getText(field)
    if (field.value !== undefined) {
      const raw = snapshot.slice(field.selectionStart, field.selectionEnd)
      if (raw.trim() !== text.trim()) return null
      const start = field.selectionStart + raw.indexOf(text.trim())
      return { field, snapshot, start, end: start + text.trim().length }
    }
    const selection = window.getSelection()
    if (!selection?.rangeCount) return null
    const range = selection.getRangeAt(0)
    if (!field.contains(range.commonAncestorContainer) || range.toString().trim() !== text.trim()) return null
    const prefix = range.cloneRange(); prefix.selectNodeContents(field); prefix.setEnd(range.startContainer, range.startOffset)
    const start = prefix.toString().length + range.toString().indexOf(text.trim())
    return { field, snapshot, start, end: start + text.trim().length }
  }
  function applyRewrite(target, replacement) {
    if (!target?.field?.isConnected || getText(target.field) !== target.snapshot) return false
    return replaceFieldRange(target.field, target.start, target.end, replacement)
  }

  async function callAI(prompt, model = GRAMMAR_MODEL) {
    if (!authToken) {
      const r = await chrome.storage.local.get('authToken')
      authToken = r.authToken
    }
    if (!authToken) throw { auth: true }
    const res = await apiRequest('/completions', {
        messages: [{ role: 'user', content: prompt }],
        model,
        stream: false,
        // Inject the active persona (validated server-side by agentId).
        ...(activeAgentId ? { agentId: activeAgentId } : {}),
    })
    if (res.status === 401) { authToken = null; throw { auth: true } }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    // Non-stream returns { content } or SSE fallback — handle both
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json()
      const content = data.content || data.choices?.[0]?.message?.content
      if (data.error || typeof content !== 'string' || !content.trim()) throw new Error(typeof data.error === 'string' ? data.error : 'The server returned no text. Please retry.')
      return content
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
  fab.innerHTML = `<div class="cv-fab-ring"></div><div class="cv-fab-core"><span class="cv-fab-mark"><svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M42 19a18 18 0 1 0 1 25" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="m32 37 15-15 5 5-15 15-7 2 2-7Z" fill="currentColor"/></svg></span></div><div class="cv-fab-count"></div>`
  document.documentElement.appendChild(fab)

  let activeField = null
  let debounceTimer = null
  let lastCheckedText = ''
  let checkedSnapshot = ''
  let grammarSequence = 0
  let checkStatus = 'local'
  let currentIssues = []
  let currentTone = 'neutral'
  let currentLanguage = 'English'
  let fabState = 'idle' // idle | checking | issues | clean

  function positionFab() {
    if (!activeField || !activeField.isConnected || !settings.floatingIcon || !settings.grammar) { fab.style.display = 'none'; return }
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
    if (activeField !== el) { grammarSequence++; lastCheckedText = ''; checkedSnapshot = ''; currentIssues = []; closeCard() }
    activeField = el
    setFabState('idle')
    positionFab()
  }

  function onFieldInput(e) {
    const el = e.target
    if (el !== activeField || !settings.grammar) return
    grammarSequence++; currentIssues = []; checkedSnapshot = ''; checkStatus = 'local'; removeInlineUnderlines(); closeCard()
    positionFab()
    clearTimeout(debounceTimer)

    // Smart debounce: check immediately after sentence-end punctuation,
    // otherwise wait the full debounce period. (Grammarly-style batching.)
    const text = getText(el)
    const endsWithSentence = /[.!?\n]\s*$/.test(text)
    const delay = endsWithSentence ? 300 : DEBOUNCE_MS

    // Instant local check happens with no delay for immediate feedback
    const quickLocal = window.__cvLocalGrammar ? window.__cvLocalGrammar(text.trim()) : []
    if (quickLocal.length > 0) {
      setFabState('issues', quickLocal.length)
    } else {
      setFabState('idle')
    }

    debounceTimer = setTimeout(() => runGrammarCheck(el), delay)
  }

  // Simple in-memory cache: text hash → result (avoids re-checking identical text)
  const grammarCache = new Map()
  async function runGrammarCheck(el) {
    if (el !== activeField || !settings.grammar || !isEditable(el)) return
    const text = getText(el)
    if (text.trim().length < 3 || text.length > 6000) { setFabState('idle'); return }
    if (text === lastCheckedText) return
    lastCheckedText = text
    const sequence = ++grammarSequence
    const fresh = () => sequence === grammarSequence && el === activeField && getText(el) === text && settings.grammar
    const local = window.__cvLocalGrammar(text)
    checkedSnapshot = text; currentIssues = local; checkStatus = 'local'
    currentTone = window.__cvLocalTone(text); currentLanguage = /[\u0900-\u097F]/.test(text) ? 'Hindi' : 'English'
    setFabState(local.length ? 'issues' : 'checking', local.length)
    try {
      const goals = await getWritingGoals() || {}
      if (!fresh()) return
      const key = JSON.stringify([text, goals, settings.dictionary || []])
      const cached = grammarCache.get(key)
      if (cached) { currentIssues = cached.issues; currentTone = cached.tone; currentLanguage = cached.language; checkStatus = 'complete' }
      else {
        const { authToken: token } = await chrome.storage.local.get('authToken'); authToken = token
        if (!fresh()) return
        if (!token) { currentIssues = local; checkStatus = 'local' }
        else {
          const response = await apiRequest('/completions/grammar', { text, goals, dictionary: settings.dictionary || [] })
          if (!fresh()) return
          if (!response.ok) throw new Error('AI check unavailable')
          const result = await response.json()
          if (!fresh()) return
          if (!Array.isArray(result.issues)) throw new Error('Invalid proofreading result')
          currentIssues = filterDictionary(normalizeIssues(text, [...result.issues, ...local]), settings.dictionary || [])
          currentTone = ['formal','casual','confident','friendly','neutral','aggressive'].includes(result.tone) ? result.tone : 'neutral'
          currentLanguage = typeof result.language === 'string' ? result.language.slice(0, 50) : 'Unknown'
          checkStatus = 'complete'
          grammarCache.set(key, { issues: currentIssues, tone: currentTone, language: currentLanguage })
          if (grammarCache.size > 50) grammarCache.delete(grammarCache.keys().next().value)
        }
      }
    } catch {
      if (!fresh()) return
      currentIssues = local; checkStatus = 'unavailable'; lastCheckedText = ''
    }
    if (!fresh()) return
    setFabState(currentIssues.length ? 'issues' : checkStatus === 'complete' ? 'clean' : 'idle', currentIssues.length)
    if (card) openGrammarCard()
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
    // Card uses position:fixed (viewport coords) — set after measuring below.

    if (currentIssues[0]?.auth) {
      card.innerHTML = authCardHTML()
    } else if (fabState === 'checking') {
      card.innerHTML = cardShell('Checking…', `<div class="cv-card-empty">Analyzing your text…</div>`)
    } else if (currentIssues.length === 0) {
      card.innerHTML = cardShell('Codeva', `
        <div class="cv-card-clean">
          <div class="cv-check-big">✓</div>
          <div>${checkStatus === 'complete' ? 'No issues found in this check.' : checkStatus === 'unavailable' ? 'AI check unavailable. Only basic local spelling was checked.' : 'Basic local check only. Sign in for AI proofreading.'}</div>
          <div class="cv-tone-row">
            <span class="cv-tone-chip cv-tone-${currentTone}">${currentTone}</span>
            <span class="cv-lang-chip">${esc(currentLanguage)}</span>
          </div>
        </div>`)
    } else {
      const toneBar = `<p class="cv-check-scope">${checkStatus === 'complete' ? 'AI proofreading' : 'Basic local suggestions · AI check unavailable'}</p><div class="cv-tone-row"><span class="cv-tone-chip cv-tone-${currentTone}">Tone: ${currentTone}</span><span class="cv-lang-chip">${esc(currentLanguage)}</span></div>`
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
          <button class="cv-apply" data-i="${i}">Apply</button>${iss.type === 'spelling' ? `<button class="cv-dictionary" data-i="${i}">Add to dictionary</button>` : ''}
        </div>`).join('')
      card.innerHTML = cardShell(`${currentIssues.length} suggestion${currentIssues.length > 1 ? 's' : ''}`, toneBar + items, true)
    }

    // Fixed positioning (relative to viewport, not document) — robust on all pages
    card.style.position = 'fixed'
    document.documentElement.appendChild(card)

    // ── Smart positioning: measure card, decide up vs down ──
    const fabRect = fab.getBoundingClientRect()
    const cardW = card.offsetWidth || 340
    const cardH = card.offsetHeight || 200
    const gap = 8
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Horizontal: align card's right edge near the FAB, clamp to viewport
    let left = fabRect.right - cardW
    left = Math.max(12, Math.min(left, vw - cardW - 12))

    // Vertical: PREFER opening upward (above the FAB) since text fields are
    // usually near the top of the page. Only go down if there's no room above.
    const spaceAbove = fabRect.top
    const spaceBelow = vh - fabRect.bottom
    let top
    if (spaceAbove >= cardH + gap) {
      top = fabRect.top - cardH - gap        // open UP
    } else if (spaceBelow >= cardH + gap) {
      top = fabRect.bottom + gap             // open DOWN
    } else {
      // Neither fits fully — pin to whichever side has more room, clamp
      top = spaceAbove > spaceBelow ? gap : Math.max(gap, vh - cardH - gap)
    }
    top = Math.max(8, Math.min(top, vh - cardH - 8))

    card.style.left = `${left}px`
    card.style.top = `${top}px`

    card.querySelector('.cv-card-close')?.addEventListener('click', closeCard)
    card.querySelector('.cv-signin')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_AUTH' })
    })
    card.querySelector('.cv-fixall')?.addEventListener('click', applyAllFixes)
    card.querySelector('.cv-pause-site')?.addEventListener('click', async () => {
      const { settings: current = {} } = await chrome.storage.local.get('settings')
      await chrome.storage.local.set({ settings: { ...current, disabledSites: [...new Set([...(current.disabledSites || []), location.hostname])] } })
      closeCard()
    })
    card.querySelectorAll('.cv-dictionary').forEach(button => button.onclick = async () => {
      const issue = currentIssues[Number(button.dataset.i)]; if (!issue) return
      const { settings: current = {} } = await chrome.storage.local.get('settings')
      await chrome.storage.local.set({ settings: { ...current, dictionary: dictionaryWords([...(current.dictionary || []), issue.original]) } })
    })
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
      <div class="cv-card-foot">Codeva writing assistant <button class="cv-pause-site">Pause on this website</button></div>`
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
    const issue = currentIssues[i]
    if (!issue || !activeField || getText(activeField) !== checkedSnapshot) { closeCard(); lastCheckedText = ''; return }
    const field = activeField
    removeInlineUnderlines()
    replaceFieldRange(field, issue.start, issue.end, issue.suggestion)
    lastCheckedText = ''; currentIssues = []; closeCard()
    clearTimeout(debounceTimer); debounceTimer = setTimeout(() => runGrammarCheck(field), 300)
  }
  function applyAllFixes() {
    if (!activeField || getText(activeField) !== checkedSnapshot) { closeCard(); return }
    const field = activeField, issues = [...currentIssues].sort((a, b) => b.start - a.start)
    removeInlineUnderlines()
    for (const issue of issues) replaceFieldRange(field, issue.start, issue.end, issue.suggestion)
    currentIssues = []; lastCheckedText = ''; closeCard(); setFabState('idle')
    clearTimeout(debounceTimer); debounceTimer = setTimeout(() => runGrammarCheck(field), 300)
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
    if (!settings.toolbar || isSitePaused(location.hostname, settings.disabledSites)) return
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
      const action = btn.dataset.act
      const text = selectedText
      toolbar.style.display = 'none'
      runToolbarAction(action, text)
    })
  })

  // Run a toolbar action IN-PAGE (no dependency on opening the side panel,
  // which needs a user gesture that's lost by the time background handles it)
  const TOOLBAR_PROMPTS = {
    explain: (t) => `Explain this clearly and simply:\n\n"""${t}"""`,
    rewrite_formal: (t) => `Rewrite this in a polished, professional tone. Return ONLY the rewritten text:\n\n"""${t}"""`,
    rewrite_shorter: (t) => `Make this more concise while keeping key info. Return ONLY the shortened text:\n\n"""${t}"""`,
    summarize: (t) => `Summarize this in 3-5 concise bullet points:\n\n"""${t}"""`,
    translate: (t) => `You are an expert translator supporting 100+ languages including 20+ international languages (English, Spanish, French, German, Chinese, Japanese, Korean, Arabic, Russian, Portuguese, Italian, Dutch, Turkish, etc.) and 22+ Indian native languages (Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese, etc.).\n\nDetect the language of this text. If it's English, translate to Hindi; otherwise translate to fluent English. Show "(detected: <language>)" on a new line at the end:\n\n"""${t}"""`,
  }

  async function runToolbarAction(action, text) {
    if (!text || text.length < 2) return
    const builder = TOOLBAR_PROMPTS[action] || ((t) => t)
    const title = { explain: 'Explanation', rewrite_formal: 'Improved', rewrite_shorter: 'Shortened', summarize: 'Summary', translate: 'Translation' }[action] || 'Result'
    const target = action.startsWith('rewrite') ? captureRewriteTarget(text) : null

    // Show a result card immediately with a loader
    showResultCard(title, null, true)

    try {
      const result = await callAI(builder(text), action.startsWith('rewrite') ? 'gemini/gemini-2.5-flash' : GRAMMAR_MODEL)
      showResultCard(title, result || '(no response)', false, target, result)
    } catch (err) {
      if (err.auth) {
        showResultCard(title, null, false, null, null, true)
      } else {
        showResultCard(title, `⚠ ${err.message || 'Request failed'}`, false)
      }
    }
  }

  // In-page result card (reuses diff-card styling, viewport-centered)
  let resultCard = null
  function showResultCard(title, body, loading, originalForApply, rewritten, authNeeded) {
    closeResultCard()
    const backdrop = document.createElement('div')
    backdrop.className = 'cv-diff-backdrop'
    resultCard = document.createElement('div')
    resultCard.className = 'cv-result-card'

    let inner
    if (authNeeded) {
      inner = `<div class="cv-result-auth"><p>Sign in to Codeva to use this feature.</p><button class="cv-signin">Sign in</button></div>`
    } else if (loading) {
      inner = `<div class="cv-result-loading"><span class="cv-reply-spinner"></span> Working…</div>`
    } else {
      inner = `<div class="cv-result-body">${esc(body)}</div>`
    }

    resultCard.innerHTML = `
      <div class="cv-result-head">
        <span class="cv-result-title"><span class="cv-logo-dot"></span> ${title}</span>
        <button class="cv-result-close">✕</button>
      </div>
      ${inner}
      ${!loading && !authNeeded ? `<div class="cv-result-foot">
        ${originalForApply ? '<button class="cv-result-btn primary cv-result-apply">Apply to page</button>' : ''}
        <button class="cv-result-btn secondary cv-result-copy">Copy</button>
      </div>` : ''}`

    document.documentElement.appendChild(backdrop)
    document.documentElement.appendChild(resultCard)

    const close = () => { backdrop.remove(); resultCard?.remove(); resultCard = null }
    backdrop.addEventListener('click', close)
    resultCard.querySelector('.cv-result-close')?.addEventListener('click', close)
    resultCard.querySelector('.cv-signin')?.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_AUTH' }))
    resultCard.querySelector('.cv-result-copy')?.addEventListener('click', (e) => {
      navigator.clipboard.writeText(body || rewritten || '').then(() => { e.target.textContent = 'Copied' }).catch(() => { e.target.textContent = 'Copy failed' })
    })
    resultCard.querySelector('.cv-result-apply')?.addEventListener('click', () => {
      if (applyRewrite(originalForApply, rewritten || body)) close()
      else resultCard.querySelector('.cv-result-apply').textContent = 'Draft changed. Copy this result instead.'
    })
  }
  function closeResultCard() {
    document.querySelectorAll('.cv-result-card, .cv-diff-backdrop').forEach(el => el.remove())
    resultCard = null
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MESSAGE HANDLERS (from background/popup)
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SELECTION') {
      const field = document.activeElement
      sendResponse({ text: isEditable(field) && field.value !== undefined ? field.value.slice(field.selectionStart, field.selectionEnd) : window.getSelection().toString().trim() })
    }
    if (msg.type === 'GET_PAGE_CONTENT') {
      sendResponse({ content: extractPage(), title: document.title, url: location.href })
    }
    if (msg.type === 'TRIGGER_GRAMMAR') {
      if (activeField) { lastCheckedText = ''; runGrammarCheck(activeField) }
      sendResponse({ ok: !!activeField })
    }
    return false
  })

  function extractPage() {
    const clone = document.body.cloneNode(true)
    clone.querySelectorAll('script,style,nav,footer,header,aside,noscript,svg,input,textarea,[contenteditable],[hidden],[aria-hidden="true"],[class^="cv-"]').forEach(n => n.remove())
    const main = clone.querySelector('main,article,[role="main"]') || clone
    return (main.innerText || main.textContent || '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 15000)
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

  // Lazily fetch the curated agent registry (cached for the page lifetime).
  async function fetchAgents() {
    if (agentsCache) return agentsCache
    const res = await apiRequest('/agents')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    agentsCache = {
      personas: Array.isArray(data?.personas) ? data.personas : [],
      divisions: data?.divisions || {},
    }
    return agentsCache
  }

  function positionSlashMenu(el) {
    const rect = el.getBoundingClientRect()
    slashMenu.style.bottom = `${window.innerHeight - rect.top + 6}px`
    slashMenu.style.left = `${rect.left}px`
  }

  // Render the agent persona picker inside the slash menu. Selecting one sets
  // the active persona for subsequent AI actions (stored + used as agentId).
  async function showAgentMenu(el, filter = '') {
    closeSlashMenu()
    slashMenu = document.createElement('div')
    slashMenu.className = 'cv-slash-menu'
    positionSlashMenu(el)
    slashMenu.innerHTML = `<div class="cv-slash-head">Agents — loading…</div>`
    document.documentElement.appendChild(slashMenu)

    let agents = []
    try {
      const data = await fetchAgents()
      agents = data.personas
    } catch {
      if (slashMenu) slashMenu.innerHTML = `<div class="cv-slash-head">Could not load agents</div>`
      return
    }
    if (!slashMenu) return // closed while loading

    const q = filter.trim().toLowerCase()
    const matches = q
      ? agents.filter(a => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q))
      : agents

    const clearRow = activeAgentId
      ? `<button class="cv-slash-item" data-agent="__clear__">
           <span class="cv-slash-cmd">✕ Clear agent</span>
           <span class="cv-slash-desc">Use the default assistant</span>
         </button>`
      : ''

    slashMenu.innerHTML = `
      <div class="cv-slash-head">Choose an Agent${activeAgentId ? ' (active: ' + esc(agentsCache.personas.find(a => a.id === activeAgentId)?.name || activeAgentId) + ')' : ''}</div>
      ${clearRow}
      ${matches.slice(0, 40).map(a => `
        <button class="cv-slash-item" data-agent="${esc(a.id)}">
          <span class="cv-slash-cmd">${esc(a.emoji || '🎭')} ${esc(a.name)}</span>
          <span class="cv-slash-desc">${esc((a.vibe || a.description || '').slice(0, 40))}</span>
        </button>`).join('') || `<div class="cv-slash-head">No agents match “${esc(filter)}”</div>`}`

    slashMenu.querySelectorAll('.cv-slash-item').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const id = btn.dataset.agent
        if (id === '__clear__') {
          activeAgentId = null
          chrome.storage.local.remove('activeAgentId')
        } else {
          activeAgentId = id
          chrome.storage.local.set({ activeAgentId: id })
        }
        // Remove the "/agent…" trigger text from the field.
        const currentVal = getText(el)
        const newVal = currentVal.replace(/\/agent\s*$/i, '').replace(/\/\w*$/, '')
        if (el.value !== undefined) { el.value = newVal } else { el.innerText = newVal }
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.focus()
        closeSlashMenu()
      })
    })
  }

  function showSlashMenu(el, filter = '') {
    // Special dynamic command: /agent opens the persona picker.
    if (/^\/agent/i.test(filter)) {
      const rest = filter.replace(/^\/agent\s*/i, '')
      showAgentMenu(el, rest)
      return
    }

    closeSlashMenu()
    const commands = Object.entries(PROMPT_LIBRARY).filter(([cmd]) =>
      cmd.toLowerCase().startsWith(filter.toLowerCase())
    )
    // Surface /agent as a discoverable command too.
    const showAgentEntry = '/agent'.startsWith(filter.toLowerCase())
    if (commands.length === 0 && !showAgentEntry) return

    slashMenu = document.createElement('div')
    slashMenu.className = 'cv-slash-menu'
    positionSlashMenu(el)
    slashMenu.innerHTML = `
      <div class="cv-slash-head">Prompt Library</div>
      ${showAgentEntry ? `
        <button class="cv-slash-item" data-cmd="/agent">
          <span class="cv-slash-cmd">🎭 /agent</span>
          <span class="cv-slash-desc">Pick an expert persona…</span>
        </button>` : ''}
      ${commands.map(([cmd, desc]) => `
        <button class="cv-slash-item" data-cmd="${esc(cmd)}">
          <span class="cv-slash-cmd">${esc(cmd)}</span>
          <span class="cv-slash-desc">${esc(desc.slice(0, 35))}…</span>
        </button>`).join('')}`

    document.documentElement.appendChild(slashMenu)

    slashMenu.querySelectorAll('.cv-slash-item').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        const cmd = btn.dataset.cmd
        if (cmd === '/agent') {
          showAgentMenu(el, '')
          return
        }
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
    // Match either a plain slash command (/blog) or the /agent picker with an
    // optional trailing filter (/agent front).
    const agentMatch = text.match(/\/agent(\s+[\w-]*)?$/i)
    const slashMatch = text.match(/\/(\w*)$/)
    if (agentMatch) {
      showSlashMenu(el, '/agent' + (agentMatch[1] || ''))
    } else if (slashMatch) {
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
      const target = captureRewriteTarget(msg.original)
      showDiffView(msg.original, msg.rewritten, (accepted) => {
        if (!applyRewrite(target, accepted)) navigator.clipboard.writeText(accepted).catch(() => {})
      })
    }
    return false
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
      if (clean.length > 3 && field === activeField && document.activeElement === field && getText(field).trim() === text && settings.smartCompose) {
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
      const current = getText(activeField), continuation = ghostText
      replaceFieldRange(activeField, current.length, current.length, continuation)
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
                box.innerHTML = `<div>${esc(reply.trim()).replace(/\n/g, '<br>')}</div>`
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
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: base64Image } }] }
      ]
      const res = await apiRequest('/completions', { messages, model: 'gemini/gemini-2.5-flash', stream: false })
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

  // ═══════════════════════════════════════════════════════════════════════════
  //  USAGE TRACKING — count words improved, prompts run, errors fixed
  // ═══════════════════════════════════════════════════════════════════════════

  async function trackUsage(action, wordsCount = 0) {
    const { usageStats = { promptsRun: 0, wordsImproved: 0, errorsFixed: 0, sessionsToday: 0, lastDate: '' } } = await chrome.storage.local.get('usageStats')
    const today = new Date().toISOString().split('T')[0]
    if (usageStats.lastDate !== today) {
      usageStats.sessionsToday = 0
      usageStats.lastDate = today
    }
    usageStats.promptsRun++
    usageStats.wordsImproved += wordsCount
    if (action === 'grammar') usageStats.errorsFixed++
    usageStats.sessionsToday++
    chrome.storage.local.set({ usageStats })
  }

  // Hook into existing callAI to track usage
  const _originalCallAI = callAI
  callAI = async function(prompt, model) {
    const result = await _originalCallAI(prompt, model)
    const words = (result || '').split(/\s+/).length
    trackUsage('prompt', words)
    return result
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  INLINE UNDERLINES — overlay colored wavy underlines on grammar errors
  //  Works on standard contenteditable fields where CSS Highlight is available.
  // ═══════════════════════════════════════════════════════════════════════════

  let underlineOverlay = null

  function showInlineUnderlines(field, issues) {
    removeInlineUnderlines()
    if (!field.isContentEditable || !settings.inlineUnderlines || !globalThis.CSS?.highlights || !globalThis.Highlight) return
    for (const type of ['grammar', 'spelling', 'punctuation', 'clarity']) {
      const ranges = issues.filter(issue => issue.type === type).map(issue => fieldRange(field, issue.start, issue.end)).filter(Boolean)
      if (ranges.length) CSS.highlights.set(`codeva-${type}`, new Highlight(...ranges))
    }
  }
  function removeInlineUnderlines() {
    for (const type of ['grammar', 'spelling', 'punctuation', 'clarity']) globalThis.CSS?.highlights?.delete(`codeva-${type}`)
    if (underlineOverlay) { underlineOverlay.remove(); underlineOverlay = null }
  }

  // Hook into grammar check results to show underlines
  const _origSetFabState = setFabState
  setFabState = function(state, count) {
    _origSetFabState(state, count)
    if (state === 'issues' && activeField?.isContentEditable && settings.inlineUnderlines) {
      showInlineUnderlines(activeField, currentIssues)
    } else if (state === 'clean' || state === 'idle') {
      removeInlineUnderlines()
    }
  }

  // Load inline underlines setting
  chrome.storage.local.get(['settings'], (r) => {
    settings.inlineUnderlines = (r.settings || {}).inlineUnderlines !== false
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEETING NOTES EXTRACTOR — select transcript, get action items + summary
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'EXTRACT_MEETING_NOTES') {
      const selected = window.getSelection()?.toString()?.trim()
      if (!selected || selected.length < 50) {
        sendResponse({ error: 'Select meeting transcript text first (min 50 chars)' })
        return true
      }
      extractMeetingNotes(selected).then(notes => sendResponse({ notes }))
      return true
    }
  })

  async function extractMeetingNotes(transcript) {
    const prompt = `You are a meeting assistant. From the following meeting transcript/notes, extract:

1. **Summary** (3-4 sentences)
2. **Action Items** (bullet list with [Owner] if identifiable)
3. **Key Decisions** (numbered list)
4. **Follow-ups** (things to revisit)

Be concise and actionable. Format with markdown.

Transcript:
"""${transcript.slice(0, 6000)}"""`

    try {
      return await callAI(prompt, 'gemini/gemini-2.5-flash')
    } catch {
      return 'Failed to extract notes. Please sign in.'
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TEAM SNIPPETS — shared reusable prompt templates (chrome.storage.sync)
  // ═══════════════════════════════════════════════════════════════════════════

  // Snippets are stored in chrome.storage.sync so they sync across devices
  // Format: { snippets: [{ id, name, trigger, content, createdAt }] }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_SNIPPETS') {
      chrome.storage.sync.get('snippets', (r) => {
        sendResponse({ snippets: r.snippets || getDefaultSnippets() })
      })
      return true
    }
    if (msg.type === 'SAVE_SNIPPET') {
      chrome.storage.sync.get('snippets', (r) => {
        const snippets = r.snippets || []
        snippets.push({ ...msg.snippet, id: Date.now().toString(36), createdAt: Date.now() })
        chrome.storage.sync.set({ snippets }, () => sendResponse({ ok: true }))
      })
      return true
    }
    if (msg.type === 'DELETE_SNIPPET') {
      chrome.storage.sync.get('snippets', (r) => {
        const snippets = (r.snippets || []).filter(s => s.id !== msg.id)
        chrome.storage.sync.set({ snippets }, () => sendResponse({ ok: true }))
      })
      return true
    }
  })

  function getDefaultSnippets() {
    return [
      { id: 'def1', name: 'Professional Email', trigger: '/promail', content: 'Write a professional email about: {topic}. Include greeting, body, and sign-off.', createdAt: 0 },
      { id: 'def2', name: 'Bug Report', trigger: '/bugreport', content: 'Write a bug report with: Summary, Steps to Reproduce, Expected vs Actual, Environment. Bug: {description}', createdAt: 0 },
      { id: 'def3', name: 'Code Review', trigger: '/cr', content: 'Review this code for: correctness, performance, security, readability. Provide actionable suggestions.\n\n{code}', createdAt: 0 },
      { id: 'def4', name: 'Meeting Agenda', trigger: '/agenda', content: 'Create a meeting agenda for: {topic}. Include: objectives, discussion points, time allocations, action items template.', createdAt: 0 },
      { id: 'def5', name: 'LinkedIn Post', trigger: '/linkedin', content: 'Write a LinkedIn post about: {topic}. Make it engaging, use line breaks, include a call-to-action. Professional but authentic tone.', createdAt: 0 },
    ]
  }

  // Integrate snippets into the slash menu (expand PROMPT_LIBRARY dynamically)
  chrome.storage.sync.get('snippets', (r) => {
    const snippets = r.snippets || getDefaultSnippets()
    snippets.forEach(s => {
      if (s.trigger && !PROMPT_LIBRARY[s.trigger]) {
        PROMPT_LIBRARY[s.trigger] = s.content
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  //  FULL-PAGE SCREENSHOT support (GoFullPage-style) — dimension + scroll helpers
  // ═══════════════════════════════════════════════════════════════════════════

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_PAGE_DIMENSIONS') {
      sendResponse({
        totalHeight: Math.max(
          document.body.scrollHeight, document.documentElement.scrollHeight,
          document.body.offsetHeight, document.documentElement.offsetHeight
        ),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        devicePixelRatio: window.devicePixelRatio || 1,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      })
      return true
    }
    if (msg.type === 'SCROLL_TO') {
      window.scrollTo({ left: 0, top: msg.y, behavior: 'instant' })
      // Hide our own UI during capture so it doesn't appear in the screenshot
      const fabEl = document.querySelector('.cv-fab')
      const tb = document.querySelector('.cv-toolbar')
      if (fabEl) fabEl.style.visibility = 'hidden'
      if (tb) tb.style.display = 'none'
      sendResponse({ ok: true, y: window.scrollY })
      return true
    }
    if (msg.type === 'RESTORE_CAPTURE') {
      window.scrollTo({ left: msg.x || 0, top: msg.y || 0, behavior: 'instant' })
      fab.style.visibility = ''
      sendResponse({ ok: true })
    }
  })

  console.log('[Codeva] Browser workspace ready v1.4.0')
})()
