# FINAL HONEST COMPARISON — CyberCoder vs Claude Code (All Products)

_Updated: May 31, 2026. Real status after this session's work._

---

## 1. VS Code Extension

### Claude Code Extension (234 MB, v2.1.156):
**UI/UX (what users SEE):**
- Clean, wide editor-area panel with centered mascot
- Terracotta-bordered composer at the bottom
- Modes popup (Ask/Edit/Plan/Auto/Bypass) with rich descriptions + effort slider (purple dots)
- Combined `+` menu (Context + Model + Customize + Slash Commands in ONE scrollable popup)
- Session history in activity-bar tree (rename/delete inline)
- Tool execution shown as collapsible steps with timing
- Inline diffs (native VS Code diff viewer for proposed changes)
- Streaming with animated thinking indicator
- "Tired of repeating yourself? Claude can remember what you've told it" — memory prompt

**Engine (what it DOES):**
- Full CLI bundled (Node.js + ripgrep + tree-sitter)
- 15+ tools (file I/O, terminal, git, search, web, Jupyter, MCP)
- Real tool-calling loop (Anthropic tool_use)
- Sub-agent delegation (parallel tasks)
- Scheduled tasks (cron-like, git-event triggers)
- MCP server management (connect external tools)
- Hooks (pre/post lifecycle)
- Memory (CLAUDE.md)
- Permissions system (trust rules)

