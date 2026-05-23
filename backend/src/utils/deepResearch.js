import { performWebSearch } from './webSearch.js'

/**
 * Deep Research: runs multiple web searches from different angles,
 * combines and deduplicates results, returns structured context.
 * 
 * @param {string} query - The research topic
 * @returns {{ results: Array, query: string, searchCount: number, timestamp: string }}
 */
export async function performDeepResearch(query) {
  // Run 3 parallel searches with different angles
  const searchAngles = [
    query,
    `${query} latest 2025`,
    `${query} research analysis expert opinion`,
  ]

  let allResults = []

  try {
    const searchPromises = searchAngles.map(q => 
      performWebSearch(q).catch(err => {
        console.warn(`Deep research search failed for "${q}":`, err.message)
        return []
      })
    )

    const searchResults = await Promise.all(searchPromises)

    // Flatten and deduplicate by URL
    const seen = new Set()
    for (const results of searchResults) {
      for (const r of results) {
        if (r.link && !seen.has(r.link)) {
          seen.add(r.link)
          allResults.push(r)
        }
      }
    }
  } catch (err) {
    console.error('Deep research error:', err)
  }

  return {
    results: allResults,
    query,
    searchCount: searchAngles.length,
    totalSources: allResults.length,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Format deep research results into a context string for injection into LLM prompts
 */
export function formatDeepResearchContext(researchData) {
  if (!researchData || !researchData.results || researchData.results.length === 0) {
    return ''
  }

  const lines = [
    `## Deep Research Context`,
    `**Query:** ${researchData.query}`,
    `**Sources found:** ${researchData.results.length}`,
    `**Researched at:** ${researchData.timestamp}`,
    '',
    '### Sources:',
  ]

  for (const r of researchData.results.slice(0, 10)) {
    lines.push(`- **${r.title || 'Source'}**: ${r.snippet || ''}`)
    if (r.link) lines.push(`  URL: ${r.link}`)
  }

  lines.push('')
  lines.push('*Use the above research to provide a comprehensive, accurate, and well-sourced answer.*')

  return lines.join('\n')
}
