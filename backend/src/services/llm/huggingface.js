import { HfInference } from '@huggingface/inference'

const client = process.env.HUGGINGFACE_API_KEY
  ? new HfInference(process.env.HUGGINGFACE_API_KEY)
  : null

export async function* streamCompletion({ messages, model = 'meta-llama/Llama-3.1-8B-Instruct', temperature = 0.7 }) {
  if (!client) throw new Error('HuggingFace API key not configured')

  const response = await client.chatCompletion({
    model,
    messages,
    temperature,
    max_tokens: 4096,
  })

  yield { type: 'token', content: response.choices[0].message.content }
  yield { type: 'done' }
}

export default { streamCompletion }
