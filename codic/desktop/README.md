# Codic desktop preview

Codic is a separate Electron desktop workbench. Repository files stay on the selected computer; only conversation context and the specific tool results needed for the model response are sent to the Codeva API.

## Develop

Use Node.js 24 and npm. The runtime imports the sibling `cybercoder/` package, so keep the repository layout intact.

The root repository records the CyberCoder runtime as a separate Git submodule. After cloning, run `git submodule update --init --recursive` from the root before installing Codic dependencies.

1. Copy `.env.example` to `.env` and set the public Supabase URL and publishable/anonymous key for the Codeva project.
2. In the Supabase URL configuration, allow `codic://auth/callback` as a redirect URL. Configure Google as a Supabase auth provider and set its provider callback to the Supabase `/auth/v1/callback` URL.
3. Start the preview:

   ```powershell
   npm install
   npm run dev
   ```

The backend defaults to the Codeva Render API. Set `CODEVA_API_BASE_URL` when using another deployment. This value is read by Electron’s main process and is not exposed to the renderer.

## Verify and package

```powershell
npm run typecheck
npm test
npm run build
npm run dist:win
```

The Windows packaging command writes a SHA-256 sidecar beside the installer after electron-builder has finished. `latest.yml` contains the electron-updater SHA-512 and installer size.

The current package targets unsigned Windows x64 NSIS, macOS universal DMG/ZIP, and Linux x64 AppImage/DEB. Build each target on its supported host before publication. macOS and Windows unsigned-installer warnings are expected. Codic does not bypass quarantine or SmartScreen.

## Current preview boundary

Implemented: Codeva website sign-in/signup handoff with a one-use PKCE ticket; secure local session storage; account/model/quota sync; project and task history stored in local SQLite; local agent runs using CyberCoder’s core/tools; streaming status; bounded parallel read-only research, planning, and code-review helpers; helper cancellation; per-helper model, status, duration, tool-call, and token-usage activity; explicit approvals for model-requested shell commands; cancel; checkpoints and restore; Git diff review and local line comments; persistent project-rooted terminal tabs with interactive input and resize, using the MIT-licensed Homebridge prebuilt node-pty package; system/light/dark appearance; task rename/pin/fork/side-chat/archive/restore; transcript copy and Markdown export; separate task windows; profile activity stats; local one-time/daily/weekly schedules.

The prompt composer `+` menu can attach selected text files or a folder. Attachments stay in main-process memory under per-window IDs until the next prompt is submitted; the file contents are not sent when selected. Codic excludes credentials by filename, binary/unsupported files, generated folders and symlinks, and caps the selection at eight files and 140 KB total. Remove an attachment chip to discard it before sending.

Codic now requires a valid Codeva session before exposing or operating on projects. A signed-out window stays on the full-screen sign-in view; it cannot enter a local-only mode. The Electron main process independently checks the stored session for project, history, browser, terminal, review, checkpoint, schedule, and agent IPC calls. Signing out cancels active agent runs, closes live terminal sessions, clears project state from every open window, and returns each window to sign-in.

File → New Window opens a fresh window with no project selected. It can list saved projects after sign-in, but it does not silently select the first folder. Task windows still restore only the project and thread explicitly requested. The close handler snapshots each window’s WebContents before destruction so cleanup does not read `window.webContents` after Electron has destroyed the native window.

Implemented preview menus include File, Edit, View, and Help actions for projects, task history, navigation panes, browser tools, terminal, zoom, troubleshooting, diagnostics, performance traces, and update settings. Windows x64 packaged builds check the Codeva generic update feed at launch, validate the downloaded installer against the feed's SHA-512, show download progress, and wait for the user to restart before installing. The website download page displays the published SHA-256 for manual verification. Unsigned macOS and Linux builds use manual downloads; they do not silently bypass Gatekeeper or quarantine.

Not implemented yet: automatic continuation of an interrupted model run; write-capable parallel agents and real Git worktree isolation; user-installed skills/MCP; pull-request review; SSH; computer use; remote companion; and public share links. Helper agents currently run only the built-in read-only research, planning, and code-review skills; they share the parent’s selected model and reasoning effort, use the normal Codeva API/quota, and can be stopped independently. The parent remains the only writer until isolated Git worktrees are implemented. Local schedules run only while Codic is open, require the selected project to remain available, and open a task window when due. They use the normal Codeva model service and ask before risky actions. Search is marked as preview in the UI.

