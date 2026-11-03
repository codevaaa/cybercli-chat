# CodeVaa platform audit — 20 September 2026

This document records the current architecture, the end-to-end flows that were exercised, the defects fixed during this audit, and the work that still blocks a production release. The remaining products share one backend (scope updated on 1 October 2026):

1. `chrome-extension` — the browser side panel, content actions, screenshot tools, and background API broker.
2. `desktop` — the root Electron application and its landing/login/Hunter windows.
3. `frontend` — the normal authenticated CodeVaa chat and the optional anonymous-chat code.

The shared service is `backend`. It owns authentication, plans, model selection, provider keys, completions, search, research, streaming, and the API consumed by the other pillars.

## What the system does

The normal chat path is `frontend -> backend /chat or /completions -> gateway -> provider`. The browser extension uses a background-only broker so page scripts cannot choose arbitrary URLs or put the user credential in page fetches. The desktop app owns its native windows and file dialogs.

## Backend and model boundary

Authentication now treats the database user plan as authoritative, rejects banned optional credentials, and does not silently turn an unauthenticated CLI request into a Pro account. Agent and IDE completion routes validate input, preserve caller system messages without letting the gateway’s identity injection delete planner instructions, and return provider errors instead of hanging unauthorized requests. Search POST requests require authentication and validate limits. Mongo sanitization runs after body parsing, and code payloads are no longer passed through an HTML sanitizer that could corrupt source.

The gateway now preserves structured OpenAI image content and the legacy markdown-base64 form, estimates image input for limits, and routes images to Gemini with explicit supported MIME validation. Streaming readers handle split UTF-8 and cancellation. A user message containing an array is converted to text before tier classification instead of becoming `"[object Object]"`-style classifier input.

Backend verification: `npm test` in `backend` passes 20 tests across four suites, including auth middleware, agent/IDE route behavior, system-message preservation, provider errors, and multimodal conversion. No real provider credential or production database was used in the audit.

## Chrome extension

The service worker is now the only API broker. It accepts an allowlisted endpoint and method, injects the stored credential there, bounds request size/time, and rejects arbitrary proxy targets. Auth capture accepts exact HTTPS origins rather than substring matches. SSE parsing handles packet boundaries, final unterminated events, `[DONE]`, reader cancellation, and provider errors. Side-panel stop/start state is recovered in `finally`, and generated output uses escaped Markdown rendering with safe HTTP(S) links and inert raw HTML.

Screenshot analysis now sends real OpenAI-compatible image parts to the backend. Visible and full-page capture use the source tab’s `windowId`, validate dimensions, and cap full-page work at 30 viewports. Citation responses always settle, including clipboard/service-worker failures. The extension tests and syntax checks pass 6/6. A real Chrome-installed extension test with browser permission prompts and a live backend remains outstanding.

## Root desktop application

All renderer IPC now passes a common sender-frame and exact-origin check. Webviews are rejected, external navigation/window opens go to the system browser, and the previous substring origin check is gone. File reads require a native picker grant or an explicit native confirmation for dropped files, with realpath validation and a 5 MB limit. Writes use a native save dialog and size checks. Hunter local execution is limited to the Hunter renderer and launches with hidden windows. The desktop renderer build passes.

Remaining desktop release concerns are concrete: `auth_token.json` is still plaintext at rest, the current preload configuration still runs with `sandbox: false`, and deep-link token/session validation must be verified against the backend rather than trusting a renderer-supplied token. These are release blockers for a security-sensitive desktop build even though IPC origin checks are in place.

## Normal frontend chat

Authenticated chat now has a cancellable `AbortController`, a stop control, matching assistant bubble IDs, guarded message loading on route changes, UTF-8-safe SSE parsing, separated thinking/status events, readable Markdown/GFM tables and code blocks, and reduced-motion response activity. The Playground uses the actual agent completion endpoint. The anonymous-chat page is disabled in production because its relay/crypto path is not ready for release.

The anonymous crypto implementation had real defects rather than test-only noise: X3DH had no consistent public X25519 identity field, the receiver derived a different key than the sender, ratchet state omitted fields used by the protocol, sender keys returned a different shape than callers expected, and group ciphertext had no key-id/iteration framing. Those contracts are now consistent and the crypto suite passes 20/20 tests. The current API still uses one initial chain for both directions because it has no role field; a production Double Ratchet must add explicit initiator/responder directional chains and a complete DH ratchet before enabling anonymous chat.

Frontend verification: `npm test -- --run` passes 230 tests in 11 files; `npm run build` passes. The production bundle remains large (about 5.19 MB uncompressed, 1.49 MB gzip), so route-level code splitting is a performance task.

## Highest-priority remaining bugs

1. Replace the anonymous-chat unsigned payload plan guard with signature verification and enforce the same entitlement at the relay API. Keep the page disabled until the crypto design is role-aware and interoperable.
2. Propagate browser cancellation through the backend gateway to provider SDK calls.
3. Add quota/usage accounting around every completion route and verify rate-limit counters under concurrent streams.
4. Encrypt desktop tokens using OS-backed protection, enable a sandbox-compatible preload, and test deep-link replay/expiry.
5. Add packaged desktop smoke tests, Chrome extension browser tests, and real Mongo/Supabase contract tests.
6. Split the frontend bundle and measure first-load behavior on a clean browser profile.

## Scope change — 1 October 2026

The separate local orchestration product and its companion web pages, backend persistence/proxy routes, installer catalog entries, and dedicated release workflow have been removed at the owner's request. The shared model completion API remains in use by Playground, CLI, and IDE integrations. The audit results above describe the retained products; they do not certify current production services.
