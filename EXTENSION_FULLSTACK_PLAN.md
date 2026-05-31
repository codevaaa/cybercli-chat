# CyberCoder VS Code Extension — Fullstack Implementation Plan

_Deep research: Claude Code extension features vs ours, gaps, and concrete plan._

---

## Claude Code VS Code Extension — FULL Feature List (researched)

Based on official docs, marketplace listing (234 MB, v2.1.156), and community:

### Core Architecture
- **Bundled CLI** — the extension ships the entire Claude Code CLI inside it (Node runtime + ripgrep + tree-sitter). That's why it's 234 MB.
- **Local MCP server** — extension runs an `ide` MCP server that the CLI connects to. This lets the agent open native VS Code diffs, read selections, execute Jupyter cells.
- **Sessions persist** across restarts (stored locally).

### Agentic Capabilities (what it DOES, not just UI)
- **Read/write/create files** in the workspace
- **Run terminal commands** (with permission system)
- **Search codebase** (ripgrep, file search, code search)
- **Web search** and **web fetch** (live internet)
- **Sub-agent delegation** (spawn sub-agents for parallel work)
- **Git operations** — stage, commit, branch, PR, merge conflicts
- **Test runner** — run tests, fix failures, re-run
- **Lint/format** — auto-fix lint errors
- **Dependency management** — update packages, resolve conflicts
- **Jupyter notebook** cell execution
- **Browser automation** (via Chrome extension integration)
- **Scheduled tasks** (routines that run on schedule/git events)

### Modes (permission levels)
1. **Ask before edits** — asks approval for every file change
2. **Edit automatically** — edits without asking (but shows diffs)
3. **Plan mode** — explores code, presents plan, then edits on approval
4. **Auto mode** — AI decides which permission level per action
5. **Bypass permissions** — no approval needed (dangerous)
6. **Effort slider** — Low / Med-Low / Medium / High / Max (controls thinking depth)

### Slash Commands (from cheat sheet, 2026)
Session: `/clear`, `/compact`, `/context`
Review: `/code-review`, `/comprehensive-review`, `/cross-review`, `/review`, `/security-review`, `/zen-review`, `/ultrareview`
Planning: `/plan`, `/goal`, `/loop`
Skills: `/research`, `/agent-browser`, `/batch`, `/playwright`, `/skill-creator`, `/run-skill-generator`
Config: `/init`, `/reload-skills`, `/update-config`, `/verify`
Info: `/usage`, `/insights`, `/heapdump`
Customize: Output styles, Agents, Hooks, Memory, Permissions, MCP servers, Manage plugins, Open in Terminal

### Settings / Customize Menu
- Switch model (Default/Sonnet/Haiku + custom models like minimax-m2.5-free)
- Effort slider (Low → Max)
- Thinking toggle
- Account & usage
- Output styles
- Agents (sub-agent configs)
- Hooks (pre/post lifecycle)
- Memory (CLAUDE.md / project memory)
- Permissions (trust rules)
- MCP servers (connect external tools)
- Manage plugins
- Open Claude in Terminal

### Login / Auth
- Claude.ai Subscription (Pro/Max/Team/Enterprise)
- Anthropic Console (API usage billing)
- Bedrock, Foundry, or Vertex (third-party cloud)
- "Prefer the terminal? Run `claude` in terminal" — clicking installs CLI

### UI Layout
- **Activity bar** — sessions rail (left, narrow)
- **Editor area** — wide chat panel (tab named "Claude Code")
- **Inline diffs** — proposed changes shown as native VS Code diffs
- **Terminal integration** — commands run in VS Code's integrated terminal
- **Status bar** — "CyberCoder: Sign in" / model indicator

---

## Our Extension (v0.3.0) — What We HAVE

| Feature | Status |
|---|---|
| Sessions sidebar (tree) | ✅ |
| Wide chat panel (editor area) | ✅ |
| Multi-provider engine (Anthropic/OpenAI/Groq/Gemini/Ollama/Codeva) | ✅ |
| Streaming responses + code blocks | ✅ |
| Copy / Apply to editor | ✅ |
| Modes menu (Ask/Edit/Plan/Auto/Bypass) | ✅ (drives system prompt) |
| Effort slider | ✅ (UI, stored) |
| Slash commands menu (25 commands) | ✅ (filterable, some trigger scans) |
| Context menu (+): Attach/Mention/Clear/Rewind/Model/Thinking/Account/Agents/Hooks/Memory/MCP/Help | ✅ |
| Bug scanner (diagnostics + AI) | ✅ |
| Right-click: Explain/Refactor/Fix/Tests/Add | ✅ |
| Model picker (all providers) | ✅ |
| Login: Codeva API key | ✅ |
| Login: BYOK (Anthropic/OpenAI/Groq/Gemini/Ollama) | ✅ |
| Logo + activity bar icon | ✅ |
| Status bar | ✅ |
| Keybindings | ✅ |

## What We're MISSING (gaps to close)

