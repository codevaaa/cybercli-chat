import OpenAI from 'openai'

const client = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.FRONTEND_URL || 'https://codeva.chat',
        'X-Title': 'Codeva',
      },
    })
  : null

export async function* streamCompletion({ messages, model = 'openai/gpt-4o-mini', temperature = 0.7 }) {
  if (!client) throw new Error('OpenRouter API key not configured')

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
    max_tokens: 4096,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) yield { type: 'token', content }
  }

  yield { type: 'done' }
}

export default { streamCompletion }
