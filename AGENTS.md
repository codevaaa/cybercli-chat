# CyberCli Chat — Agent Guidelines

## Project Overview

CyberCli Chat is a full-stack AI chat platform that aims to surpass ChatGPT, Claude, and Gemini by combining 8+ free AI providers, unique features like Council Mode and conversation branching, and a hybrid Supabase + MongoDB architecture.

## Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS v4 + tsParticles + Framer Motion + GSAP
- **Backend**: Node.js 22 + Express + Zod validation
- **Auth**: Supabase Auth with JWT + RLS policies
- **Databases**: Supabase PostgreSQL (users, billing, audit) + MongoDB Atlas (chats, messages, settings)
- **AI Gateway**: Unified proxy with OpenRouter, Groq, Gemini, Cerebras, Cloudflare, HuggingFace, Bytez, NVIDIA
- **TTS**: Gemini Flash TTS (server) + Puter.js ElevenLabs (client-side, unlimited)
- **Hosting**: Vercel (frontend) + Render (backend)

## File Structure Conventions

### Frontend (`frontend/`)
- `src/pages/public/` — Marketing pages (landing, features, pricing, etc.)
- `src/pages/auth/` — Auth pages (login, signup, forgot password, etc.)
- `src/pages/app/` — Authenticated app pages (chat, settings, library, etc.)
- `src/components/layout/` — Navbar, Footer, Sidebar
- `src/components/landing/` — Hero, Features, Pricing, CTA sections
- `src/components/ui/` — Reusable UI components (Button, Card, Input, Modal)
- `src/components/chat/` — Chat-specific components (MessageBubble, ThreadSidebar, etc.)
- `src/hooks/` — Custom React hooks
- `src/stores/` — Zustand state management
- `src/lib/` — API client, constants, utilities

### Backend (`backend/`)
- `src/routes/` — Express route definitions
- `src/controllers/` — Route handlers
- `src/services/llm/` — AI provider integrations
- `src/services/tts/` — Text-to-speech services
- `src/models/` — Mongoose schemas
- `src/middleware/` — Auth, validation, rate limiting, error handling
- `src/utils/` — Encryption, sanitization, tokenization, logging
- `src/config/` — Database, Supabase, Redis, Stripe connections

## Design System

- **Colors**: Dark-first (`#0A0A0F` background), violet accent (`#7C3AED`)
- **Typography**: Inter (UI), Instrument Serif (editorial), JetBrains Mono (code)
- **Spacing**: 4px base unit, rounded corners (`8px` buttons, `12px` cards)
- **Animations**: `cubic-bezier(0.16, 1, 0.3, 1)` for reveals, 150-500ms durations
- **Cards**: No drop shadows. Use subtle borders (`rgba(255,255,255,0.06)`) and inner glow

## API Patterns

- All API routes under `/api/v1/`
- Auth via `Authorization: Bearer <jwt>` header
- SSE streaming for chat completions (`text/event-stream`)
- Zod validation on all request bodies
- Rate limiting per user tier (Free: 50/hr, Pro: 500/hr)

## Security Checklist

- [ ] No API keys in frontend code
- [ ] CSP headers via Helmet.js
- [ ] CORS whitelist
- [ ] RLS policies on all Supabase tables
- [ ] Input sanitization (DOMPurify frontend, Zod backend)
- [ ] Field-level encryption for sensitive MongoDB fields
- [ ] Request logging with IP and user ID
- [ ] Stripe webhook signature verification

## Development Phases

1. ✅ Phase 0: Foundation (Vite, Tailwind, tsParticles, landing page)
2. ✅ Phase 0: All public pages (Home, Features, Models, Pricing, Contact, About, Careers, Affiliate, Blog, Docs, Legal)
3. ✅ Phase 0: Auth pages (Signup, Login, Forgot Password, Reset, Magic Link, Verify)
4. ✅ Phase 0: App pages (Chat, Settings, Profile, Library, Agents, Voice)
5. ⏳ Phase 1: Backend scaffold (Express, routes, models, middleware)
6. ⏳ Phase 2: Supabase auth integration
7. ⏳ Phase 3: AI Gateway with OpenRouter + Groq + Gemini
8. ⏳ Phase 4: TTS (Gemini Flash + Puter.js ElevenLabs)
9. ⏳ Phase 5: Remaining providers (Cerebras, Cloudflare, HF, Bytez, NVIDIA)
10. ⏳ Phase 6: Advanced features (Council Mode, branching, local models)
11. ⏳ Phase 7: Stripe billing
12. ⏳ Phase 8: Polish, PWA, performance optimization
