# Codeva code map

Static inspection of the existing working tree at `D:\gptulternative\gptulternative`, 1 October 2026. This describes the files currently present, including existing uncommitted changes; it does not certify the deployed production revision. No application code, credentials, databases, or running services were changed for this map. Kali_Kal was left untouched. This document is the only requested write.

## Boot instructions observed in this checkout

### API

Sources: `D:\gptulternative\gptulternative\backend\package.json`, `D:\gptulternative\gptulternative\backend\src\server.js`, `D:\gptulternative\gptulternative\backend\src\config\env.js`, and `D:\gptulternative\gptulternative\backend\.env.example`.

The backend is an ESM Node/Express application. Its package declares Node >=22. `dev` runs `node --watch src/server.js`; `start` runs `node src/server.js`. Environment loading explicitly targets `backend/.env`.

```powershell
Set-Location 'D:\gptulternative\gptulternative\backend'
npm install
npm run dev
```

Use `npm start` for the non-watch entry point. Configuration names in the example include `PORT`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MONGODB_URI`, and provider keys. Configure an existing local environment rather than overwriting production credentials. The source and example default to port **3000**. The server binds `0.0.0.0`; `GET /health` is its health endpoint. Most API routes mount under `/api/v1`; compatibility routes mount under `/v1`.

### Web application

Sources: `D:\gptulternative\gptulternative\frontend\package.json`, `D:\gptulternative\gptulternative\frontend\vite.config.js`, `D:\gptulternative\gptulternative\frontend\src\lib\api.js`, and `D:\gptulternative\gptulternative\frontend\src\lib\supabase.js`.

The frontend is React 19 with Vite. `dev` runs Vite; its configured port is **5173**. `build` produces `frontend/dist`; `preview` runs the Vite preview server.

```powershell
Set-Location 'D:\gptulternative\gptulternative\frontend'
npm install
$env:VITE_API_URL = 'http://localhost:3000/api/v1'
npm run dev
```

The explicit API URL above matches the backend's default. Without `VITE_API_URL`, the frontend selects `http://localhost:5000/api/v1` on localhost, which differs from the backend's default port; away from localhost it selects `https://cybercli-api.onrender.com/api/v1`. The checked-in frontend environment example also names that hosted API. Supabase login requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; when those are missing the frontend client substitutes a disabled-auth stub.

These are source-derived instructions; installs and servers were not run during this read-only inspection.

### CyberCoder CLI

Sources present: `D:\gptulternative\gptulternative\frontend\src\pages\public\ClaudeCodePage.jsx`, `D:\gptulternative\gptulternative\frontend\src\pages\public\DownloadsPage.jsx`, and `D:\gptulternative\gptulternative\backend\src\routes\cli.routes.js`.

The product page advertises:

```powershell
npm install -g @codeva_chat/cli@latest
cm /init
```

Its FAQ says to configure an API key from the Codeva dashboard. These are **documented commands**, not a verified local CLI package entry point: no CLI `package.json`, `bin` declaration, or executor source was found in this checkout. `D:\gptulternative\gptulternative\.gitignore` lists `cybercoder/` as a separately managed sub-repository, but that directory is absent locally.

`D:\gptulternative\gptulternative\frontend\src\pages\public\DocsArticlePage.jsx` also describes `cd cli-daemon`, `npm install`, and `node daemon.js --key=...`. The referenced `cli-daemon` directory is absent here, so those instructions cannot be checked against daemon implementation.

### VS Code extension

Sources present: `D:\gptulternative\gptulternative\frontend\src\pages\public\ExtensionDocsPage.jsx` and `D:\gptulternative\gptulternative\frontend\src\pages\public\DocsArticlePage.jsx`.

The extension documentation instructs users to install CyberCoder through VS Code's Marketplace or **Extensions → Install from VSIX**, and gives:

```powershell
code --install-extension cybercoder.vsix --force
```

It documents `Ctrl+Shift+I` to open the extension and `Ctrl+Shift+L` to add a selection. The articles use both “Codeva” and “CyberCoder” as Marketplace search terms. An extension package manifest, activation implementation, and the referenced VSIX were not found among the inspected source files. Therefore a source-development launch command and the shipped extension's exact behavior cannot be verified here.