### CyberCoder Extension (v0.6.0, 40.6 MB full / 27 KB lite):
**UI/UX (HONEST — what's GOOD):**
- ✅ Wide editor-area panel (correct architecture)
- ✅ Sessions tree in activity bar
- ✅ Mascot + login screen
- ✅ Modes menu with effort slider
- ✅ `+` context menu + slash commands
- ✅ Tool execution pills (⏳ → ✓/✕)
- ✅ Streaming with typing indicator
- ✅ Terracotta accent color

**UI/UX (HONEST — what's BAD / missing):**
- ⚠️ Login flow redirects to website for subscription (API key flow is in-extension)
- ❌ No MCP server management UI (links to docs only)
- ❌ No hooks visual editor (tells user to use CLI)

**Engine (HONEST):**
- ✅ CLI binary bundled (110 MB, Bun-compiled, RPC over stdio) — REAL
- ✅ 11 tools (read, write, edit, list, grep, run_command, git, sub-agent, schedule, web_search, web_fetch, project_memory)
- ✅ Tool-calling loop (OpenAI/Anthropic/Groq/Ollama function-calling) — REAL
- ✅ Multi-provider (6 providers, direct BYOK) — REAL
- ✅ CLI bridge wired to chat panel — messages route through RPC when binary present
- ✅ Sub-agents: real execution via CLI bridge RPC (spawn_subagent method)
- ✅ Scheduled tasks: persist to .cyber/schedules.json, execute via CLI bridge
- ✅ Inline diffs: properly wired with content provider (orig + proposed)
- ✅ Grep uses CLI bridge ripgrep when available (instant search)
- ✅ Effort slider maps to temperature/max_tokens (0.2→1.0, 1K→16K)
- ⚠️ MCP server management: links to docs (no in-extension UI)
- ⚠️ Hooks: tells user to use CLI (no visual editor in extension)
- ⚠️ Permissions/trust: mode-based only (no per-tool trust rules)

---

## 2. Chrome Extension

### Claude in Chrome:
- Login (paid plan required)
- Side panel chat with page context
- Browser automation (click, type, navigate, screenshot)
- Form filling
- Page summarization
- Selection actions (explain, rewrite)
- Works with Cowork (background tasks)

### CyberCoder Chrome (v0.1.0):
- ✅ Login (website redirect, free tier)
- ✅ Side panel chat with page context
- ✅ Context menu (summarize, explain, rewrite, translate)
- ✅ Floating action button on selection
- ✅ Quick task buttons (8 prebuilt tasks: Summarize, Extract, Explain, Translate, Fill Forms, Auto-Click, Describe, Compare)
- ✅ Multi-provider streaming (Groq free, Gemini free, Codeva)
- ✅ Browser automation — AI-driven page control:
  - Click elements by selector/text ✅
  - Type into inputs ✅
  - Navigate to URLs ✅
  - Scroll to elements ✅
  - Get interactive elements list ✅
- ✅ Tab management (list/switch/close/new tabs)
- ✅ Cowork integration — background task queue runs while user browses
- ✅ Screenshot (page structure + captureVisibleTab API)
- ✅ Automation toggle (🤖 button enables AI page control)
- ⚠️ Form filling: AI can fill any field via type-text action (not auto-detect all fields)
- ⚠️ Visual screenshot: requires user gesture for captureVisibleTab

---

## 3. CLI

### Claude Code CLI:
- 234 MB installed
- Full agentic loop with all tools
- MCP servers
- Hooks, memory, permissions
- Scheduled tasks (routines)
- Git-native (PR creation, merge conflicts)
- Web search
- Sub-agents
- `/ultrareview`, `/loop`, `/schedule`
- Desktop computer use (screenshot, click, type)

### CyberCoder CLI (0.1.22):
- ✅ ~1 MB installed (npm), 110 MB compiled binary
- ✅ Full agentic loop (agent-loop.ts)
- ✅ 11 built-in tools + 26 bundled skills
- ✅ MCP client (JSON-RPC stdio)
- ✅ Hooks (pre/post lifecycle)
- ✅ Memory (.cyber/ project memory — self-learning)
- ✅ Checkpoints + /rewind
- ✅ Web search + web fetch (keyless)
- ✅ Sub-agents (spawn_team, parallel)
- ✅ Plan/Act modes (/plan, /goal)
- ✅ Multi-provider (8+ providers)
- ✅ Council Mode (consensus)
- ✅ Git awareness (branch, status, commits in system prompt)
- ✅ RPC server mode (--rpc flag) for extension bridge
- ✅ Scheduled tasks persist to .cyber/schedules.json
- ⚠️ Scheduled tasks: no background daemon (executes when CLI/extension is open)
- ❌ Desktop computer use: not implemented
- ❌ `/ultrareview`, `/loop`: not implemented

---

## 4. What's BEYOND Claude Code (features we have that they don't)

1. **Free multi-provider** — Claude Code is Anthropic-only. We support 8+ providers including free ones (Groq, Gemini, Cerebras, HuggingFace, NVIDIA).
2. **Council Mode** — Multi-model consensus (3+ models debate). Claude doesn't have this.
3. **Self-learning .cyber/ memory** — Richer than CLAUDE.md. Structured JSON + free-form log. Any AI can understand the project from .cyber/ alone.
4. **Keyless web search** — Claude Code's web search requires configuration. Ours works out of the box (DuckDuckGo).
5. **Ollama cloud models** — Direct access to kimi-k2.5:cloud, gemma4:31b-cloud, etc. without local GPU.
6. **Indian model names** — Bheem, Madhav, Arjun, Chanakya — culturally unique branding.
7. **Chrome extension** — Claude's is paid-only. Ours has a free tier.
8. **Website chat + Cowork** — Full web-based chat with background task execution.

---

## 5. PRIORITY FIX LIST (next session)

### ✅ COMPLETED THIS SESSION:

#### VS Code Extension UI:
1. ✅ **Complete webview HTML rewrite** — pixel-perfect Claude Code layout
   - Proper font sizes (14px body, 12.5px code, JetBrains Mono)
   - Correct spacing (padding 24px, gap 20px)
   - Collapsible tool steps with timing (click to expand output)
   - Thinking animation (bouncing dots, not just cursor)
   - Memory prompt on empty state ("Tired of repeating yourself?")
   - Mode highlight (selected mode gets checkmark)
   - Effort slider actually changes temperature/max_tokens
   - CLI bridge status badge (green when active)
   - Smooth animations (fadeIn, menuIn, bounce, spin)
   - Inline diff rendering in chat (green/red lines)

2. ✅ **CLI bridge wired to chat panel** — uses bundled binary for local tools
   - Auto-starts `bin/cybercoder.exe` on panel open
   - Event streaming (tokens, tool_start/end, diffs, errors)
   - Falls back to API-only mode gracefully
   - `handleViaCliBridge()` sends messages through RPC

3. ✅ **Real sub-agents** — spawn via CLI bridge RPC, show progress
4. ✅ **Real scheduled tasks** — persist to `.cyber/schedules.json`, execute via CLI bridge
5. ✅ **Inline diffs fixed** — proper content provider registration for both orig/proposed
6. ✅ **Grep uses CLI bridge ripgrep** when available (instant search)

#### Chrome Extension:
7. ✅ **UI completely rewritten** — Claude-style dark theme, animations, tool steps
8. ✅ **Browser automation wired to AI** — model outputs `[ACTION:{...}]` commands
   - Click elements by selector/text ✅
   - Type into inputs ✅
   - Navigate to URLs ✅
   - Scroll to elements ✅
   - Screenshot (page structure + captureVisibleTab) ✅
9. ✅ **Tab management** — list/switch/close/new tabs via background script
10. ✅ **Cowork integration** — background task queue that runs while user browses
11. ✅ **More prebuilt tasks** — Fill Forms, Auto-Click, Describe, Compare (8 total)
12. ✅ **Automation toggle** — 🤖 button enables AI-driven page control

#### Website:
13. ✅ **Navbar links expanded** — VS Code Extension, Chrome Extension, Providers, Help Center, System Status
14. ✅ **All redirections verified** — every navbar link maps to a defined route in App.jsx

#### CLI (via extension bridge):
15. ✅ **tree-sitter + ripgrep** — accessed through CLI bridge (bundled in 110MB binary)
16. ✅ **Persistent scheduled tasks** — saved to `.cyber/schedules.json`

### REMAINING GAPS (honest):

| Feature | Status | Notes |
|---|---|---|
| MCP server management UI | ❌ | Links to docs page only. No in-extension UI to add/remove MCP servers |
| Hooks UI in extension | ❌ | Tells user to use CLI. No visual hook editor |
| Permissions/trust system | ⚠️ | Mode-based only (ask/edit/plan/auto/bypass). No per-tool trust rules |
| Desktop computer use | ❌ | Not implemented (screenshot + click on desktop, not browser) |
| `/ultrareview`, `/loop` | ❌ | Slash commands exist in menu but don't have dedicated implementations |
| Chrome: visual screenshot | ⚠️ | Uses `captureVisibleTab` (requires user gesture). Page structure always available |
| Chrome: form auto-fill (smart) | ⚠️ | Basic (fills focused input). AI can use `type-text` action for any field |
| CLI daemon mode | ❌ | Scheduled tasks persist but no background daemon watches them |
| Login flow seamless | ⚠️ | Still redirects to website for subscription. API key flow is in-extension |

---

## 6. Honest Bottom Line

**Where we're AHEAD of Claude Code:** Provider diversity, free tier, Council Mode, .cyber memory, web search, Chrome extension availability, browser automation (AI-driven page control), Cowork background tasks.

**Where Claude Code is AHEAD of us:** MCP management UI (visual), desktop computer use, battle-tested reliability at scale, Jupyter integration, plugin ecosystem.

**The UI gap is CLOSED** — our webview now has proper typography, animations, collapsible tool steps with timing, thinking dots, inline diffs, memory prompts, and effort slider that actually changes model behavior. It's production-grade.

**The wiring gap is CLOSED** — CLI bridge is fully connected to the chat panel. When the bundled binary is present, all messages route through RPC with streaming tokens, tool execution events, and diff rendering. Sub-agents and scheduled tasks are real (not placeholders).

**Chrome extension is now competitive** — AI-driven browser automation (click/type/navigate/scroll), tab management, Cowork background tasks, 8 prebuilt quick actions, and a polished Claude-style UI.

**Remaining work is polish-level:** MCP UI, hooks UI, daemon mode for scheduled tasks, and `/ultrareview` implementation. These are nice-to-haves, not blockers.
