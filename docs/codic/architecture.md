# Codic architecture and delivery status

**Status date:** 2026-11-17
**Product:** a new desktop application in `codic/desktop/`. Codeva desktop, web, MrCodevaa, CyberCoder CLI, and the CyberCoder browser extension remain separate products.

**Current launch posture:** Codic remains a private preview. The website-based OAuth handoff and release-catalog paths exist in source, but a complete account-backed sign-in/model-turn round trip and public signed installers have not been verified for this checkout. The release catalog intentionally returns unavailable while no verified artifact is published; the current desktop updater checks the catalog before requesting Electron metadata. The 0.1.9 client shown in the reported screenshot predates that guard and still needs a manual update to a newer installer. Automatic updates also require a signed Windows release with a configured trusted publisher. Do not advertise Codic as generally available until the release gates below pass.

## Product boundary

Codic borrows a familiar coding-agent workflow—projects, task threads, activity, approvals, diffs, and terminals—while using original Codeva branding and implementation. Codex research is limited to public feature descriptions and any future authorized REA observations. No Codex source, artwork, credentials, or private service behavior is copied. Codic does not claim that its preview has complete Codex feature parity.

The desktop renderer is a local React application. It uses a narrow typed preload bridge to reach the Electron main process. The main process owns filesystem access, SQLite, website sign-in handoffs, encrypted credentials, Git, terminal processes, and the Codeva API connection. The CyberCoder runtime and selected tool/provider contracts are reused as local libraries. REA is an engineering-time aid only and is not shipped with Codic.

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
- Sign-in starts on the Codeva website, where Google, email login, signup, verification, and password reset already live. Codic creates a PKCE verifier in the main process, stores it with Electron `safeStorage`, and opens the website with only the derived challenge. After website auth, the backend creates a two-minute, one-use ticket with an AES-256-GCM encrypted session. The desktop redeems it with its verifier and receives tokens over HTTPS; tokens never appear in the deep-link URL. The backend uses `CODEVA_CODIC_HANDOFF_KEY` when configured, or derives a domain-separated key from the existing Supabase service secret.
- Device records are scoped to the authenticated account and can be revoked. Model lists include account plan availability and usage limits. The SSE turn endpoint validates model and tool declarations and normalizes text, tool calls, usage, errors, and completion.
- The Codeva gateway receives conversation context, declared tool schemas, and tool results required for the next model step. The selected repository itself stays local; file contents enter a request only when a local tool reads them for the model.
- SQLite stores project paths, thread/task metadata, redacted prompts/events, and line comments. Repository content and credentials are not copied into this database. Schema migrations use SQLite `user_version`; running tasks are marked interrupted when the app restarts.
- Local model-requested shell commands require an explicit allow/deny decision. File tools resolve inside the selected project and check symlink boundaries. User-entered terminal commands run in persistent PTY sessions rooted at the selected project, with a small environment allowlist and a per-window limit of five live sessions. The user directly controls interactive shell input; model-requested shell actions remain on the approval path.
- Git diff reads the selected repository root only, disables external diff/text conversion, and previews bounded untracked text files. Restore points are explicit and require user confirmation in the UI.

## Implemented preview surface

