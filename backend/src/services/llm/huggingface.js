import { HfInference } from '@huggingface/inference'

const client = process.env.HUGGINGFACE_API_KEY
  ? new HfInference(process.env.HUGGINGFACE_API_KEY)
  : null

export async function* streamCompletion({ messages, model = 'meta-llama/Llama-3.1-8B-Instruct', temperature = 0.7 }) {
  if (!client) throw new Error('HuggingFace API key not configured')

  const stream = client.chatCompletionStream({
    model,
    messages,
    temperature,
    max_tokens: 4096,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) yield { type: 'token', content }
  }
  yield { type: 'done' }
}

export default { streamCompletion }
