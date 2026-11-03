# Codeva editor API — months 0–5

These are the dossier routes added to the existing Codeva API, mounted at `/api/v1/studio`. The current web client uses them from `/projects/studio/:projectId`; the existing chat, projects, CLI, IDE and Council entry points remain. The authorized months 3–5 Code-OSS client is at `editors/code-oss`; it uses these same routes.

Source: `D:\gptulternative\gptulternative\backend\src\routes\dossier.routes.js`; mount: `D:\gptulternative\gptulternative\backend\src\server.js`; client: `D:\gptulternative\gptulternative\frontend\src\pages\app\DossierStudio.jsx`.

The JSON below was captured by Supertest from the actual Express handlers in `backend/src/routes/dossier.routes.test.js`. Authentication, Mongo, model responses and Docker are test doubles in that contract test. These are real handler request/response shapes, **not production sessions or verified model verdicts**. `fixture` provider/model values and screenshot references in these examples are test data. Full captures are also in [dossier-api-fixtures.json](dossier-api-fixtures.json). IDs, timestamps, event sequence and the single-use launch token will differ on each run.

All `/projects/...` routes require Codeva's existing `Authorization: Bearer <Supabase access token>` and ownership of the existing Project. The preview session exchange uses a one-time POST token obtained by that authenticated owner, then a private HttpOnly cookie. An API error does not cancel an active worker. SSE disconnect/reconnect also does not cancel it.

## HTTP contract

| Action | Method and relative path | Success |
| --- | --- | --- |
| Create existing Project + adjacent dossier | POST `/projects` | 201, project + dossier envelope |
| Attach dossier to an existing owned Project | POST `/projects/:id/dossier` | 201, dossier envelope |
| Read current persisted dossier | GET `/projects/:id/dossier` | 200, dossier envelope |
| Accept, reject or edit one line | PATCH `/projects/:id/spec/:lineId` | 200, dossier envelope |
| Queue accepted spec or retry checkpoint | POST `/projects/:id/run` | 202, dossier envelope; worker runs asynchronously |
| Read concurrent listener answer | POST `/projects/:id/listener` | 200, answer + stored source revision |
| Add fix requiring review | POST `/projects/:id/fix` | 202, dossier envelope |
| Read independent per-line judges | GET `/projects/:id/judges` | 200, state + judge array |
| Stream persisted events | GET `/projects/:id/progress?after=0` | 200, authenticated SSE |
| Execute and record a real preview click | POST `/projects/:id/click` | 200, dossier envelope |
| Get private preview launcher | POST `/projects/:id/preview` | 200, URLs + single-use token, 30-second lifetime |
| Exchange preview launch token | POST `/preview/:id/session` | 303, private cookie + redirect to preview |
| Open preview or use generated-app routes | GET/POST `/preview/:id/*` | Proxied app response, private cookie required |
| Retrieve an owned screenshot | GET `/projects/:id/artifacts/:name` | 200 PNG; name must be referenced in this dossier |
| Restore last green code + generated DB + preview | POST `/projects/:id/rollback` | 200, dossier envelope, only at worker safe point |
| Confirm completion | POST `/projects/:id/complete` | 200, dossier envelope; current green judges + current generation click required |

`prompt` is submitted verbatim, 1–16000 UTF-8 bytes; do not trim or enhance it client-side. `name` is 1–100 characters. Only `general`, `cs` and `commerce` packs are accepted. Secret-containing submissions are rejected with 422 before storage.

New spec lines begin `pending`. Review requests accept `accepted`, `rejected`, or `edited`; `edited` requires `text`, 1–2000 characters. Later accept/reject decisions preserve preceding edited final text. Each line carries stable `id`, original `text` and `final_text`. Every remaining line, including must-never lines, must be accepted/edited before building; there must be an active build goal and acceptance line. Rejected IDs are excluded from task bindings. A contradiction returns 422 on run and is exposed in the dossier `lint` array.

A question is `{question: string}`; a fix is `{text: string}`, each 1–2000 characters. Listener answers are deterministic facts from stored state, task counts and the current block, with a source revision. They do not invent an answer absent from the dossier or invoke a free model. Fixes create pending acceptance IDs and append to `prompts_added`; a running task finishes its safe point before review resumes.

Click input is either `{path: "/", button_label: "View notes"}` or `{path: "/", selector: "button"}`, never both. The shell uses the button's visible accessible name. Paths must be relative to the owned preview; methods are GET/POST only. The controller does not accept a target URL, IP, arbitrary shell command or uploaded runtime. Click execution returns a real screenshot/result; stored clicks are replayed after a green fix.

The dossier envelope contains `project_id`, `revision`, `dossier`, `lint` and `meter`. `dossier` contains the immutable original prompt/hash, ordered additions, spec, task evidence, judge lines, live interactions, sources, append-only events, state, generation and block. Only last-green generation/time are public; its internal code/database snapshot is never returned by the read endpoint. Each judge has actual `provider`, `model`, `agent_id` and exactly one `id`, `verdict`, `evidence`, `source_ids` record per active spec line. Missing, duplicate or unsupported pass evidence blocks the run. Both judges receive the current PNG and trusted test results, never the builder transcript or a file-edit tool.

Persisted states: `listen`, `spec`, `wait_for_user`, `tasks`, `build`, `test`, `judge`, `live`, `fix`, `done`, `blocked`. `blocked.reason` explains failure; `blocked.resume_state` identifies the retry checkpoint. The read response is authoritative after reconnect; the client never reconstructs it from a chat transcript.

Errors are `{ "error": "message" }`: 400 malformed input, 401 missing/expired login or preview session, 403 disallowed model tier, 404 missing/foreign project or artifact, 409 unsafe state/concurrent edit, 413 oversized preview request, 422 contradiction/secret/invalid generated evidence, 503 missing durable Mongo/Docker/runtime configuration. Unexpected exceptions return sanitized 500. Do not assume a 202 means the build passed.

## Progress stream

