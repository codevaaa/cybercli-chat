# Codeva cross-client integration and extension upgrade

Inspection and implementation date: 3 November 2026. This describes the local working tree, which already contained substantial unrelated changes before this work. It does not certify the deployed revision.

## How the clients connect

| Component | Actual implementation and connection |
| --- | --- |
| Web frontend | React 19/Vite in `frontend`. `src/lib/api.js` selects the hosted Render API in production. `authStore.js` owns Supabase sessions and dispatches `CYBERCLI_AUTH_SYNC`. `ChatPage.jsx` and API helpers use stored `/chat` threads and `/completions` for guest/fallback completion flows. |
| Desktop | Electron in `desktop`. `src/main/index.ts` loads `https://cybermindcli.info/chat`, manages windows and main-process services. `src/preload/index.ts` exposes a bounded IPC bridge for auth, window actions, external links and desktop integrations. The hosted React app remains its principal chat UI. |
| CyberCoder | A separate nested Git repository exists locally at `cybercoder` (the older map saying it was absent is stale). It is a pnpm workspace with CLI, VS Code extension, core agent loop, providers, tools, auth, shared, skills and telemetry packages. `packages/core/src/agent-loop.ts` coordinates tools, approval hooks and context budgets. `packages/providers/src/cybermind-cloud.ts` connects to `/completions` or `/cli/complete`; CLI utilities authenticate at `/cli/auth`. The VS Code client stores credentials in SecretStorage. |
| Editor workbench | `editors/studio-client` is another integration surface. Existing documentation describes the `/ide` completion/session and `/studio` dossier APIs. It is distinct from the browser extension and Electron web wrapper. |
| Browser extension | Manifest V3 with an ES-module worker, classic content scripts, module side panel, options and capture pages. Page tasks go through the worker’s restricted API broker; extension pages stream directly to the configured Render API. Website session sync is allowed only from the two exact HTTPS Codeva origins. |
| Backend | ESM Express in `backend`, mounted under `/api/v1`. Supabase verifies sessions; MongoDB stores application data; shared gateway routing, plan configuration and key pools supply provider access/fallback. Web chat, extension completions, CLI and IDE APIs are related clients of this backend, rather than separate independent AI services. |

This inspection traced the cross-client boundaries and extension dependencies. It was not a line-by-line audit of every file in the monorepo, nested repositories, hunter engine, mobile scaffolds, or model artifacts.

## Observed gaps and changes

- Options used inline scripts/event handlers incompatible with normal MV3 CSP. Replaced with a module, native labeled controls and persistent settings.
- Side-panel messages were in-memory only. Added account-partitioned, bounded local history and drafts, search, delete/undo, export and regeneration.
- Welcome page actions did not attach webpage content. Added explicit context controls and source-bearing prompts that read the active page before sending.
- Models were hardcoded in the panel. The new selector uses `/models` with an automatic-routing fallback. `/completions` now resolves the catalog’s Madhav alias consistently with `/agent/complete` and checks Council plan access.
- Grammar replies could affect another field or a changed draft, and replacements targeted the first string match. Added sequence/snapshot guards, full-text cache keys, exact non-overlapping offsets and range-based edits.
- Inline overlays inserted unescaped user text into editor HTML and changed the editor’s own DOM. Replaced them with CSS Highlight ranges. Rich text outside corrected ranges is retained.
- Malformed AI proofreading became an empty issue list. The backend now returns an error for invalid JSON/schema, bounds inputs, normalizes goals/issues/tone, caches by user and limits checks per account.
- Main completion streams did not cancel ordinary gateway requests when clients stopped. Reused the existing response lifetime helper and propagated authenticated plan/cancellation. Truncated client streams are no longer reported complete.
- Sign-out could be immediately undone by periodic auth capture. Added an explicit extension sign-out preference and account message synchronization. An older request’s 401 cannot erase a newer login session.
- Full-page capture now retains actual scroll positions, restores the original scroll in `finally`, bounds resource use and uses non-public session storage/preview pages.
- Replaced old “all shipped” and competitor parity claims with feature verification and compatibility notes.

## Validation and deployment boundary

- Live read-only checks returned HTTP 200 for the Render `/health` and `/api/v1/models` endpoints. The live catalog at inspection exposed Madhav and Council. The public website redirects to the `www` origin, which is explicitly covered.
- Full backend tests: 106 passed, zero failed.
- Extension unit/manifest/CSP tests: 18 passed, zero failed.
- Proofreading service coverage: 100% lines/functions, over 97% branches under the targeted backend tests.
- Real unpacked extension in headless Chromium with mocked backend replies: catalog, actual page context, persisted conversations, writing corrections, stale grammar replies, rich text, history, narrow layout, system appearance, persistent settings, sign-out, capture preview/PNG link.
- Screenshots: `artifacts/extension/assistant-light.png`, `writing-dark.png`, `settings-dark.png`.

The browser suite uses fixture sessions and model replies. Production Supabase login and paid model completions were not exercised with a real account. Provider quality, third-party editor coverage, live context-menu capture, and YouTube/PDF/Gmail/LinkedIn compatibility require live acceptance testing. Council’s internal parallel non-stream provider work retains its existing lifecycle; the ordinary gateway stream is the path verified for upstream cancellation.

No deployment, Git commit, Git push, or desktop/CLI rebuild is included. Deploy the reviewed backend revision to Render, then reload/install the extension package. Vercel/Electron/CyberCoder do not require a rebuild for the extension-only UI changes. The source archive deliberately includes no environment files or provider keys.