## Web routes and their API connections

Route definitions: `D:\gptulternative\gptulternative\frontend\src\App.jsx`. All application routes below use `ProtectedRoute`, implemented in `D:\gptulternative\gptulternative\frontend\src\components\auth\ProtectedRoute.jsx`; unauthenticated access redirects to `/auth/login`.

API mount definitions: `D:\gptulternative\gptulternative\backend\src\server.js`. API paths in this table include their `/api/v1` prefix.

| Web route | Rendered page | Observed API connection |
| --- | --- | --- |
| `/chat/:threadId?` | ChatPage | `/chat` for stored threads/messages; `/completions` for completion requests outside the stored-thread path |
| `/settings`, `/settings/*` | SettingsPage | `GET`, `PATCH /settings` |
| `/projects` | ProjectsPage | `GET`, `POST /projects`; `PUT`, `DELETE /projects/:id` |
| `/agents` | AgentsPage | `GET /agents`, the curated registry; custom persona CRUD is separately under `/personas` |
| `/workflows` | WorkflowsPage | `GET`, `POST /workflows`; `DELETE /workflows/:id` |
| `/library` | LibraryPage | Requests `/library`; no matching mount exists in the inspected API server |
| `/usage` | UsagePage | `GET /usage`, `GET /usage/history` |
| `/voice` | VoicePage | Voice functionality is also implemented through the TTS/STT API and chat voice components |
| `/voice-chat` | VoiceChatPage | Additional protected voice page |
| `/voice-settings` | VoiceSettingsPage | Additional protected voice settings page |
| `/playground` | PlaygroundPage | `POST /agent/complete`, non-streaming, with model, system prompt, and messages |

The page implementations are under `D:\gptulternative\gptulternative\frontend\src\pages\app`. The public `/council-mode`, `/madhav`, `/ravan`, `/product`, and `/docs/vscode-extension` routes render product/documentation pages, not separate engine processes.

Stored chat operations are implemented directly in `D:\gptulternative\gptulternative\backend\src\routes\chat.routes.js`: create/list/get/update/delete threads; `POST /chat/:id/fork`; message listing/sending; `POST /chat/:id/messages/sync`; and deleting messages after a selected message. Forking creates a new thread and copies the selected history with fork metadata. The similarly named `D:\gptulternative\gptulternative\backend\src\controllers\chat.controller.js` contains demo handlers; it is not the implementation imported by the mounted chat router.

Projects use `D:\gptulternative\gptulternative\backend\src\routes\projects.routes.js` and `D:\gptulternative\gptulternative\backend\src\controllers\projects.controller.js`. Stored-thread completion fetches the linked project's custom instructions and adds them to model context.

Workflows in `D:\gptulternative\gptulternative\backend\src\routes\workflows.routes.js` are stored prompt templates. In `D:\gptulternative\gptulternative\frontend\src\pages\app\WorkflowsPage.jsx`, running a workflow navigates to `/chat?prompt=...`; the inspected route is not a durable job scheduler or multi-step execution engine.

Voice API implementation: `D:\gptulternative\gptulternative\backend\src\routes\tts.routes.js`. `POST /tts` returns WAV from `generateGeminiTTS`; missing/auth-failed keys can signal browser TTS fallback. `POST /tts/stt` is authenticated and sends audio to Gemini for transcription. The service is `D:\gptulternative\gptulternative\backend\src\services\tts\gemini-tts.js`; the chat overlay is `D:\gptulternative\gptulternative\frontend\src\components\chat\VoiceChatModal.jsx`.

## Provider routing and failover

The main implementation is `D:\gptulternative\gptulternative\backend\src\services\llm\gateway.js`. It contains `MODEL_MAP`, `OPENROUTER_FALLBACK_MAP`, `FALLBACK_CHAIN`, per-model `FALLBACK_CHAINS`, task classification, plan-aware model selection, identity/context preparation, streaming `complete`, and `completeNonStream`.

`D:\gptulternative\gptulternative\backend\src\config\plans.js` supplies model tier and plan rules. An `auto` request uses prompt-length/code/reasoning heuristics to choose a tier; an inaccessible explicit model is downgraded. Image and large-context routing can select a Gemini alias. The gateway prunes context to approximately 24,000 characters in its current calls; this is a character budget, not a demonstrated million-token context implementation.