Use authenticated `fetch`, not an unauthenticated EventSource or token query string. Resume with `?after=<last seq>` or `Last-Event-ID` on a same-origin client; the existing global CORS whitelist does not add a new Last-Event-ID header allowance, so the web shell uses the query. Events have increasing `seq`, `time`, `project_id`, `state`, `agent_id`, `provider`, `model`, `spec_line_ids` and an event `kind`; provider/model are null on transitions that have no model call. Route attempts/failures/successes also record `reason`. No raw provider key is recorded. Heartbeats are SSE comments.

Captured first frame from the actual SSE route:

```text
id: 1
data: {"seq":1,"time":"2026-10-01T05:58:00.148Z","project_id":"6abdf6688cd632b74818aba6","state":"listen","agent_id":"Listener","provider":null,"model":null,"spec_line_ids":[],"kind":"prompt_saved"}

: heartbeat
```

## Months 3–5 additions

All project actions keep the same existing auth and ownership gate. No provider credential is accepted by the editor client.

| Action | Method under `/api/v1/studio` | Response |
| --- | --- | --- |
| Upload PDF or notes | POST `/projects/:id/materials` | 201, current dossier envelope |
| Question about uploaded material | POST `/projects/:id/material-question` | 200, exact excerpts/citations or locked refusal |
| Project model meter | GET `/projects/:id/meter` | 200, persisted-log-derived counts |
| Replay stored task tools | GET `/projects/:id/replay` | 200, ordered steps and complete/failed status |
| Local tab inference only | POST `/tab` | 200 bounded completion/timeout, or 503 if the local model is unavailable |

Material upload is either `{name,kind:"notes",text}` (100000-byte text limit) or `{name,kind:"pdf",data_base64}` (5 MB decoded, 100 pages, 200000 extracted characters). Parsing runs in a disposable worker with a 10-second deadline and bounded JS heap. Only supplied bytes and local pinned PDF.js fonts are used, never a source URL. Text is chunked into 800-character pieces with lexical terms, stored in the existing dossier's Mongo data; PDF page or note ID remains on every chunk. At most 20 files / 2 MB indexed JSON per dossier. Duplicate content of the same kind is not appended again. Original binary PDFs are not retained. Scanned/encrypted/unreadable files return 422; this phase adds no OCR.

Question input is `{question:string}` (2000 characters). Commerce returns only exact quoted chunks with `{material_id,name,kind,chunk_id,page|note_id,quote}`. It does not invent a synthesized factual answer. Unmatched material returns exactly `The material does not contain it.`, `supported:false`, and `citations:[]`. Both clients reject missing/invalid references or altered quote text using the same sentence. Lexical retrieval is deliberately narrow; relevant excerpts are not a semantic proof that a broader question was answered.

`meter` is `{free,mid,frontier,unit:"provider_attempts",through_seq}`. Every attempted route, including failed provider requests, counts once in its actual tier; failures/events do not double-count. Phase-1 events without `tier` use the same known provider/model classification. The append-only existing-Mongo event log is the authority, so reloading never resets the count. Existing UsageLog entries also include project ID; old account usage/billing routes are preserved.

Tool events add `tool_call_id`, `tool`, `input`, `output`, `task_id` and optional `tier`. `tool_start` is followed by `tool_result` or `tool_error`; only safe outputs are stored. Read/search/trusted test overlap within the task, not across builder writes. Replay pairs stored entries in start-sequence order. An unmatched/duplicate output or an old project with no recorded task tools produces `status:"failed"`; the endpoint performs no tool/model call to fill the gap. Nonzero tool outputs are displayed as recorded errors, not rewritten as success.

Task `screen.visual_diff` stores prior/current screenshot, changed-pixel ratio, diff PNG reference, threshold and covering spec IDs. First shot is an explicit baseline. Above 20% fails unless a bound accepted/edited affirmative appearance/layout line covers it; a must-never or negative line cannot approve a change. Ownership-gated PNG retrieval uses the existing artifact route. This deterministic gate is not a general visual-semantic verifier.

Tab input is `{prefix:string,suffix?:string}` (8000/2000 characters). The backend calls only `DOSSIER_TAB_MODEL_URL`, default `http://127.0.0.1:11434/api/generate`, model `qwen2.5-coder:0.5b`, with a 100ms inference budget and a bounded 512-character result. The URL must be an IP loopback HTTP `/api/generate` path; redirects/external hosts and the Codeva/free-chat path are rejected. No gateway/free provider call is possible in this module. The budget starts after existing authentication; auth latency is not claimed to be below 100ms. No model is downloaded automatically and no inline ghost text is registered.

## Captured JSON by action

Every response below is the complete captured handler response. GET actions have no body. The tab capture uses a fixed local HTTP inference fixture, not a verified neural model.

### Create project

`POST /api/v1/studio/projects`

Request JSON:

```json
{
  "name": "Notes",
  "prompt": "  Build a notes app\r\n🌏  ",
  "pack": "general"
}
```

Response: HTTP 201.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project": {
    "id": "6abdf788611039a2511917d9",
    "name": "Notes"
  },
  "project_id": "6abdf788611039a2511917d9",
  "revision": 0,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [],
    "pack": "general",
    "state": "listen",
    "spec": {
      "will_build": [],
      "must_never": [],
      "acceptance": []
    },
    "tasks": [],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      }
    ],
    "blocked": null,
    "generation": 0,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 0,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 1
  }
}
```

</details>

### Attach existing project

`POST /api/v1/studio/projects/507f1f77bcf86cd799439012/dossier`

Request JSON:

```json
{
  "prompt": "Use this existing project for a notes app",
  "pack": "cs"
}
```

Response: HTTP 201.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "507f1f77bcf86cd799439012",
  "revision": 0,
  "dossier": {
    "project_id": "507f1f77bcf86cd799439012",
    "prompt_original": "Use this existing project for a notes app",
    "prompt_sha256": "69dbe1db46b894f0477609bfa0fa38e47cb07418567a61ea46d0623d7c004bf1",
    "prompts_added": [],
    "pack": "cs",
    "state": "listen",
    "spec": {
      "will_build": [],
      "must_never": [],
      "acceptance": []
    },
    "tasks": [],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.960Z",
        "project_id": "507f1f77bcf86cd799439012",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      }
    ],
    "blocked": null,
    "generation": 0,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 0,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 1
  }
}
```