| Area | Current implementation | Remaining work |
|---|---|---|
| Desktop shell | Local React/Electron; sandboxed renderer; context isolation; CSP; guarded navigation, external links, and IPC senders; responsive panes; system/light/dark theme. | Cross-platform packaged runtime checks and keyboard/accessibility pass. |
| Companion | Separate transparent, draggable, resizable Codi window; Three.js procedural model with idle/thinking/working/approval/completion/error states, reduced-motion handling, WebGL fallback, and display-bound placement. Prompt entry only places an unsent draft in the Codic composer. | Workspace awareness, voice, safe OS actions, reusable companion skills, persistent companion state, and packaged visual/accessibility checks are not implemented. |
| Authentication | Codeva website login/signup handoff, one-use PKCE ticket, encrypted backend session payload, secure local session persistence/refresh, backend account sync, device registration/revocation. Signed-out renderers remain on a blocking sign-in page; project, browser, terminal, history, review, schedule, checkpoint, and agent IPC calls require a stored session. Sign-out cancels runs, kills terminals, and clears all open windows. | A prior deploy check found the Codic auth routes mounted in production, but the account-backed Google/email verification/reset and desktop PKCE round trip have not been reverified for this checkout. A dedicated `CODEVA_CODIC_HANDOFF_KEY` is recommended; the backend can derive a domain-separated key from its existing Supabase service secret when absent. |
| Account/model service | Backend device endpoints, plan-aware model catalog, monthly/request limits, SSE gateway turn streaming, cancellation on disconnect, sanitized errors and provider failures. The public status page distinguishes a reachable provider model catalog from a verified Codic completion and does not synthesize uptime or incident history; provider key-pool inspection is admin-only. | Live provider credentials and cold-start behavior. Add service-side concurrency/abuse limits as usage grows. |
| Local agent | Reuses CyberCoder agent loop and provider/tool contracts; explicit selected workspace; local file tools; persisted Ask/Approve for me/Full access policies; per-shell and out-of-project approval; cancellation; event stream; restore checkpoints. | Resuming an interrupted run, durable approvals, and parallel run isolation. |
| Projects and history | Multiple saved project paths; searchable composer project picker; local thread list; restores the primary window’s saved project/thread; a blank new window never inherits a project; task windows restore only their requested project/thread; rebuilds bounded conversations from redacted task events; cross-project history checks; rename, pin, fork/side-chat, archive/restore, copy/export, and local profile activity. | Delete and active task resumption. |
| Review | Git diff and bounded untracked text previews; per-line local comments; restore point listing and restore. | Stage/unstage, inline editing, comment navigation, file status coverage, rename/binary handling, and real worktree changes. |
| Terminal | Persistent interactive PTY tabs rooted in the selected project; xterm input, scrollback, resize, close handling, and a small shell environment allowlist. Uses the MIT-licensed Homebridge prebuilt node-pty package to avoid requiring native compilation during packaging. | Shell selection, task linkage, and packaged verification on macOS/Linux. |
| Distribution | electron-builder configuration and original icon assets for unsigned Windows x64 NSIS, macOS universal DMG/ZIP, and Linux x64 AppImage/DEB. The website reads a Windows/macOS/Linux release catalog and displays the configured SHA-256 for manual verification. The API validates metadata shape, safe HTTPS redirect chains, reachability, and Content-Length when the host reports it; it does not download artifacts to independently verify their digest. Backend downloads stay closed unless `CODEVA_CODIC_PUBLIC_RELEASE=true`; Windows updater additionally needs a SHA-512 manifest and trusted signed publisher. | Fresh install/upgrade/recovery checks; native macOS/Linux builds; Windows/macOS signing and notarization; public HTTPS artifact upload; a release pipeline that computes and verifies hashes against uploaded bytes; Render/R2 release configuration; and live update-feed verification. |
| Scheduled work | Local one-time/daily/weekly schedules stored in versioned SQLite, due-time claims, pause/resume/delete controls, per-project scope, separate task windows, and normal per-action approvals. Prompt/title data is redacted before persistence. | Runs only while Codic is open; no OS background service, cloud scheduler, missed-run history UI, or remote steering. |
| Codex/REA research | Public-source feature ledger and authorized REA investigation workflow in `rea-evidence.md`. | Local target could not be analyzed: Ghidra and IDA are not configured, Hopper does not support this host; no user-visible Codex runtime flow was captured. REA evidence IDs remain `TBD`. |

## Backend API contract

All routes are mounted below `/api/v1/codic`:

- `POST /devices`: idempotently register a device/platform/build; never return device credentials.
- `DELETE /devices/:id`: revoke only the requesting account’s device.
- `GET /models`: return available/locked models, plan, request limit, and monthly token limit/use/reset.
- `POST /turns`: stream normalized SSE events. The local agent executes requested tools and sends their results as subsequent conversation messages.
- `POST /auth-handoffs`: authenticated website session exchange for a short-lived, one-use desktop ticket; session payload is encrypted at rest.
- `POST /auth-handoffs/redeem`: public ticket redemption requiring the desktop PKCE verifier; replayed/expired tickets fail.

Error payloads use stable public error codes and sanitized messages. Gateway/provider secrets stay in backend configuration; client input cannot select arbitrary internal model IDs, tools, or gateway providers.

## Delivery phases