Provider key rotation lives in `D:\gptulternative\gptulternative\backend\src\services\llm\keyPool.js`. It accepts legacy single keys and numbered keys 1–50, rotates round-robin, and records successes/failures. HTTP 401/403/429 sets cooldown to 60 seconds multiplied by consecutive failure count, capped at four multipliers. If all keys are cooling down, it returns the earliest-cooling key anyway. The pool and its counters are process memory.

### Provider wiring actually observed

This table describes code paths, **not verified live credentials, provider availability, or upstream model existence**. A displayed provider/model name does not necessarily identify the upstream destination.

| Provider | Observed main-gateway wiring |
| --- | --- |
| OpenRouter | OpenAI-compatible client at `https://openrouter.ai/api/v1`; many primary aliases and proxy/fallback requests use it |
| Groq | OpenAI-compatible client at `https://api.groq.com/openai/v1`; Llama aliases and emergency streaming backup |
| Mistral | OpenAI-compatible client at `https://api.mistral.ai/v1`; Mistral/Codestral registry entries |
| Hugging Face | OpenAI-compatible client at `https://router.huggingface.co/v1`; Qwen/Llama/DeepSeek registry entries |
| NVIDIA | OpenAI-compatible client at `https://integrate.api.nvidia.com/v1`; NVIDIA registry entries |
| Cloudflare | Account-specific Workers AI OpenAI-compatible endpoint; requires both key and `CLOUDFLARE_ACCOUNT_ID` |
| OpenCode / Zen | OpenAI-compatible client at `https://opencode.ai/zen/v1`; several entries target this provider, while others are remapped |
| LLM7 | OpenAI-compatible client at `https://api.llm7.io/v1`; Codestral, Mistral Small, and Devstral entries target it; many other `llm7/*` IDs are remapped |
| ApiFreeLLM | Client at `https://apifreellm.com/api/v1`; most `apifreellm/*` entries are remapped; the legacy `puter/gpt-5.5` entry targets this provider |
| Gemini | Direct Google SDK branch exists for entries whose provider is `gemini`, with no tools. The normal `gemini/gemini-2.5-flash` and `gemini/gemini-2.5-pro` IDs both currently map to OpenRouter's `google/gemini-2.5-flash` |
| Cerebras | Client/key support exists, but the inspected `cerebras/llama-3.1-8b` registry entry maps to Groq |
| Bytez | A registry entry and key-pool support exist, but `getClient` has no direct Bytez branch and falls through to the OpenRouter proxy; the main gateway does not import the standalone Bytez adapter |

Standalone adapter files also exist under `D:\gptulternative\gptulternative\backend\src\services\llm`, including `bytez.js`, `cerebras.js`, `cloudflare.js`, and others. Their presence alone does not mean the mounted chat path calls them. The gateway explicitly imports `gemini.js` for its direct streaming SDK branch. Legacy `puter/*` IDs in this gateway are mappings to the providers above, not a direct Puter client in that path.

Streaming attempts the selected destination, applicable OpenRouter proxy fallback, the model-specific or default chain, and finally Groq `llama-3.1-8b-instant`. It forwards text and tool-call deltas. If no initial client exists, it emits a configuration error before the provider-error cascade. `completeNonStream` differs: after a primary failure it can try an OpenRouter proxy for selected provider types, but does **not** run the full streaming fallback chain or emergency Groq branch.

`D:\gptulternative\gptulternative\backend\src\services\llm\ModelOrchestrator.js` contains a separate cost/latency/complexity model selector and consensus helper. The inspected mounted chat and agent routes use `llmGateway`; a search found no import of `ModelOrchestrator.js` elsewhere in backend source. The legacy CLI consensus/models handlers reference `orchestrator` without an import/binding in their route file.

## Council Mode

Implementation: `D:\gptulternative\gptulternative\backend\src\services\llm\councilEngine.js`. Stored-thread chat dispatches to it in `D:\gptulternative\gptulternative\backend\src\routes\chat.routes.js`. Completion dispatch and the dedicated `POST /api/v1/completions/council` endpoint are in `D:\gptulternative\gptulternative\backend\src\routes\completions.routes.js`.

