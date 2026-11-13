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

The Windows updater checks at launch and can be checked from **Help → Check for updates** or **Settings → Updates**. Available updates download in the background, show progress, verify the electron-builder SHA-512, and wait for the user to restart before installation. Temporary network and Render cold-start failures retry after 30, 60, and 120 seconds; a missing release feed is shown as “No update has been published” and does not keep retrying. The UI reads its version from Electron at runtime.

The updater only becomes live after a Windows x64 installer is uploaded to HTTPS storage and the backend is configured with matching `CODEVA_CODIC_WINDOWS_FILENAME`, `CODEVA_CODIC_WINDOWS_VERSION`, `CODEVA_CODIC_WINDOWS_SHA256`, `CODEVA_CODIC_WINDOWS_SHA512`, `CODEVA_CODIC_WINDOWS_SIZE`, and `CODEVA_CODIC_WINDOWS_URL` (or the supported R2 settings), with `CODEVA_CODIC_PUBLIC_RELEASE=true`. The same flag also exposes the installer on the public downloads API. Keep it `false` until the release is approved for users. The unsigned Windows preview has no publisher-signature verification; electron-updater checks the SHA-512 from the HTTPS feed. The website uses SHA-256 for a separate user-visible check.

Codic 0.1.7 has been packaged locally for Windows x64 and its generated `latest.yml` SHA-512/size were checked against the installer. That installer has not been uploaded or advertised; the release flag remains closed until publication is explicitly approved.

On 2026-11-13, commit `bb2f30f` was pushed to `main`, and the production website and API deployments updated. The live website bundle now contains the Codic callback and handoff client. The API returns HTTP 401 for unauthenticated `/api/v1/codic/models` and `/api/v1/codic/auth-handoffs` requests, and HTTP 400 for a malformed `/api/v1/codic/auth-handoffs/redeem` request, confirming these routes are deployed. This verifies route availability, not an account-backed Google OAuth round trip. Complete that final check by signing in from the desktop and confirming the app reopens; the website callback offers an “Open Codic” retry if the browser blocks the custom protocol. The callback carries only a short-lived opaque ticket, never raw session tokens.

The local 0.1.3 Windows preview used `VITE_CODIC_ALLOW_LOCAL_PREVIEW=true`; that bypass is not enabled in the installed 0.1.6 build or this 0.1.7 source. The private Windows build includes public Supabase client configuration from the ignored local `.env` and keeps the signed-out screen as a hard gate. Keep installers private until an account-backed website-to-desktop sign-in and model request have been exercised.

Action approvals default to “Ask for approval.” “Approve for me” auto-allows only the exact read-only shell command allowlist. “Full access” is an explicit opt-in that lets the local agent run shell commands and access paths outside the selected project; out-of-project edits still receive checkpoints, but they are not included in the selected project’s Git diff view.
