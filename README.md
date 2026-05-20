# CyberCli Chat

The most powerful AI chat platform. Multi-model, uncensored, voice-enabled, and entirely yours.

## Features

- **8+ AI Providers** — OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, Bytez, NVIDIA
- **Council Mode** — Three models debate, synthesize the best answer
- **Uncensored & Ethical** — Truth-seeking models with ethical guardrails
- **Free Voice Chat** — Walkie-talkie style with 5 unique AI voices
- **Conversation Branching** — Fork any message into a new thread
- **In-Browser Local AI** — Run models via WebGPU for zero latency

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Auth | Supabase Auth |
| SQL DB | Supabase PostgreSQL |
| NoSQL DB | MongoDB Atlas |
| Cache | Redis |
| Hosting | Vercel (frontend) + Render (backend) |

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

## Environment Variables

See `backend/.env.example` for required variables.

## License

MIT