The engine creates **four** specialized prompt variants and calls `completeNonStream` in parallel: Gemini Flash alias (creative strategist), Mistral Large (technical architect), Groq Llama 3.3 70B alias (factual analyst), and OpenRouter GPT-4o Mini (comprehensive expert). Each is raced against a 12-second timer. Those IDs still pass through gateway plan resolution and registry remapping; the engine does not prove that four distinct upstream models answered.

With multiple successful replies, it requests synthesis using the Gemini Pro alias and an eight-second timer. One successful reply is returned directly; no successes trigger a single-model fallback; failed synthesis returns the longest successful reply. It emits individual `council_responses` for visualization. Parallel progress updates are collected and yielded after the parallel stage completes. The final synthesized text is already complete before it is emitted in small chunks with delays. The timeout races do not cancel their underlying provider requests.

## Agents, Cowork, tools, and file writes

### Custom personas and curated agents

Custom persona CRUD is in `D:\gptulternative\gptulternative\backend\src\routes\personas.routes.js`; persistence is `D:\gptulternative\gptulternative\backend\src\models\Persona.js`. Records contain name, description, system prompt, temperature, max tokens, icon, ownership, and visibility. These routes save persona records; they do not execute shell commands or edit workspace files.

The separate curated registry is `D:\gptulternative\gptulternative\backend\src\services\agents\registry.js`, exposed through read-only `/api/v1/agents` routes in `D:\gptulternative\gptulternative\backend\src\routes\agents.routes.js`. ChatPage's agent selector consumes `data.personas` and sends `agentId`. Chat/completion routes validate that ID against the trusted registry and inject its system prompt. That path uses curated registry IDs, not Mongo custom-persona IDs.

The standalone `/agents` page in `D:\gptulternative\gptulternative\frontend\src\pages\app\AgentsPage.jsx` expects an array with React icon components and tool lists, while the registry returns an object containing `personas`. The page calls `agents.map` on that result. Its New Agent and settings buttons have no action handlers in the inspected component; on request failure it substitutes sample cards. These observations distinguish this page from the actual chat selector and persona CRUD API.

### Cowork

Source: `D:\gptulternative\gptulternative\frontend\src\pages\app\ChatPage.jsx`.

The file contains `CoworkView`, task cards, React task state, and `runCoworkTask`. That runner posts a Cowork system instruction plus a user prompt to `/api/v1/completions` with streaming enabled; it gathers text and supports abort, retry, and removal. It sends no tool definitions, executes no file operations, and has no durable task store in that runner.

However, the current render branch for `activeNav === 'cowork'` or `'code'` displays `ComingSoonView`. It does not render the defined `CoworkView`. Thus this checkout contains a completion-based Cowork implementation but does not expose it through that tab as a working autonomous file-editing interface.

### CyberCoder and editor tools

`D:\gptulternative\gptulternative\backend\src\routes\agent.routes.js` exposes `/api/v1/agent/complete` and parallel sub-agent completion requests. `D:\gptulternative\gptulternative\backend\src\routes\ide.routes.js` exposes `/api/v1/ide/complete`, prompt enhancement, tab completion, session metadata, and custom-provider proxying. Completion routes forward supplied tool schemas and return model-requested tool calls. These endpoints do **not** execute those calls against the user's filesystem.

`D:\gptulternative\gptulternative\backend\src\routes\cli.routes.js` authenticates API keys into `CLISession` records, manages context/usage, and sends completion requests to `SwarmOrchestrator`. It returns tool calls to the client rather than performing local edits. It also has observable incomplete contracts: the non-streaming completion handler responds only with `{ complexity: 'high' }`, and the streaming handler uses `finalOutput` after the block where it was declared. These are source observations; the endpoints were not exercised here.

`D:\gptulternative\gptulternative\backend\src\routes\v1.routes.js` provides Anthropic-shaped `/v1/messages` and public OpenAI-shaped `/v1/chat/completions` over the gateway. The inspected handlers primarily normalize text and return text events; they do not forward a complete client tool-execution protocol or edit local files.

