# APINEX in the existing Codeva router

`backend/src/services/llm/apinex.js` supplies the fixed compatible endpoint `https://api.apinex.bond/v1` and exact supported IDs. `keyPool.js`, `gateway.js`, `plans.js` and `models.routes.js` extend the existing router, key rotation, plan selection and public model catalog. The temporary credential is only in ignored `backend/.env` as `APINEX_API_KEY`; clients and installers receive no provider keys.

When the server has an APINEX key, normal automatic chat prefers APINEX. Explicit model choices stay explicit. A failed APINEX primary tries OpenRouter next, then the other accessible APINEX models and the existing remaining providers. Without an APINEX key, the previous automatic defaults remain. Council uses the existing Council engine. Kali_Kal routing is not extended.

| APINEX service model ID | Observed result |
| --- | --- |
| `free/gpt-6-luna` | Real bilingual streaming, structured JSON, tool-call/result round trip and green-image check passed. |
| `free/glm-5.3-flash` | Real bilingual streaming, structured JSON and tool-call/result round trip passed. |
| `free/deepseek-v4-pro-0813` | Real bilingual streaming, structured JSON and tool-call/result round trip passed. |
| `free/minimax-m3.1` | HTTP 402, subscription required; optional route retained. |
| `free/qwen-3.8-max` | HTTP 402, subscription required; optional route retained. |
| `free/claude-opus-4.6` | HTTP 402, subscription required; optional route retained. |

These are APINEX catalog identifiers, not independent certification of the underlying vendor/model identity. The three models produced ten passing checks in the earlier `artifacts/codeva-editor/apinex-tests.json`; availability is time-dependent. `scripts/ide/verify-apinex.mjs` reruns the bounded checks. The restricted IDs are not shown as available native editor models.

The October 3 backend route check received HTTP 402 from APINEX for the requested GPT Luna route. Existing failover then returned actual `openai/gpt-4o-mini` responses through OpenRouter. Hindi response preferences and structured tool-result round trips passed on that fallback. This latest result certifies the route/failover behavior, not current APINEX availability. `normal-chat.json` records requested and actual model identities separately.

Actual standard chat answered and persisted both messages in an isolated real Mongo account/API-key test (`normal-chat.json`). This is not a production Supabase login test.

The dossier's existing paid/mid/frontier gate remains in production. `DossierModels({functionalTesting:true})` is allowed only in an isolated `NODE_ENV=test` process and only permits the three accessible APINEX IDs. Its artifacts explicitly say `paid_frontier_acceptance_certified:false`. The latest free dossier run failed during generated-file output; it is not marked complete or given fabricated judge passes. Empty streams and interrupted partial answers fail rather than appearing as successful mixed-provider responses.

Provider-call tests are opt-in via `CODEVA_ACCEPTANCE_PROVIDER_CALLS=1`. Token counts derived from text are marked estimates. Cancellation stops compatible provider requests and heartbeat cleanup runs on response failure/disconnect. The supplied temporary key will need replacement in the server environment after its owner revokes it.
