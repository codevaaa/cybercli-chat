# Full-stack release verification — 3 November 2026

This release collects the current pending source changes in the existing `codevaaa/cybercli-chat` repository, including the browser workspace upgrade, backend/auth/provider work, dossier/editor integrations, local Brahma tooling, and the owner-requested standalone agent-platform removal documented in `REMOVAL_2026-10-01.md`.

## Local validation

| Check | Result |
| --- | --- |
| Backend JavaScript suite | 106 tests passed |
| Backend chat relay suite | 15 tests passed |
| Frontend suite | 255 tests passed across 16 files |
| Frontend production build | Passed |
| Desktop TypeScript and Electron/Vite build | Passed |
| Chrome extension unit/manifest/CSP suite | 18 tests passed |
| Chromium unpacked-extension integration | Passed: chat, page context, history, queued actions, writing, themes, settings, stale replies, rich text, sign-out, capture preview |
| Editor client, release packaging and frozen-eval tests | 22 tests passed |
| Frozen dossier evaluation | 50/50 fixtures passed |
| Brahma data/builder guard tests | 7 tests passed |

The browser suite uses fixture sessions and mocked AI responses. The frozen eval disables network. These checks do not certify live provider quality, GPU training, generated installer signing, or production database migrations.

Non-blocking diagnostics remain: the frontend reports an outdated Browserslist dataset, mixed static/dynamic imports and a large main bundle. The chat-relay test reports an EventEmitter listener warning. Tests and builds still exit successfully; this release does not describe those diagnostics as resolved.

## Repository and credential handling

- Existing main branch and configured GitHub repository are retained. No force push or history rewrite is planned.
- The independent `cybercoder` checkout is clean and its local main commit already matches its GitHub main branch (`f567764`). There is no new nested-repository change to publish.
- Provider keys, live environment files, dependencies, model weights/data caches and generated Python bytecode are excluded from the commit. The browser ZIP and its fixture screenshots are included as small review/install artifacts.
- Secret-pattern findings in the outgoing files were reviewed as test fixtures or references to session fields, rather than embedded credentials. Credentials used for GitHub authentication are not written to repository files or remote URLs.

## Rollout boundary

Pushing main makes the reviewed source available to configured deployment integrations. Render/Vercel deployment success must be checked separately; a successful Git push does not prove that production is running the new revision. Live Supabase sign-in, provider completions, and website-specific editor integrations remain production acceptance checks. The browser package must be reloaded/installed separately in Chrome.