The local CyberCoder tool dispatcher, command runner, approval implementation, and workspace write executor cannot be located because the CLI/extension sources are absent. Editor documentation describes those operations, but backend tool-call forwarding alone is not evidence that the shipped client executes them.

Separately, authenticated `POST /api/v1/execute` is implemented in `D:\gptulternative\gptulternative\backend\src\routes\execute.routes.js`. It executes JavaScript/Python through `D:\gptulternative\gptulternative\backend\src\services\sandbox\agenticSandbox.js`, which creates an E2B cloud sandbox, can install JavaScript dependencies there, runs code, and kills the sandbox. This is a cloud execution surface, not the CyberCoder local workspace executor.

The Electron wrapper has real selected-file read and Save-dialog write handlers in `D:\gptulternative\gptulternative\desktop\src\main\index.ts`: `fs:read-file`, `fs:select-file`, and `fs:write-file`. The write handler writes the destination selected by the user. This file does not establish a Cowork/CyberCoder model-to-filesystem tool loop.

## Storage ownership

| Data | Observed store and source path |
| --- | --- |
| Login identity and session verification | Supabase Auth: `D:\gptulternative\gptulternative\frontend\src\stores\authStore.js`, `D:\gptulternative\gptulternative\frontend\src\lib\supabase.js`, `D:\gptulternative\gptulternative\backend\src\config\supabase.js`; verification calls `supabase.auth.getUser(token)` |
| Application account registry, moderation, credits, plan copy | Mongoose User keyed by Supabase UUID: `D:\gptulternative\gptulternative\backend\src\models\User.js`; sync/check/me/account operations: `D:\gptulternative\gptulternative\backend\src\routes\auth.routes.js` |
| Plan lookup used by auth and legacy CLI | Supabase `users` table queries: `D:\gptulternative\gptulternative\backend\src\middleware\auth.js` and `D:\gptulternative\gptulternative\backend\src\routes\cli.routes.js`. Account/plan data therefore has multiple code representations; not everything is Mongo-only |
| Stored normal chat history and branch metadata | Mongoose Thread/Message: `D:\gptulternative\gptulternative\backend\src\models\Thread.js` and `D:\gptulternative\gptulternative\backend\src\models\Message.js`; persisted through the mounted chat router |
| Projects and instructions | Mongoose Project: `D:\gptulternative\gptulternative\backend\src\models\Project.js`; project IDs are referenced by Thread records |
| Custom personas | Mongoose Persona: `D:\gptulternative\gptulternative\backend\src\models\Persona.js`; curated registry personas are server source data rather than Mongo records |
| Settings | Mongoose UserSettings: `D:\gptulternative\gptulternative\backend\src\models\UserSettings.js`, accessed by the settings router; browser state also caches preferences |
| Workflow templates | Mongoose Workflow: `D:\gptulternative\gptulternative\backend\src\models\Workflow.js` |
| CLI sessions, knowledge, analytics | Mongoose models: `D:\gptulternative\gptulternative\backend\src\models\CLISession.js`, `D:\gptulternative\gptulternative\backend\src\models\KnowledgeGraph.js`, `D:\gptulternative\gptulternative\backend\src\models\UsageAnalytics.js` |
| API credentials and API usage | Mongoose ApiKey and UsageLog: `D:\gptulternative\gptulternative\backend\src\models\ApiKey.js`, `D:\gptulternative\gptulternative\backend\src\models\UsageLog.js`; the API-key auth path compares hashes |

MongoDB connection and fallback activation are in `D:\gptulternative\gptulternative\backend\src\config\database.js`. Missing URI, connection failure, or disconnection activates the patched local database; a successful connection deactivates it. `D:\gptulternative\gptulternative\backend\src\utils\fallbackDb.js` reads/writes per-model JSON at `D:\gptulternative\gptulternative\backend\data\<lowercase-model-name>.json`. This is an alternate local persistence path, not proof that production currently uses JSON.

`D:\gptulternative\gptulternative\backend\src\routes\usage.routes.js` derives web usage summaries/history from Message counts and token aggregates. `D:\gptulternative\gptulternative\backend\src\routes\stripe.routes.js` integrates Stripe and updates the Mongo User plan plus Supabase Auth user metadata. These files were inspected without running billing operations.

