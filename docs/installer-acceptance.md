# Codeva same-phase installer acceptance

**NOT DONE.** This ledger records executed evidence; source, fixture or CI configuration cannot replace a native acceptance test. No push, deployment, workflow dispatch or release publication has occurred.

| # | Acceptance | Result | Executed evidence and remaining boundary |
| --- | --- | --- | --- |
| 24 | Clean Windows user installs setup.exe, Start Menu opens the branded IDE, uninstall removes it. | FAIL | Actual current-user setup, Start Menu launch, icon, installed workbench and uninstall have passed on this host. Its existing Windows account is not a clean-user VM; that full boundary remains unverified. |
| 25 | Installed IDE opens a phase-1 project and shows prompt_original without the source folder. | FAIL | Installer bundles the existing API sidebar with production API default. Native authenticated existing-account project open has not executed. Unit/API doubles are not used to certify this gate. |
| 26 | Existing Download page links all three OS artifacts and logged-out visitor downloads Windows setup. | FAIL | Actual Windows setup bytes/hash served anonymously by the existing local download routes; feed returns the same artifact and 204 for current release. Mac/Linux builds and production publication remain absent. |
| 27 | Re-running the Windows command produces a new setup.exe without manual copy. | PASS | Multiple canonical `node scripts/package-ide.mjs windows` builds succeeded, with new release IDs, real setup bytes, hashes and automatically written manifests. No manual artifact copy. |

Release source: `scripts/package-ide.mjs`; repeatable OS commands and missing signing secrets: [scripts/package-ide.md](../scripts/package-ide.md). Exact base: `1.139.0` / `2242ebbb54efeeb0129e08e919e7e8d43033cd83`. Editor name: **MrCodevaa**; existing Codeva chat desktop and CyberCoder extension remain intact.

## Executed local checks

- Backend: the full regression suite and separate real-provider checks are recorded in `artifacts/codeva-editor/backend-final-tests.log` and `apinex-tests.json`. The latest IDE streaming test exercises disconnect cancellation, a single DONE frame and sanitized errors.
- Frontend: **255 tests passed**; Vite production build passed with existing large-chunk/dynamic-import warnings.
- Bundled client: **17 tests passed**, including loopback account Origin/state, refresh races, terminal excerpt boundaries, native chat/tool routing, webview readiness and preferences. Helper MZ fixtures remain explicitly non-installable. Release/feed scope has 100% lines / 94.37% branches; download UI has 95.83% statements / 100% lines.
- Original CyberCoder extension: frozen pnpm install, original build and original VSCE package succeeded, producing `cybercoder/packages/vscode-extension/cybercoder.vsix` **0.6.2**.
- Real Ollama model `qwen2.5-coder:0.5b` installed/warmed; unchanged 100ms tab policy returned an empty timed-out completion. No chat-provider fallback was used.
- Docker Desktop/WSL now runs real containers. `live-sandbox.json`, `isolated-account.json` and `on-prem.json` record real Docker/browser/Mongo/GoTrue checks with explicit fixture scope. Paid generated-project/native production-login gates remain incomplete. No automatic host reboot.

Native Mac and Linux builds must run the same script on their OS. `.github/workflows/package-codeva-editor.yml` configures those native runners but has not been executed. Their absence is not masked with renamed Windows files or old chat-desktop downloads.

The installer remembers a previous custom installation directory. Native checks assert installed `product.commit` equals current `release-win32.json`; set `CODEVA_EDITOR_INSTALL_DIR` when checking a custom path. This prevents an older normal installation from being mistaken for the rebuilt smoke installation.

Latest executed Windows release: `1.139.0-codeva.1791045318031`, release ID `74f4efdc3d338b33f5b6df0482ce76ad8059858a`, 234,958,369 bytes. SHA-256: `6851101703c81d6962da27bc8e6f045e0b87703aa90f2f39c66802d5eca2b47c`. The actual setup installed successfully and both installed-workbench checks passed against that exact release, including visible Chat Prism M dimensions, title-bar preferences persistence and actual terminal selection. Public local download/feed checks served the same bytes/hash. Build, install and UI logs are `build-eleventh.log`, `install-eleventh.log`, `installed-eleventh.log`, `native-chat-eleventh.log` under `artifacts/codeva-editor`. This build is unsigned because the Windows signing certificate secret is absent.
