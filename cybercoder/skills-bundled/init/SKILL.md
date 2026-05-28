---
name: init
description: Initialize a repository for agent collaboration. Generates AGENTS.md, .cybermind/ config, sensible .gitignore additions, and a contributor-oriented README section.
version: 0.1.0
inputs:
  - { name: project_name, type: string, required: false, description: Project display name (defaults to current directory name). }
outputs:
  - { name: files, type: string, description: List of files created or updated. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "initialize this repo for agents"
  - "set up cybermind in this project"
  - "/init"
license: MIT
author: cybermind
category: productivity
official: true
---

# Init

You bootstrap a repository so that future agent runs are productive. You
**read the existing repo first** (don't overwrite anything), then create or
update the following files:

## Files to create/update

1. **`AGENTS.md`** at the repo root — a contributor-style guide written *for
   AI agents*. Sections:
   - **Project overview** — one paragraph: what this is, who it's for.
   - **Stack** — bullet list of frameworks/languages/build tools detected.
   - **Layout** — `tree`-style listing of the top 2 levels with one-line
     descriptions.
   - **Commands** — install, dev, build, test, lint, typecheck (detect from
     `package.json` scripts, `Makefile`, `Cargo.toml`, etc.).
   - **Conventions** — TypeScript strict? ESLint rules? Naming patterns?
     Test framework? Read 3–5 representative files to infer.
   - **Don't do** — destructive paths (production DB, secrets files, build
     artifacts).
   - **Where to ask** — link to README / CONTRIBUTING / Slack if found.

2. **`.cybermind/config.yml`** — initial config:
   ```yaml
   version: 1
   default_model: auto
   profiles:
     strict-ts:
       require_typecheck_after_edit: true
       deny_tools: [run_command]
   skills:
     enabled:
       - research
       - plan
       - code-review
   ```

3. **`.cybermind/workflows/onboard.yml`** — example workflow showing the
   format, with a couple of trivial steps.

4. **`.gitignore`** — add the following section if not present:
   ```
   # cybermind
   .cybermind/cache/
   .cybermind/logs/
   .cybermind/secrets.enc
   ```

## Methodology

1. **Detect the stack first** (use `read_file` on `package.json`, `pyproject.toml`,
   `Cargo.toml`, `go.mod`, etc.). Use `list_dir` to spot frameworks
   (`next.config.*`, `vite.config.*`, `tsconfig.json`, etc.).
2. **Find existing docs** — if a `README.md` or `CONTRIBUTING.md` exists,
   read them and *cite* them in AGENTS.md rather than duplicating.
3. **Detect commands** — parse `package.json:scripts` (or equivalent) and
   list each with its purpose.
4. **Infer conventions** — read 3 representative source files; note imports,
   semicolons, quote style, file naming, test framework.
5. **Write files** with `write_file` (or `edit` for `.gitignore` augmentation).
   **Don't overwrite an existing `AGENTS.md`** — if it exists, read it and
   ask whether to merge.

## Output

```
## Created/updated
- `AGENTS.md` — new
- `.cybermind/config.yml` — new
- `.cybermind/workflows/onboard.yml` — new
- `.gitignore` — appended cybermind section

## Detected stack
- <list>

## Next steps
- Try `/research where is the entrypoint?` to confirm the AGENTS.md.
```

Be terse, accurate, and never invent commands that don't exist in the
detected scripts.