| Feature | Priority | Effort |
|---|---|---|
| **Agentic file read/write/create** (not just chat) | P0 | Medium |
| **Terminal command execution** (run in VS Code terminal, capture output) | P0 | Medium |
| **Inline diffs** (show proposed changes as native diffs, accept/reject) | P0 | High |
| **Codebase search** (grep/file-search from the agent) | P1 | Medium |
| **Git operations** (stage, commit, branch, PR) | P1 | Medium |
| **Sub-agent spawn** (parallel tasks in the extension) | P1 | High |
| **Ollama cloud models** fullstack (kimi-k2.5:cloud, glm-5:cloud, minimax-m2.7:cloud, qwen3.5:cloud, gemma4:31b-cloud) | P1 | Low |
| **Codeva provider** in model picker (Bheem/Madhav/Arjun/Chanakya names) | P1 | Low |
| **CLI auto-install** ("Prefer terminal? Run cm" → installs if missing) | P1 | Low |
| **Scheduled tasks / routines** | P2 | High |
| **Browser automation** (Chrome extension integration) | P2 | High |
| **Inline Jupyter execution** | P2 | Medium |
| **Native diff viewer** for proposed edits | P2 | High |
| **MCP server management** UI (not just link) | P2 | Medium |
| **Plugins system** | P3 | High |

---

## Website Pages Needed (fullstack)

| Page | Route | Purpose |
|---|---|---|
| **API Key Management** | `/settings/api-keys` (exists but broken for unauth) | Real key creation + list + revoke |
| **Provider Setup** | `/providers` or `/settings/providers` | Anthropic/OpenAI/Groq/Gemini/Ollama setup guides + key input |
| **Help Center** | `/help` | Searchable FAQ + contact + extension docs |
| **Ollama Setup Guide** | `/docs/ollama-setup` | Cloud models, `ollama launch`, config |
| **Extension Docs** | `/docs/vscode-extension` | Full guide for the VS Code extension |
| **Docs responsive fix** | existing `/docs/*` | Navbar overlap, mobile layout |

---

## Backend Upgrades Needed

1. **API key creation fix** — the route works but requires valid Supabase JWT. If the user's session expired or Supabase is unreachable, it fails silently. Need better error messages + session refresh.
2. **Codeva as a provider** in the extension — the `/cli/complete` endpoint already works; just need the extension to show Codeva models with their Indian names (Bheem, Madhav, etc.).
3. **Ollama cloud proxy** — for users who want cloud Ollama models through our backend (optional; direct Ollama is already supported).

---

## Ollama Cloud Models (fullstack setup)

From ollama.com docs, these cloud models are available without local GPU:
- `kimi-k2.5:cloud` — Moonshot AI reasoning
- `glm-5:cloud` — Zhipu GLM-5
- `minimax-m2.7:cloud` — MiniMax coding/agentic
- `qwen3.5:cloud` — Alibaba Qwen 3.5
- `gemma4:31b-cloud` — Google Gemma 4 31B (cloud inference)
- `glm-4.7-flash` — Zhipu fast

Usage: `ollama launch claude --model kimi-k2.5:cloud` (Claude Code integration)
For us: user sets Ollama host → picks `ollama/kimi-k2.5:cloud` → engine streams from Ollama's cloud endpoint.

**Already supported in our engine** — user just needs to:
1. Install Ollama (`ollama serve`)
2. Connect provider in extension (Ollama → host)
3. Pick model `ollama/kimi-k2.5:cloud`

We need: a **docs page** explaining this + the model picker should show these as recommended.

---

## Implementation Order (next steps)

### Phase 1: Make the engine AGENTIC (P0 — this is what makes it "not just a chatbot")
1. Add **file read/write/create tools** the agent can call (via function-calling)
2. Add **terminal execution** (run commands in VS Code terminal, capture output)
3. Add **inline diff** for proposed edits (VS Code's native diff API)
4. Wire these as "tools" the model can invoke (OpenAI function-calling format)

### Phase 2: Fullstack provider + models (P1)
1. Add **Codeva provider** with Indian model names in the picker
2. Add **Ollama cloud models** as recommended in the picker
3. Fix **API key creation** backend error handling
4. Build **Provider Setup page** on website

### Phase 3: Website pages (P1)
1. **Help Center** page
2. **Extension docs** page
3. **Ollama setup guide** page
4. **Docs responsive fix** (navbar overlap)

### Phase 4: Advanced agentic (P2)
1. Sub-agent spawn from extension
2. Git operations
3. Codebase search (grep/find)
4. Scheduled tasks
5. Chrome extension integration

---

## Honest Summary

Claude Code's 234 MB extension is powerful because it bundles the **entire CLI agent** (with all its tools: file I/O, terminal, git, search, web) inside the extension. Our 22 KB extension currently only does **chat + bug scan** — it's a chatbot with a nice UI, not an agent.

To make it a real agent like Claude Code, we need to add **tool-use** (file read/write, terminal exec, search) that the model can invoke autonomously. That's Phase 1 above. The UI is ready; the engine streams; what's missing is the **agentic tool layer** that lets the model actually DO things in the workspace.

This is the single biggest gap. Once tools are added, the extension becomes genuinely powerful — it can refactor files, run tests, fix bugs, all autonomously. Without tools, it's just a fancy chat window.