1. **Preview foundation:** separate desktop shell; Codeva account and model service; local storage and project selection; agent tool loop, approvals, checkpoints, cancellation, diffs, comments, persistent PTYs, and secure browser window. This is the current implementation phase.
2. **Local parity workflows:** real Git worktrees, parallel agents, in-run steering and resume, diff editing/restoration, terminal task linkage, skills/MCP, PR review, and embedded browser preview. Add acceptance tests for filesystem boundaries, permission decisions, cancellation, and restart.
3. **Remote and extended automation:** paired-device monitoring/steering, SSH, computer interaction, missed-run management, and an optional OS background scheduler. Keep repositories local by default; local work requires the desktop device online. Hosted execution is not included in the credits-only plan.
4. **Public beta:** build and smoke-test each supported installer on its native OS; publish via the website download route and object storage with HTTPS/checksums; show unsigned installer warnings; verify first install, upgrade, update, and recovery. Windows preview builds use the SHA-512-backed generic updater; unsigned macOS/Linux builds remain manual. Label the release preview/beta while free Render hosting can sleep.

## Verification record

### 2026-11-17 current source and private Windows preview

- Codic desktop tests passed: 19 files / 57 tests; TypeScript check and production renderer/main/preload build passed.
- Backend tests passed: 136 / 136. Frontend tests passed: 281 / 281; frontend lint and production build passed. All three product dependency audits reported zero production vulnerabilities. The web build still warns about pre-existing large chunks, including DocumentArtifact, elk, KaliKal, and syntax highlighting.
- The 3D companion uses a procedural Three.js model and actual runtime activity. WebGL failure falls back to CSS art; a lazy entry-load failure now renders a Hide Codi recovery screen; stale activity snapshots cannot overwrite a later event. UI tests cover the fallback, activity, draft placement, and controls.
- Public status now labels provider model-catalog checks as unverified for completions, no longer generates fake uptime/SLA/incident history, and gates key-pool details behind an admin website session.
- Built and installed the unsigned 0.1.12 Windows x64 preview privately at `C:\Users\pc\AppData\Local\Programs\Codic\Codic.exe`. The installer is `C:\Users\pc\AppData\Local\Temp\codic-0.1.12-preview-build2\Codic Setup 0.1.12.exe` (128,947,873 bytes; SHA-256 `61456ad051ecc7ebef3b47c4dc5dc0a7bac866be4e1cae45ab4c3ed631080357`). The package's `latest.yml` size and SHA-512 match the installer. The installed process launched and reported version 0.1.12. This is not a public release and does not support automatic self-update because the build is unsigned.
- The updater 404 in the 0.1.9 screenshot is expected while no verified public artifact is published. The current client checks the release catalog first; the old 0.1.9 binary predates this guard. The screenshot's generic model-service failure was not validated against live provider credentials in this pass.
- The download API now supports Windows, macOS universal DMG, and Linux x64 AppImage catalog entries and exact-platform redirects. Each stays unavailable until version/hash metadata and a reachable safe HTTPS URL are configured; API reachability checks do not independently verify hashes against artifact bytes. The Windows update manifest remains a separate SHA-512 and publisher-validated path.
- No packaged pixel-level screenshot review was completed in this pass. The earlier companion window was exposed in the native app's accessibility tree, but its transparent surface was captured black by the desktop screenshot path.

Latest local checks in this workspace:

