# Codeva browser workspace 1.6.0

## Screenshot issues addressed

The previous signed-out screen stretched narrow content across a wide window. The new account screen uses two balanced regions above 720px and a compact scrolling layout below it. Writing uses separate draft/review columns on wide windows. Assistant messages keep a readable width; welcome actions and history adapt to the available space.

The previous writing popup combined a green tick with a message saying only a local check had run. The replacement shows explicit limited, checking, unavailable and AI-completed states. It never certifies a sentence as correct merely because the local rules returned no suggestions.

The popup includes measured word/sentence counts, local/AI source labels, correctness/clarity filters, ignore, dictionary, AI recheck, six rewrite styles with preview and explicit apply, undo, website pause and Escape dismissal. Its body scrolls within the viewport. Common local English spelling and agreement errors are checked in both popup and Writing, including when the AI service is unavailable. These limited rules do not provide full multilingual proofreading.

## Provider configuration

All credentials belong in private `backend/.env` and Render environment settings. Restart/redeploy after changing them. The browser sends requests only to the existing Codeva API.

| Service | Integration and setup |
| --- | --- |
| APINEX | Existing integration retained. Set `APINEX_API_KEY`; existing catalog aliases remain available. Model catalog membership does not establish account entitlement. [Developer reference](https://apinex.bond/developers) |
| Radox | OpenAI-compatible `https://radoxai.com/v1`. Set `RADOX_API_KEY`; optional `RADOX_MODEL` defaults to the documented `deepseek-v4-flash-0731`. Public Codeva alias: `radox/default`. When configured, it participates in automatic routing and failover. [Getting started](https://radoxai.com/docs/getting-started), [models](https://radoxai.com/docs/models) |
| Logfare | OpenAI-compatible `https://logfare.ai/v1`, upstream `logfare/auto`. Set `LOGFARE_API_KEY` for optional explicit chat selection. The owner chose to exclude it from automatic writing and fallback. Its documentation describes research logging and additional account/access requirements; the app does not change those preferences or grant consent. [API documentation](https://logfare.ai/docs), [service description](https://logfare.ai/) |
| AntSeed | AntSeedStats is a community analytics site. Configure your authenticated AntSeed gateway using `ANTSEED_BASE_URL`, `ANTSEED_API_KEY` and `ANTSEED_MODEL` copied from its console/catalog. The local authenticated gateway normally uses `http://127.0.0.1:8379/v1`; production should use its HTTPS URL. Public Codeva alias: `antseed/default`. No gateway installation, payment, staking or wallet action is performed by this release. [Official quickstart](https://antseed.com/docs/quickstart/), [AntSeedStats](https://antseedstats.com/free) |

Missing new provider configuration stays out of the public model choices. Explicit requests to an unconfigured new provider return a clear error. Configured catalog entries are not a successful live inference certificate. New credentials are deferred by the owner, so live inference on these new integrations remains pending.

Logfare is excluded from automatic candidates and automatic failover, including writing requests. Server tests verify that a failed Radox request can reach the configured AntSeed gateway without sending data to Logfare. Partial streamed answers do not append a second provider’s response.

## Validation and next editor phase

Regression coverage includes exact Unicode offsets, local sentence corrections, unsupported informal words, truthful empty/error states, provider routing/configuration/privacy, cancellation and partial streams. Chromium loads the real MV3 extension and exercises 300/400/768/1200px layouts, popup failure states, ignore/filter, rewrite preview/apply/undo, session handoff and existing workflows. External services are mocked; no new provider credentials were supplied.

The subsequent editor phase uses the existing **MrCodevaa** integration in `editors/studio-client` and pinned `editors/code-oss`, with the same backend. Its source/build verification will be started after this browser release is pushed. The independent CyberCoder repository is a separate existing client.
