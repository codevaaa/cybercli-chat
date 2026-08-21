# CodeVaa Agent Platform — Quick Start

## Architecture at a Glance

```
codeva run "build me a REST API"
        │
        ▼
  CLI (codeva.js)
        │  WebSocket
        ▼
  Platform Server (localhost:4000)
        │
        ▼
  Orchestrator
  ├── Decomposer  → Chanakya (LLM) → TaskGraph (dependency DAG)
  ├── AgentPool   → up to N parallel AgentWorkers
  │   ├── Ravan       (coder)
  │   ├── Arjun       (tester)
  │   ├── Madhav      (debugger)
  │   ├── Bheem       (devops)
  │   ├── Sahadeva    (researcher)
  │   ├── Nakul       (writer)
  │   ├── Yudhishthir (reviewer)
  │   └── Shiv        (security)
  ├── SharedMemory  → per-session key-value store (~/.codeva/sessions/)
  └── Synthesizer   → merges all outputs into final answer
        │
        ▼
  Backend LLM Gateway (localhost:3000/api/v1/agent/complete)
        │
        ▼
  Groq / OpenRouter / HuggingFace / Gemini / Mistral ...
```

## Running Everything

### Step 1 — Start the Backend
```powershell
cd backend
npm start
# Backend runs on http://localhost:3000
```

### Step 2 — Start the Agent Platform
```powershell
cd agent-platform
node src/index.js
# Platform runs on http://localhost:4000
# WebSocket on ws://localhost:4000/ws
```

### Step 3a — Use the CLI
```powershell
cd agent-platform
# Run a goal
node cli/bin/codeva.js run "build a todo app with React and Express"

# Check status
node cli/bin/codeva.js status

# List installed skills
node cli/bin/codeva.js skills list

# Initialize a project
node cli/bin/codeva.js init
```

### Step 3b — Use the Agent Manager UI
```powershell
cd agent-platform/ui
npm run dev
# UI opens at http://localhost:5174
```

### Step 3c — Use the Desktop App
```powershell
cd agent-platform/desktop
npm install
npm run dev
# Opens Electron window (embeds the UI + auto-starts platform server)
```

## Setting Up Auth

The platform talks to the backend via `x-cli-session` header.
Set this in `agent-platform/.env`:
```
CODEVA_CLI_SESSION=<your-cli-session-token>
CODEVA_BACKEND_URL=http://localhost:3000
```

Get a CLI session token from the backend:
```
POST /api/v1/auth/cli-session
{ "email": "...", "password": "..." }
```

## Project Configuration

Place `AGENTS.md` at your project root to configure the agent team:
```markdown
## Project Context
This is a React + Node.js app using MongoDB.

### coder
model: codeva/ravan
instructions: Always use TypeScript. Follow existing patterns.
```

Place `SKILLS.md` at your project root to give agents domain knowledge:
```markdown
## API Design Rules
All endpoints must use camelCase JSON keys.
Always return { success, data, error } shape.
```

## API Reference

### Platform REST API (port 4000)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/platform/run | Start a session |
| GET  | /api/platform/status | Platform + sessions status |
| GET  | /api/sessions/:id | Get session snapshot |
| GET  | /api/sessions/:id/graph | Task graph JSON |
| GET  | /api/sessions/:id/memory | Shared memory contents |
| GET  | /api/agents | List all agent types |
| GET  | /api/skills | List installed skills |
| POST | /api/skills | Install a skill |

### Backend Proxy (port 3000, auth required)
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/platform/run | Auth-gated platform run |
| GET  | /api/v1/platform/status | Platform status |
| GET  | /api/v1/platform/agents | Agent definitions |

### WebSocket Protocol (ws://localhost:4000/ws)
```json
// Send to start a run:
{ "type": "run", "goal": "build X", "sessionId": "uuid", "projectPath": "/path" }

// Receive events:
{ "type": "orchestrator:graph_ready", "tasks": [...] }
{ "type": "task:started", "task": {...} }
{ "type": "agent:token", "taskId": "t1", "token": "Hello" }
{ "type": "agent:tool", "taskId": "t1", "tool": { "tool": "file_read", "args": {...} } }
{ "type": "task:completed", "task": {...} }
{ "type": "orchestrator:completed", "result": "...", "stats": {...} }
```

## Key Files

| File | Purpose |
|------|---------|
| `src/orchestrator/Orchestrator.js` | Main session runner |
| `src/orchestrator/Decomposer.js` | Goal → TaskGraph via LLM |
| `src/orchestrator/TaskGraph.js` | DAG with status tracking |
| `src/agents/AgentWorker.js` | ReAct loop per task |
| `src/agents/AgentRegistry.js` | Agent definitions + personas |
| `src/agents/AgentsMdParser.js` | Reads AGENTS.md |
| `src/memory/SharedMemory.js` | Cross-agent state store |
| `src/tools/ToolExecutor.js` | file/terminal/web/browser tools |
| `src/llm/client.js` | Routes through backend LLM gateway |
| `src/skills/SkillsLoader.js` | Reads .md skill files |
| `cli/bin/codeva.js` | CLI entry point |
| `ui/src/pages/AgentManager.jsx` | Main UI page |
| `ui/src/store/platformStore.js` | Zustand WS state |
| `desktop/src/main.js` | Electron main process |
