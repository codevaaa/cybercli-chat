import { ICONS } from '../lib/icons.js'
import { streamCompletion, getToken, fetchMe, apiJSON, AUTH_URL } from '../lib/config.js'
import { renderMarkdown } from '../lib/markdown.js'
import { initTheme } from '../lib/theme.js'
import { accountKey, newConversation, normalizeWorkspace, pagePrompt, HISTORY_LIMIT, MESSAGE_LIMIT } from '../lib/workspace.js'
import '../lib/writing.js'

const $ = id => document.getElementById(id)
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const { normalizeIssues, applyIssues, metrics, filterDictionary, dictionaryWords, localGrammar } = globalThis.CodevaWriting
let workspace = { conversations: [], activeId: null }, storageKey = null, view = 'chat'
let activeRequest = null, writingRequest = null, authGeneration = 0, claimingPrompt = false, deleted = null
let issueFilter = 'all', rewriteCandidate = null, writingUndo = []
let writeSnapshot = '', writeIssues = [], saveChain = Promise.resolve(), draftTimer, checkpointAt = 0
const activeChat = () => workspace.conversations.find(c => c.id === workspace.activeId)
const busy = () => !!activeRequest

function status(text, state = '') { $('sp-status').textContent = text; $('sp-status').dataset.state = state }
function showView(next) {
  view = next
  for (const name of ['chat', 'write', 'history']) $(`sp-${name}-view`).hidden = !storageKey || name !== view
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page')
    else button.removeAttribute('aria-current')
  })
  if (view === 'history') renderHistory()
}
function persist() {
  if (!storageKey) return Promise.resolve()
  workspace.conversations = workspace.conversations.filter(c => c.messages.length || c.id === workspace.activeId)
    .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, HISTORY_LIMIT)
  for (const conversation of workspace.conversations) conversation.messages = conversation.messages.slice(-MESSAGE_LIMIT)
  const value = { ...workspace, draft: $('sp-input').value, writingDraft: $('sp-writing').value }
  // Stay well below Chrome’s local storage quota even after long conversations.
  while (JSON.stringify(value).length > 3000000 && value.conversations.length > 1) {
    const index = value.conversations.findLastIndex(c => c.id !== value.activeId)
    value.conversations.splice(index, 1)
  }
  const key = storageKey, snapshot = structuredClone(value)
  saveChain = saveChain.catch(() => {}).then(() => chrome.storage.local.set({ [key]: snapshot }))
  return saveChain.catch(() => status('Could not save locally. Export your chat to keep a copy.', 'error'))
}
function draftChanged() { clearTimeout(draftTimer); draftTimer = setTimeout(persist, 300) }

async function connectAccount() {
  const generation = ++authGeneration
  const token = await getToken().catch(async () => (await chrome.storage.local.get('authToken')).authToken || null)
  if (generation !== authGeneration) return
  const key = token ? accountKey(token) : null
  if (key !== storageKey) {
    activeRequest?.abort(); writingRequest?.abort()
    activeRequest = null; setBusy(false)
    storageKey = key; deleted = null; writingUndo = []
    $('sp-undo-delete').hidden = true
    $('sp-use-page').checked = false
    const stored = key ? (await chrome.storage.local.get(key))[key] : null
    if (generation !== authGeneration) return
    workspace = normalizeWorkspace(stored)
    if (!activeChat()) { const chat = newConversation(); workspace.conversations.unshift(chat); workspace.activeId = chat.id }
    $('sp-input').value = stored?.draft?.slice(0, 20000) || ''
    $('sp-writing').value = stored?.writingDraft?.slice(0, 6000) || ''
    resetWriting(); renderChat()
  }
  $('sp-auth').hidden = !!token
  showView(view)
  if (!token) { status('Sign in to connect your Codeva account'); return }
  status('Checking server connection…')
  checkPending().catch(error => status(error.message, 'error'))
  const me = await fetchMe()
  if (generation !== authGeneration) return
  if (!me) { status('Session expired. Please sign in again.', 'error'); return }
  status(me._networkError ? 'Server unavailable. Your local conversations are still here.' : `Connected to Codeva · ${me.plan || 'free'} plan`, me._networkError ? 'error' : 'connected')
}

