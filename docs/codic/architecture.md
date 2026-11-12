# Codic architecture and delivery status

**Status date:** 2026-11-12
**Product:** a new desktop application in `codic/desktop/`. Codeva desktop, web, MrCodevaa, CyberCoder CLI, and the CyberCoder browser extension remain separate products.

## Product boundary

Codic borrows a familiar coding-agent workflow—projects, task threads, activity, approvals, diffs, and terminals—while using original Codeva branding and implementation. Codex research is limited to public feature descriptions and any future authorized REA observations. No Codex source, artwork, credentials, or private service behavior is copied. Codic does not claim that its preview has complete Codex feature parity.

The desktop renderer is a local React application. It uses a narrow typed preload bridge to reach the Electron main process. The main process owns filesystem access, SQLite, OAuth opening/callbacks, encrypted credentials, Git, terminal processes, and the Codeva API connection. The CyberCoder runtime and selected tool/provider contracts are reused as local libraries. REA is an engineering-time aid only and is not shipped with Codic.

## Runtime and data flow

```text
React renderer (sandboxed, no Node access)
        │ typed preload IPC; sender and frame checked
        ▼
Electron main process ─── local project files / Git / shell
        │                         │
        │ authenticated HTTPS     └── versioned SQLite in app userData
        ▼
Codeva backend /api/v1/codic
        │
        └── existing account, quota, and model gateway
```

- The renderer never receives the Supabase access token through the app bridge as an API parameter. Supabase session persistence uses a custom storage adapter backed by Electron `safeStorage`.
- Google OAuth opens the system browser and returns through the `codic://auth/callback` deep link. The Supabase redirect allowlist and Google provider configuration must be set for the deployed Supabase project.
- Device records are scoped to the authenticated account and can be revoked. Model lists include account plan availability and usage limits. The SSE turn endpoint validates model and tool declarations and normalizes text, tool calls, usage, errors, and completion.
- The Codeva gateway receives conversation context, declared tool schemas, and tool results required for the next model step. The selected repository itself stays local; file contents enter a request only when a local tool reads them for the model.
- SQLite stores project paths, thread/task metadata, redacted prompts/events, and line comments. Repository content and credentials are not copied into this database. Schema migrations use SQLite `user_version`; running tasks are marked interrupted when the app restarts.
- Local model-requested shell commands require an explicit allow/deny decision. File tools resolve inside the selected project and check symlink boundaries. A user-entered terminal command is a separate, direct action in a fresh project-rooted shell with a small environment allowlist, time limit, and output cap.
- Git diff reads the selected repository root only, disables external diff/text conversion, and previews bounded untracked text files. Restore points are explicit and require user confirmation in the UI.

## Implemented preview surface

| Area | Current implementation | Remaining work |
|---|---|---|
| Desktop shell | Local React/Electron; sandboxed renderer; context isolation; CSP; guarded navigation, external links, and IPC senders; responsive panes; system/light/dark theme. | Cross-platform packaged runtime checks and keyboard/accessibility pass. |
| Authentication | Email/password, account creation, Google OAuth, verification/reset entry points, secure session persistence, refresh via Supabase client, backend account sync, device registration/revocation. | Live Supabase DNS/configuration and Google callback flow must be verified against restored credentials. Recovery callback experience can be refined after that live project is reachable. |
| Account/model service | Backend device endpoints, plan-aware model catalog, monthly/request limits, SSE gateway turn streaming, cancellation on disconnect, sanitized errors and provider failures. | Live provider credentials and cold-start behavior. Add service-side concurrency/abuse limits as usage grows. |
| Local agent | Reuses CyberCoder agent loop and provider/tool contracts; explicit selected workspace; local file tools; per-shell approval; cancellation; event stream; restore checkpoints. | Resuming an interrupted run, network permissions, out-of-project approval flow, Git push approval, durable approvals, and parallel run isolation. |
| Projects and history | Multiple saved project paths; local thread list; reopens the latest project and thread; rebuilds bounded conversations from redacted task events; cross-project history checks. | Search, rename/delete, richer thread organization, and active task resumption. |
| Review | Git diff and bounded untracked text previews; per-line local comments; restore point listing and restore. | Stage/unstage, inline editing, comment navigation, file status coverage, rename/binary handling, and real worktree changes. |
| Terminal | Multiple command history tabs in memory; user-entered bounded commands in a fresh shell. Windows PowerShell uses a UTF-16LE encoded command and suppresses startup progress noise. | Persistent PTY processes, shell selection, resize/interactive programs, and task linkage. |
| Distribution | electron-builder configuration and original icon assets for unsigned Windows x64 NSIS, macOS universal DMG/ZIP, and Linux x64 AppImage/DEB. Windows installer builds and the unpacked app launch, project picker, terminal, and Git review panels have been smoke-checked locally. | Native macOS/Linux builds, fresh installer/upgrade/recovery checks, website download route, published checksum manifest, update notice, and publishing. |
| Codex/REA research | Public-source feature ledger and authorized REA investigation workflow in `rea-evidence.md`. | Local target could not be analyzed: Ghidra and IDA are not configured, Hopper does not support this host; no user-visible Codex runtime flow was captured. REA evidence IDs remain `TBD`. |

