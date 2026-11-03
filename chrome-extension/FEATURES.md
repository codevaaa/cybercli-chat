# Extension feature verification — 1.4.0

This file describes source and test evidence, not a production deployment certificate.

| Workflow | State | Evidence / limitation |
| --- | --- | --- |
| Assistant streaming, stop, retry, copy | Implemented | Stream unit tests cover UTF-8 splits, error events, disconnects and cancellation. Chromium checks rendered responses. |
| Saved history and drafts | Implemented | Browser reload restores the conversation; local account partitioning is unit tested. History is not web-chat sync. |
| Page summaries and explanation | Implemented | Chromium verifies that actual article content and source URL reach the API request. |
| Model selection | Implemented | Reads the API catalog, with automatic fallback; backend tests verify Madhav routing and Council plan access. |
| Writing review | Implemented | Chromium checks request, suggestion review and replacement; backend validates exact offsets and output. |
| On-page grammar | Implemented for standard fields | Chromium checks textarea corrections, stale-response protection and rich text formatting. |
| Inline highlights | Implemented where CSS Highlight API exists | Uses document ranges without inserting an HTML overlay into the editor. |
| System/light/dark appearance | Implemented | Chromium checks both system appearance and persistent settings at narrow width. |
| Login/sign-out | Implemented | Trusted origins and payload normalization are unit tested; extension sign-out is checked in Chromium. Live Supabase login still needs deployment smoke testing. |
| Full-page capture | Implemented with limits | Preview assembly/PNG link checked in Chromium. Capture requires the original tab, max 30 viewports, max 60M pixels and bounded session storage. Live context-menu capture is a manual acceptance item. |
| Smart Compose | Existing, hardened for stale replies | Setting works; continuation now uses native field updates. Broad website compatibility not certified. |
| Slash prompts and snippets | Existing | Separate website/command compatibility testing remains. |
| Gmail/LinkedIn replies | Existing | Depends on site DOM; not certified by the core test suite. |
| YouTube/PDF helpers | Existing | Captions, built-in viewers and canvas restrictions can prevent access. |
| Citations | Existing | Generated from page metadata; no fabricated “copied to clipboard” claim in the context-menu handoff. |
| Security scanning / universal editor support | Not certified | Do not infer support from old marketing text or the legacy popup. |

See README.md for installation, backend rollout, privacy behavior, and tests. Desktop and CyberCoder source were inspected for integration context; they were not rebuilt or changed by this extension upgrade.
