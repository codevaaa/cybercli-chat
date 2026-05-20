import axios from 'axios'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_KEY = process.env.CLOUDFLARE_API_KEY

export async function* streamCompletion({ messages, model = '@cf/meta/llama-3.1-8b-instruct', temperature = 0.7 }) {
  if (!ACCOUNT_ID || !API_KEY) throw new Error('Cloudflare credentials not configured')

  const response = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${model}`,
    { messages, temperature },
    {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      responseType: 'stream',
    }
  )

  // Cloudflare Workers AI returns non-streamed JSON by default
  yield { type: 'token', content: response.data.result?.response || '' }
  yield { type: 'done' }
}

export default { streamCompletion }
