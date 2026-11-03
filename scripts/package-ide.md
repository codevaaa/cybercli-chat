# Package the MrCodevaa editor

This is the release path for the fork at `D:\gptulternative\gptulternative\editors\code-oss`, based on **1.139.0**, commit `2242ebbb54efeeb0129e08e919e7e8d43033cd83`. Users download an installer; they do not clone source. Later phases rebuild these same commands and filenames. The existing chat desktop and CyberCoder VS Code extension remain separate existing integrations.

The editor product name is **MrCodevaa**, read from `product.json`. Its application name, profile folder, mutex and `mrcodevaa://` URI are distinct from the existing Codeva chat desktop's `codeva://` callback. It uses the existing Codeva account and API.

## One release command per OS

Run from the root of this existing product checkout. The command creates the pinned checkout when absent, applies the canonical overlay, verifies its base, installs the locked build dependencies, builds the actual upstream workbench, packages it and writes the release manifest automatically.

```powershell
# Windows x64, using VS 2022 Build Tools with C++, ATL, Spectre libs and Windows SDK
node scripts/package-ide.mjs windows
```

```sh
# macOS, with Xcode command-line tools and native build prerequisites
node scripts/package-ide.mjs macos
```

```sh
# Debian/Ubuntu Linux x64, with native C++/GTK/libsecret/libkrb5/FUSE prerequisites
node scripts/package-ide.mjs linux
```

Node major 24 at **24.18.0 or newer**, Python and Git/LFS are prerequisites. The pinned upstream `.npmrc` supplies its Electron version; this command does not upgrade the VS Code tag or substitute a Microsoft binary. Linux build prerequisites are recorded in `.github/workflows/package-codeva-editor.yml`; macOS builds x64 and arm64 and uses the pinned upstream universal-app merger. Cross-OS packaging is refused rather than mislabelling a Windows binary as a Mac/Linux app.

All outputs go to `artifacts/codeva-editor/`:

| OS | User-facing artifact | Packaging |
| --- | --- | --- |
| Windows | `MrCodevaa-win-x64-setup.exe` | Upstream Inno Setup **user** target; current-user installation, Start Menu shortcut, uninstaller. |
| macOS | `MrCodevaa-mac-universal.dmg` | The actual universal upstream app packaged into a DMG, with an Applications shortcut. |
| Linux | `MrCodevaa-linux-x64.deb` | The actual upstream Linux app packaged as Debian. |
| Linux | `MrCodevaa-linux-x64.AppImage` | The same upstream Linux app packaged as type-2 AppImage. |

The script copies/renames generated installer outputs itself. No manual copy is part of a release. Each OS writes `release-<win32|darwin|linux>.json` only after required artifacts exist, match native package signatures and have SHA256/SHA1 computed from their actual bytes. Missing artifacts remain unavailable in the API and Download page. A previous failed build cannot create a successful new manifest.

`CODEVA_IDE_BUILD_NUMBER` optionally sets an integer release revision. Without it, the command uses its invocation timestamp. Use the same value across the three OS runners. `1.139.0-codeva.<revision>` identifies a Codeva rebuild; the underlying Git base remains the pinned tag. Its 40-character release identity distinguishes successive builds in the existing upstream update protocol without merging a later tag.

Preparation keeps upstream packaging. MrCodevaa bundles the Codeva API participant and excludes the GitHub service participant. Its matching vendor ripgrep-shim step is excluded because that vendor extension is not shipped; the Codeva participant/auth modules are required by the app verifier. Other builds retain the upstream vendor SDK integrity checks. Target-platform filters exclude unrelated optional native binaries. Windows 11 context-menu AppX files require actual upstream context-menu configuration. Windows packaging discovers the installed SDK's `signtool.exe`, needed even for unsigned setup. No second Codeva agent/router/store is introduced.

## First launch and credentials

The built-in Codeva project sidebar defaults to `https://cybercli-api.onrender.com/api/v1`, the existing production API, and the existing website login. `codeva.apiBaseUrl` remains a setting. For local development, explicitly set it to `http://localhost:3000/api/v1` and `codeva.webUrl` to your existing local web origin. `CODEVA_IDE_API_BASE_URL` is an explicit build-time override for development/test builds; production releases leave it unset.

Sign-in opens the existing website. The website posts a state-bound session to the editor's one-use loopback listener; tokens never enter a URL or a manual paste dialog. Account access/refresh credentials use SecretStorage and the existing API's `/auth/ide-refresh` route. The website callback/API changes must be deployed before production login is certified. The application scan rejects `.env`/certificate files and matching configured server-secret bytes in the staged app. No provider API keys belong in release jobs. This is a release-boundary check, not a universal dependency audit.

## Codeva account, chat, projects and terminal

The native Accounts “Sign In” action routes to the extension's existing cybermindcli.info login. MrCodevaa skips the default GitHub/Copilot account provider and first-run Copilot onboarding; the Codeva sidebar shows the verified account email and plan, and exposes sign-out and preferences. “Open MrCodevaa Projects” opens the same owned dossier projects from the existing Codeva API inside the current editor window.

The sidebar's chat settings choose a curated Codeva persona plus concise/balanced/detailed style and automatic/English/Hindi response language. The API maps only allowlisted values to server-authored instructions in `backend/src/routes/chat.routes.js` and `backend/src/routes/ide.routes.js`; arbitrary persona system prompts are never sent by the client. The integrated terminal context-menu action sends only the user's selected output, rejects common credential patterns or selections above 12,000 characters, and opens an unsent Ask-mode draft. It does not run terminal commands. Its proposed `terminalSelection` API is explicitly allowed for `codeva.codeva-studio` in the packaged `product.json`.