async function loadModels() {
  try {
    const data = await apiJSON('/models')
    $('sp-model').replaceChildren(new Option('Automatic routing', 'auto'))
    const { selectedModel = 'auto' } = await chrome.storage.local.get('selectedModel')
    for (const model of data.models || []) {
      if (!model || model.localOnly || model.id === 'auto' || typeof model.id !== 'string') continue
      const option = document.createElement('option'); option.value = model.id
      option.textContent = `${model.name || model.id}${model.free === false ? ' · paid' : ''}`
      option.title = model.description || ''; option.dataset.manualOnly = String(model.automatic === false)
      $('sp-model').appendChild(option)
    }
    if ([...$('sp-model').options].some(option => option.value === selectedModel)) $('sp-model').value = selectedModel
    $('sp-model-status').textContent = 'Models from your Codeva server'
  } catch { $('sp-model-status').textContent = 'Catalog unavailable · automatic routing is available' }
}

function renderChat() {
  const main = $('sp-chat'); main.replaceChildren()
  const messages = activeChat()?.messages || []
  if (!messages.length) {
    main.innerHTML = `<div class="sp-welcome"><p class="eyebrow">A clearer way forward</p><h1>What’s on your mind?</h1><p>A second pair of eyes for your writing, research, and everyday work.</p><div class="sp-chips">
      <button data-action="summary">${ICONS.list}<strong>Understand this page</strong><small>Read less. Take away more.</small></button>
      <button data-action="explain">${ICONS.lightbulb}<strong>Explain the details</strong><small>Find the idea behind it.</small></button>
      <button data-action="write">${ICONS.wand}<strong>Polish a draft</strong><small>Keep your voice. Add clarity.</small></button>
      <button data-action="code">${ICONS.code}<strong>Think through code</strong><small>Debug, review, or build.</small></button>
    </div></div>`
    main.querySelectorAll('[data-action]').forEach(button => button.onclick = async () => {
      if (button.dataset.action === 'write') { showView('write'); $('sp-writing').focus(); return }
      if (button.dataset.action === 'code') { $('sp-input').value = 'Help me review this code:\n\n'; $('sp-input').focus(); return }
      $('sp-use-page').checked = true
      $('sp-input').value = button.dataset.action === 'summary' ? 'Summarize this page with the main points and practical takeaways.' : 'Explain the main concepts on this page and anything that needs closer attention.'
      await send()
    })
  } else messages.forEach((message, index) => messageElement(message, index))
  main.scrollTop = main.scrollHeight
}
function messageElement(message, index) {
  const element = document.createElement('article'); element.className = `sp-msg ${message.role}`
  const label = document.createElement('span'); label.className = 'sp-msg-label'; label.textContent = message.role === 'user' ? 'You' : 'Codeva'
  const bubble = document.createElement('div'); bubble.className = 'sp-bubble'
  if (message.role === 'assistant') bubble.innerHTML = renderMarkdown(message.content)
  else bubble.textContent = message.content
  element.append(label, bubble); $('sp-chat').appendChild(element)
  if (message.role === 'assistant' && message.status !== 'streaming') {
    if (message.status) {
      const note = document.createElement('p'); note.className = 'sp-response-note'
      note.textContent = message.status === 'stopped' ? 'Response stopped. You can retry.' : 'This response did not finish. You can retry.'
      element.appendChild(note)
    }
    const actions = document.createElement('div'); actions.className = 'sp-msg-actions'
    if (message.content) {
      const copy = document.createElement('button'); copy.className = 'sp-mini-btn'; copy.textContent = 'Copy'
      copy.onclick = () => copyText(message.content, copy); actions.appendChild(copy)
    }
    if (index === activeChat().messages.length - 1) {
      const retry = document.createElement('button'); retry.className = 'sp-mini-btn'; retry.textContent = message.status ? 'Retry' : 'Regenerate'
      retry.disabled = busy()
      retry.onclick = () => { if (!busy()) { activeChat().messages.splice(index, 1); runPrompt(null) } }
      actions.appendChild(retry)
    }
    element.appendChild(actions)
  }
  return { element, bubble }
}
async function currentPage(type = 'GET_PAGE_CONTENT') {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !/^https?:/.test(tab.url || '')) throw new Error('Open a regular website first. Chrome pages and the Web Store cannot be read.')
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type })
    if (result?.error) throw new Error(result.error)
    if (!result) throw new Error('No page response')
    return result
  } catch { throw new Error('Could not read this page. Reload the webpage after installing or updating the extension.') }
}
async function refreshPage() {
  if (!$('sp-use-page').checked) { $('sp-page-label').textContent = 'Page context is off. No page is attached to your next message.'; return null }
  const page = await currentPage(); pagePrompt('Check page', page)
  $('sp-page-label').textContent = `${page.title || new URL(page.url).hostname} · ${page.content.length.toLocaleString()} characters`
  return page
}
async function send() {
  if (busy()) { activeRequest.abort(); return }
  const text = $('sp-input').value.trim()
  if (!text || !storageKey) return
  const request = new AbortController(); activeRequest = request; setBusy(true)
  try {
    const page = await refreshPage()
    if (request.signal.aborted) return
    const enriched = page ? pagePrompt(text, page) : text
    $('sp-input').value = ''; $('sp-input').style.height = 'auto'
    await runPrompt(text, enriched, request)
  } catch (error) { status(error.message, 'error') }
  finally { if (activeRequest === request) { activeRequest = null; setBusy(false); checkPending() } }
}
function setBusy(value) {
  $('sp-send').innerHTML = value ? '<span aria-hidden="true">■</span>' : ICONS.send
  $('sp-send').setAttribute('aria-label', value ? 'Stop response' : 'Send message')
  $('sp-new').disabled = value; $('sp-model').disabled = value
}
async function runPrompt(text, requestText = text, controller) {
  if (!storageKey || (!controller && busy())) return
  const chat = activeChat(), key = storageKey
  const request = controller || new AbortController(); activeRequest = request; setBusy(true)
  showView('chat')
  if (text) {
    chat.messages.push({ role: 'user', content: text, ...(requestText !== text ? { request: requestText } : {}) })
    if (chat.messages.filter(m => m.role === 'user').length === 1) chat.title = text.replace(/\s+/g, ' ').slice(0, 70)
  }
  const history = chat.messages.filter(m => m.role === 'user' || !m.status).slice(-12)
    .map(m => ({ role: m.role, content: m.role === 'user' ? m.request || m.content : m.content }))
  if (!history.length) { activeRequest = null; setBusy(false); return }
  const response = { role: 'assistant', content: '', status: 'streaming' }; chat.messages.push(response)
  chat.updatedAt = Date.now(); renderChat()
  const element = $('sp-chat').lastElementChild, bubble = element.querySelector('.sp-bubble')
  bubble.innerHTML = '<span class="sp-typing">Thinking…</span>'
  await persist()
  let failure = null, completed = false
  try {
    await streamCompletion({ messages: history, model: $('sp-model').value, signal: request.signal,
      onToken: token => {
        response.content += token
        const main = $('sp-chat'), atBottom = main.scrollHeight - main.scrollTop - main.clientHeight < 100
        bubble.innerHTML = renderMarkdown(response.content)
        if (atBottom) main.scrollTop = main.scrollHeight
        if (Date.now() - checkpointAt > 1200) { checkpointAt = Date.now(); if (key === storageKey) persist() }
      },
      onInfo: info => { if (!response.content) bubble.textContent = String(info || 'Thinking…') },
      onError: error => { failure = error },
      onDone: () => { completed = true },
    })
    if (!completed || !response.content) {
      response.status = failure?.stopped ? 'stopped' : 'error'
      if (key === storageKey) status(failure?.message || 'The server returned no text. Please retry.', 'error')
    } else { delete response.status; if (key === storageKey) status('Response complete · saved in this browser', 'connected') }
  } finally {
    if (key === storageKey) {
      if (activeRequest === request) { activeRequest = null; setBusy(false) }
      renderChat(); await persist(); checkPending()
    }
  }
}
async function checkPending() {
  if (busy() || claimingPrompt || !storageKey) return
  claimingPrompt = true
  let prompt = null, controller = null
  try {
    const { pendingPrompt, pendingAt } = await chrome.storage.local.get(['pendingPrompt', 'pendingAt'])
    if (!busy() && typeof pendingPrompt === 'string' && pendingAt && Date.now() - pendingAt < 60000) {
      controller = new AbortController(); activeRequest = controller; setBusy(true)
      await chrome.storage.local.remove(['pendingPrompt', 'pendingAt'])
      prompt = pendingPrompt.slice(0, 30000)
    }
  } catch (error) {
    if (activeRequest === controller) { activeRequest = null; setBusy(false) }
    status(error.message, 'error')
  } finally { claimingPrompt = false }
  if (prompt) await runPrompt(prompt, prompt, controller)
}