`D:\gptulternative\gptulternative\frontend\src\pages\app\LibraryPage.jsx` requests an unmounted `/library` endpoint and falls back to hard-coded sample chats. This page is not evidence of a separate library datastore. Chat threads themselves are stored through the Thread/Message models above.

`D:\gptulternative\gptulternative\backend\src\services\memory.js` implements a process-local Map containing plan/context/files/alerts/history. `SwarmOrchestrator` imports `MemoryManager`, but its inspected `processRequest` does not call it. This is not a demonstrated durable vector-memory pipeline.

## What MADHAV and RAVAN actually do

### MADHAV

There are different code paths under the same branding:

1. In `D:\gptulternative\gptulternative\backend\src\services\swarmOrchestrator.js`, `processRequest` treats every requested tier as MADHAV. It defines a 12-entry provider/model pool, randomly chooses a starting position among the first three, then tries entries **sequentially until the first success**. It sends a coding-assistant system prompt, supplied messages/tools, redacts string prompts with SecretScanner, and records usage. It returns text or tool calls; it neither executes a twelve-agent collaboration nor performs file writes. Its pool includes ApiFreeLLM, but its `ENDPOINTS` object has no `apifreellm` entry. Pool model strings were observed, not verified against upstream services.
2. In the main gateway, `codeva-madhav-v1` initially maps to OpenRouter `google/gemini-2.5-flash`; its streaming-specific chain is OpenRouter Qwen 2.5 72B, Hugging Face DeepSeek R1 Distill Llama 70B, then Groq Llama 3.3 70B, followed by the gateway's emergency behavior if needed.
3. Agent/IDE friendly-name maps translate `codeva/madhav` or `madhav` to `llm7/deepseek-v3.1:671b-terminus`; that gateway registry ID currently maps to OpenRouter Qwen 2.5 72B. It is not the same primary destination as `codeva-madhav-v1`.

### RAVAN

In `D:\gptulternative\gptulternative\backend\src\services\llm\gateway.js`, `codeva-ravan-v1` selects a RAVAN-specific system prompt and initially maps to OpenRouter Qwen 2.5 72B. Its configured streaming chain is Hugging Face Qwen 2.5 72B, OpenRouter Gemini 2.5 Flash, then Groq Llama 3.3 70B. Agent/IDE friendly-name maps translate `codeva/ravan` to this ID; actual selection is still subject to plan routing.

The `/ravan` and `/madhav` pages contain marketing descriptions and static displays. The inspected runtime paths demonstrate prompting, external-model selection, proxying, and cascading. They do not demonstrate proprietary model training, a ten-head RAVAN executor, or the benchmark/distributed-context capabilities described on those pages.

## VS Code extension versus Code-OSS

The **documented CyberCoder integration is a VS Code extension, not a Code-OSS fork**: its instructions install a VSIX into existing VS Code, describe an activity-bar chat panel, and describe handoff to a local CLI daemon. The backend offers completion/tool-call endpoints for that client. The extension's source/package is missing from this checkout, so its shipped behavior cannot be independently certified from these files.

`D:\gptulternative\gptulternative\frontend\src\pages\public\ExtensionDocsPage.jsx` lists nine claimed tools: `read_file`, `list_dir`, `grep`, `write_file`, `edit_file`, `run_command`, `git`, `spawn_subagent`, and `schedule_task`. It documents permission modes and Codeva-key/BYOK/Ollama authentication. `D:\gptulternative\gptulternative\frontend\src\pages\public\DocsArticlePage.jsx` describes workspace Q&A, editor diffs, and CLI handoff with approval. These are observed documentation claims, not locally inspected tool implementations.

There is also a separate legacy launcher, `D:\gptulternative\gptulternative\Start-Codevaa.bat`, which expects `upstream\vscode\.build\electron\Codevaa.exe`. That upstream tree is absent. Ignore rules mention other Code-OSS build locations too. Those artifacts are distinct from the documented extension and do not supply its missing source or a verified extension development boot path.

No rewrite, new application, repository restructuring, Master Lock implementation, or production operation was performed.

Stop.