</details>

### Read dossier

`GET /api/v1/studio/projects/6abdf788611039a2511917d9/dossier`

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 0,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [],
    "pack": "general",
    "state": "listen",
    "spec": {
      "will_build": [],
      "must_never": [],
      "acceptance": []
    },
    "tasks": [],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      }
    ],
    "blocked": null,
    "generation": 0,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 0,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 1
  }
}
```

</details>

### Accept spec line

`PATCH /api/v1/studio/projects/6abdf788611039a2511917d9/spec/b575b32f-42b4-46d7-a22a-77da833ae430`

Request JSON:

```json
{
  "status": "accepted"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 6,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [],
    "pack": "general",
    "state": "wait_for_user",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after login",
          "status": "accepted"
        }
      ]
    },
    "tasks": [],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      }
    ],
    "blocked": null,
    "generation": 0,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 1,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 7
  }
}
```

</details>

### Edit spec line

`PATCH /api/v1/studio/projects/6abdf788611039a2511917d9/spec/b575b32f-42b4-46d7-a22a-77da833ae430`

Request JSON:

```json
{
  "status": "edited",
  "text": "Show owner notes after a successful login"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 7,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [],
    "pack": "general",
    "state": "wait_for_user",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        }
      ]
    },
    "tasks": [],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      }
    ],
    "blocked": null,
    "generation": 0,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 1,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 8
  }
}
```

</details>

### Start or resume

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/run`

Request JSON:

```json
{}
```

Response: HTTP 202.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 8,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [],
    "pack": "general",
    "state": "tasks",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "queued",
        "attempts": 0,
        "diff": [],
        "command": null,
        "output": null,
        "screenshot": null,
        "ui": true
      }
    ],
    "judge": [],
    "live": [],
    "sources": [],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": null
  },
  "lint": [],
  "meter": {
    "free": 1,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 9
  }
}
```

</details>

### Listener question

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/listener`

Request JSON:

```json
{
  "question": "What is running?"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
  "source": {
    "type": "dossier",
    "revision": 8,
    "state": "tasks"
  }
}
```

</details>

### Fix line

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/fix`

Request JSON:

```json
{
  "text": "Button must open notes"
}
```

Response: HTTP 202.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 35,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [
      {
        "id": "4a4ad211-b74a-4d73-889d-59756ffba0fb",
        "type": "question",
        "text": "What is running?",
        "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
        "time": "2026-10-01T06:02:48.980Z"
      },
      {
        "id": "f10c6544-6297-48d2-8cbe-3a6f3634add5",
        "type": "fix",
        "text": "Button must open notes",
        "time": "2026-10-01T06:02:49.007Z"
      }
    ],
    "pack": "general",
    "state": "wait_for_user",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        },
        {
          "id": "4d148b2a-eaae-464b-a1fb-b84d66a837e4",
          "text": "Button must open notes",
          "final_text": "Button must open notes",
          "status": "pending"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0"
      }
    ],
    "judge": [],
    "live": [
      {
        "id": "11dbbf5e-6522-4146-899c-ae7b16f3fb35",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "selector": "button"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "selector": "button"
          }
        }
      },
      {
        "id": "c0dee41c-1995-4650-9515-b1ef34f73f95",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ]
      },
      {
        "type": "screen",
        "id": "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:48.980Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "question"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "build_attempt",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "reason": "mid_default"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:48.985Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:48.991Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 33,
        "time": "2026-10-01T06:02:48.993Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 34,
        "time": "2026-10-01T06:02:49.005Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "done",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 35,
        "time": "2026-10-01T06:02:49.007Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "fix",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "transition"
      },
      {
        "seq": 36,
        "time": "2026-10-01T06:02:49.007Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430",
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "transition"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:48.985Z"
    },
    "current_task": "b4e02f19-6a24-4c16-9133-99a709b974ac"
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 36
  }
}
```

</details>

### Preview URL

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/preview`

Request JSON:

```json
{}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "preview_url": "http://127.0.0.1:52522/api/v1/studio/preview/6abdf788611039a2511917d9/",
  "launch_url": "http://127.0.0.1:52522/api/v1/studio/preview/6abdf788611039a2511917d9/session",
  "launch_token": "32408ad4a4384574a5199a60213907e24413755a4ba8621953044167a7af0023",
  "expires_in": 30
}
```

</details>

### Judge lines

`GET /api/v1/studio/projects/6abdf788611039a2511917d9/judges`

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "state": "live",
  "judge": [
    {
      "agent_id": "Judge",
      "provider": "fixture",
      "model": "Judge",
      "lines": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        },
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        },
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        }
      ]
    },
    {
      "agent_id": "Judge-cheap",
      "provider": "fixture",
      "model": "Judge-cheap",
      "lines": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        },
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        },
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "verdict": "pass",
          "evidence": "Trusted app screen contains notes",
          "source_ids": [
            "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
          ]
        }
      ]
    }
  ]
}
```

</details>

### Store click

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/click`

Request JSON:

```json
{
  "path": "/",
  "selector": "button"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 32,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [
      {
        "id": "4a4ad211-b74a-4d73-889d-59756ffba0fb",
        "type": "question",
        "text": "What is running?",
        "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
        "time": "2026-10-01T06:02:48.980Z"
      }
    ],
    "pack": "general",
    "state": "live",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "11dbbf5e-6522-4146-899c-ae7b16f3fb35",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "selector": "button"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "selector": "button"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ]
      },
      {
        "type": "screen",
        "id": "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:48.980Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "question"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "build_attempt",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "reason": "mid_default"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:48.985Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:48.991Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:48.985Z"
    },
    "current_task": "b4e02f19-6a24-4c16-9133-99a709b974ac"
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 32
  }
}
```

</details>

### Store button click

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/click`

Request JSON:

