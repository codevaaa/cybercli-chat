export function modelClass(provider, model) {
  if (provider === 'openrouter' && /^anthropic\/claude-sonnet-4$/.test(model)) return 'frontier'
  if (provider === 'openrouter' && /^(openai\/gpt-4o-mini|google\/gemini-2\.5-flash|qwen\/qwen-2\.5-72b-instruct)$/.test(model)) return 'mid'
  if (provider === 'mistral' && model === 'codestral-latest') return 'mid'
  return 'free'
}
