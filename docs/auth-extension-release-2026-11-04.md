# Codeva account repair and browser workspace 1.5.0

## Root cause and scope

The Google authorization flow referenced `bqaaxqibrarewctxvlix.supabase.co`, which returned NXDOMAIN. Frontend and backend environment configuration pointed to that same project. The owner chose to restore the project. After restoration its DNS resolved and the production Google authorization request reached the Google sign-in page. A code change cannot restore a missing authentication provider project.

This release repairs the client/account lifecycle around that dependency and upgrades the browser writing workspace. It does not claim complete Grammarly/ChatGPT feature parity or universal editor compatibility.

## Integration map

| Component | Role and connection |
| --- | --- |
| React website (`frontend`) | Supabase Google/email/signup/magic links, PKCE callback, account provisioning through Express, then extension handoff with acknowledgement. Shared by the Electron app's web experience. |
| Express API (`backend`) | Verifies Supabase identity, maintains the MongoDB account registry and account gates, refreshes sessions through isolated Supabase clients, and routes writing/chat requests through the existing model gateway and plans. |
| Chrome MV3 extension (`chrome-extension`) | Accepts website handoff only from the two exact production HTTPS origins, verifies account access with the API, stores/rotates credentials, and provides chat, page context, writing review, history and capture. |
| Electron (`desktop`) | Existing native auth bridge and shared web frontend; desktop build/typecheck verified. Native protocol/browser consent remains a manual acceptance check. |
| Independent CyberCoder checkout (`cybercoder`) | Existing coding client, inspected for integration context. Clean at `f567764`, matching its GitHub main; no nested-repository change in this release. |

## Account lifecycle changes

1. Public `GET /api/v1/auth/health` checks the configured auth project's DNS and health with bounded cached requests. Login remains on the page with a useful error when the provider is unavailable.
2. Google, email signup and magic links retain validated CLI/editor/desktop/extension return context. Callback processing waits for the SDK's PKCE initialization and avoids exchanging a single-use code twice.
3. `POST /auth/sync` provisions the verified identity with a guarded atomic upsert. A new Google user can become a registered account. Editable metadata does not set plans or roles; banned/suspended accounts stay blocked. The JSON fallback supports the operators, defaults and unique-key checks needed for this flow. Its file storage remains a single-process fallback, not shared MongoDB durability.
4. The website marks an account ready only after provisioning succeeds. Temporary failures preserve the Supabase session for retry; protected app access remains gated. Repeated initialization and logout/account-switch races are covered by tests.
5. The extension handoff verifies the session against `/auth/me`. The connection page shows success only after an origin/source/request-id checked acknowledgement. Tokens are absent from that acknowledgement and connection-page URLs.
6. Rate-limited `POST /auth/session/refresh` rotates both credentials through an isolated client. Extension refreshes coalesce, preserve newer logins/logout, and keep saved sessions during temporary outages. Invalid/revoked sessions are cleared.
7. Signup confirmation retains the entered email and extension destination. Verification resend and password recovery show actionable errors.

## Writing and visual changes

- Original C-and-pen SVG mark, 16–512px PNG icons, matching toolbar/on-page/settings branding.
- System/light/dark appearance retained, with consistent writing controls and scroll behavior.
- Six authenticated rewrite actions: professional, friendly, shorter, expanded, confident and simplified. The user reviews the result before applying; stale results cannot overwrite a changed draft.
- Undo for applied AI writing changes; correctness/clarity filters; measured word/sentence/character counts and reading time.
- Personal dictionary with spelling-only suppression, audience/formality goals, American/British/detected spelling, and per-site pauses that stop automatic writing requests.
- Grammar and rewrite share the existing account limit of 30 requests/minute/process and route through the server gateway. No provider keys ship in the browser package.

## Validation

| Check | Result |
| --- | --- |
| Backend suite | 112 tests passed |
| Frontend suite | 274 tests passed across 19 files |
| Extension unit/manifest/CSP suite | 24 tests passed |
| Unpacked Chromium extension | 20 workflows passed, including handoff, dictionary, rewrite/undo, website pause, rich text, history, capture, themes and sign-out |
| Built React website + real MV3 extension | Mocked Google PKCE callback, one-time provisioning, extension ACK, signup verification/resend, provider outage and registry outage passed |
| Frontend production build | Passed; existing large-bundle warning remains |
| Desktop TypeScript/Electron build | Passed |
| New auth/writing helper coverage | Backend helpers 100% lines; frontend auth helpers/store 94.34% lines and 80.59% branches; extension session manager 95.35% lines |

Browser tests mock external auth, mail, account and model responses. They do not send real verification emails, complete a person's Google consent, or certify live AI output. Real Google account consent and site-specific advanced editor integrations remain manual acceptance items.

## Installation and deployment

Download the 1.5.0 archive linked from the website, extract it, and use Chrome's **Load unpacked**. Reload the extension and existing webpages after upgrading. Start sign-in from the extension and wait for the website to confirm the connection.

Deploy the matching frontend/backend revision together. Supabase URL/key values remain in private local/hosting environments. The restored project's allowed callback URLs must include the deployed website. A Git push alone does not establish which revision Render/Vercel are serving; deployment checks are reported separately.