```json
{
  "path": "/",
  "button_label": "View notes"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 33,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [
      {
        "id": "4a4ad211-b74a-4d73-889d-59756ffba0fb",
        "type": "question",
        "text": "What is running?",
        "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
        "time": "2026-10-01T06:02:48.980Z"
      }
    ],
    "pack": "general",
    "state": "live",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "11dbbf5e-6522-4146-899c-ae7b16f3fb35",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "selector": "button"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "selector": "button"
          }
        }
      },
      {
        "id": "c0dee41c-1995-4650-9515-b1ef34f73f95",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ]
      },
      {
        "type": "screen",
        "id": "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:48.980Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "question"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "build_attempt",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "reason": "mid_default"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:48.985Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:48.991Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 33,
        "time": "2026-10-01T06:02:48.993Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:48.985Z"
    },
    "current_task": "b4e02f19-6a24-4c16-9133-99a709b974ac"
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 33
  }
}
```

</details>

### Rollback

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/rollback`

Request JSON:

```json
{}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 37,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [
      {
        "id": "4a4ad211-b74a-4d73-889d-59756ffba0fb",
        "type": "question",
        "text": "What is running?",
        "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
        "time": "2026-10-01T06:02:48.980Z"
      },
      {
        "id": "f10c6544-6297-48d2-8cbe-3a6f3634add5",
        "type": "fix",
        "text": "Button must open notes",
        "time": "2026-10-01T06:02:49.007Z"
      }
    ],
    "pack": "general",
    "state": "live",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        },
        {
          "id": "4d148b2a-eaae-464b-a1fb-b84d66a837e4",
          "text": "Button must open notes",
          "final_text": "Button must open notes",
          "status": "rejected"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "11dbbf5e-6522-4146-899c-ae7b16f3fb35",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "selector": "button"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "selector": "button"
          }
        }
      },
      {
        "id": "c0dee41c-1995-4650-9515-b1ef34f73f95",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ]
      },
      {
        "type": "screen",
        "id": "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:48.980Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "question"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "build_attempt",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "reason": "mid_default"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:48.985Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:48.991Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 33,
        "time": "2026-10-01T06:02:48.993Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 34,
        "time": "2026-10-01T06:02:49.005Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "done",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 35,
        "time": "2026-10-01T06:02:49.007Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "fix",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "transition"
      },
      {
        "seq": 36,
        "time": "2026-10-01T06:02:49.007Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430",
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "transition"
      },
      {
        "seq": 37,
        "time": "2026-10-01T06:02:49.010Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "blocked",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430",
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "transition"
      },
      {
        "seq": 38,
        "time": "2026-10-01T06:02:49.010Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "blocked",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430",
          "4d148b2a-eaae-464b-a1fb-b84d66a837e4"
        ],
        "kind": "blocked",
        "reason": "Restoring last green"
      },
      {
        "seq": 39,
        "time": "2026-10-01T06:02:49.010Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "rollback"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:48.985Z"
    },
    "current_task": "b4e02f19-6a24-4c16-9133-99a709b974ac"
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 39
  }
}
```

</details>

### Complete

`POST /api/v1/studio/projects/6abdf788611039a2511917d9/complete`

Request JSON:

```json
{}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf788611039a2511917d9",
  "revision": 34,
  "dossier": {
    "project_id": "6abdf788611039a2511917d9",
    "prompt_original": "  Build a notes app\r\n🌏  ",
    "prompt_sha256": "c60209be8170710a6a2db5b50de5176c7426e05315006d5ace06176c91036251",
    "prompts_added": [
      {
        "id": "4a4ad211-b74a-4d73-889d-59756ffba0fb",
        "type": "question",
        "text": "What is running?",
        "answer": "Stored state: tasks. 0/1 tasks tested. No stored block. The dossier contains no further verified answer to this question.",
        "time": "2026-10-01T06:02:48.980Z"
      }
    ],
    "pack": "general",
    "state": "done",
    "spec": {
      "will_build": [
        {
          "id": "089ba989-fe68-4867-bb2d-9897009b8369",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "30299329-fd13-4c14-85af-df455726c25b",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after a successful login",
          "status": "edited"
        }
      ]
    },
    "tasks": [
      {
        "id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "089ba989-fe68-4867-bb2d-9897009b8369",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "30299329-fd13-4c14-85af-df455726c25b",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          },
          {
            "id": "b575b32f-42b4-46d7-a22a-77da833ae430",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "11dbbf5e-6522-4146-899c-ae7b16f3fb35",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "selector": "button"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "selector": "button"
          }
        }
      },
      {
        "id": "c0dee41c-1995-4650-9515-b1ef34f73f95",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "46a80b28-f40b-4d25-9781-768795e2f5b0",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ]
      },
      {
        "type": "screen",
        "id": "screen:2031d3b7-5d5b-41fe-a0c3-6abe5aea4deb",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:5d4c2b04-31ff-4542-ac56-804fcaa76233"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:48.962Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:48.968Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:48.969Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:48.972Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:48.974Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "30299329-fd13-4c14-85af-df455726c25b"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:48.976Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:48.977Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:48.979Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:48.980Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "question"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "3d5b49e0-297d-4e0d-98ba-48c708ecda32",
        "tool": "read",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:48.981Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "build_attempt",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac",
        "reason": "mid_default"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "5720a344-5f94-471e-89af-61bdc3e02349",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:48.982Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "2ec0fce5-1da1-4f2e-8e89-140048bd8bc1",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "a3ff2a06-aba9-4db4-b451-160ff1366fda",
        "tool": "search",
        "output": [],
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "10375ce0-5c35-4978-90d7-1af8a025d847",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_start",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "input": {},
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "tool_result",
        "tool_call_id": "b4508d92-56f4-4f80-8b84-e99813b98dd9",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:48.983Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "task_id": "b4e02f19-6a24-4c16-9133-99a709b974ac"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:48.984Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:48.985Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:48.991Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 33,
        "time": "2026-10-01T06:02:48.993Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "live_click"
      },
      {
        "seq": 34,
        "time": "2026-10-01T06:02:49.005Z",
        "project_id": "6abdf788611039a2511917d9",
        "state": "done",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "089ba989-fe68-4867-bb2d-9897009b8369",
          "30299329-fd13-4c14-85af-df455726c25b",
          "b575b32f-42b4-46d7-a22a-77da833ae430"
        ],
        "kind": "transition"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:48.985Z"
    },
    "current_task": "b4e02f19-6a24-4c16-9133-99a709b974ac"
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 34
  }
}
```

</details>

### Upload notes

`POST /api/v1/studio/projects/6abdf789611039a2511917db/materials`

Request JSON:

```json
{
  "name": "Commerce notes",
  "kind": "notes",
  "text": "Stock inventory records goods available for sale."
}
```

Response: HTTP 201.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf789611039a2511917db",
  "revision": 32,
  "dossier": {
    "project_id": "6abdf789611039a2511917db",
    "prompt_original": "  Commerce inventory\r\nनमस्ते 🌏  ",
    "prompt_sha256": "ba06d4f0a49001ca1ac72767a0ad918e7775ab791a5a42f47dbcb03cc4771f31",
    "prompts_added": [],
    "pack": "commerce",
    "state": "done",
    "spec": {
      "will_build": [
        {
          "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after login",
          "status": "accepted"
        }
      ]
    },
    "tasks": [
      {
        "id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "e95161e7-89b4-4aa8-be32-022938af45d8"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "7c96597e-5ea4-46f1-9655-59105fa399b1",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "e95161e7-89b4-4aa8-be32-022938af45d8",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ]
      },
      {
        "type": "screen",
        "id": "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:24b1741d-aac0-4aa0-80ee-aab84fc26884",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:24b1741d-aac0-4aa0-80ee-aab84fc26884"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:49.035Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:49.041Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:49.042Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:49.043Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:49.044Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "147fe729-523f-4a7d-a7b4-87eb225ef39f",
        "tool": "read",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "147fe729-523f-4a7d-a7b4-87eb225ef39f",
        "tool": "read",
        "output": [],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "build_attempt",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
        "reason": "mid_default"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "5cf9c58f-56ee-435b-a8f4-7f04deadbf10",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "5cf9c58f-56ee-435b-a8f4-7f04deadbf10",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "ac863f1a-b426-4ff9-96a3-2bccb85b9ff7",
        "tool": "read",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "259e3a76-61ee-4c2a-9ebf-0a67ac7a8b3d",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "6c15883d-416f-4b5f-bde9-eec705c32589",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "ac863f1a-b426-4ff9-96a3-2bccb85b9ff7",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "259e3a76-61ee-4c2a-9ebf-0a67ac7a8b3d",
        "tool": "search",
        "output": [],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "6c15883d-416f-4b5f-bde9-eec705c32589",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "d87696b2-240a-454f-9bc8-88bd47cbbb57",
        "tool": "browser",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "d87696b2-240a-454f-9bc8-88bd47cbbb57",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:49.052Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "live_click"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:49.053Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "done",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:49.059Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "done",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "material_indexed"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:49.048Z"
    },
    "current_task": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
    "materials": [
      {
        "id": "6c654669-ad57-4165-a6b6-e3aaec71c246",
        "name": "Commerce notes",
        "kind": "notes",
        "sha256": "cd6cb7234184cb168d3a5e9180b074773f8ef41ce68f4766e8ae1fe8d9babb07",
        "chunks": [
          {
            "id": "c8c53535-28d0-4016-a58b-83854794f07b",
            "note_id": "ea5fbad3-7503-467d-9151-1ad610cfc30d",
            "offset": 0,
            "text": "Stock inventory records goods available for sale.",
            "terms": [
              "stock",
              "inventory",
              "records",
              "goods",
              "available",
              "sale"
            ]
          }
        ],
        "created_at": "2026-10-01T06:02:49.059Z"
      }
    ]
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 32
  }
}
```

