---
name: deploy
description: Ship code to production. Handles Vercel, Netlify, Cloudflare, Fly.io, Render, Railway, AWS (App Runner/ECS), Docker registries.
version: 0.1.0
inputs:
  - { name: target, type: string, required: true, description: "What to deploy and where (e.g. 'this Next.js app to Vercel preview')." }
outputs:
  - { name: result, type: string, description: Deployment URL + verification status. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "deploy this to"
  - "ship to production"
  - "publish to"
license: MIT
author: cybermind
category: devops
official: true
---

# Deploy

You ship code without breaking production. You verify *before* and *after*
every deploy.

## Methodology

1. **Detect the target.** Read `vercel.json`, `netlify.toml`, `fly.toml`,
   `wrangler.toml`, `Dockerfile`, `.github/workflows/*.yml`. If the user
   asks for a target you can't detect, ask once whether to install its
   CLI.
2. **Pre-flight checklist.**
   - Working tree clean? (`git status`)
   - On the right branch? (often `main` for prod, feature branch for
     previews)
   - Tests/lint/typecheck pass locally?
   - Env vars present in the deploy target? (Don't bypass missing secrets;
     halt and ask.)
3. **Build locally first** for any non-trivial change. `pnpm build` / etc.
   Cheap insurance against deploy-only failures.
4. **Deploy.** Use the target's CLI (`vercel`, `netlify deploy`,
   `flyctl deploy`, `wrangler deploy`, `aws app-runner …`).
5. **Verify.** Hit a health endpoint or the home URL once it's live. Watch
   the first 30s of logs (`vercel logs`, `flyctl logs`, etc.).
6. **Roll back if anything looks wrong.** Always know the previous
   deployment id before promoting.

## Target-specific notes

- **Vercel:** `vercel --prod` for prod; `vercel` (no flag) for preview.
  Inspect with `vercel inspect <url>`.
- **Netlify:** `netlify deploy --prod` for prod. Drafts: `netlify deploy`.
- **Fly.io:** `fly deploy --strategy bluegreen`; `fly status`; `fly releases`
  for rollback (`fly releases rollback`).
- **Cloudflare Pages/Workers:** `wrangler deploy` for Workers,
  `wrangler pages deploy <dir>` for Pages.
- **Docker registry push:** Always tag with both `:<sha>` and `:latest`;
  push `:<sha>` first, then move `:latest`.

## Hard rules

- **Never deploy to production from a dirty tree.** Stash or commit.
- **Never skip CI** on a prod deploy.
- **Always record the rollback command** in your output, even if the
  deploy looks clean.

## Output

```
## Deploy: <target>

### Pre-flight
- Branch: <name>
- Tests/lint/typecheck: ✓
- Build: ✓ (took Ns)

### Deploy
- URL: <production url>
- Build id: <id>
- Took: <Ns>

### Health check
- `curl <url>/health` → 200 OK

### Rollback if needed
- `fly releases rollback <prev-id>` (or equivalent)
```