## Backend API contract

All routes are mounted below `/api/v1/codic` and require Codeva authentication:

- `POST /devices`: idempotently register a device/platform/build; never return device credentials.
- `DELETE /devices/:id`: revoke only the requesting account’s device.
- `GET /models`: return available/locked models, plan, request limit, and monthly token limit/use/reset.
- `POST /turns`: stream normalized SSE events. The local agent executes requested tools and sends their results as subsequent conversation messages.

Error payloads use stable public error codes and sanitized messages. Gateway/provider secrets stay in backend configuration; client input cannot select arbitrary internal model IDs, tools, or gateway providers.

## Delivery phases

1. **Preview foundation:** separate desktop shell; Codeva account and model service; local storage and project selection; agent tool loop, approvals, checkpoints, cancellation, diffs, comments, and terminal command runner. This is the current implementation phase.
2. **Local parity workflows:** real Git worktrees, parallel agents, in-run steering and resume, diff editing/restoration, persistent PTYs, skills/MCP, PR review, and browser preview. Add acceptance tests for filesystem boundaries, permission decisions, cancellation, and restart.
3. **Remote and automation:** paired-device monitoring/steering, SSH, computer interaction, and scheduled local automations. Keep repositories local by default; local work requires the desktop device online. Hosted execution is not included in the credits-only plan.
4. **Public beta:** build and smoke-test each supported installer on its native OS; publish via the website download route and object storage with HTTPS/checksums; show unsigned installer warnings and manual update notices; verify first install, upgrade, and recovery. Label the release preview/beta while free Render hosting can sleep.

## Verification record

Latest local checks in this workspace:

- Desktop TypeScript typecheck passed.
- Desktop Vitest suite passed: 5 files / 13 tests.
- Desktop production Electron/Vite build and unsigned Windows x64 NSIS packaging passed. The sandboxed preload is emitted as CommonJS because Electron executes sandboxed preload scripts as CommonJS; the packaged window now renders and exposes the typed bridge correctly.
- Windows packaged-app smoke check opened the repository, ran `Get-Location | Select-Object -ExpandProperty Path` from the selected workspace and showed the expected path with exit code 0, and loaded the Git review panel.
- Desktop terminal regression test checks that a Windows command executes and returns the workspace path rather than echoing the command string.
- CyberCoder `@cybermind/codic-runtime` and `@cybermind/core` TypeScript checks passed.
- CyberCoder Codeva provider tests passed: 3 tests.
- Backend Codic route tests passed: 8 tests with mocked account, usage, and provider modules.
- Full desktop dependency audit (`npm audit`) reported zero vulnerabilities after pinning the packaging toolchain’s `minimatch` dependency to patched `11.0.8`; Windows NSIS packaging passed with that override.
- No live sign-in, provider generation, Windows installer install/upgrade, macOS/Linux build, R2 upload, or public release has been verified. The currently reported Supabase hostname returns `DNS_PROBE_FINISHED_NXDOMAIN`, and no provider credentials were restored.

## Required private deployment configuration

Use local ignored `.env` files and the deployment secret stores. Never paste keys into chat or source control.

- Desktop build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `CODEVA_API_BASE_URL`.
- Backend: existing Supabase service configuration and model gateway/provider credentials.
- Production backend: configure these in Render. The frontend website and download page are separate and still need Codic release assets and a public version/checksum manifest.

The previously shared GitHub classic token was exposed in conversation. Revoke it in GitHub before any push; do not use that token. A replacement should be held in protected GitHub secrets or a private local credential store.