Implementation: `editors/studio-client/extension.cjs`, `chat.cjs`, `features.cjs`, `view.js`, and `view.css`; the workbench's account and Agents-window routing are patched by `editors/phase3-workbench.mjs` against the same pinned base.

## Download page and update feed use the same artifacts

The existing `/downloads` page fetches the public catalog at `/api/v1/downloads/editor` and links `/api/v1/downloads/editor/<filename>`. The existing chat-desktop endpoints and extension updater are preserved. These editor download endpoints need no account. Signing status is displayed from release metadata instead of claiming every download is signed.

`product.json.updateUrl` is `https://cybercli-api.onrender.com/api/v1/editor-updates`. The existing API serves the upstream protocol:

```text
GET /api/v1/editor-updates/api/update/<platform>/stable/<installed-release-id>
```

The feed returns 204 for the current release/unavailable platform and returns the identical Download-page URL, release identity, version, timestamp and hashes for an available different release. Windows uses the existing Inno update path with fast/background updates disabled. Linux uses the stock available-update UI. macOS retains the stock update state/UI but opens the same DMG for manual replacement: Squirrel.Mac requires ZIP, so pointing it at a DMG would fail. No second Mac ZIP installer channel is added.

Publish artifacts and their three manifests together, either in `CODEVA_IDE_RELEASE_DIR` mounted on the **existing API**, or at an immutable public HTTPS release base configured as `CODEVA_IDE_RELEASE_MANIFEST_BASE_URL`. The latter avoids storing large installers on the Render web service. `CODEVA_PUBLIC_API_URL` defaults to the existing production API and determines feed links; request Host headers do not determine them.

`.github/workflows/package-codeva-editor.yml` runs these same commands on native Windows/macOS/Linux runners, using one revision. Its manual `publish` choice publishes outputs to this existing repository's GitHub releases. After that release, point the existing backend's manifest-base setting at its `/releases/download/codeva-editor-<revision>` URL. Building a local file does not publish it to production. No workflow dispatch, Git push, release publication or production deployment has been performed by this change.

## Signing secrets

| Platform | Signing secrets | When absent |
| --- | --- | --- |
| Windows | `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD` (certificate path, HTTPS location or base64 PFX). `CSC_LINK`/`CSC_KEY_PASSWORD` are supported local alternatives. | Build the unsigned setup.exe and mark it unsigned. |
| Apple | `CSC_LINK` + `CSC_KEY_PASSWORD`, or `CSC_NAME` for an existing Developer ID Application identity. CI maps `APPLE_CSC_LINK` and `APPLE_CSC_KEY_PASSWORD` into these variables on the Mac runner only. | Build the unsigned DMG and mark it unsigned. |
| Apple notarization | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. | Certificate signing still runs; notarization is reported unavailable. |

Supplied signing credentials must work: a failed signing command fails the release instead of silently labelling it signed. Temporary certificate/keychain files are cleaned up. Windows signs the app and the upstream Inno installer/uninstaller. Mac prepackaged apps require explicit signing, so the helper signs/verifies the compiled app before DMG creation and signs/verifies the DMG afterward. Certificates are not copied into artifacts or the fork.

This workspace has no Windows or Apple signing credentials configured for the release. Unsigned installer execution may require the OS's normal publisher-confirmation flow. Certificate absence is not used to skip packaging.

## Verification and host setup

```powershell
node editors/verify.mjs
node --test scripts/package-ide.test.mjs
node --test editors/studio-client/*.test.cjs
```

After a successful Windows build, from this root on a user that has no existing MrCodevaa install:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ide/test-installed-windows.ps1
node scripts/ide/verify-release-http.mjs
```

The smoke script installs the actual current-user setup, resolves/opens the real Start Menu shortcut, checks the installed native window/About/sidebar, installs the original CyberCoder VSIX when available, then executes the actual uninstaller. It refuses to uninstall a pre-existing user installation. Evidence lives in `artifacts/codeva-editor/`, including screenshots. A new editor profile on this existing Windows account is labelled as such; it does not pretend to be a clean Windows account/VM. `-KeepInstalled` intentionally skips only the uninstall portion and records that choice. Neither script supplies fixture authentication for the paid/live phase-1 gate.

API tests exercise anonymous byte downloads, hashes/update URLs, unchanged legacy downloads, unavailable/corrupt releases and immutable remote release manifests. Their unit artifact is explicitly a fixture, not an installable app. Tests of packaging helpers do not substitute for a real setup.exe install/rebuild exercise.

VS 2022 Build Tools with Spectre/ATL/SDK, Ollama with `qwen2.5-coder:0.5b`, Docker Desktop and WSL were installed on this host. The warmed model returned no completion at the unchanged 100ms deadline. The Docker engine now works: actual migration, owner isolation, resilience, rollback and on-prem boot checks ran in real containers. These explicit fixture checks do not certify a model-generated paid project. Multiple real Windows setup builds and installed workbench checks succeeded; current logs and gate boundaries are in `docs/installer-acceptance.md` and `docs/phase-6-9-acceptance.md`.

The original separately managed extension source was recovered at `cybercoder/` from `https://github.com/codevaaa/cybercoder`, exact commit `f567764a0bfec3281ac5bfafe5b20a91320c94bd`. Its own frozen pnpm install, existing build and existing package command succeeded, producing `cybercoder/packages/vscode-extension/cybercoder.vsix` version 0.6.2. It is not replaced by the new sidebar or bundled as a second Codeva runtime. The nested existing repo remains managed separately in its pre-existing gitignored location.

The current install/live acceptance record is [docs/installer-acceptance.md](../docs/installer-acceptance.md). Any remaining FAIL means this phase is not done.
