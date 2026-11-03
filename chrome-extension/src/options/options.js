import '../lib/writing.js'
import { initTheme } from '../lib/theme.js'
import { getToken, getUser } from '../lib/config.js'
import { accountKey } from '../lib/workspace.js'
const $ = id => document.getElementById(id)
const notify = text => { $('settings-status').textContent = text }
let writes = Promise.resolve()
function saveSetting(group, key, value) {
  writes = writes.catch(() => {}).then(async () => {
    const stored = (await chrome.storage.local.get(group))[group] || {}
    await chrome.storage.local.set({ [group]: { ...stored, [key]: value } })
    notify('Preferences saved.')
  }).catch(() => notify('Could not save preferences. Please try again.'))
}
async function showAccount() {
  try {
    const [token, user] = await Promise.all([getToken(), getUser()])
    $('account').textContent = token ? `Connected${user?.email ? ` as ${user.email}` : ' to your Codeva account'}.` : 'No account connected.'
    $('sign-out').disabled = !token; $('clear-history').disabled = !token
  } catch {
    const { authToken } = await chrome.storage.local.get('authToken')
    $('account').textContent = authToken ? 'Connection temporarily unavailable. Your saved session has been kept.' : 'No account connected.'
    $('sign-out').disabled = !authToken; $('clear-history').disabled = !authToken
  }
}
async function init() {
  await initTheme()
  const { settings = {}, writingGoals = {} } = await chrome.storage.local.get(['settings', 'writingGoals'])
  $('dictionary').value = (settings.dictionary || []).join('\n')
  $('disabled-sites').value = (settings.disabledSites || []).join('\n')
  $('save-dictionary').onclick = () => { const words = CodevaWriting.dictionaryWords($('dictionary').value); $('dictionary').value = words.join('\n'); saveSetting('settings', 'dictionary', words) }
  $('save-sites').onclick = () => { const sites = [...new Set($('disabled-sites').value.split(/[,\n]+/).map(value => value.trim().toLowerCase()).filter(value => /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(value)))].slice(0, 50); $('disabled-sites').value = sites.join('\n'); saveSetting('settings', 'disabledSites', sites) }
  $('theme').value = settings.theme || 'system'
  $('theme').onchange = () => saveSetting('settings', 'theme', $('theme').value)
  document.querySelectorAll('[data-setting]').forEach(input => {
    input.checked = settings[input.dataset.setting] !== false
    input.onchange = () => saveSetting('settings', input.dataset.setting, input.checked)
  })
  document.querySelectorAll('[data-goal]').forEach(select => {
    if (writingGoals[select.dataset.goal]) select.value = writingGoals[select.dataset.goal]
    select.onchange = () => saveSetting('writingGoals', select.dataset.goal, select.value)
  })
  $('sign-in').onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_AUTH' })
  $('sign-out').onclick = async () => { await chrome.runtime.sendMessage({ type: 'LOGOUT' }); notify('Signed out of the extension.'); showAccount() }
  $('clear-history').onclick = async () => {
    const { authToken: token } = await chrome.storage.local.get('authToken'); if (!token) return
    await chrome.storage.local.remove(accountKey(token)); notify('This account’s local history was cleared.');
  }
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes.authToken) showAccount() })
  await showAccount()
}
init().catch(() => notify('Settings could not load. Reopen this page to try again.'))