</details>

### Upload PDF

`POST /api/v1/studio/projects/6abdf789611039a2511917db/materials`

Request JSON:

```json
{
  "name": "Commerce.pdf",
  "kind": "pdf",
  "data_base64": "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFs0IDAgUiA2IDAgUl0gL0NvdW50IDIgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNDAwIDMwMF0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgMyAwIFIgPj4gPj4gL0NvbnRlbnRzIDUgMCBSID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNzAgPj4Kc3RyZWFtCkJUIC9GMSAxMiBUZiAyMCAyMDAgVGQgKENvbW1lcmNlIHJldmVudWUgZXF1YWxzIHNhbGVzIHJlY2VpdmVkLikgVGogRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNDAwIDMwMF0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgMyAwIFIgPj4gPj4gL0NvbnRlbnRzIDcgMCBSID4+CmVuZG9iago3IDAgb2JqCjw8IC9MZW5ndGggNzEgPj4Kc3RyZWFtCkJUIC9GMSAxMiBUZiAyMCAyMDAgVGQgKFN0b2NrIGludmVudG9yeSBjb250YWlucyBmaW5pc2hlZCBnb29kcy4pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDEyMSAwMDAwMCBuIAowMDAwMDAwMTkxIDAwMDAwIG4gCjAwMDAwMDAzMTcgMDAwMDAgbiAKMDAwMDAwMDQzNyAwMDAwMCBuIAowMDAwMDAwNTYzIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgOCAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNjg0CiUlRU9G"
}
```

