# Codeva dossier runtime — months 0–5

This extends the existing Codeva backend and projects shell. It does not replace chat, accounts, stored conversations, provider failover, Council, Cowork, billing, CyberCoder or the existing VS Code extension. The original inspected boot map remains [codeva-map.md](codeva-map.md); the editor contract is [editor-api.md](editor-api.md). Months 3–5 extend the same loop and store. Both [the original live gates](phase-0-2-acceptance.md) and [the current acceptance report](phase-3-5-acceptance.md) retain unresolved FAILs; the phase is **not done**.

## Runtime boundaries

`D:\gptulternative\gptulternative\backend\src\models\Dossier.js` stores dossiers in a new collection on the existing Mongo connection. `backend/src/services/dossier/store.js` uses revision-based compare-and-swap and rejects changes to the original prompt and preceding events. Supabase auth, Mongo projects/chats and their schemas remain authoritative for their existing responsibilities. JSON fallback remains available for existing features; the dossier worker refuses it because it has no cross-process CAS.

`backend/src/services/dossier/domain.js` defines the explicit state graph and spec gates. Illegal transitions throw. Active acceptance lines are required; all active lines need a user decision. The deterministic linter covers public/owner-only access contradictions and direct must-never/build conflicts. It is not a general natural-language proof system.

`backend/src/services/dossier/worker.js` runs separately from the API, using a 60-second Mongo lease and 15-second heartbeat. Each tick reads persisted state and executes one machine step. It refreshes the existing account plan/ban checks; existing cache windows remain 60 seconds for plans and 30 seconds for bans. Closing SSE does not stop the worker. API IPC disconnection stops the child at a safe point; after restart the next worker reads Mongo and waits out any previous lease. A real API kill/reopen exercise with the existing database is still required.

`backend/src/services/dossier/engine.js` implements Conductor, Listener, Builder, Tester, Judge and Judge-cheap only. Conductor generates a pending spec. Listener answers from stored state without cancelling work. Accepted build goals are separate sequential tasks with shared spec guards. Builder receives previous test/judge failures on retry and returns bounded source files that the controller writes only inside the project container. Tester can run only `python /runtime/runtime.py test`; the controller uses the real exit code, not a model's claim. Both independent judge calls receive accepted lines, trusted test output and the current screenshot PNG. They receive no builder transcript and no editing tools. Missing per-line evidence, invalid source IDs, disagreement or convergence on the same actual model blocks live/done.

`backend/src/services/dossier/models.js` calls the existing `llmGateway.complete`. Internal aliases are explicit worker routes and are excluded from automatic normal-chat/CLI model selection. Default builder/judge is OpenRouter `openai/gpt-4o-mini`; default cheaper judge is OpenRouter `google/gemini-2.5-flash`. Approved text fallback may use Mistral Codestral through the same gateway; image judges require the approved vision routes. Provider availability is not inferred from aliases. All failures remain blocked when there is no approved route.

Frontier is OpenRouter `anthropic/claude-sonnet-4`, requested only after two failed attempts of the same task and only when the existing plan permits premium models. Editing a bound spec resets that task's attempts. A Docker failure or missing provider key before an audited provider attempt does not count as a model attempt. Free-only output is never released as a final answer. Provider/model/reason are recorded without keys; SDK bodies are not printed in gateway error logs. Existing UsageLog gets separately labelled token estimates, not invented exact cost or a billing migration.

## Sandbox and generated app

`backend/src/services/dossier/sandbox/Dockerfile` pins Python **3.12.8-alpine3.21**. The generated stack is Python stdlib HTTP + SQLite + inline HTML/CSS/JS, with no downloaded dependencies. The trusted runtime is immutable at `/runtime/runtime.py`; generated code is `features.py` with `render(user, rows)`. It may use the stock owner-scoped GET/POST `rows` API for create/read/update/delete. Specs outside this stack must block rather than return fake integrations. Packs are `general`, `cs` and `commerce`; commerce is the sole new field pack.

