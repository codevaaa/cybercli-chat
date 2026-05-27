

/**
 * Perform a web search using DuckDuckGo free search interface.
 * Falls back to DDG Instant Answer API if HTML scraping fails.
 */
export async function performWebSearch(query) {
  try {
    // 1. Try DuckDuckGo HTML Search
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
      }
    })
    
    if (res.ok) {
      const html = await res.text()
      const results = []
      
      // Find all titles and snippets by classes
      const titleRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
      const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g
      
      const titles = {} // href -> title
      const snippets = {} // href -> snippet
      
      let match
      while ((match = titleRegex.exec(html)) !== null) {
        const href = match[1]
        const text = match[2].replace(/<[^>]*>/g, '').trim()
        titles[href] = text
      }
      
      while ((match = snippetRegex.exec(html)) !== null) {
        const href = match[1]
        const text = match[2].replace(/<[^>]*>/g, '').trim()
        snippets[href] = text
      }
      
      // Merge by href
      for (const href of Object.keys(titles)) {
        if (results.length >= 5) break
        
        const title = titles[href]
        const snippet = snippets[href] || ''
        let link = href
        
        if (link.includes('uddg=')) {
          const redirectMatch = /uddg=([^&]*)/.exec(link)
          if (redirectMatch) {
            link = decodeURIComponent(redirectMatch[1])
          }
        }
        
        if (link.startsWith('//')) link = 'https:' + link
        if (!link.startsWith('http')) continue
        
        results.push({ title, snippet, link })
      }
      
      if (results.length > 0) return results
    }
  } catch (error) {
    console.warn('Scraping DuckDuckGo HTML failed, trying Instant Answer API...', error.message)
  }

  // 2. Fallback to DuckDuckGo Instant Answer API
  try {
    const fallbackUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(fallbackUrl)
    if (res.ok) {
      const data = await res.json()
      const results = []
      
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          link: data.AbstractURL || 'https://duckduckgo.com'
        })
      }
      
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0] || query,
              snippet: topic.Text,
              link: topic.FirstURL
            })
          }
        }
      }
      
      return results
    }
  } catch (fallbackError) {
    console.error('DuckDuckGo API fallback failed:', fallbackError.message)
  }

  return []
}