The Windows updater checks at launch and can be checked from **Help → Check for updates** or **Settings → Updates**. It first reads the release catalog, so a missing `latest.yml` is reported as “No update has been published” without showing the raw HTTP error. Before downloading, Codic requires a configured Windows publisher in `app-update.yml`; Electron Updater's Authenticode verification remains enabled, and the feed's SHA-512 is checked as an additional integrity measure. Unsigned previews with no publisher identity show that automatic updates are disabled and link users to the official downloads page. Temporary network and Render cold-start failures retry after 30, 60, and 120 seconds. The UI reads its version from Electron at runtime.

The updater only becomes live after a signed Windows x64 installer is uploaded to HTTPS storage and the backend is configured with matching `CODEVA_CODIC_WINDOWS_FILENAME`, `CODEVA_CODIC_WINDOWS_VERSION`, `CODEVA_CODIC_WINDOWS_SHA256`, `CODEVA_CODIC_WINDOWS_SHA512`, `CODEVA_CODIC_WINDOWS_SIZE`, and `CODEVA_CODIC_WINDOWS_URL` (or the supported R2 settings), with `CODEVA_CODIC_PUBLIC_RELEASE=true`. The same flag also exposes the installer on the public downloads API. Keep it `false` until the release is approved for users. Codic must be packaged with the matching publisher identity so the update client can reject a different or unsigned signer. The website uses SHA-256 for a separate user-visible check.

The Windows 0.1.7 preview was packaged locally and its generated `latest.yml` SHA-512/size were checked against the installer. Codic 0.1.12 is now installed as a private unsigned Windows preview; its installer has no public catalog entry. It cannot self-update until a signed build with a trusted publisher is uploaded and the release metadata is configured.

On 2026-11-13, commit `bb2f30f` was pushed to `main`, and the production website and API deployments updated. The live website bundle now contains the Codic callback and handoff client. The API returns HTTP 401 for unauthenticated `/api/v1/codic/models` and `/api/v1/codic/auth-handoffs` requests, and HTTP 400 for a malformed `/api/v1/codic/auth-handoffs/redeem` request, confirming these routes are deployed. This verifies route availability, not an account-backed Google OAuth round trip. Complete that final check by signing in from the desktop and confirming the app reopens; the website callback offers an “Open Codic” retry if the browser blocks the custom protocol. The callback carries only a short-lived opaque ticket, never raw session tokens.

The local 0.1.3 Windows preview used `VITE_CODIC_ALLOW_LOCAL_PREVIEW=true`; that bypass is not enabled in the installed 0.1.6 build or this 0.1.7 source. The private Windows build includes public Supabase client configuration from the ignored local `.env` and keeps the signed-out screen as a hard gate. Keep installers private until an account-backed website-to-desktop sign-in and model request have been exercised.

Action approvals default to “Ask for approval.” “Approve for me” auto-allows only the exact read-only shell command allowlist. “Full access” is an explicit opt-in that lets the local agent run shell commands and access paths outside the selected project; out-of-project edits still receive checkpoints, but they are not included in the selected project’s Git diff view.

## Version 1 release gates

Keep the public release flag closed until each platform has its proper publisher signature and packaging metadata, the website-to-desktop sign-in and one real model request have been completed with a test account, and updates have been exercised from a signed older build to a signed newer build. Verify that a mismatched signer and an unsigned update are rejected.

Before launch, run the desktop, backend, frontend, and browser-extension checks from a clean clone with the pinned CyberCoder submodule. Confirm the Mongo-backed plan limiter on the deployed database, model-provider failure handling with production-like credentials, and recovery after an interrupted model run. Review project-scoped file access, approval prompts, terminal lifetime, session expiry, and local data deletion on every supported operating system.

The opt-in desktop companion is an early local MVP: it is draggable, animated, can focus Codic, and can place an unsent draft in the composer. It does not speak, inspect the screen or workspace, automate OS actions, or create skills. User-installed skills/MCP, write-capable isolated helper worktrees inside Codic, pull-request review, SSH, computer use, remote task steering, and public share links remain separate product milestones. Do not describe those capabilities as shipped until their implementations and acceptance checks are complete.
