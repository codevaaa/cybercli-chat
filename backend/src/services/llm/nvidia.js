import OpenAI from 'openai'

const client = process.env.NVIDIA_API_KEY
  ? new OpenAI({ apiKey: process.env.NVIDIA_API_KEY, baseURL: 'https://integrate.api.nvidia.com/v1' })
  : null

export async function* streamCompletion({ messages, model = 'nvidia/llama-3.1-nemotron-70b-instruct', temperature = 0.7 }) {
  if (!client) throw new Error('NVIDIA API key not configured')

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
