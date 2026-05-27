export const APP_NAME = 'CyberCli Chat'
export const APP_VERSION = '1.0.0'
export const API_VERSION = 'v1'

export const RATE_LIMITS = {
  free: { requestsPerHour: 50, tokensPerHour: 10000 },
  pro: { requestsPerHour: 500, tokensPerHour: 100000 },
  enterprise: { requestsPerHour: 5000, tokensPerHour: 1000000 },
}

export const MAX_MESSAGE_LENGTH = 10000
export const MAX_THREADS_PER_USER = 1000
export const MAX_MESSAGES_PER_THREAD = 5000

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'es', 'fr', 'de', 'ja', 'ko', 'zh']

export const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1' },
  { id: 'groq', name: 'Groq Cloud', baseUrl: 'https://api.groq.com/openai/v1' },
  { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com' },
  { id: 'cerebras', name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1' },
  { id: 'cloudflare', name: 'Cloudflare AI', baseUrl: 'https://api.cloudflare.com' },
  { id: 'huggingface', name: 'HuggingFace', baseUrl: 'https://api-inference.huggingface.co' },
  { id: 'bytez', name: 'Bytez', baseUrl: 'https://api.bytez.com/api/v1' },
  { id: 'nvidia', name: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1' },
]

export const TTS_VOICES = [
  { id: 'gemini_flash', name: 'Sahadeva (Gemini Flash)', gender: 'female', provider: 'gemini', languages: ['en', 'hi', 'es'] },
  { id: 'gemini_pro', name: 'Sahadeva Pro (Gemini Pro)', gender: 'male', provider: 'gemini', languages: ['en', 'hi', 'es'] },
  { id: 'mistral_large', name: 'Vayu (Mistral Large)', gender: 'male', provider: 'gemini', languages: ['en', 'de', 'fr'] },
]
