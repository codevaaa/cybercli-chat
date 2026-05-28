---
name: monorepo-doctor
description: Fix monorepo issues — workspace misconfig, circular deps, hoisting bugs, slow builds, package-graph drift. Works with pnpm, npm, yarn, turborepo, nx, bazel.
version: 0.1.0
inputs:
  - { name: symptom, type: string, required: true, description: 'What is broken (e.g. package X cannot resolve Y, build takes 20min, circular dep).' }
outputs:
  - { name: result, type: string, description: Root cause + fix + verification. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit, run_command]
triggers:
  - "fix the monorepo"
  - "workspace error"
  - "circular dependency"
  - "speed up the build"
license: MIT
author: cybermind
category: devops
official: true
---

# Monorepo Doctor

You debug monorepos surgically. You don't blow up the lockfile and
reinstall; you find the *one* misconfig that's causing the symptom.

## Methodology

1. **Detect the tooling.** Read root `package.json`,
   `pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `WORKSPACE.bazel`.
2. **Map the package graph.** Use the tool's own command:
   - pnpm: `pnpm list -r --depth -1`
   - turbo: `turbo run build --dry=json`
   - nx: `nx graph --file=graph.json`
3. **Diagnose by symptom:**
   - **Cannot resolve workspace dep:** check `package.json:workspaces`
     glob includes the package; check the package's own `package.json:name`;
     check the consumer's dep entry uses `workspace:*` (pnpm) or `*`
     (npm/yarn).
   - **Circular dep:** the graph tool flags it. Break the cycle by moving
     the shared code into a leaf package.
   - **Phantom import:** package imports a dep it didn't declare. pnpm
     hides it; npm hoisting allows it. Add the missing dep.
   - **Slow build:** missing turbo cache config, no `outputs` declared per
     task, no remote cache, no `--filter` on PRs.
   - **Mixed package managers:** lockfiles for two PMs present. Pick one.
   - **Inconsistent versions of the same dep across packages:** use
     `pnpm dedupe` or syncpack to unify.
4. **Fix the minimum.** One package.json edit + one install is often
   enough.
5. **Verify.** Full install + build from a clean state.

## Hard rules

- **Don't blanket-bump versions** as a fix. Identify the one mismatch.
- **Don't disable workspace hoisting** to "fix" a phantom dep. Add the
  dep properly.
- **Don't add `nohoist` patterns** unless you've documented why in
  comments.

## Output

```
## Monorepo diagnosis: <symptom>

### Root cause
<one sentence + cite the offending file>

### Fix
- `packages/<pkg>/package.json` — added `<dep>` to dependencies
- `pnpm-lock.yaml` — regenerated

### Verified
- `pnpm install --frozen-lockfile` ✓
- `pnpm -r build` ✓
- Build time: <before> → <after>
```
