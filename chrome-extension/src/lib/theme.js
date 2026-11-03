export async function initTheme() {
  const apply = value => { document.documentElement.dataset.theme = ['light', 'dark'].includes(value) ? value : 'system' }
  apply((await chrome.storage.local.get('settings')).settings?.theme)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) apply(changes.settings.newValue?.theme)
  })
}
