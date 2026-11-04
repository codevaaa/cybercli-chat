// Shared by the content script (classic) and side panel (module side-effect import).
globalThis.CodevaWriting = Object.freeze({
  localGrammar(text, dictionary = []) {
    const spellings = { teh: 'the', thier: 'their', recieve: 'receive', recieved: 'received', definately: 'definitely', accomodate: 'accommodate', acheive: 'achieve', beleive: 'believe', calender: 'calendar', collegue: 'colleague', concious: 'conscious', embarass: 'embarrass', enviroment: 'environment', existance: 'existence', foriegn: 'foreign', goverment: 'government', grammer: 'grammar', gaurd: 'guard', harrass: 'harass', independant: 'independent', liason: 'liaison', maintainance: 'maintenance', neccessary: 'necessary', noticable: 'noticeable', occassion: 'occasion', persistant: 'persistent', privelege: 'privilege', publically: 'publicly', reccomend: 'recommend', refered: 'referred', relevent: 'relevant', succesful: 'successful', tommorow: 'tomorrow', truely: 'truly', unfortunatly: 'unfortunately', wierd: 'weird', writen: 'written', alot: 'a lot' }
    const issues = [], preserveCase = (original, replacement) => original === original.toUpperCase() ? replacement.toUpperCase() : /^[A-Z]/.test(original) ? replacement[0].toUpperCase() + replacement.slice(1) : replacement
    for (const match of text.matchAll(/\b[a-zA-Z']+\b/g)) {
      const corrected = spellings[match[0].toLowerCase()]
      if (corrected) issues.push({ original: match[0], suggestion: preserveCase(match[0], corrected), start: match.index, type: 'spelling', reason: 'Common misspelling', source: 'local' })
    }
    const agreements = { 'this are': 'this is', 'that are': 'that is', 'these is': 'these are', 'those is': 'those are', 'he are': 'he is', 'she are': 'she is', 'it are': 'it is', 'they is': 'they are', 'we is': 'we are', 'you is': 'you are', 'i is': 'I am', 'i are': 'I am', 'i has': 'I have', 'we has': 'we have', 'they has': 'they have', 'you has': 'you have', 'he have': 'he has', 'she have': 'she has', 'it have': 'it has' }
    for (const match of text.matchAll(/\b(?:this|that|these|those|he|she|it|they|we|you|i)\s+(?:is|are|has|have)\b/gi)) {
      const replacement = agreements[match[0].toLowerCase().replace(/\s+/g, ' ')]
      if (replacement) issues.push({ original: match[0], suggestion: preserveCase(match[0], replacement), start: match.index, type: 'grammar', reason: 'Check subject–verb agreement', source: 'local' })
    }
    for (const match of text.matchAll(/\b([a-zA-Z]+)\s+\1\b/gi)) issues.push({ original: match[0], suggestion: match[1], start: match.index, type: 'grammar', reason: 'Repeated word', source: 'local' })
    for (const match of text.matchAll(/\bi\b(?!['’])/g)) issues.push({ original: 'i', suggestion: 'I', start: match.index, type: 'grammar', reason: 'Capitalize the pronoun “I”', source: 'local' })
    return globalThis.CodevaWriting.filterDictionary(globalThis.CodevaWriting.normalizeIssues(text, issues), dictionary)
  },
  assessment(status, issues, text) {
    if (text.trim().length < 3) return { state: 'limited', title: 'Add a sentence to check', detail: 'Local rules check common English errors. AI proofreading can review grammar and clarity.' }
    if (text.length > 6000) return { state: 'limited', title: 'This draft is too long for one check', detail: 'Check a selection of up to 6,000 characters. The full draft has not been reviewed.' }
    if (status === 'checking') return { state: 'checking', title: 'AI proofreading in progress', detail: 'Your draft stays unchanged while Codeva checks it.' }
    if (status === 'complete') return { state: issues.length ? 'suggestions' : 'complete', title: issues.length ? `${issues.length} suggestion${issues.length === 1 ? '' : 's'} to review` : 'No suggestions from this AI check', detail: 'AI reviewed this draft. Review suggestions in context; checks can miss errors.' }
    return { state: status === 'unavailable' ? 'unavailable' : 'local', title: issues.length ? `${issues.length} local suggestion${issues.length === 1 ? '' : 's'}` : 'Full proofreading has not run', detail: status === 'unavailable' ? 'AI proofreading is unavailable. Only limited local English rules ran; your text has not passed a full check.' : 'Only limited local English rules ran. Sign in to request AI proofreading.' }
  },
  issueKey(issue) { return JSON.stringify([issue.start, issue.end, issue.original, issue.suggestion]) },
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
        ...(item.source ? { source: item.source === 'local' ? 'local' : 'ai' } : {}),
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
