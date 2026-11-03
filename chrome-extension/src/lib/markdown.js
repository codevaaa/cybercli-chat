// Small, escaped Markdown subset for extension chat. Raw HTML is always text.
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
function inline(text) {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g
  let result = '', cursor = 0
  for (const match of text.matchAll(pattern)) {
    result += escape(text.slice(cursor, match.index))
    const token = match[0]
    if (token.startsWith('`')) result += `<code>${escape(token.slice(1, -1))}</code>`
    else if (token.startsWith('**')) result += `<strong>${escape(token.slice(2, -2))}</strong>`
    else {
      const end = token.indexOf('](')
      result += `<a href="${escape(token.slice(end + 2, -1))}" target="_blank" rel="noopener noreferrer">${escape(token.slice(1, end))}</a>`
    }
    cursor = match.index + token.length
  }
  return result + escape(text.slice(cursor))
}
export function renderMarkdown(text) {
  const lines = String(text || '').split('\n')
  const output = []
  let code = null, list = null
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null } }
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      closeList()
      if (code !== null) { output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`); code = null }
      else code = []
      continue
    }
    if (code !== null) { code.push(line); continue }
    const item = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/)
    if (item) {
      const tag = item[1] ? 'ul' : 'ol'
      if (tag !== list) { closeList(); list = tag; output.push(`<${tag}>`) }
      output.push(`<li>${inline(item[2])}</li>`); continue
    }
    closeList()
    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`)
    else if (line.trim()) output.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  if (code !== null) output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`)
  return output.join('\n')
}
