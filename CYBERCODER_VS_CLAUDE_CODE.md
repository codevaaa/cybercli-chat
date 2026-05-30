# CyberCoder vs Claude Code — Honest Full-Stack Comparison

_Last updated: May 30, 2026. This is a real audit of what CyberCoder ships today
(verified against the codebase) versus Anthropic's Claude Code, plus the concrete
gaps and the plan to surpass it on FREE providers._

---

## TL;DR

Claude Code is more powerful **today** not because of one magic model, but because
of an entire **agent harness** tuned over many iterations: aggressive prompt
caching, tight context management, a huge tool ecosystem, IDE/CI integrations, and
a polished install/update story. CyberCoder already replicates most of the *core*
harness (token engine, parallel sub-agents, self-correction, checkpoints, hooks,
MCP, web tools, and now `.cyber` self-learning memory). The remaining gap is
**breadth of integrations, packaged binary size/footprint, and battle-tested
polish** — not raw capability.

The win condition for free providers is process, not parameters:
1. Prompt caching → ~90% cheaper repeat tokens on multi-turn loops.
2. Auto-compaction → small free context windows stay usable on long tasks.
3. Parallel sub-agents → each gets a fresh budget, so effective context ≫ one model.
4. Self-correction → verify-after-write + retries cut wasted turns.
5. Task-tier routing → fast/cheap free models for bulk, strongest only for hard steps.

---

## Feature-by-feature

| Capability | Claude Code | CyberCoder (today) | Gap / Notes |
|---|---|---|---|
| Terminal agent loop | ✅ | ✅ `core/agent-loop.ts` | parallel read-only, sequential destructive, retry |
| Prompt caching | ✅ | ✅ `providers/anthropic.ts` | works for Anthropic-shape providers |
| Context auto-compaction | ✅ | ✅ `core/context.ts` | `windowForModel()`, tool-output trimming |
| Parallel sub-agents | ✅ (subagents) | ✅ `skills/orchestrator.ts` | `spawn_team`, bounded concurrency |
| Self-correction / verify | ✅ | ✅ edit/write `verify` hooks | surfaces errors back to the model |
| Plan / Act modes | ✅ | ✅ `core/plan-act.ts` | `/plan`, `/goal` |
| Checkpoints + rewind | ✅ | ✅ `tools/workspace-checkpoint.ts` | real filesystem time-travel `/rewind` |
| Hooks (pre/post) | ✅ | ✅ `cli/runtime/hooks.ts` | preCommand block, postEdit format |
| MCP client | ✅ | ✅ `tools/mcp-client.ts` | dependency-free JSON-RPC stdio |
| Web search/fetch in CLI | ⚠️ limited | ✅ `web-search.ts`/`web-fetch.ts` | keyless — **edge over Claude Code** |
| Project memory file | ✅ CLAUDE.md | ✅ `.cyber/` + CYBER.md | **self-learning** (`project_memory` tool) |
| Skills ecosystem | ✅ | ✅ 26 bundled skills | bundled into the package |
| Multi-provider routing | ❌ (Anthropic only) | ✅ 8+ providers | **edge** — free-provider power |
| Council / consensus | ❌ | ✅ `core/consensus.ts` | multi-model consensus |
| IDE extensions (VS Code/JetBrains) | ✅ | ⚠️ planned | **gap** |
| GitHub Action / CI SDK | ✅ | ⚠️ partial | **gap** |
| Packaged binary footprint | ~200–300 MB | ~1 MB CLI | small is good, but missing bundled runtimes/models |
| Desktop app | ✅ | ✅ Electron (Codeva) | parity in progress |
| Background "Cowork" tasks | ✅ | ✅ web + (desktop via shared UI) | live-streamed, stoppable |

---

## Why Claude Code's CLI is ~200–300 MB and ours is ~1 MB

This is the question that flagged "something is missing." The size difference is
mostly **bundled runtime + native dependencies**, not smarter code:

- Claude Code ships **ripgrep binaries** for every platform, a **Node runtime**
  (or a packaged executable), native modules (e.g. tree-sitter parsers for many
  languages), and platform shims. CyberCoder currently assumes Node 20+ and the
  system's tools are present, so the npm package stays tiny.
- This is a **tradeoff, not a deficiency**: small install = fast `npm i -g`, but it
  depends on the user's environment. To match robustness we should optionally
  bundle: ripgrep (we already use a grep tool), tree-sitter grammars for accurate
  symbol maps, and ship a packaged binary (via `pkg`/`bun build --compile`) for
  users without Node.

**Action items to close the footprint/robustness gap:**
- [ ] Bundle a vendored ripgrep per-platform (fallback to system rg).
- [ ] Add tree-sitter based symbol extraction (replaces regex in `repo-map.ts`)
      for accurate multi-language navigation.
- [ ] Offer a standalone compiled binary so Node isn't required.
- [ ] Optionally bundle a small local model path (Ollama bootstrap) for offline.

---

## Where CyberCoder is ALREADY ahead

1. **Free multi-provider gateway** — OpenRouter/Groq/Gemini/Cerebras/Cloudflare/
   HuggingFace/NVIDIA/Bytez/Mistral + local Ollama, with plan-gated routing.
   Claude Code is Anthropic-only.
2. **Keyless web search + fetch in the CLI** — live research without an API key.
3. **Council / consensus mode** — multiple models cross-check a hard answer.
4. **Self-learning `.cyber/` memory** — the project understanding compounds across
   sessions and is portable to any AI/agent that reads `.cyber/`.
5. **Uncensored agentic models** available for security research workflows (HF).

---

## Gaps to close to decisively surpass (prioritized)

1. **IDE integrations**: VS Code + JetBrains extensions that drive the CLI (LSP).
2. **CI/SDK**: a `cybercoder` GitHub Action and a programmatic SDK for pipelines.
3. **Accurate code intelligence**: tree-sitter symbol graph + repo map.
4. **Packaged binary**: compiled, Node-optional, with vendored ripgrep.
5. **Speculative drafting**: draft with a fast free model, validate with a stronger
   one only when confidence is low (extra token savings + speed).
6. **Eval harness**: a small suite of real coding tasks to measure pass-rate per
   provider so routing decisions are data-driven.

---

## Cross-device parity checklist

- [x] Website (Vercel) — chat, Cowork, pricing/upgrade, product, downloads.
- [x] CLI (npm `@codeva_chat/cli`) — full agent harness + `.cyber` memory.
- [~] Desktop (Electron) — loads the same web app; auto-update flow done; installer
      flow built; needs packaged-build testing.
- [ ] Mobile — store listings referenced on /downloads; apps pending.

> This document is the source of truth for the comparison. Update the tables as
> items land so we can see, at a glance, exactly where we stand against Claude Code.