`backend/src/services/dossier/sandbox.js` creates one `codeva-dossier-<Mongo project id>` container and named data volume per project. It requests `--network none`, 1 CPU, 256 MiB RAM/swap cap, 64 PIDs, dropped capabilities, no-new-privileges and a read-only root. It has no host workspace bind mount or public port mapping. The trusted Python server listens on container loopback; the existing API reaches it with bounded `docker exec` requests. Existing containers must match the policy before reuse.

Two explicit demo users and four rows are seeded before serving; `INSERT OR IGNORE` makes retries idempotent. These sample accounts belong to the generated preview only. They are not Codeva accounts. Its disposable SQLite file is generated-app state inside this sandbox, as required for code/database rollback; it is not an additional Codeva production database.

The browser controller intercepts HTTP requests to a fixed virtual preview origin and forwards only GET/POST to the same container. External HTTP routes and WebSockets are blocked, service workers are blocked, WebRTC constructors are disabled, and the preview CSP rejects external connections/frames/workers. Screenshots are bounded to a 1280×800 viewport. They are stored privately under `backend/data/dossier-artifacts`, excluded from git, and retrieved only through dossier ownership checks. This browser control is not a substitute for verifying the actual container network policy.

Snapshots contain generated text files and a SQLite backup, kept privately in the dossier. Rollback takes the worker lease, disables preview, restores code/database, restarts the same container and restores the last-green spec/tasks/judges. Later fix lines remain as rejected history and cannot inherit earlier approval. Stored clicks are replayed after a green fix. Done requires green distinct judges and a verified click in the current generation.

Only the owned preview is used for wrong-password, user isolation and row mutation tests. The tools accept no external target URL/IP or arbitrary tester shell command. Generated source, UI and tester output are scanned for secrets; pasted secret prompts fail before storage. Secret-bearing tester output blocks the task and is redacted before persistence or retry feedback, while retaining its actual command exit code. No git export is added in this phase, and `.git` writes are prohibited. This is not a claim of a complete dependency audit or universal generated-app correctness.

## Months 3–5 additions

`backend/src/services/dossier/materials.js` extracts readable PDF pages in a bounded disposable worker using pinned PDF.js, or accepts text notes. Chunks, source IDs and lexical indexes live on the existing Mongo dossier document. There is no chat migration or second vector database. Commerce answers are exact uploaded excerpts with a page or note ID; unmatched questions return exactly `The material does not contain it.` Both the existing web project screen and the new sidebar reject uncited or altered answers. This is lexical excerpt retrieval, not semantic answer generation or OCR.

`backend/src/services/dossier/tools.js` records tool calls, results and errors as existing dossier events. After a task's write, read/search/trusted-test calls can overlap inside that task. Replay pairs stored calls and outputs in start order and fails on missing or duplicate output; it never invokes a model to fill gaps. `backend/src/services/usage/projectMeter.js` derives free/mid/frontier provider-attempt counts from those persisted events, beside existing UsageLog. Both clients show the same counters after reload.

Every UI task stores its current private screenshot; subsequent tasks use `backend/src/services/dossier/visual.js` to store a pixel diff. An uncovered change above the configured 20% threshold fails the task. Coverage requires an accepted, bound, affirmative appearance/layout spec line; a negative or must-never line does not approve a change. This deterministic gate is not a general semantic design reviewer.

The trusted generated-app runtime inserts an English/Hindi toggle and persists its selection locally. Generated visible labels must carry literal translations; missing bilingual attributes fail trusted tests. Login labels also switch. The executed Chromium evidence uses fixed trusted fixture source, not an actual provider-built Docker app. Rebuild the sandbox image before deploying these runtime changes; existing containers have not been rolled out or certified here.

The authenticated `/api/v1/studio/tab` endpoint in `backend/src/services/dossier/tab.js` calls only a configured IP-loopback `/api/generate` model service, with a 100ms inference budget after authentication. It has no gateway/free-chat fallback. Its real HTTP tests use a fixed local service; an actual installed small model remains unverified. No editor ghost-text UI is added.

