import OpenAI from 'openai'

const client = process.env.OPENCODE_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENCODE_API_KEY, baseURL: 'https://opencode.ai/zen/v1' })
  : null

export async function* streamCompletion({ messages, model = 'deepseek-v4-flash', temperature = 0.7 }) {
  if (!client) throw new Error('OpenCode AI API key not configured')

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) yield { type: 'token', content }
  }

  yield { type: 'done' }
}

export default { streamCompletion }