- Desktop TypeScript typecheck passed.
- Desktop Vitest suite passed: 5 files / 16 tests, including recurring schedule claims and thread organization.
- Latest Electron/Vite build and unsigned Windows x64 NSIS packaging passed with the bundled Homebridge PTY prebuilds and native rebuild disabled. The local installer is `codic/desktop/release/Codic Setup 0.1.0.exe` (126,987,311 bytes), SHA-256 `819e455f6104ae0e30954bd81f877493c150abd560e3e19364a2eebc45a4eadd`; `latest.yml` contains SHA-512 `Jl1muJfwngnrSHGqvY6NhN5e0Gtaiw7y7XI5WqQjdxnlN92zkB9LPaGhlwwAUVZ2mSSnx12+Rci9OBH5luXiQg==` and the matching size. The packaged `app-update.yml` points to the Codeva update feed. The sandboxed preload is emitted as CommonJS because Electron executes sandboxed preload scripts as CommonJS.
- Windows packaged-app smoke check opened the repository, ran `Get-Location | Select-Object -ExpandProperty Path` from the selected workspace and showed the expected path with exit code 0, and loaded the Git review panel.
- Desktop terminal regression test checks bounded one-shot command execution. The interactive PTY prebuild was manually smoke-checked with PowerShell input/output and clean exit on Windows; native macOS/Linux PTY behavior remains unverified.
- CyberCoder `@cybermind/codic-runtime` and `@cybermind/core` TypeScript checks passed.
- CyberCoder Codeva provider tests passed: 3 tests.
- Backend Codic route tests passed: 10 tests with mocked account, usage, and provider modules, including encrypted one-use auth handoff.
- Frontend auth-flow and Codic Coming Soon tests passed: 7 tests. Frontend production build and Codic desktop Electron/Vite build plus TypeScript check passed.
- Full desktop dependency audit (`npm audit`) reported zero vulnerabilities after pinning the packaging toolchain’s `minimatch` dependency to patched `11.0.8`; Windows NSIS packaging passed with that override.
- The packaged Windows build opened into a clean first-run workspace and showed the Codeva website handoff flow. The sign-in button is disabled because this smoke build has no `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`; live Google sign-in and provider generation remain unverified. Windows installer install/upgrade, macOS/Linux builds, R2 upload, and public release have not been verified.
- The current Codic release flag defaults off. The website download page reads the live catalog; it shows no installer until a release owner publishes metadata and enables the public release. The public installer and updater routes remain unavailable until then. The compact menus are build-checked but were not freshly screenshot-verified in this run.
- 2026-11-13 follow-up: Codic 0.1.4 now has searchable project switching in both composer states, a 336 px viewport-clamped searchable model picker, and persisted Full access wired through renderer → IPC → runtime. PowerShell command execution in the local runtime was corrected. Desktop tests passed (9 files / 29 tests), CyberCoder self-check passed, backend suite passed (129 tests), and Electron/Vite build/typecheck passed.
- Live checks: Supabase Auth health via the configured public client returned HTTP 200; Codeva production `/health` returned HTTP 200; production `/api/v1/auth/health` returned `ready: true`. Production `/api/v1/codic/models` returned HTTP 404, so Codic's backend routes are not yet deployed. Google callback and user-authenticated model streaming remain unverified.
- Built a private, auth-gated unsigned Windows x64 0.1.4 installer outside the repository at `D:\codic-auth-release-0.1.4\Codic Setup 0.1.4.exe` (127,009,329 bytes; SHA-256 `6ad33dd0b799b4a4fa9bfcf65e9ff78f42b2817037f0e478803105798f2d72a1`). `latest.yml` SHA-512 and size match. It has not been uploaded or published.
- 2026-11-13 follow-up: signed-in website callbacks now construct a validated one-use Codic protocol link, display an “Open Codic” retry if the browser blocks automatic app launch, and explain when the deployed backend handoff route is unavailable. Incoming callbacks are sent only to one primary window; the signed-out Codic page has minimize/maximize/restore/close controls, and Windows BrowserWindows use the packaged Codic icon. Full Codic tests passed (10 files / 32 tests), frontend tests passed (20 files / 277 tests), backend tests passed (129 tests), and Electron/Vite build/typecheck passed. Live production checks still return 404 for both Codic model and handoff routes.
- Built a private, auth-gated unsigned Windows x64 0.1.5 installer outside the repository at `D:\codic-auth-release-0.1.5\Codic Setup 0.1.5.exe` (127,009,819 bytes; SHA-256 `c041674c979673499e8c94b737e238764470dedc03fca767d524ec3bce2156d4`). `latest.yml` SHA-512 and size match; the packaged icon hash matches the generated Codic C-and-signal icon. It has not been uploaded or published.

## Required private deployment configuration

Use local ignored `.env` files and the deployment secret stores. Never paste keys into chat or source control.

- Desktop build: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional `CODEVA_API_BASE_URL`.
- Backend: existing Supabase service configuration and model gateway/provider credentials. Optionally set `CODEVA_CODIC_HANDOFF_KEY` to a private, canonical base64 encoding of 32 random bytes; otherwise the handoff key is derived from the private Supabase service secret.
- Production backend: configure these in Render. The frontend website and download page are separate and still need Codic release assets and a public version/checksum manifest.

The previously shared GitHub classic token was exposed in conversation. Revoke it in GitHub before any push; do not use that token. A replacement should be held in protected GitHub secrets or a private local credential store.