The pinned Code-OSS checkout, reproducible branding and API-only sidebar are documented in [editors/README.md](../editors/README.md). Native boot is blocked by the Windows C++ prerequisite, and the original separately managed extension cannot be built from this checkout. The 50 frozen dossier-invariant prompts, network-free fixture mode, non-zero regression check and opt-in live mode are documented in [evals/README.md](../evals/README.md).

## Boot alongside the existing app

Keep the API and web commands from the map. The API starts its worker automatically when the existing Mongo connection is durable and `DOSSIER_WORKER_ENABLED` is not `false`. The host also needs the Docker CLI/daemon and prebuilt image; no image is pulled during a user task.

On that configured sandbox host, from `D:\gptulternative\gptulternative`:

```powershell
docker build -t codeva-dossier-python:3.12.8-1 backend/src/services/dossier/sandbox
Set-Location backend
npm install
npx playwright install chromium
npm run dev
```

The pinned Playwright package is **1.63.0**. Do not run generated model-written Python on the host as a fallback. If Docker is missing or isolation does not match, the dossier blocks; existing chat remains available. Docker Desktop and WSL are now installed in this Windows workspace, but the engine reports no virtualization available / Virtual Machine Platform not enabled. The image build and actual container checks remain unperformed until the host can run the engine. No automatic restart or host-execution fallback was introduced.

For an explicitly separate worker process on the same existing backend configuration, disable automatic worker startup with `DOSSIER_WORKER_ENABLED=false` on the API and run `npm run dossier:worker` from `backend`. Both use the existing Mongo database and ownership leases. No new API app or database is needed.

Configure `DOSSIER_PREVIEW_ORIGIN` to the HTTP(S) origin reaching this same API and distinct from every `FRONTEND_URL` origin. Configure the existing frontend with `VITE_API_URL=http://localhost:3000/api/v1` for the map's local default. Preview uses a one-use 30-second POST launch token, then a 5-minute HttpOnly cookie and the generated demo login. It is not publicly reachable by possessing the URL alone. Existing account bans and project deletion also gate preview access. There is no deployment or region-residency claim in this change.

## Tests and their limits

From `backend`, `npm test` runs the repository's existing native Node test harness with module mocks; this checkout does not use Jest as its actual backend runner. Route tests use Supertest. External providers, Supabase and Mongo are mocked; they do not modify production data. `npm test` also runs real Chromium against a fixed trusted local Python fixture, so Python and the installed Playwright Chromium binary are required for that browser test.

```powershell
node --experimental-test-module-mocks --test --experimental-test-coverage '--test-coverage-include=**/services/dossier/*.js' '--test-coverage-include=**/routes/dossier.routes.js' '--test-coverage-include=**/services/usage/projectMeter.js' '--test-coverage-exclude=**/*.test.js' '--test-coverage-exclude=**/testFixtures.js' '--test-coverage-exclude=**/testPdfFixture.js' src/**/*.test.js
```

From the repository root:

```powershell
python backend/src/services/dossier/sandbox/runtime_test.py
```

The Python tests run actual SQLite and a local HTTP preview with trusted fixture source. They verify login, row read/mutation ownership, sample seeding/idempotency and source/database restoration. They are not proof of Docker isolation or of a provider-generated project's full behavior.

From `frontend`, `npm test` and `npm run build` use the unchanged Vite/Vitest commands. New studio DOM tests exercise bilingual labels, review gates, preserving edited text, exact prompt submission, listener/fix, private POST preview launch, named click, rollback and completion API actions. Project-evidence tests also cover PDF/notes uploads, exact cited excerpts/refusal, event-derived meters, screenshot-diff summaries and recorded replay.

The [fixture screenshot](evidence/dossier-preview-fixture.png) is actual Chromium output from the trusted test app, labelled as a fixture. It is not a production Codeva UI or a passed model-generated project. Generated screenshots, snapshots and local Docker volumes do not yet have retention/garbage-collection or backup administration; those DevOps features are outside this phase. No production deployment or push was performed.