function resetWriting() {
  writingRequest?.abort(); writeSnapshot = ''; writeIssues = []; $('sp-issues').replaceChildren(); $('sp-apply-all').hidden = true
  const text = $('sp-writing').value, measured = metrics(text)
  rewriteCandidate = null; $('sp-rewrite-review').hidden = true
  $('sp-undo-writing').disabled = !writingUndo.length || writingUndo.at(-1).after !== text
  $('sp-writing-count').textContent = `${measured.words} ${measured.words === 1 ? 'word' : 'words'} · ${text.length.toLocaleString()} / 6,000 characters`
  $('sp-writing-metrics').textContent = `${measured.sentences} ${measured.sentences === 1 ? 'sentence' : 'sentences'} · estimated reading time ${measured.readingSeconds} seconds`
  $('sp-writing-status').textContent = 'Check your draft to see grammar, spelling, and clarity suggestions.'
}
function renderIssues() {
  $('sp-issues').innerHTML = writeIssues.map((issue, index) => {
    if (issueFilter === 'clarity' && issue.type !== 'clarity' || issueFilter === 'correctness' && issue.type === 'clarity') return ''
    return `<article class="issue"><small>${esc(issue.type)} · ${issue.source === 'local' ? 'Local rule' : 'AI suggestion'}</small><p><del>${esc(issue.original)}</del> → <ins>${esc(issue.suggestion || '(delete)')}</ins></p><p>${esc(issue.reason)}</p><div class="issue-actions">${issue.type === 'spelling' ? `<button class="sp-mini-btn" data-learn="${index}">Add to dictionary</button>` : ''}<button class="sp-mini-btn" data-dismiss="${index}">Dismiss</button><button class="sp-mini-btn" data-apply="${index}">Apply change</button></div></article>`
  }).join('')
  $('sp-apply-all').hidden = !writeIssues.length
  $('sp-apply-all').textContent = writeIssues.length === 1 ? 'Apply suggestion' : `Apply all ${writeIssues.length} suggestions`
  $('sp-issues').querySelectorAll('[data-dismiss]').forEach(button => button.onclick = () => { writeIssues.splice(Number(button.dataset.dismiss), 1); renderIssues() })
  $('sp-issues').querySelectorAll('[data-apply]').forEach(button => button.onclick = () => applyWriting([writeIssues[Number(button.dataset.apply)]]))
  $('sp-issues').querySelectorAll('[data-learn]').forEach(button => button.onclick = async () => {
    const issue = writeIssues[Number(button.dataset.learn)]
    const { settings = {} } = await chrome.storage.local.get('settings')
    const words = dictionaryWords([...(settings.dictionary || []), issue.original])
    await chrome.storage.local.set({ settings: { ...settings, dictionary: words } })
    writeIssues = filterDictionary(writeIssues, words); renderIssues()
    $('sp-writing-status').textContent = 'Dictionary updated for future writing checks.'
  })
}
function saveWritingChange(before, after) {
  writingUndo.push({ before, after }); writingUndo = writingUndo.slice(-10)
  $('sp-writing').value = after; resetWriting(); persist()
}
function setWritingBusy(value) {
  $('sp-check').disabled = value; $('sp-check').textContent = value ? 'Working…' : 'Check writing'
  document.querySelectorAll('[data-rewrite]').forEach(button => { button.disabled = value })
}
async function rewriteDraft(mode) {
  const text = $('sp-writing').value
  if (text.trim().length < 2) { $('sp-writing-status').textContent = 'Add a draft before rewriting.'; return }
  writingRequest?.abort()
  const controller = new AbortController(), key = storageKey; writingRequest = controller
  setWritingBusy(true); $('sp-writing-status').textContent = 'Preparing a rewrite for you to review…'
  try {
    const { writingGoals = {}, settings = {} } = await chrome.storage.local.get(['writingGoals', 'settings'])
    const result = await apiJSON('/completions/rewrite', { method: 'POST', body: { text, mode, goals: writingGoals, dictionary: settings.dictionary || [] }, signal: controller.signal })
    if (controller.signal.aborted || key !== storageKey || $('sp-writing').value !== text) return
    if (result.original !== text || typeof result.rewritten !== 'string' || !result.rewritten.trim()) throw new Error('The editor returned an invalid rewrite. Your draft has been kept.')
    rewriteCandidate = { original: text, rewritten: result.rewritten }
    $('sp-rewrite-text').textContent = result.rewritten; $('sp-rewrite-review').hidden = false
    $('sp-writing-status').textContent = 'Rewrite ready. Review it before applying.'
  } catch (error) { if (!controller.signal.aborted) $('sp-writing-status').textContent = error.message }
  finally { if (writingRequest === controller) { writingRequest = null; setWritingBusy(false) } }
}
function applyWriting(changes) {
  if ($('sp-writing').value !== writeSnapshot) { resetWriting(); return }
  try {
    const old = writeSnapshot, next = applyIssues(old, changes)
    const remaining = writeIssues.filter(i => !changes.includes(i)).map(issue => {
      const delta = changes.filter(c => c.end <= issue.start).reduce((sum, c) => sum + c.suggestion.length - c.original.length, 0)
      return { ...issue, start: issue.start + delta, end: issue.end + delta }
    })
    saveWritingChange(old, next); writeSnapshot = next; writeIssues = remaining
    renderIssues(); $('sp-writing-status').textContent = `${changes.length} change${changes.length === 1 ? '' : 's'} applied. ${remaining.length} remaining.`; persist()
  } catch (error) { $('sp-writing-status').textContent = error.message }
}
async function checkWriting() {
  const text = $('sp-writing').value
  if (text.trim().length < 2) { $('sp-writing-status').textContent = 'Enter at least two characters to check.'; return }
  writingRequest?.abort()
  const controller = new AbortController(); writingRequest = controller
  setWritingBusy(true); $('sp-writing-status').textContent = 'Checking grammar, spelling, and clarity…'
  const key = storageKey
  try {
    const { writingGoals = {}, settings = {} } = await chrome.storage.local.get(['writingGoals', 'settings'])
    const result = await apiJSON('/completions/grammar', { method: 'POST', body: { text, goals: writingGoals, dictionary: settings.dictionary || [] }, signal: controller.signal })
    if (controller.signal.aborted || key !== storageKey || $('sp-writing').value !== text) return
    if (!Array.isArray(result.issues)) throw new Error('The server returned an invalid proofreading response. Please try again.')
    writeSnapshot = text; writeIssues = filterDictionary(normalizeIssues(text, [...result.issues.map(issue => ({ ...issue, source: 'ai' })), ...localGrammar(text, settings.dictionary || [])]), settings.dictionary || [])
    $('sp-writing-status').textContent = `${writeIssues.length ? `${writeIssues.length} suggestion${writeIssues.length === 1 ? '' : 's'}` : 'No suggestions from this AI check'} · ${result.language || 'Language detected'} · ${result.tone || 'neutral'} tone`
    renderIssues()
  } catch (error) {
    if (!controller.signal.aborted && key === storageKey && $('sp-writing').value === text) {
      const { settings = {} } = await chrome.storage.local.get('settings')
      writeSnapshot = text; writeIssues = localGrammar(text, settings.dictionary || []); renderIssues()
      $('sp-writing-status').textContent = `${error.message} Only limited local English rules ran. Full proofreading has not completed.`
    }
  }
  finally { if (writingRequest === controller) { writingRequest = null; setWritingBusy(false) } }
}
function renderHistory() {
  const query = $('sp-history-search').value.toLowerCase()
  const chats = workspace.conversations.filter(c => c.messages.length && `${c.title} ${c.messages.map(m => m.content).join(' ')}`.toLowerCase().includes(query))
  $('sp-history-list').innerHTML = chats.length ? chats.map(chat => `<div class="history-item"><button class="history-open" data-open="${esc(chat.id)}"><strong>${esc(chat.title)}</strong><small>${chat.messages.length} messages · ${esc(new Date(chat.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}</small></button><button class="ic-btn" data-delete="${esc(chat.id)}" aria-label="Delete conversation">${ICONS.trash}</button></div>`).join('') : '<p class="history-empty">No conversations here yet. Start with a question in Assistant.</p>'
  $('sp-history-list').querySelectorAll('[data-open]').forEach(button => button.onclick = () => {
    if (busy()) { status('Stop the current response before switching conversations.'); return }
    workspace.activeId = button.dataset.open; showView('chat'); renderChat(); persist()
  })
  $('sp-history-list').querySelectorAll('[data-delete]').forEach(button => button.onclick = () => {
    if (busy()) { status('Stop the current response before deleting a conversation.'); return }
    deleted = workspace.conversations.find(c => c.id === button.dataset.delete)
    workspace.conversations = workspace.conversations.filter(c => c !== deleted)
    if (!activeChat()) { const chat = newConversation(); workspace.conversations.unshift(chat); workspace.activeId = chat.id; renderChat() }
    $('sp-undo-delete').hidden = false; renderHistory(); persist()
  })
}
async function copyText(text, button) {
  try { await navigator.clipboard.writeText(text); if (button) { const label = button.textContent; button.textContent = 'Copied'; setTimeout(() => { button.textContent = label }, 1800) } }
  catch { status('Clipboard access failed. Select and copy the text manually.', 'error') }
}
async function cycleTheme() {
  const { settings = {} } = await chrome.storage.local.get('settings')
  settings.theme = { system: 'light', light: 'dark', dark: 'system' }[settings.theme || 'system'] || 'system'
  await chrome.storage.local.set({ settings }); themeLabel(settings.theme)
}
function themeLabel(theme = 'system') {
  $('sp-theme').title = `Theme: ${theme} · click to change`; $('sp-theme').setAttribute('aria-label', `Theme: ${theme} · click to change`)
}
async function init() {
  $('sp-logo').innerHTML = ICONS.logo; $('sp-auth-logo').innerHTML = ICONS.logo
  $('sp-settings').innerHTML = ICONS.settings; $('sp-send').innerHTML = ICONS.send
  $('sp-signin').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_AUTH' }).catch(error => status(error.message, 'error'))
  $('sp-settings').onclick = () => chrome.runtime.openOptionsPage()
  $('sp-theme').onclick = cycleTheme
  $('sp-send').onclick = send
  $('sp-input').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!busy()) send() } }
  $('sp-input').oninput = () => { $('sp-input').style.height = 'auto'; $('sp-input').style.height = Math.min($('sp-input').scrollHeight, 144) + 'px'; draftChanged() }
  $('sp-model').onchange = () => {
    chrome.storage.local.set({ selectedModel: $('sp-model').value })
    $('sp-model-status').textContent = $('sp-model').selectedOptions[0]?.dataset.manualOnly === 'true' ? 'Optional provider · logs traffic for research' : 'Models from your Codeva server'
  }
  $('sp-new').onclick = () => { if (busy() || !storageKey) return; const chat = newConversation(); workspace.conversations.unshift(chat); workspace.activeId = chat.id; $('sp-input').value = ''; showView('chat'); renderChat(); persist(); $('sp-input').focus() }
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => showView(button.dataset.view))
  $('sp-use-page').onchange = () => refreshPage().catch(error => { $('sp-use-page').checked = false; $('sp-page-label').textContent = error.message })
  $('sp-refresh-page').onclick = () => { $('sp-use-page').checked = true; refreshPage().catch(error => { $('sp-use-page').checked = false; $('sp-page-label').textContent = error.message }) }
  $('sp-writing').oninput = () => { resetWriting(); draftChanged() }
  $('sp-check').onclick = checkWriting
  $('sp-apply-all').onclick = () => applyWriting([...writeIssues])
  $('sp-copy-draft').onclick = () => copyText($('sp-writing').value, $('sp-copy-draft'))
  $('sp-import').onclick = async () => {
    try { const result = await currentPage('GET_SELECTION'); if (!result.text?.trim()) throw new Error('Select text on the webpage first.'); $('sp-writing').value = result.text.slice(0, 6000); resetWriting(); persist() }
    catch (error) { $('sp-writing-status').textContent = error.message }
  }
  document.querySelectorAll('[data-rewrite]').forEach(button => button.onclick = () => rewriteDraft(button.dataset.rewrite))
  $('sp-rewrite-apply').onclick = () => {
    if (!rewriteCandidate || $('sp-writing').value !== rewriteCandidate.original) { resetWriting(); return }
    saveWritingChange(rewriteCandidate.original, rewriteCandidate.rewritten)
    $('sp-writing-status').textContent = 'Rewrite applied. You can undo this change.'
  }
  $('sp-rewrite-copy').onclick = () => copyText(rewriteCandidate?.rewritten || '', $('sp-rewrite-copy'))
  $('sp-rewrite-dismiss').onclick = () => { rewriteCandidate = null; $('sp-rewrite-review').hidden = true }
  $('sp-undo-writing').onclick = () => {
    const change = writingUndo.at(-1)
    if (!change || change.after !== $('sp-writing').value) return
    writingUndo.pop(); $('sp-writing').value = change.before; resetWriting(); persist()
    $('sp-writing-status').textContent = 'Last AI change undone.'
  }
  document.querySelectorAll('[data-issue-filter]').forEach(button => button.onclick = () => {
    issueFilter = button.dataset.issueFilter
    document.querySelectorAll('[data-issue-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
    renderIssues()
  })
  const { writingGoals = {} } = await chrome.storage.local.get('writingGoals')
  document.querySelectorAll('[data-writing-goal]').forEach(select => {
    if (writingGoals[select.dataset.writingGoal]) select.value = writingGoals[select.dataset.writingGoal]
    select.onchange = async () => {
      const { writingGoals: current = {} } = await chrome.storage.local.get('writingGoals')
      await chrome.storage.local.set({ writingGoals: { ...current, [select.dataset.writingGoal]: select.value } })
      resetWriting()
    }
  })
  $('sp-history-search').oninput = renderHistory
  $('sp-undo-delete').onclick = () => { if (!deleted) return; workspace.conversations.unshift(deleted); deleted = null; $('sp-undo-delete').hidden = true; renderHistory(); persist() }
  $('sp-export').onclick = () => {
    const chat = activeChat(); if (!chat?.messages.length) { status('Open a conversation before exporting.'); return }
    const text = `# ${chat.title}\n\n` + chat.messages.map(m => `## ${m.role === 'user' ? 'You' : 'Codeva'}\n\n${m.content}`).join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' })), link = document.createElement('a')
    link.href = url; link.download = 'codeva-conversation.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    if (changes.authToken) connectAccount().catch(error => status(error.message, 'error'))
    if (changes.pendingPrompt) checkPending().catch(error => status(error.message, 'error'))
    if (changes.settings) themeLabel(changes.settings.newValue?.theme)
    if (changes.panelNotice?.newValue) status(changes.panelNotice.newValue, 'error')
    if (storageKey && changes[storageKey] && changes[storageKey].newValue === undefined) {
      activeRequest?.abort(); activeRequest = null; setBusy(false)
      workspace = { conversations: [], activeId: null }
      const chat = newConversation(); workspace.conversations.push(chat); workspace.activeId = chat.id
      $('sp-input').value = ''; $('sp-writing').value = ''; resetWriting(); renderChat(); renderHistory()
      status('Local history cleared.')
    }
  })
  chrome.tabs.onActivated.addListener(() => { if ($('sp-use-page').checked) $('sp-page-label').textContent = 'Tab changed. The current page will be read when you send.' })
  window.addEventListener('offline', () => status('You’re offline. Drafts and conversations remain saved here.', 'error'))
  window.addEventListener('online', () => { status('Back online. You can send or retry your message.'); loadModels() })
  await initTheme(); themeLabel((await chrome.storage.local.get('settings')).settings?.theme)
  loadModels(); await connectAccount()
}
init().catch(error => status(`Workspace could not load: ${error.message}`, 'error'))
