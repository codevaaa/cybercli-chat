import { ChatMessage, ProviderConfig, completeOnce, resolveProvider } from './engine'

export interface CouncilResult {
  individual: { model: string; provider: string; response: string }[]
  synthesis: string
}

/**
 * Council Mode — send the same prompt to multiple models, then synthesize
 * the best answer. This is a feature ChatGPT/Claude don't have natively.
 */
export async function runCouncil(
  messages: ChatMessage[],
  keys: Record<string, string | undefined>,
  onProgress?: (model: string, status: 'running' | 'done') => void,
  system?: string
): Promise<CouncilResult> {
  // Build the council from available providers (max 3 for speed)
  const candidates: ProviderConfig[] = []
  if (keys.groq) candidates.push({ provider: 'groq', model: 'llama-3.3-70b-versatile', apiKey: keys.groq })
  if (keys.gemini) candidates.push({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: keys.gemini })

  if (candidates.length === 0) {
    const fallback = resolveProvider('auto', keys)
    if (fallback) candidates.push(fallback)
  }

  const council = candidates.slice(0, 3)
  if (council.length === 0) throw new Error('No providers connected for Council Mode.')

  // Run all models in parallel
  const individual = await Promise.all(
    council.map(async (cfg) => {
      onProgress?.(cfg.model, 'running')
      try {
        const response = await completeOnce(messages, cfg, system)
        onProgress?.(cfg.model, 'done')
        return { model: cfg.model, provider: cfg.provider, response }
      } catch (e: any) {
        onProgress?.(cfg.model, 'done')
        return { model: cfg.model, provider: cfg.provider, response: `(failed: ${e.message})` }
      }
    })
  )

  // If only one model, no synthesis needed
  if (council.length === 1) {
    return { individual, synthesis: individual[0].response }
  }

  // Synthesize: use the strongest model to pick/merge the best answer
  const synthesizer = council[council.length - 1]
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const synthesisPrompt: ChatMessage[] = [
    {
      role: 'user',
      content: `Original question: "${lastUserMsg}"\n\nHere are responses from ${council.length} different AI models:\n\n${individual
        .map((r, i) => `--- Model ${i + 1} (${r.model}) ---\n${r.response}`)
        .join('\n\n')}\n\nSynthesize the BEST possible answer by combining the strengths of each response. Be accurate, complete, and concise. Output only the final answer.`,
    },
  ]

  const synthesis = await completeOnce(
    synthesisPrompt,
    synthesizer,
    'You are a synthesis engine. Combine multiple AI responses into one superior answer.'
  )

  return { individual, synthesis }
}
