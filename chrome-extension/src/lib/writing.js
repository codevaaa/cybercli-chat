// Shared by the content script (classic) and side panel (module side-effect import).
globalThis.CodevaWriting = Object.freeze({
  normalizeIssues(text, incoming) {
    const result = [], cursors = new Map()
    for (const item of (Array.isArray(incoming) ? incoming : []).slice(0, 100)) {
      if (typeof item?.original !== 'string' || !item.original || typeof item.suggestion !== 'string' || item.lowConfidence || item.original === item.suggestion) continue
      const start = Number.isInteger(item.start) && item.start >= 0 && text.slice(item.start, item.start + item.original.length) === item.original
        ? item.start : text.indexOf(item.original, cursors.get(item.original) || 0)
      if (start < 0) continue
      const end = start + item.original.length
      cursors.set(item.original, end)
      if (result.some(i => start < i.end && end > i.start)) continue
      result.push({ original: item.original, suggestion: item.suggestion, start, end,
        type: ['grammar', 'spelling', 'punctuation', 'clarity'].includes(item.type) ? item.type : 'grammar',
        reason: typeof item.reason === 'string' ? item.reason.slice(0, 300) : 'Suggested correction' })
    }
    return result.sort((a, b) => a.start - b.start)
  },
  applyIssues(text, issues) {
    let result = text
    for (const issue of [...issues].sort((a, b) => b.start - a.start)) {
      if (result.slice(issue.start, issue.end) !== issue.original) throw new Error('Text changed. Check it again before applying suggestions.')
      result = result.slice(0, issue.start) + issue.suggestion + result.slice(issue.end)
    }
    return result
  },
})
