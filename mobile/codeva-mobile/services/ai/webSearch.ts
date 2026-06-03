/**
 * Keyless web search — DuckDuckGo Instant Answer + HTML scrape fallback.
 * Lets the AI auto-research current information (like Claude's web search).
 */

export interface SearchResult {
  title: string
  snippet: string
  url: string
}

export async function webSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  try {
    // DuckDuckGo Instant Answer API (keyless, CORS-friendly)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()

    const results: SearchResult[] = []

    // Abstract (main answer)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || '',
      })
    }

    // Related topics
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics.slice(0, 6)) {
        if (topic.Text && topic.FirstURL) {
          results.push({ title: topic.Text.split(' - ')[0], snippet: topic.Text, url: topic.FirstURL })
        }
      }
    }

    return results
  } catch {
    return []
  }
}

/**
 * Decide if a query needs web search (current events, prices, latest, etc.).
 */
export function needsWebSearch(query: string): boolean {
  const q = query.toLowerCase()
  const triggers = [
    'latest', 'current', 'today', 'news', 'recent', 'price', 'stock',
    'weather', 'who is', 'what is the', 'when did', 'how much', '2025', '2026',
    'release', 'update', 'version', 'now', 'this year', 'search',
  ]
  return triggers.some((t) => q.includes(t))
}

/** Format search results to inject into the AI context. */
export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return ''
  return (
    '\n\n[Web search results — use these to answer with current info, cite sources]\n' +
    results
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`)
      .join('\n\n')
  )
}
