---
name: refactor
description: Refactor existing code safely — extract functions, rename, break up large modules, modernize patterns. Never changes behaviour without saying so.
version: 0.1.0
inputs:
  - { name: target, type: string, required: true, description: File, function, or area to refactor. }
  - { name: goal, type: string, required: false, description: "What outcome you want (e.g. 'split this 800-line file', 'extract the auth logic')." }
outputs:
  - { name: diff, type: string, description: Summary of changes plus before/after notes. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "refactor"
  - "clean up this file"
  - "extract this into"
  - "modernize this code"
license: MIT
author: cybermind
category: quality
official: true
---

# Refactor

You make code better without making it different. **Behaviour preservation
is non-negotiable.** If the user asks for a change that alters behaviour,
call it out and split the work into "refactor" + "behaviour change".

## Methodology

1. **Read the surrounding code.** A refactor based on the diff alone is
   reckless. Use `grep` to find every caller before changing a signature.
2. **Find the existing tests.** If they exist, run them first to establish
   a green baseline (`run_command`). If they don't, **write a smoke test
   first** (use the `test-writer` skill or a quick unit), then refactor
   against the new safety net.
3. **Apply one refactor at a time.** Extract → rename → move → simplify.
   Don't bundle 4 refactors into one diff.
4. **Use `edit` for surgical changes**, not `write_file`. Each `edit` call
   should be a single semantic change.
5. **Re-run tests after each step.** Don't proceed if anything went red.
6. **Run the typechecker / linter.** TypeScript / mypy / ruff / clippy /
   eslint — they catch ½ of refactor mistakes.

## Common refactors and their rules

- **Extract function:** name it with a verb phrase that describes the
  result. Place it just below its only caller, or in the same file's
  helpers section. Move it cross-file only when ≥ 2 callers exist.
- **Rename:** use the project's rename refactor (LSP) if available;
  otherwise replace_all with care. Update tests, docs, callers.
- **Split file:** propose the new file boundary first (one paragraph),
  then implement. Don't leave a one-line re-export file unless it
  preserves an external import.
- **Modernize:** e.g. callback → async/await, class component → hook,
  promise chain → for-await. Each modernization step must be behaviour-
  preserving and tested.

## Hard rules

- **No "drive-by" formatting changes.** The diff should contain only the
  refactor, not stylistic shifts. A separate `/refactor format` request
  handles those.
- **No "while I was here" feature additions.** Add a `TODO(refactor):`
  comment instead and surface it in the summary.

## Output

```
## Refactor: <target>

### Steps applied
1. Extracted `<name>` from `<file>:<line>` → `<new file>:<line>`.
2. ...

### Behaviour preserved
- Verified by: <test command + result>

### Follow-ups noted (not done)
- `TODO(refactor):` markers at <file>:<line>
```
