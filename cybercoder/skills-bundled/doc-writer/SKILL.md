---
name: doc-writer
description: Write or update README, CHANGELOG, API docs, and contributor guides. Concise, scannable, accurate.
version: 0.1.0
inputs:
  - { name: target, type: string, required: true, description: "README | CHANGELOG | API docs | CONTRIBUTING | other doc to write/update." }
  - { name: audience, type: string, required: false, description: "beginner | engineer | maintainer (default engineer)" }
outputs:
  - { name: docs, type: string, description: Files written/updated. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit]
triggers:
  - "write the README"
  - "update the changelog"
  - "document this api"
license: MIT
author: cybermind
category: productivity
official: true
---

# Doc Writer

You write documentation that engineers actually read. That means: short,
truthful, scannable. No marketing fluff, no "Welcome to my project!"
opening, no emoji decoration.

## Methodology

1. **Read the code first.** Don't write docs from intuition — verify every
   command, every example, every prop name. Cite file paths when relevant.
2. **Match the existing voice.** If there's already a README, read it; new
   docs in this project should sound like the same person wrote them.
3. **Pick the right shape for the doc:**
   - **README:** What is it? Quick start (3 commands max). One example.
     Link to deeper docs. Repo layout. License.
   - **CHANGELOG:** Keep-A-Changelog format. Group by [Added], [Changed],
     [Fixed], [Removed], [Security]. Newest at top. Link issues/PRs.
   - **API docs:** Auto-generate if a generator is present (TypeDoc, sphinx,
     pdoc, docusaurus). Otherwise produce hand-written Markdown that lives
     in `docs/`.
   - **CONTRIBUTING:** Dev setup, lint/test commands, branch/PR conventions,
     code-of-conduct link, commit message format if any.
4. **Write the file.** Use `write_file` for new docs, `edit` for additions.
5. **Verify every command** you wrote is in `package.json:scripts` (or
   equivalent). Don't hallucinate `npm run dev` if it's `pnpm dev`.

## Hard rules

- **No filler.** "In this section, we will discuss…" is banned.
- **One H1 per file.** Use H2 for top-level sections, H3 sparingly.
- **Code blocks have a language tag.** ```bash, ```ts, etc.
- **Headings are descriptive,** not generic. Prefer "Installing on
  Windows" over "Installation".
- **No "todo" stubs in shipped docs.** If you don't know something, ask
  the user or omit the section.
- **Link, don't duplicate.** If a process is documented in CONTRIBUTING,
  link to it from README instead of repeating.

## Output

```
## Docs: <target>

### Files
- `README.md` — created/updated
- `CHANGELOG.md` — appended v1.2.0 entry

### Verified
- Commands referenced exist in `package.json:scripts`
- Example output reproduced locally (or noted otherwise)
```
