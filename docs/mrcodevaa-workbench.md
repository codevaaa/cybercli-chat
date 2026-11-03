# MrCodevaa workbench and account flow

This is the existing `editors/code-oss` fork, pinned to `1.139.0` / `2242ebbb54efeeb0129e08e919e7e8d43033cd83`. `editors/prepare.mjs` and `editors/phase3-workbench.mjs` apply the canonical overlay. Rebuild using the same commands in `scripts/package-ide.md`; there is no second editor or packaging path.

The native Welcome, Chat, Sessions, Markdown rendering, context attachments, model picker and diff editor are reused from the upstream MIT code. The upstream Copilot source also has an MIT license. Its GitHub service/account participant is not shipped or activated in MrCodevaa. Its source and notices remain in the pinned checkout. The bundled `codeva.codeva-studio` participant uses the existing Codeva API. This is a Codeva integration, not a relabelled GitHub subscription or claim of equivalent capabilities.

## Controls and real operations

| Control | Existing module it calls |
| --- | --- |
| Welcome Start/Recent/Open/Clone | Native workbench, with Codeva sign-in and chat actions added. |
| Open MrCodevaa Projects | `codeva.openAgents` lists owned `/studio/projects`; no vendor Agents window or second runtime. |
| Codeva Account in the title bar | Opens the sidebar account card. Sign-in opens the existing website; sign-out clears SecretStorage. |
| MrCodevaa Preferences in the title bar | Opens the sidebar preferences. Editor settings still opens the native configuration editor. Navigation stays in the activity bar; account/preferences move to the title bar. |
| Normal native chat | `/chat` and `/chat/:id/messages`; Mongo remains authoritative for history. Response formatting uses native Markdown rendering. |
| Response style, language, persona | Closed preference enums in `backend/src/services/chat/assistantPreferences.js`; curated server personas from `/agents`. No arbitrary client-authored system instructions. |
| `/plan` | Creates a dossier with the original request and opens its specification. Human specification/design acceptance remains required. |
| `/build`, `/fix` | Existing dossier run/fix APIs and their real tests/reviews. A blocked task stays blocked. |
| Edit Selection, `/review` | Existing dossier inline/diff APIs; accepting/rejecting calls the server. |
| Checkpoint | Existing rollback restores generated files, SQLite and preview together. |
| Explain Selected Terminal Output | Sends only an explicitly selected, bounded, credential-checked terminal excerpt into a native chat draft. The user reviews and submits it. The existing chat backend diagnoses the output and suggests next steps; the extension does not run commands or upload an entire terminal transcript. |
| Local Tab | Only `/studio/tab`, with a 100ms deadline and no chat-provider fallback. |

The native model adapter forwards structured tools to `/ide/complete`; it does not execute arbitrary local tools itself. Builds/tools remain owned by the dossier runtime. The default API setting is `https://cybercli-api.onrender.com/api/v1`. The website/account/chat product is still Codeva; the editor/assistant name is MrCodevaa.

## Website sign-in and refresh

`editors/studio-client/auth.cjs` creates a one-use loopback callback and random state. The editor opens `https://cybermindcli.info/auth/login?redirect=ide&port=...&state=...`. Account credentials never appear in this URL. Existing login, Google OAuth, signup, verification and magic-link callback pages preserve the state through `frontend/src/lib/editorAuth.js`.

After the existing website authenticates the account, it posts the access/refresh session in a hidden form body to the waiting loopback listener. The listener validates the exact website Origin, state, body bounds and existing `/auth/check-user` account before saving anything. `session.cjs` keeps the bundle in OS-backed SecretStorage. Expiration uses the rate-limited `/auth/ide-refresh` route and an isolated Supabase client; sign-out/account-switch races cannot restore a stale refreshed session.

The changed website callback and refresh route require deployment to their existing hosts before this new installed-editor login works against production. No production deployment or real production-account login is certified by local tests. There is no manual JWT-paste login in the new client.

## Validation boundaries

`scripts/ide/verify-native-chat.mjs` exercises the installed executable with a fresh signed-out profile: Welcome, native Chat, the real bundled participant, account-required response, project branding and absence of Copilot activation. It does not impersonate a signed-in production account. `verify-installed-ide.mjs` checks the installed executable, title, About, palette and sidebar without an extension development host.

The optional-mode conversion in `extHostTypeConverters.ts` supplies an empty tool-reference array when the native request omits it. This fixes the actual `variables is not iterable` error before the participant is called. Real installed-editor checks passed for final release `74f4efdc3d338b33f5b6df0482ce76ad8059858a`: visible Chat Prism M dimensions, the bundled participant, title-bar account/preferences, style/language persistence and an actual selected PowerShell excerpt opening as a chat draft. The terminal hint also points to that working Codeva action, rather than inserting a Copilot CLI command. The installed release ID matches the rebuilt artifact.

Full project generation with two actual model reviews is a separate gate. Free APINEX functional checks do not certify the paid/frontier requirement, the clean Windows user gate or Mac/Linux installers. See `docs/phase-6-9-acceptance.md`.

Backend regressions: 99 tests passed. New auth/provider/preference/stream-lifetime scope: 100% lines, 94.74% branches, 100% functions. Bundled auth/chat/session/terminal helper scope: 100% lines, 86.67% branches, 85.45% functions across 17 client tests. These are scoped coverage results, not coverage of the entire upstream editor.
