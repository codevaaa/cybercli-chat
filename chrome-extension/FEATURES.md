# Extension feature verification — 1.6.0

This file describes source and test evidence, not a production deployment certificate.

| Workflow | State | Evidence / limitation |
| --- | --- | --- |
| Assistant streaming, stop, retry, copy | Implemented | Stream unit tests cover UTF-8 splits, error events, disconnects and cancellation. Chromium checks rendered responses. |
| Saved history and drafts | Implemented | Browser reload restores the conversation; local account partitioning is unit tested. History is not web-chat sync. |
| Page summaries and explanation | Implemented | Chromium verifies that actual article content and source URL reach the API request. |
| Model selection | Implemented | Reads the API catalog, with automatic fallback; backend tests verify Madhav routing and Council plan access. |
| Writing review | Implemented | Chromium checks request, suggestion review and replacement; backend validates exact offsets and output. |
| Reviewed rewrites and undo | Implemented | Six actions use the authenticated rewrite endpoint; Chromium checks explicit apply, undo, and stale-draft rejection. |
| Dictionary and writing preferences | Implemented | Dictionary validation and spelling-only suppression tested on server/client; Chromium checks learning a term. Goals and dialect reach server prompts. |
| Website pause | Implemented | Domain-boundary unit checks and Chromium verify automatic writing requests stop on a paused site. |
| On-page grammar | Implemented for standard fields | Chromium checks textarea corrections, stale-response protection and rich text formatting. |
| Inline highlights | Implemented where CSS Highlight API exists | Uses document ranges without inserting an HTML overlay into the editor. |
| System/light/dark appearance | Implemented | Chromium checks both system appearance and persistent settings at narrow width. |
| Wide and compact workspace | Implemented | Account and writing layouts checked at 300, 400, 768 and 1200px; wide Writing separates draft and review. |
| Expanded on-page review | Implemented | Chromium checks source/error states, ignore, filters, rewrite preview/apply/undo, keyboard dismissal and viewport bounds. Limited local checks never certify a sentence as correct. |
| Additional server providers | Configuration ready | Radox and authenticated AntSeed gateway support automatic routing/failover; Logfare is explicit/manual only. Owner will add new credentials later; live inference on these integrations is not certified. |
| Login/signup/sign-out | Implemented | Built React app + unpacked MV3 tests cover Google PKCE callback, provisioning, signup email verification/resend, outage recovery and extension ACK. Real account consent remains a manual acceptance item. |
| Session refresh | Implemented | Unit tests check serialized token rotation, outages, revoked sessions, logout races and account switching. |
| Original Codeva mark | Implemented | Native SVG source and matching 16–512px toolbar assets; no third-party logo dependency. |
| Full-page capture | Implemented with limits | Preview assembly/PNG link checked in Chromium. Capture requires the original tab, max 30 viewports, max 60M pixels and bounded session storage. Live context-menu capture is a manual acceptance item. |
| Smart Compose | Existing, hardened for stale replies | Setting works; continuation now uses native field updates. Broad website compatibility not certified. |
| Slash prompts and snippets | Existing | Separate website/command compatibility testing remains. |
| Gmail/LinkedIn replies | Existing | Depends on site DOM; not certified by the core test suite. |
| YouTube/PDF helpers | Existing | Captions, built-in viewers and canvas restrictions can prevent access. |
| Citations | Existing | Generated from page metadata; no fabricated “copied to clipboard” claim in the context-menu handoff. |
| Security scanning / universal editor support | Not certified | Do not infer support from old marketing text or the legacy popup. |

See README.md for installation, backend rollout, privacy behavior, and tests. The desktop build passes with the shared web authentication changes. The independent CyberCoder checkout remains unchanged and clean.
