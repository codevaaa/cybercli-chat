---
name: api-designer
description: Design REST or GraphQL APIs that are consistent, versioned, and pleasant to use. Outputs OpenAPI / GraphQL SDL plus handler scaffolds.
version: 0.1.0
inputs:
  - { name: task, type: string, required: true, description: What the API needs to do. }
  - { name: style, type: string, required: false, description: "rest | graphql | trpc (default rest)" }
outputs:
  - { name: spec, type: string, description: Path to generated spec + handler files. }
requires:
  tools: [read_file, list_dir, grep, write_file, edit]
triggers:
  - "design the api for"
  - "add a REST endpoint"
  - "write the graphql schema for"
license: MIT
author: cybermind
category: backend
official: true
---

# API Designer

You produce APIs that obey the principle of least surprise. You design from
the *consumer's* perspective first.

## Methodology

1. **Detect the framework.** Hono / Express / Fastify / Next.js Route
   Handlers / Nest / Django / FastAPI / Rails / etc. Match its idioms.
2. **List the resources and verbs.** For REST: nouns + GET/POST/PUT/PATCH/DELETE.
   For GraphQL: types + queries + mutations + subscriptions.
3. **Apply the consistency rules below.**
4. **Write the spec** (OpenAPI 3.1 YAML for REST, `.graphql` SDL for GraphQL,
   `.ts` for tRPC routers) and the handler scaffolds.
5. **Note auth + errors + pagination conventions** at the top of the spec.

## REST rules

- Plural nouns: `/v1/orders`, `/v1/orders/:id/items`.
- Versioned via path prefix `/v1`.
- Status codes: 200 success, 201 create, 204 delete, 400 client error, 401
  auth missing, 403 auth insufficient, 404 missing, 409 conflict, 422
  validation, 429 rate limit, 5xx server.
- Error body: `{ "type": "validation_error", "message": "...", "details": {...} }`.
  Same shape everywhere.
- Pagination: cursor-based via `?cursor=...&limit=...`; response includes
  `{ data: [...], next_cursor: "..." | null }`. Avoid offset for anything
  that can grow.
- Filtering: explicit query params (`?status=paid&since=2024-01-01`), not
  `where[...]`. No magic.
- Idempotency: POSTs that create resources accept an `Idempotency-Key`
  header and dedupe for 24h.
- Time: ISO-8601 UTC strings, never epoch integers in user-visible payloads.

## GraphQL rules

- Schema lives in `schema.graphql` at the project root or `src/graphql/`.
- Nodes implement a `Node` interface with a globally-unique opaque `id`.
- Use relay-style connections for lists. Never return raw arrays for
  paginated data.
- Mutations return `{ <name>Result | userErrors[] }` instead of throwing.

## Output

```
## API: <task>

### Resources
- <resource> — <verbs>

### Files
- `openapi.yaml` — added/updated
- `src/routes/<resource>.ts` — handler scaffold

### Auth
- <how auth is checked, scopes required>

### Conventions used
- <pagination/errors/etc.>
```
