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

The current package targets unsigned Windows x64 NSIS, macOS universal DMG/ZIP, and Linux x64 AppImage/DEB. Build each target on its supported host before publication. macOS and Windows unsigned-installer warnings are expected. Codic does not bypass quarantine or SmartScreen.

## Current preview boundary

Implemented: Codeva email/password and Google sign-in entry points; secure local session storage; account/model/quota sync; project and task history stored in local SQLite; local agent runs using CyberCoder’s core/tools; streaming status; explicit approvals for model-requested shell commands; cancel; checkpoints and restore; Git diff review and local line comments; bounded project terminal commands; system/light/dark appearance.

Not implemented yet: automatic continuation of an interrupted model run; live PTY terminals; real Git worktrees or parallel agents; skills/MCP; pull-request review; embedded browser; SSH; computer use; scheduled automations; remote companion; download manifest, checksum distribution, or update notifications. Those features remain release roadmap items. Search is marked as preview in the UI.

Live sign-in, model-provider, quota, and account/device revocation checks require a reachable Supabase project and working Codeva backend/provider configuration. The currently configured Supabase host was reported as returning `DNS_PROBE_FINISHED_NXDOMAIN`; local unit tests and packaging do not establish that the live account or provider flow works.