Response: HTTP 201.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "project_id": "6abdf789611039a2511917db",
  "revision": 33,
  "dossier": {
    "project_id": "6abdf789611039a2511917db",
    "prompt_original": "  Commerce inventory\r\nनमस्ते 🌏  ",
    "prompt_sha256": "ba06d4f0a49001ca1ac72767a0ad918e7775ab791a5a42f47dbcb03cc4771f31",
    "prompts_added": [],
    "pack": "commerce",
    "state": "done",
    "spec": {
      "will_build": [
        {
          "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "text": "Show notes",
          "final_text": "Show notes",
          "status": "accepted"
        }
      ],
      "must_never": [
        {
          "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "text": "Expose secrets",
          "final_text": "Expose secrets",
          "status": "accepted"
        }
      ],
      "acceptance": [
        {
          "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
          "text": "Show owner notes after login",
          "final_text": "Show owner notes after login",
          "status": "accepted"
        }
      ]
    },
    "tasks": [
      {
        "id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "status": "tested",
        "attempts": 1,
        "diff": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "command": "python /runtime/runtime.py test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "screenshot": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "ui": true,
        "builder": {
          "provider": "fixture",
          "model": "Builder"
        },
        "screen": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null,
          "visual_diff": {
            "baseline": true,
            "ratio": 0,
            "allowed": true
          }
        },
        "test_id": "e95161e7-89b4-4aa8-be32-022938af45d8"
      }
    ],
    "judge": [
      {
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "lines": [
          {
            "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          }
        ]
      },
      {
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "lines": [
          {
            "id": "1b572145-fc57-4681-aa2d-e20b2c28a16a",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          },
          {
            "id": "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e",
            "verdict": "pass",
            "evidence": "Trusted app screen contains notes",
            "source_ids": [
              "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee"
            ]
          }
        ]
      }
    ],
    "live": [
      {
        "id": "7c96597e-5ea4-46f1-9655-59105fa399b1",
        "type": "click",
        "generation": 1,
        "click": {
          "path": "/",
          "button_label": "View notes"
        },
        "result": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": {
            "path": "/",
            "button_label": "View notes"
          }
        }
      }
    ],
    "sources": [
      {
        "type": "test",
        "test_id": "e95161e7-89b4-4aa8-be32-022938af45d8",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ]
      },
      {
        "type": "screen",
        "id": "screen:78b7e14a-57c4-4bfb-9d7d-ec30290bfaee",
        "path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png"
      },
      {
        "type": "test",
        "id": "test:24b1741d-aac0-4aa0-80ee-aab84fc26884",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output",
          "source_id": "test:24b1741d-aac0-4aa0-80ee-aab84fc26884"
        }
      }
    ],
    "events": [
      {
        "seq": 1,
        "time": "2026-10-01T06:02:49.035Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "listen",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "prompt_saved"
      },
      {
        "seq": 2,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [],
        "kind": "transition"
      },
      {
        "seq": 3,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "spec",
        "agent_id": "Conductor",
        "provider": "fixture",
        "model": "Conductor",
        "spec_line_ids": [],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 4,
        "time": "2026-10-01T06:02:49.038Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 5,
        "time": "2026-10-01T06:02:49.041Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 6,
        "time": "2026-10-01T06:02:49.042Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 7,
        "time": "2026-10-01T06:02:49.043Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "wait_for_user",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "spec_review"
      },
      {
        "seq": 8,
        "time": "2026-10-01T06:02:49.044Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "tasks",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 9,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 10,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "147fe729-523f-4a7d-a7b4-87eb225ef39f",
        "tool": "read",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 11,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "147fe729-523f-4a7d-a7b4-87eb225ef39f",
        "tool": "read",
        "output": [],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 12,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "build_attempt",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
        "reason": "mid_default"
      },
      {
        "seq": 13,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": "fixture",
        "model": "Builder",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 14,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "5cf9c58f-56ee-435b-a8f4-7f04deadbf10",
        "tool": "write",
        "input": {
          "paths": [
            "features.py"
          ]
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 15,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "build",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "5cf9c58f-56ee-435b-a8f4-7f04deadbf10",
        "tool": "write",
        "output": [
          {
            "path": "features.py",
            "before": "",
            "after": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 16,
        "time": "2026-10-01T06:02:49.045Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 17,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "ac863f1a-b426-4ff9-96a3-2bccb85b9ff7",
        "tool": "read",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 18,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "259e3a76-61ee-4c2a-9ebf-0a67ac7a8b3d",
        "tool": "search",
        "input": {
          "query": "render"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 19,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "6c15883d-416f-4b5f-bde9-eec705c32589",
        "tool": "test",
        "input": {
          "command": "python /runtime/runtime.py test"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 20,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "ac863f1a-b426-4ff9-96a3-2bccb85b9ff7",
        "tool": "read",
        "output": [
          {
            "path": "features.py",
            "content": "def render(user, rows): return \"<h1>Notes</h1>\""
          }
        ],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 21,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "259e3a76-61ee-4c2a-9ebf-0a67ac7a8b3d",
        "tool": "search",
        "output": [],
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 22,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "6c15883d-416f-4b5f-bde9-eec705c32589",
        "tool": "test",
        "output": {
          "exit_code": 0,
          "tests": [
            "owner_isolation",
            "idempotent_seed"
          ],
          "rows": 4,
          "output": "trusted output"
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 23,
        "time": "2026-10-01T06:02:49.046Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_start",
        "tool_call_id": "d87696b2-240a-454f-9bc8-88bd47cbbb57",
        "tool": "browser",
        "input": {},
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 24,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "test",
        "agent_id": "Builder",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "tool_result",
        "tool_call_id": "d87696b2-240a-454f-9bc8-88bd47cbbb57",
        "tool": "browser",
        "output": {
          "screenshot": "00000000-0000-0000-0000-000000000001.png",
          "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
          "text": "Rendered owner notes",
          "click": null
        },
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 25,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "tasks",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a"
      },
      {
        "seq": 26,
        "time": "2026-10-01T06:02:49.047Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 27,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge",
        "provider": "fixture",
        "model": "Judge",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 28,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "judge",
        "agent_id": "Judge-cheap",
        "provider": "fixture",
        "model": "Judge-cheap",
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "provider_attempt",
        "reason": "test_fixture",
        "tier": "free"
      },
      {
        "seq": 29,
        "time": "2026-10-01T06:02:49.048Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "live",
        "agent_id": "Judge",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition",
        "verdict": "pass"
      },
      {
        "seq": 30,
        "time": "2026-10-01T06:02:49.052Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "live",
        "agent_id": "Tester",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "live_click"
      },
      {
        "seq": 31,
        "time": "2026-10-01T06:02:49.053Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "done",
        "agent_id": "Conductor",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "transition"
      },
      {
        "seq": 32,
        "time": "2026-10-01T06:02:49.059Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "done",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "material_indexed"
      },
      {
        "seq": 33,
        "time": "2026-10-01T06:02:49.263Z",
        "project_id": "6abdf789611039a2511917db",
        "state": "done",
        "agent_id": "Listener",
        "provider": null,
        "model": null,
        "spec_line_ids": [
          "1b572145-fc57-4681-aa2d-e20b2c28a16a",
          "2101b793-191b-40f2-8bf5-d2c9a4823a2c",
          "24df01f6-b4d5-4c87-bee9-e5e2fe5d7a8e"
        ],
        "kind": "material_indexed"
      }
    ],
    "blocked": null,
    "generation": 1,
    "last_green": {
      "generation": 1,
      "time": "2026-10-01T06:02:49.048Z"
    },
    "current_task": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
    "materials": [
      {
        "id": "6c654669-ad57-4165-a6b6-e3aaec71c246",
        "name": "Commerce notes",
        "kind": "notes",
        "sha256": "cd6cb7234184cb168d3a5e9180b074773f8ef41ce68f4766e8ae1fe8d9babb07",
        "chunks": [
          {
            "id": "c8c53535-28d0-4016-a58b-83854794f07b",
            "note_id": "ea5fbad3-7503-467d-9151-1ad610cfc30d",
            "offset": 0,
            "text": "Stock inventory records goods available for sale.",
            "terms": [
              "stock",
              "inventory",
              "records",
              "goods",
              "available",
              "sale"
            ]
          }
        ],
        "created_at": "2026-10-01T06:02:49.059Z"
      },
      {
        "id": "5462140e-439f-4cc8-a5e1-55f3ea4ac64a",
        "name": "Commerce.pdf",
        "kind": "pdf",
        "sha256": "be94994dc2285a993d8a55a79153c616228e92b5f124b60d90ac9de2c909c877",
        "chunks": [
          {
            "id": "c3cf0c59-4567-490d-9acb-fdd83e246953",
            "page": 1,
            "offset": 0,
            "text": "Commerce revenue equals sales received.",
            "terms": [
              "commerce",
              "revenue",
              "equals",
              "sales",
              "received"
            ]
          },
          {
            "id": "6bffeefc-ac00-48e0-a1ea-749feee4f11e",
            "page": 2,
            "offset": 0,
            "text": "Stock inventory contains finished goods.",
            "terms": [
              "stock",
              "inventory",
              "contains",
              "finished",
              "goods"
            ]
          }
        ],
        "created_at": "2026-10-01T06:02:49.263Z"
      }
    ]
  },
  "lint": [],
  "meter": {
    "free": 4,
    "mid": 0,
    "frontier": 0,
    "unit": "provider_attempts",
    "through_seq": 33
  }
}
```

</details>

### Material cited question

`POST /api/v1/studio/projects/6abdf789611039a2511917db/material-question`

Request JSON:

```json
{
  "question": "stock inventory"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "answer": "Stock inventory records goods available for sale.",
  "citations": [
    {
      "material_id": "6c654669-ad57-4165-a6b6-e3aaec71c246",
      "name": "Commerce notes",
      "kind": "notes",
      "chunk_id": "c8c53535-28d0-4016-a58b-83854794f07b",
      "note_id": "ea5fbad3-7503-467d-9151-1ad610cfc30d",
      "quote": "Stock inventory records goods available for sale."
    }
  ],
  "supported": true,
  "mode": "exact_excerpts"
}
```

</details>

### PDF cited question

`POST /api/v1/studio/projects/6abdf789611039a2511917db/material-question`

Request JSON:

```json
{
  "question": "stock inventory"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "answer": "Stock inventory records goods available for sale.\n\nStock inventory contains finished goods.",
  "citations": [
    {
      "material_id": "6c654669-ad57-4165-a6b6-e3aaec71c246",
      "name": "Commerce notes",
      "kind": "notes",
      "chunk_id": "c8c53535-28d0-4016-a58b-83854794f07b",
      "note_id": "ea5fbad3-7503-467d-9151-1ad610cfc30d",
      "quote": "Stock inventory records goods available for sale."
    },
    {
      "material_id": "5462140e-439f-4cc8-a5e1-55f3ea4ac64a",
      "name": "Commerce.pdf",
      "kind": "pdf",
      "chunk_id": "6bffeefc-ac00-48e0-a1ea-749feee4f11e",
      "page": 2,
      "quote": "Stock inventory contains finished goods."
    }
  ],
  "supported": true,
  "mode": "exact_excerpts"
}
```

</details>

### Material absent question

`POST /api/v1/studio/projects/6abdf789611039a2511917db/material-question`

Request JSON:

```json
{
  "question": "quantum zebras"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "answer": "The material does not contain it.",
  "citations": [],
  "supported": false
}
```

</details>

### Project model meter

`GET /api/v1/studio/projects/6abdf789611039a2511917db/meter`

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "free": 4,
  "mid": 0,
  "frontier": 0,
  "unit": "provider_attempts",
  "through_seq": 33
}
```

</details>

### Replay stored tools

`GET /api/v1/studio/projects/6abdf789611039a2511917db/replay`

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "status": "complete",
  "steps": [
    {
      "seq": 10,
      "time": "2026-10-01T06:02:49.045Z",
      "tool_call_id": "147fe729-523f-4a7d-a7b4-87eb225ef39f",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "read",
      "input": {},
      "output": [],
      "result_seq": 11,
      "status": "complete"
    },
    {
      "seq": 14,
      "time": "2026-10-01T06:02:49.045Z",
      "tool_call_id": "5cf9c58f-56ee-435b-a8f4-7f04deadbf10",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "write",
      "input": {
        "paths": [
          "features.py"
        ]
      },
      "output": [
        {
          "path": "features.py",
          "before": "",
          "after": "def render(user, rows): return \"<h1>Notes</h1>\""
        }
      ],
      "result_seq": 15,
      "status": "complete"
    },
    {
      "seq": 17,
      "time": "2026-10-01T06:02:49.046Z",
      "tool_call_id": "ac863f1a-b426-4ff9-96a3-2bccb85b9ff7",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "read",
      "input": {},
      "output": [
        {
          "path": "features.py",
          "content": "def render(user, rows): return \"<h1>Notes</h1>\""
        }
      ],
      "result_seq": 20,
      "status": "complete"
    },
    {
      "seq": 18,
      "time": "2026-10-01T06:02:49.046Z",
      "tool_call_id": "259e3a76-61ee-4c2a-9ebf-0a67ac7a8b3d",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "search",
      "input": {
        "query": "render"
      },
      "output": [],
      "result_seq": 21,
      "status": "complete"
    },
    {
      "seq": 19,
      "time": "2026-10-01T06:02:49.046Z",
      "tool_call_id": "6c15883d-416f-4b5f-bde9-eec705c32589",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "test",
      "input": {
        "command": "python /runtime/runtime.py test"
      },
      "output": {
        "exit_code": 0,
        "tests": [
          "owner_isolation",
          "idempotent_seed"
        ],
        "rows": 4,
        "output": "trusted output"
      },
      "result_seq": 22,
      "status": "complete"
    },
    {
      "seq": 23,
      "time": "2026-10-01T06:02:49.046Z",
      "tool_call_id": "d87696b2-240a-454f-9bc8-88bd47cbbb57",
      "task_id": "2f3bc224-a1c6-4da7-a5c6-5e62650cd96a",
      "tool": "browser",
      "input": {},
      "output": {
        "screenshot": "00000000-0000-0000-0000-000000000001.png",
        "screenshot_path": "dossier-artifacts/00000000-0000-0000-0000-000000000001.png",
        "text": "Rendered owner notes",
        "click": null
      },
      "result_seq": 24,
      "status": "complete"
    }
  ]
}
```

</details>

### Local tab completion

`POST /api/v1/studio/tab`

Request JSON:

```json
{
  "prefix": "const next = ",
  "suffix": "\n"
}
```

Response: HTTP 200.

<details>
<summary>Complete captured response JSON</summary>

```json
{
  "completion": "1;",
  "host": "http://127.0.0.1:52584",
  "model": "qwen2.5-coder:0.5b",
  "budget_ms": 100,
  "elapsed_ms": 1.4309999999999263
}
```

</details>

## Existing-project attach and private preview exchange

Attaching an existing owned project calls POST `/projects/:id/dossier` with the same `{prompt,pack}` fields as create, but no name. Its response is the same dossier envelope as read/create, without create's `project` object. A duplicate dossier is 409 through Mongo's unique project index.

POST `/preview/:id/session` takes `{token: <launch_token from the captured preview response>}` as JSON or form data. Its response is a 303 redirect and `Set-Cookie: codeva_project_preview=...; HttpOnly; SameSite=Lax; Path=/api/v1/studio/preview/:id; Max-Age=300`, with Secure on HTTPS. It does not return JSON. The launch token is consumed atomically and cannot be reused. Never put either token in a URL. The preview is unavailable during build/fix/rollback, even with an unexpired cookie. A project deletion also disables it.

The preview origin must differ from every origin in Codeva's existing `FRONTEND_URL` setting. Configure `DOSSIER_PREVIEW_ORIGIN` to an HTTP(S) origin that reaches this same API; it is not a second web app. The preview URL by itself gives 401. Opening it requires the authenticated owner's one-time launch exchange, then the generated app's separate sample login. Sample credentials are explicitly demo fixtures: `sample-a` or `sample-b`, password `Demo-2026!`. They do not bypass the outer Codeva project ownership gate.

Generated code never receives Codeva/provider credentials. Responses have no-store and a restrictive CSP; only inline generated CSS/JS and same-origin data calls work. Authentication cookies for generated rows are rewritten to this project's preview path. The generated stack has its own disposable SQLite inside the existing project's sandbox volume; this is generated-app sample data, not a second Codeva product database. Stock row APIs enforce owner-scoped read/create/update/delete. Build specifications requiring unsupported integrations must block, not fabricate them.

## Regenerate these examples

The installed MrCodevaa participant also calls existing `/api/v1/ide/me`, `/api/v1/ide/complete`, `/api/v1/chat` and `/api/v1/agents`; those are outside the `/studio` prefix. `backend/src/routes/ide.routes.js` resolves curated `agentId` through the existing registry and forwards structured tool calls/results. `responsePreferences` is interpreted by `backend/src/services/chat/assistantPreferences.js` as closed style/language enums. Neither setting changes the existing account plan, provider billing or Mongo chat ownership.

IDE completion SSE aborts its upstream provider when the client disconnects, disposes its keepalive and emits one DONE frame on successful completion. Unexpected exceptions become a generic error frame. The actual HTTP cancellation test is in `backend/src/routes/agent.routes.test.js`; provider behavior is mocked for that regression check.

Standard chat now stores the responding provider/model emitted by the gateway, including failover, while the thread retains the user's selected model. The actual isolated Mongo/provider route test detected and verified this correction: requested APINEX GPT Luna failed with 402, responded through OpenRouter `openai/gpt-4o-mini`, and stored that actual identity. Hindi IDE preferences and a structured read-only tool-result round trip also passed. Evidence: `artifacts/codeva-editor/normal-chat.json`; this is existing API-key authentication, not production Supabase editor login.

`POST /api/v1/auth/ide-refresh` accepts the existing account's refresh credential in the request body, rate-limits attempts and returns access/refresh/expiry only after isolated Supabase refresh and the existing Mongo account status check. Source: `backend/src/services/auth/editorSession.js`; mount: `backend/src/routes/auth.routes.js`. Credentials never enter a query string, artifact or client webview. This route and the existing website callback must deploy together before production editor login is certified.

Terminal assistance uses the normal chat route after explicit draft submission. Only a selected, bounded and credential-checked excerpt is sent; no arbitrary terminal execution endpoint is added.

From `D:\gptulternative\gptulternative\backend`:

```powershell
$env:DOSSIER_CAPTURE_CONTRACTS = 'true'
node --experimental-test-module-mocks --test src/routes/dossier.routes.test.js
Remove-Item Env:DOSSIER_CAPTURE_CONTRACTS
node ../docs/render-editor-api.mjs
```

This captures fixture JSON/SSE and renders this document from them; it does not call production providers, auth, billing or storage. Repeat when handlers change. Live environment acceptance remains separately listed in [phase-0-2-acceptance.md](phase-0-2-acceptance.md) and [phase-3-5-acceptance.md](phase-3-5-acceptance.md).
