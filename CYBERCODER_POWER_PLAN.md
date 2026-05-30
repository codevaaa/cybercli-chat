# CyberCoder — Power Plan (make it surpass Claude Code, 100% real)

This is the concrete roadmap to make CyberCoder the most powerful agentic
coding CLI — built on FREE providers (Ollama / Anthropic key / any third‑party
key) — with zero fake features. Items marked ✅ are already implemented this
session; the rest are prioritized next steps.

## A. Already real (this session)
- ✅ Token/context engine: auto-compaction, tool-output trimming, prompt caching
- ✅ Parallel multi-agent orchestration (`spawn_team`, bounded concurrency)
- ✅ Self-correction: edit/write verification + transient-error retry
- ✅ Reliable skill bundling (25 skills ship with the package)
- ✅ Live web research: `web_search` + `web_fetch` (keyless, verified)
- ✅ Claude-Code-style animated thinking words
- ✅ Plan-gated unified gateway (free/pro/max/enterprise govern models)

## B. How free providers reach Claude-Code power (the real levers)
1. **Prompt caching** — system prompt + tool schemas cached → ~90% cheaper
   re-sends on multi-turn agent loops. (Done for Anthropic-shape providers.)
2. **Auto-compaction** — keeps small context windows (8k–32k) usable on long
   tasks without losing the thread. (Done.)
3. **Parallel sub-agents** — each gets a fresh context budget, so total useful
   context >> a single model's window. (Done.)
4. **Self-correction** — verify-after-write + retries cut wasted turns. (Done.)
5. **Task-tier routing** — cheap-but-fast models (Groq llama-3.3, Gemini Flash,
   Cerebras) for bulk steps; strongest free model only for hard steps. (Done.)
6. **Speculative drafting** (next): draft with a fast model, validate/refine
   with a stronger one only when confidence is low.

## C. Next high-impact features (prioritized)
1. **Plan/Act modes + /goal** — a read-only planning pass that produces a task
   list, then an execution pass that works the list until a completion check
   passes (like Claude Code's `/goal`).
2. **Git awareness** — auto-detect repo, current branch, staged/unstaged diff;
   feed a compact repo map into context; `/pr` to open PRs.
3. **Hooks system** — run shell commands on events (fileEdited, preToolUse,
   postTask): auto-format, run tests, lint. 17-event model like Claude Code.
4. **MCP client** — connect external MCP servers (databases, browsers, APIs)
   so any MCP tool becomes a CyberCoder tool.
5. **Checkpoints + /rewind** — snapshot the workspace before each destructive
   action; one-command rollback. (Backend `checkpoint.ts` already exists.)
6. **Repo map / codebase index** — build a symbol+file index once, let the
   agent navigate by symbol instead of re-grepping (faster, fewer tokens).
7. **Sandboxed execution** — optional Docker/Podman jail for `run_command` on
   untrusted repos.
8. **Background tasks** — long jobs run detached; `/background` frees the prompt.
9. **Parallel file reads** — already parallel for read-only tools; add a
   `read_many` batch tool to fetch N files in one round-trip.
10. **Test-driven self-heal loop** — after edits, auto-run the nearest test
    suite; if red, feed failures back and iterate until green (bounded).

## D. Best plugins / libraries to pull in (real, vetted)
- `ripgrep`/`@vscode/ripgrep` — already grep-style; bundle the binary for speed.
- `simple-git` — robust git operations for git-awareness + `/commit` + `/pr`.
- `@modelcontextprotocol/sdk` — official MCP client for the MCP feature.
- `tree-sitter` + language grammars — accurate symbol extraction for repo map.
- `diff` / `diff-match-patch` — precise patch application + verification.
- `execa` — safer cross-platform process spawning than raw child_process.
- `undici` — fast HTTP for web tools at scale.
- `p-queue` — production-grade concurrency control for the orchestrator.

## E. Skills to inbuild (from officialskills.sh / awesome-claude-skills)
Already added: debugger, commit, security-audit, skill-creator, web-research.
Recommended next (universal SKILL.md format, work across agents):
- `pr-writer`, `changelog`, `release-notes`
- `test-writer` (exists) + `coverage-raiser`
- `api-designer` (exists) + `openapi-gen`
- `dependency-upgrader`, `monorepo-doctor` (exists)
- `react-best-practices`, `tailwind-expert`, `accessibility-auditor`
- `sql-optimizer`, `db-migrator` (db-architect exists)
- `terraform-author`, `k8s-operator` (infra-as-code exists)
- `incident-responder`, `log-analyzer`

## F. Reliability target ("199% real, no bugs")
- Every destructive tool verifies its result (done for edit/write).
- Add a post-edit **typecheck/lint gate**: after a code edit, run the project's
  typechecker; if it errors on the edited file, surface to the model to fix.
- Add a **test gate** for bug-fix tasks (red→green loop).
- Golden-path **e2e tests** for the agent loop with a mock provider.
- Structured tool errors (machine-readable) so the model recovers deterministically.

## G. Cross-device / fullstack
- CLI: works on Win/macOS/Linux (PowerShell/bash detection — done).
- Desktop (Electron) reuses the web renderer + same backend gateway.
- Web chat + CLI + desktop all hit the SAME plan-gated gateway → one identity,
  one billing, one model policy. (Gateway unified this session.)
