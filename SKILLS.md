# SKILLS.md — Agent Knowledge Base for CodeVaa

> Skills are context cheat sheets injected into agents before they start.
> They compress domain knowledge so agents don't waste tokens searching.

## LLM Gateway Architecture

The `backend/src/services/llm/gateway.js` file is the central LLM dispatch engine.

Key exports:
- `llmGateway.complete({ messages, model, temperature, plan, tools })` — async generator (streaming)
- `llmGateway.completeNonStream({ ... })` — returns `{ content, tool_calls, finish_reason }`
- `resolveModelForPlan(requestedId, planName, text)` — model resolution
- `classifyTier(text)` — heuristic task complexity scoring

Model name format: `'codeva/ravan'`, `'auto'`, `'groq/llama-3.3-70b'`, etc.
All Codeva character names map to real models in MODEL_NAME_MAP in agent.routes.js.

## Backend Route Patterns

All routes are under `/api/v1/`. File pattern: `src/routes/<name>.routes.js`.

Standard route file template:
```js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
const router = Router()
router.get('/', requireAuth, async (req, res) => { ... })
export default router
```

Register in server.js: `app.use('/api/v1/myroute', myRoutes)`

## MongoDB Models

All models in `src/models/`. Use Mongoose with ESM:
```js
import mongoose from 'mongoose'
const schema = new mongoose.Schema({ ... }, { timestamps: true })
export default mongoose.model('ModelName', schema)
```

Key models: Thread, Message, User, UserSettings, ApiKey, Project, Style, Persona

## Frontend Component Patterns

Design system:
- Background: `#0A0A0F` (bg class)
- Surface: `#111118` (surface class)
- Accent: `#D97757` (accent class)
- All components use TailwindCSS utility classes
- Animations via Framer Motion

Standard component:
```jsx
import React from 'react'
import { motion } from 'framer-motion'
export default function MyComponent({ prop }) {
  return <motion.div className="bg-surface border border-border rounded-xl p-4">...</motion.div>
}
```

State management: Zustand stores in `src/stores/`.

## Agent Platform Architecture

The agent platform (`agent-platform/`) consists of:
- `src/orchestrator/` — Task decomposition and execution engine
- `src/agents/` — AgentRegistry + AgentWorker (ReAct loop)
- `src/memory/` — SharedMemory (per-session key-value store)
- `src/tools/` — ToolExecutor (file, terminal, web, browser, memory)
- `src/skills/` — SkillsLoader (reads .md skills files)
- `src/llm/client.js` — Routes through backend /api/v1/agent/complete
- `cli/` — Commander.js CLI
- `ui/` — React Agent Manager UI

WebSocket protocol: connect to `ws://localhost:4000/ws`, send `{ type: 'run', goal }`.

## Environment Variables

Backend `.env` keys (never log or expose these):
- `MONGODB_URI` — MongoDB Atlas connection string
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Supabase auth
- `GROQ_API_KEY1..50` — Groq API keys (multi-key rotation)
- `OPENROUTER_API_KEY1..50` — OpenRouter keys
- `GEMINI_API_KEY1..10` — Google Gemini keys
- `MISTRAL_API_KEY` — Mistral AI key
- `HUGGINGFACE_API_KEY` — HuggingFace Inference API
- `STRIPE_SECRET_KEY` — Stripe payments
- `ELEVENLABS_API_KEY` — TTS voice
- `JWT_SECRET` — JWT signing secret

## Deployment

- Backend → Render.com (see `backend/render.yaml`)
- Frontend → Vercel (auto-deploy from main branch)
- Platform → Run locally or on any VPS: `node agent-platform/src/index.js`
