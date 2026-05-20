import OpenAI from 'openai'

const client = process.env.BYTEZ_API_KEY
  ? new OpenAI({ apiKey: process.env.BYTEZ_API_KEY, baseURL: 'https://api.bytez.com/api/v1' })
  : null

export async function* streamCompletion({ messages, model = 'meta-llama/Llama-3.1-8B-Instruct', temperature = 0.7 }) {
  if (!client) throw new Error('Bytez API key not configured')

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
