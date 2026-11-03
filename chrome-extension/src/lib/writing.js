// Shared by the content script (classic) and side panel (module side-effect import).
globalThis.CodevaWriting = Object.freeze({
  dictionaryWords(value) {
    const words = Array.isArray(value) ? value : String(value || '').split(/[,\n]+/)
    const seen = new Set()
    return words.map(word => String(word).trim()).filter(word => {
      const key = word.normalize('NFKC').toLocaleLowerCase()
      if (!/^[\p{L}\p{M}][\p{L}\p{M}\p{N}'’_-]{0,63}$/u.test(word) || seen.has(key)) return false
      seen.add(key); return true
    }).slice(0, 200)
  },
  filterDictionary(issues, dictionary) {
    const words = new Set((dictionary || []).map(word => word.normalize('NFKC').toLocaleLowerCase()))
    return issues.filter(issue => issue.type !== 'spelling' || !words.has(issue.original.normalize('NFKC').toLocaleLowerCase()))
  },
  metrics(text) {
    const words = [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)].filter(part => part.isWordLike).length
    const sentences = text.trim() ? [...new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(text)].length : 0
    return { words, sentences, characters: text.length, readingSeconds: words ? Math.max(1, Math.ceil(words * 60 / 200)) : 0 }
  },
  isSitePaused(host, sites) {
    return (sites || []).some(site => host === site || host.endsWith(`.${site}`))
  },
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
