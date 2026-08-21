# AGENTS.md — CodeVaa Agent Team Configuration

> This file configures the autonomous agent team for this project.
> Place it at your project root. CodeVaa reads it before every session.

## Project Context

This is the **CodeVaa** full-stack AI platform — a multi-model AI chat and
autonomous agent system. Built with:
- **Backend**: Node.js + Express + MongoDB + Supabase
- **Frontend**: React 19 + Vite + TailwindCSS + Zustand
- **Agent Platform**: Custom Node.js orchestration engine
- **Desktop**: Electron wrapper
- **Mobile**: React Native (scaffold)

The backend lives at `backend/`. The main frontend at `frontend/`.
The agent platform at `agent-platform/`.

## Agent Team Overrides

### coder
model: codeva/ravan
instructions: |
  You are working on a Node.js/React full-stack project.
  - Backend uses ESM (import/export), not CommonJS
  - Express routes follow the pattern: router.get('/path', middleware, handler)
  - Use async/await everywhere, never callbacks
  - Frontend uses React 18 + Vite + TailwindCSS
  - Always match existing file structure and naming conventions
  - Read existing code before writing new code

### tester
model: codeva/arjun
instructions: |
  This project uses Jest for backend tests.
  - Test files go in __tests__/ or .test.js alongside the source
  - Use supertest for HTTP endpoint testing
  - Mock external services (MongoDB, Supabase, LLM providers)
  - Minimum 80% coverage for new code

### devops
model: codeva/bheem
instructions: |
  - Deployment target: Render.com (backend), Vercel (frontend)
  - Use render.yaml for Render configuration
  - Environment variables documented in .env.example
  - Docker is optional but preferred for local development

### security
model: codeva/shiv
instructions: |
  Key security concerns for this project:
  - API key exposure (check all .env handling)
  - JWT token security
  - MongoDB injection prevention (already using express-mongo-sanitize)
  - Rate limiting is in place but verify it works correctly
  - CORS whitelist must be maintained

### reviewer
model: codeva/yudhishthir
instructions: |
  Focus on:
  1. API key leakage — NEVER log or expose env vars
  2. Proper error handling — no unhandled promise rejections
  3. Memory leaks in streaming responses
  4. Race conditions in parallel agent execution
  5. Input validation on all user-facing endpoints

## Custom Agents

### llm-specialist
model: codeva/madhav
tools: [file_read, web_search]
instructions: |
  You specialize in LLM provider integrations.
  You deeply understand the gateway.js routing logic and can optimize
  model selection, fallback chains, and prompt engineering.

### frontend-architect
model: codeva/nakul
tools: [file_read, file_write, web_search]
instructions: |
  You specialize in React + Vite + TailwindCSS architecture.
  You ensure components are accessible, performant, and follow
  the existing design system (dark theme, #D97757 accent color).
