# Codic desktop preview

Codic is a separate Electron desktop workbench. Repository files stay on the selected computer; only conversation context and the specific tool results needed for the model response are sent to the Codeva API.

## Develop

Use Node.js 24 and npm. The runtime imports the sibling `cybercoder/` package, so keep the repository layout intact.

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

Implemented: Codeva website sign-in/signup handoff with a one-use PKCE ticket; secure local session storage; account/model/quota sync; project and task history stored in local SQLite; local agent runs using CyberCoder’s core/tools; streaming status; explicit approvals for model-requested shell commands; cancel; checkpoints and restore; Git diff review and local line comments; persistent project-rooted terminal tabs with interactive input and resize, using the MIT-licensed Homebridge prebuilt node-pty package; system/light/dark appearance; task rename/pin/fork/side-chat/archive/restore; transcript copy and Markdown export; separate task windows; profile activity stats; local one-time/daily/weekly schedules.

Codic now requires a valid Codeva session before exposing or operating on projects. A signed-out window stays on the full-screen sign-in view; it cannot enter a local-only mode. The Electron main process independently checks the stored session for project, history, browser, terminal, review, checkpoint, schedule, and agent IPC calls. Signing out cancels active agent runs, closes live terminal sessions, clears project state from every open window, and returns each window to sign-in.

File → New Window opens a fresh window with no project selected. It can list saved projects after sign-in, but it does not silently select the first folder. Task windows still restore only the project and thread explicitly requested. The close handler snapshots each window’s WebContents before destruction so cleanup does not read `window.webContents` after Electron has destroyed the native window.

Implemented preview menus include File, Edit, View, and Help actions for projects, task history, navigation panes, browser tools, terminal, zoom, troubleshooting, diagnostics, performance traces, and update settings. Windows x64 packaged builds check the Codeva generic update feed at launch, validate the downloaded installer against the feed's SHA-512, show download progress, and wait for the user to restart before installing. The website download page displays the published SHA-256 for manual verification. Unsigned macOS and Linux builds use manual downloads; they do not silently bypass Gatekeeper or quarantine.

Not implemented yet: automatic continuation of an interrupted model run; real Git worktrees or parallel sub-agents; skills/MCP; pull-request review; SSH; computer use; remote companion; and public share links. Local schedules run only while Codic is open, require the selected project to remain available, and open a task window when due. They use the normal Codeva model service and ask before risky actions. Search is marked as preview in the UI.

The release UI and update code are implemented, but they are not live until a Windows installer is uploaded to HTTPS storage and the backend deployment is configured with `CODEVA_CODIC_WINDOWS_FILENAME`, `CODEVA_CODIC_WINDOWS_VERSION`, `CODEVA_CODIC_WINDOWS_SHA256`, `CODEVA_CODIC_WINDOWS_SHA512`, `CODEVA_CODIC_WINDOWS_SIZE`, and `CODEVA_CODIC_WINDOWS_URL` (or the supported R2 settings). The API advertises an update only when it can reach the installer and both checksums are valid. The unsigned Windows preview has no publisher-signature verification; electron-updater checks the SHA-512 from the HTTPS feed. The download page uses SHA-256 for a separate user-visible check.

The current local Supabase Auth health check returns HTTP 200, and the Codeva production API and its public auth-readiness endpoint return HTTP 200/ready. Live checks on 2026-11-13 confirmed that production returns HTTP 404 for both `/api/v1/codic/models` and `/api/v1/codic/auth-handoffs/redeem`, so its deployed version does not yet include the Codic API routes from this checkout. Website-to-desktop sign-in and model access cannot finish until the backend is deployed and those routes are rechecked. The website callback now shows an “Open Codic” retry if the browser blocks custom-protocol navigation; its opaque ticket never carries raw session tokens.

The local 0.1.3 Windows preview used `VITE_CODIC_ALLOW_LOCAL_PREVIEW=true`; that bypass is not enabled in the 0.1.5 build. The current private Windows build includes the public Supabase client configuration from the ignored local `.env` and keeps the signed-out screen as a hard gate. Do not publish it until the deployed backend has the Codic routes and the full website-to-desktop sign-in and model flow have been exercised.

Action approvals default to “Ask for approval.” “Approve for me” auto-allows only the exact read-only shell command allowlist. “Full access” is an explicit opt-in that lets the local agent run shell commands and access paths outside the selected project; out-of-project edits still receive checkpoints, but they are not included in the selected project’s Git diff view.
