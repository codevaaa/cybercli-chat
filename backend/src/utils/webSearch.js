

/**
 * Perform a web search using multiple strategies:
 * 1. DuckDuckGo HTML search (primary)
 * 2. DuckDuckGo Lite search (fallback 1)
 * 3. DuckDuckGo Instant Answer API (fallback 2)
 */
export async function performWebSearch(query) {
  let results

  // 1. Try DDG HTML Search
  results = await tryDDGHtml(query)
  if (results.length > 0) return results

  // 2. Try DDG Lite Search (simpler HTML, more reliable)
  results = await tryDDGLite(query)
  if (results.length > 0) return results

  // 3. DDG Instant Answer API
  results = await tryDDGApi(query)
  if (results.length > 0) return results

  return []
}

/* ── Strategy 1: DDG Full HTML ────────────────────────────── */
async function tryDDGHtml(query) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const html = await res.text()
    const results = []

    // Parse result blocks  —  DDG wraps each in <div class="result ...">
    const blockRegex = /<div[^>]*class="[^"]*\bresult\b[^"]*results_links[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
    let blockMatch

    while ((blockMatch = blockRegex.exec(html)) !== null && results.length < 6) {
      const block = blockMatch[1]

      // Extract link  —  <a class="result__a" href="...">
      const linkMatch = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(block)
      // Extract snippet
      const snippetMatch = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(block)

      if (!linkMatch) continue

      let href = linkMatch[1]
      const title = stripTags(linkMatch[2])
      const snippet = snippetMatch ? stripTags(snippetMatch[1]) : ''

      href = extractRealUrl(href)
      if (!href || !href.startsWith('http')) continue

      results.push({ title, snippet, link: href })
    }

    // Fallback: simpler per-link extraction if block regex failed
    if (results.length === 0) {
      const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
      const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi

      const titles = []
      const snippets = []
      let m
      while ((m = titleRegex.exec(html)) !== null) titles.push({ href: m[1], text: stripTags(m[2]) })
      while ((m = snippetRegex.exec(html)) !== null) snippets.push(stripTags(m[1]))

      for (let i = 0; i < Math.min(titles.length, 6); i++) {
        let href = extractRealUrl(titles[i].href)
        if (!href || !href.startsWith('http')) continue
        results.push({
          title: titles[i].text,
          snippet: snippets[i] || '',
          link: href,
        })
      }
    }

    return results
  } catch (err) {
    console.warn('DDG HTML search failed:', err.message)
    return []
  }
}

/* ── Strategy 2: DDG Lite (simpler HTML) ─────────────────── */
async function tryDDGLite(query) {
  try {
    const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const html = await res.text()
    const results = []

    // Lite results are in <a rel="nofollow" href="...">Title</a> then <td class="result-snippet">...</td>
    const linkRegex = /<a[^>]*rel="nofollow"[^>]*href="([^"]*)"[^>]*class="[^"]*result-link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi
    const snippetRegex = /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi

    const links = []
    const snips = []
    let m
    while ((m = linkRegex.exec(html)) !== null) links.push({ href: m[1], text: stripTags(m[2]) })
    while ((m = snippetRegex.exec(html)) !== null) snips.push(stripTags(m[1]))

    for (let i = 0; i < Math.min(links.length, 6); i++) {
      let href = extractRealUrl(links[i].href)
      if (!href || !href.startsWith('http')) continue
      results.push({
        title: links[i].text,
        snippet: snips[i] || '',
        link: href,
      })
    }

    return results
  } catch (err) {
    console.warn('DDG Lite search failed:', err.message)
    return []
  }
}

/* ── Strategy 3: DDG Instant Answer API ──────────────────── */
async function tryDDGApi(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return []

    const data = await res.json()
    const results = []

    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        link: data.AbstractURL || 'https://duckduckgo.com',
      })
    }

    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || query,
            snippet: topic.Text,
            link: topic.FirstURL,
          })
        }
      }
    }

    return results
  } catch (err) {
    console.warn('DDG API fallback failed:', err.message)
    return []
  }
}

/* ── Helpers ─────────────────────────────────────────────── */
function stripTags(html) {
  return (html || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim()
}

function extractRealUrl(href) {
  if (!href) return null

  // DDG redirect URLs contain uddg= parameter with the real URL
  if (href.includes('uddg=')) {
    const match = /uddg=([^&]*)/.exec(href)
    if (match) {
      return decodeURIComponent(match[1])
    }
  }

  // Some hrefs are protocol-relative
  if (href.startsWith('//')) return 'https:' + href

  return href
}
