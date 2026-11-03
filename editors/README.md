# Existing Codeva editor integrations

The editor is **MrCodevaa**. The website, account and normal chat product remain **Codeva**. This directory extends the live product; it does not introduce another provider router, account database or app repository.

`code-oss/` is the existing pinned checkout: tag `1.139.0`, commit `2242ebbb54efeeb0129e08e919e7e8d43033cd83`. `BASE.txt` contains that tag. `prepare.mjs` refuses another HEAD and applies `phase3-workbench.mjs`, Prism M branding and bundled `studio-client/`. These canonical files reproduce the changes; the nested upstream checkout remains ignored. Upstream licenses and source notices remain.

The original extension remains at `cybercoder/`, restored from existing `codevaaa/cybercoder` at `f567764a0bfec3281ac5bfafe5b20a91320c94bd`. Its original frozen build/package produced VSIX `0.6.2`. The bundled participant is a separate integration with the same backend, and does not replace that extension.

## Install and rebuild

Users install the artifact without cloning or needing this source directory. Run the single canonical command on its actual OS:

```sh
node scripts/package-ide.mjs windows
node scripts/package-ide.mjs macos
node scripts/package-ide.mjs linux
```

The packaging path, signing secrets, prerequisites, download/update feed and native tests are documented in `scripts/package-ide.md`. Windows uses a per-user Inno setup with Start Menu shortcut and uninstaller. Missing certificates do not prevent an unsigned build. Windows cannot certify native Mac/Linux artifacts.

For development of the existing checkout:

```powershell
node editors/prepare.mjs
node editors/verify.mjs
Set-Location editors/code-oss
npm ci
npm run compile
.\scripts\code.bat
```

The pinned source requires Node major 24 and Windows C++/ATL/Spectre/SDK prerequisites. They are installed on this host; real compilation/package commands succeeded. Native execution remains a separate check.

## Account and backend

`codeva.apiBaseUrl` defaults to `https://cybercli-api.onrender.com/api/v1`; `codeva.webUrl` defaults to `https://cybermindcli.info`. HTTPS is required outside explicit loopback development.

**Sign in to Codeva** opens the existing website. `auth.cjs` uses a one-use loopback listener, exact website Origin and random state; the website posts credentials in a form body. Access/refresh credentials stay in OS-backed SecretStorage. `session.cjs` refreshes through `/auth/ide-refresh` and protects sign-out/account-switch races. There is no provider-key login or manual JWT-paste input. This changed website callback and refresh route require deployment to the existing hosts before production login is certified.

The sidebar uses `/ide/me`, curated `/agents`, and owned `/studio/projects`. Project state comes from the existing Mongo dossier API. It shows the exact original request, specification/design review, tool progress, judges, citations, diffs and checkpoint status. Private preview launches use a one-use POST; credentials never appear in browser query strings. The webview cannot make network requests directly.

Native Chat, Sessions, Markdown rendering, attachments, model selection and diff UI remain from the MIT workbench. The bundled participant uses existing `/chat` history and `/ide/complete` tool round trips. GitHub Copilot's service participant/account setup is excluded from the shipped app; legitimate Git source-control integration and upstream attribution remain. This does not claim complete Copilot feature parity.

Normal conversation stays in normal chat. `/plan` creates a dossier; `/build` and `/fix` invoke project APIs; `/review` opens changes; `/checkpoint` restores the API's last-green state. Inline edit requires an owned project and human review. Local Tab uses only `/studio/tab`, with a 100ms deadline and no cloud-chat fallback.

Account/preferences controls are in the title bar. Style, Hindi/English/automatic language and curated persona settings persist through native configuration and are interpreted by the existing backend. **Explain Selected Terminal Output** opens a reviewable native chat draft containing only the bounded selected excerpt. It refuses credentials and does not execute terminal commands.

## Checks and boundaries

```powershell
node --test editors/studio-client/*.test.cjs
node editors/verify.mjs
node scripts/ide/verify-installed-ide.mjs
node scripts/ide/verify-native-chat.mjs
```

Native checks launch the installed executable with an isolated signed-out profile and assert its release ID matches the current artifact. They exercise actual title-bar controls, preferences persistence, About/branding and the bundled account-required chat response. They do not certify production login or generated-project success.

Evidence and unfinished gates are recorded in `docs/installer-acceptance.md`, `docs/phase-6-9-acceptance.md` and `docs/mrcodevaa-workbench.md`. A blocked model/build stays blocked; fixture verdicts do not substitute for real acceptance.
