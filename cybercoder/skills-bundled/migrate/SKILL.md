---
name: migrate
description: Migrate code between frameworks or versions — React class→hook, JavaScript→TypeScript, Express→Hono, Pages Router→App Router, Webpack→Vite, etc.
version: 0.1.0
inputs:
  - { name: from, type: string, required: true, description: "Source (framework/version)." }
  - { name: to, type: string, required: true, description: "Target (framework/version)." }
  - { name: scope, type: string, required: false, description: "File/dir to migrate (default: whole project)." }
outputs:
  - { name: result, type: string, description: Files changed + manual follow-ups required. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "migrate from"
  - "upgrade to"
  - "convert to typescript"
  - "next.js pages to app router"
license: MIT
author: cybermind
category: quality
official: true
---

# Migrate

You run migrations as an iterative, testable process — never as one giant
diff. You always leave the project in a green state after each commit.

## Methodology

1. **Read the source's migration guide.** Don't reinvent it. Cite the
   official upgrade doc in your output.
2. **Inventory the surface.** Count files affected (`grep -r`), classify
   them by complexity (trivial / mechanical / requires-thought).
3. **Sequence the work:**
   - **Phase 1 — Setup:** install new deps, add target config alongside
     the old one. Both coexist. Project still builds.
   - **Phase 2 — Mechanical conversions** in batches of 5–20 files. Each
     batch must pass tests/lint before the next.
   - **Phase 3 — Manual cases:** the residual files that needed real
     thought. One at a time.
   - **Phase 4 — Remove the old.** Delete old deps, configs, files.
4. **Use codemods when they exist** (`jscodeshift`, `ast-grep`,
   `@next/codemod`, `npm:typescript codemod`).
5. **Test after every batch.** `pnpm test`, `pnpm build`,
   `pnpm typecheck`.
6. **Commit small.** One PR per phase. Reviewable.

## Common migrations

- **JS → TS:** rename `.js`→`.ts`, run `tsc --noEmit` to surface errors,
  fix them file-by-file. Start with `"strict": false` and tighten later.
- **CRA → Vite:** delete `react-scripts`, add `vite`, `@vitejs/plugin-react`,
  move `index.html` to root, update `import.meta.env` for env vars.
- **Pages Router → App Router (Next):** use `@next/codemod`, then convert
  data fetching (`getServerSideProps` → server component or `fetch` with
  caching). Move API routes to Route Handlers.
- **Class component → Hook:** state → `useState`, lifecycle → `useEffect`,
  `this.props` → props arg. Test render output is identical.
- **Express → Hono:** routes → `app.get/post`, middleware ordering may
  differ, `req.body` parsing changes.

## Hard rules

- **No flag days.** The project must build after every commit during the
  migration.
- **No "best-effort" partial conversion** of a file. Either fully convert
  it or leave it.
- **Tests are the contract.** If they go red mid-migration, you stop and
  fix immediately.

## Output

```
## Migration: <from> → <to>

### Phase plan
1. Setup — done
2. Mechanical (batch 1/N) — done
...

### Files changed (this run)
- N files in <dir>

### Manual follow-ups
- <file>:<line> — <why>

### Verification
- `pnpm test` ✓, `pnpm typecheck` ✓
```
