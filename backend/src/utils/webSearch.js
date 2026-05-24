

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
      
      // Match result divs
      const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g
      let match
      
      while ((match = resultBlockRegex.exec(html)) !== null && results.length < 5) {
        const block = match[1]
        
        // Extract title, snippet, and link
        const titleMatch = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/.exec(block) || /<a class="result__url"[^>]*>([\s\S]*?)<\/a>/.exec(block)
        const snippetMatch = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block)
        const linkMatch = /href="([^"]*)"/.exec(block)
        
        if (titleMatch && snippetMatch && linkMatch) {
          const title = titleMatch[1].replace(/<[^>]*>/g, '').trim()
          const snippet = snippetMatch[1].replace(/<[^>]*>/g, '').trim()
          let link = linkMatch[1]
          
          // Clean up duckduckgo redirect link if present
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
