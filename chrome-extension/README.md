# Codeva browser workspace — 1.5.0

A Manifest V3 Chrome extension connected to the same Codeva API as the web, desktop, and CyberCoder clients. Vanilla JavaScript, with no build step.

## Working core

- **Assistant:** streaming chat, stop, retry/regenerate, escaped Markdown, copy, account-scoped local conversations, draft recovery, search, delete with undo, and Markdown export.
- **Page assistance:** explicitly attach the current webpage or use Summarize/Explain actions. The request includes the page title, source URL, and up to 15,000 characters of readable text. Text inside form controls is excluded from page extraction.
- **Writing workspace:** proofread up to 6,000 characters, filter correctness/clarity suggestions, review or apply changes, and undo the last AI edit. Six rewrite actions return a preview before replacing your draft. Measured word/sentence counts and reading time update as you type.
- **Writing preferences:** personal dictionary (up to 200 terms), audience/formality goals, American/British/detected spelling, and per-website pauses. Dictionary and website preferences stay on this device.
- **On-page writing:** debounced AI checks with local spelling fallback, exact position fixes, stale response protection, and CSS highlights in supported contenteditable fields. Applying fixes preserves unrelated rich text markup.
- **Appearance:** system theme by default, with persistent light/dark overrides. Settings and content surfaces follow the same preference.
- **Account:** Google/email/signup/magic-link flows preserve extension context. The website provisions the verified account before handing it off; the extension validates it and acknowledges success. Background refresh rotates credentials with race protection. Temporary service outages keep saved credentials; rejected sessions require sign-in again.
- **Brand:** original Codeva C-and-pen vector mark, with matching 16–512px icons and themed content/settings surfaces.
- **Capture:** bounded full-page screenshot capture with a session-only preview and PNG download. Keep the source tab selected during capture. Sticky headers and dynamic page layout can still appear in captures.

Model choices come from `/api/v1/models`, with automatic routing available if the catalog is unavailable. Catalog names are server-side product aliases; the gateway resolves providers and applies account plans. A product name does not guarantee a particular upstream model or quality level.

## Install locally

1. Open `chrome://extensions` and enable **Developer mode**.
2. Choose **Load unpacked** and select this `chrome-extension` folder, or extract the release ZIP and select its folder.
3. After updating, click **Reload** on the extension and reload existing webpages so their content scripts update.
4. Click Codeva’s toolbar icon and choose **Sign in**. Finish Google or email sign-in on the website. The connection page confirms when the extension acknowledges the session. Reload an already-open website tab after upgrading the extension.
5. Use **Assistant**, **Writing**, and **History**. The header theme button cycles System → Light → Dark; Settings offers a direct choice.

Shortcuts: Ctrl+Shift+S opens the panel; Ctrl+Shift+G checks the active writing field. macOS uses Command. Chrome may reserve a shortcut; customize it at `chrome://extensions/shortcuts`.

## Backend and rollout

Production API: `https://cybercli-api.onrender.com/api/v1`.
Website: `https://cybermindcli.info` (also supports the `www` origin).

Deploy the matching backend and frontend with this package. New endpoints include public `/auth/health`, authenticated `/auth/sync`, rate-limited `/auth/session/refresh`, and authenticated `/completions/rewrite`. Authentication availability checks prevent navigation to an unavailable project. The existing Supabase project must be active and its redirect allowlist must include the website callback; code cannot restore a paused/deleted provider project.

Grammar and rewrite share a limit of 30 requests per minute per account per backend process. They return HTTP 400 for invalid input, 401 for missing/invalid auth, 429 for excess requests, and 502 when valid output is unavailable. Provider outages during session verification/refresh return 503. The main API limiter also applies. Invalid proofreading JSON is an error, rather than an “all clear”.

## Privacy and storage

- Chat/page requests and writing text are processed through Codeva’s API and its configured AI providers.
- When automatic grammar or Smart Compose is enabled, text in supported writing fields is sent while typing. Disable them in Settings to submit text manually instead. Password, payment, and recognizable secret/token fields are excluded; this is a heuristic, so disable automatic assistance on sensitive sites.
- Page context is off by default. It is read when selected by the user and refreshed from the active tab before sending.
- Conversations and drafts are saved in `chrome.storage.local`, separately by account. They are browser-local, not synchronized to the web app’s MongoDB chat history. Settings can clear the current account’s history.
- Full-page captures live in `chrome.storage.session` until the browser session ends. Capture pages are not web-accessible resources.
- No provider API keys are bundled. Account access and refresh tokens are stored in extension-local storage and validated/refreshed by the backend. They are excluded from connection-page URLs and acknowledgements. Sign-out removes both credentials.

## Compatibility limits

Chrome internal pages, the Chrome Web Store, and some built-in PDF/canvas editors cannot be read or edited by ordinary content scripts. Textareas, text inputs, and standard contenteditable fields are the tested baseline. Specialized editors may need site-specific adapters. Formatting is preserved for grammar replacements outside the changed range; a rewrite intentionally replaces the selected range with plain text.

Older code for slash prompts, Gmail/LinkedIn replies, YouTube captions, PDF overlays, citations, and snippets remains in the repository. It depends on website DOM structure/caption access and is not included in the new core compatibility claim. The legacy popup is not the toolbar entry point. This release does not certify those integrations or claim ChatGPT/Grammarly feature parity, security scanner coverage, or exhaustive language support.

## Validation

From this folder:

```powershell
npm test
npm run test:browser
# First run `npm run build` in ../frontend, then:
npm run test:auth
```

The browser suites use Playwright installed with `backend` and its Chromium runtime. They load the real unpacked extension, mock external responses, and check article/editor behavior plus the built React website’s Google PKCE callback, provisioning, signup verification/resend, outage handling, and extension acknowledgement. They do not spend production provider quota or certify real Google account consent or live authenticated model output. Screenshots are saved under `artifacts/extension` in the repository. `npm run icons` regenerates the SVG and PNG sizes from the original vector source.

From the backend folder:

```powershell
npm test
node --experimental-test-module-mocks --experimental-test-coverage --test-coverage-include=src/services/writing/grammar.js --test src/routes/completions.extension.test.js
```
