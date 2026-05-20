import OpenAI from 'openai'

const client = process.env.CEREBRAS_API_KEY
  ? new OpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: 'https://api.cerebras.ai/v1' })
  : null

export async function* streamCompletion({ messages, model = 'llama3.1-8b', temperature = 0.7 }) {
  if (!client) throw new Error('Cerebras API key not configured')

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
