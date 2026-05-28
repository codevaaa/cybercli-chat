# CyberMind Cloud — Backend Implementation Prompt

> **Paste this entire document into your backend repo's agent (Claude Code / Cursor / Windsurf) and have it implement the system end-to-end.** This is the production backend for the `cybermind` CLI (npm: `cybermind`, binary `cybermind` / `cm`), hosted at `cybermindcli.info` (formerly `cybercli-chat.vercel.app`). It is Anthropic-Console-class: auth, multi-provider LLM proxy, billing, a 75-skill marketplace, team workspaces, encrypted cloud sync, telemetry, and a web dashboard.

---

## 0. Mission

You are extending the existing Next.js project at `cybercli-chat.vercel.app` (will rebrand to `cybermindcli.info`) into the **production SaaS backend for CyberMind CLI**. The CLI talks to this backend exactly the way Claude Code talks to Anthropic Console — same auth model, same API surface — except this backend additionally routes to multiple providers and hosts our own models (e.g. `minimax-m2.5-free`).

**Definition of done:** A user can run `npm i -g cybermind`, then `cybermind login`, complete OAuth in the browser, return to the CLI authenticated, and have every LLM call billed against their CyberMind account. Plus a fully working web dashboard at `cybermindcli.info`, plus 75 pre-seeded marketplace skills, plus team workspaces, plus billing.

---

## 1. Tech stack (lock these in)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 App Router** | Already deployed on Vercel, edge + node runtimes both available |
| Language | **TypeScript strict** | Matches CLI |
| Database | **Postgres** via **Neon** (serverless) | Cheap, branchable, edge-friendly |
| ORM | **Prisma 5** | Generates types we share with the CLI |
| Cache + queues | **Upstash Redis** + **Upstash QStash** | Rate limit, idempotency keys, background jobs |
| Object storage | **Cloudflare R2** (S3 API) | Cheap egress for skill artifacts and cloud-sync blobs |
| Auth | **Custom JWT + refresh** for API keys; **Auth.js (NextAuth)** for web sessions | Anthropic-Console-style with our own `sk-cm-…` keys |
| Email | **Resend** | Verification, password reset, invoices |
| Billing | **Stripe** (Subscriptions + Metered Billing) | Usage-based + tiered plans |
| Search | **Postgres `tsvector`** + **pgvector** for embedding similarity | Marketplace search, related-skills |
| Observability | **Sentry** + **Axiom** (via Vercel integration) | Errors + structured logs |
| LLM SDKs | `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, native fetch for Ollama | Multi-provider routing |
| Deployment | **Vercel** for web/edge; **Neon** for DB; **Upstash** for Redis | Single platform = single bill |

> Add every package to `package.json` and run `pnpm install` after scaffolding.

---

## 2. Repository layout (delta from the existing project)

```
cybermindcli.info/
├─ app/
│  ├─ (web)/                     # Marketing + dashboard pages
│  │  ├─ page.tsx                # Landing
│  │  ├─ pricing/page.tsx
│  │  ├─ skills/page.tsx         # Marketplace index
│  │  ├─ skills/[owner]/[repo]/[skill]/page.tsx  # Skill detail
│  │  ├─ dashboard/page.tsx      # User dashboard (usage, keys, billing)
│  │  ├─ dashboard/keys/page.tsx
│  │  ├─ dashboard/billing/page.tsx
│  │  ├─ dashboard/team/page.tsx
│  │  └─ docs/[...slug]/page.tsx # Astro Starlight (or MDX) docs
│  ├─ (auth)/
│  │  ├─ login/page.tsx
│  │  ├─ signup/page.tsx
│  │  ├─ verify/page.tsx
│  │  ├─ reset/page.tsx
│  │  └─ oauth/callback/route.ts
│  └─ api/
│     ├─ v1/
│     │  ├─ messages/route.ts          # Anthropic-compatible
│     │  ├─ chat/completions/route.ts  # OpenAI-compatible
│     │  ├─ models/route.ts            # List models for current user
│     │  ├─ usage/route.ts             # Usage summary for current key
│     │  ├─ keys/route.ts              # Create/list/revoke API keys
│     │  ├─ skills/route.ts            # Marketplace: list/search/publish
│     │  ├─ skills/[id]/route.ts       # Get/update/delete a skill
│     │  ├─ skills/[id]/install/route.ts
│     │  ├─ skills/[id]/versions/route.ts
│     │  ├─ orgs/route.ts              # Teams
│     │  ├─ orgs/[id]/members/route.ts
│     │  ├─ sync/blob/[scope]/route.ts # Encrypted cloud sync
│     │  ├─ telemetry/route.ts         # Opt-in telemetry sink
│     │  └─ mcp/route.ts               # MCP server registry
│     ├─ webhooks/
│     │  └─ stripe/route.ts
│     └─ auth/[...nextauth]/route.ts
├─ lib/
│  ├─ db.ts                      # Prisma client singleton
│  ├─ auth/
│  │  ├─ password.ts             # argon2id hashing
│  │  ├─ jwt.ts                  # sign/verify
│  │  ├─ api-keys.ts             # sk-cm-… issuance
│  │  └─ session.ts              # NextAuth helpers
│  ├─ providers/                 # Server-side LLM SDK wrappers
│  │  ├─ anthropic.ts
│  │  ├─ openai.ts
│  │  ├─ gemini.ts
│  │  ├─ minimax.ts              # Your hosted models
│  │  └─ router.ts               # Per-key/model routing
│  ├─ billing/
│  │  ├─ stripe.ts
│  │  ├─ usage.ts                # Token accounting
│  │  └─ plans.ts                # Free, Pro, Team, Enterprise
│  ├─ ratelimit.ts               # Upstash Redis sliding window
│  ├─ storage.ts                 # R2 client
│  ├─ skills/
│  │  ├─ parse.ts                # SKILL.md YAML frontmatter parser
│  │  ├─ sync.ts                 # Nightly GitHub re-sync
│  │  └─ embed.ts                # pgvector embedding for related search
│  ├─ telemetry.ts               # Sentry + Axiom wrappers
│  └─ crypto.ts                  # AES-GCM for sync blobs
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                    # Seeds 75 curated skills (see §11)
├─ scripts/
│  ├─ seed-skills.ts             # Pulls SKILL.md from GitHub for the 75 seeds
│  └─ rotate-keys.ts             # Rotates pepper / signing keys
├─ middleware.ts                 # CORS, CSP, rate limit, auth header parse
├─ next.config.ts
└─ package.json
```

---

## 3. Database schema (Prisma)

Implement exactly this `prisma/schema.prisma`. Run `prisma migrate dev --name init` afterwards.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
  extensions = [pgvector(map: "vector"), pg_trgm]
}

// ─────── Identity ───────

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  emailVerifiedAt DateTime?
  passwordHash    String?   // null if OAuth-only
  displayName     String?
  avatarUrl       String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?

  orgs            OrgMembership[]
  ownedOrgs       Org[]            @relation("OrgOwner")
  apiKeys         ApiKey[]
  oauthAccounts   OAuthAccount[]
  sessions        Session[]
  publishedSkills Skill[]
  syncBlobs       SyncBlob[]
  auditLogs       AuditLog[]

  @@index([email])
}

model OAuthAccount {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider     String   // "google" | "github"
  providerUid  String
  accessToken  String?
  refreshToken String?
  expiresAt    DateTime?
  createdAt    DateTime @default(now())

  @@unique([provider, providerUid])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique   // hashed refresh token
  userAgent String?
  ip        String?
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@index([userId])
}

// ─────── Orgs (team workspaces) ───────

model Org {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  ownerId     String
  owner       User     @relation("OrgOwner", fields: [ownerId], references: [id])
  createdAt   DateTime @default(now())
  members     OrgMembership[]
  apiKeys     ApiKey[]
  subscription Subscription?
  skills      Skill[]  // org-private skills

  @@index([slug])
}

model OrgMembership {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orgId     String
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  role      OrgRole  @default(MEMBER)
  invitedBy String?
  createdAt DateTime @default(now())

  @@unique([userId, orgId])
}

enum OrgRole { OWNER ADMIN MEMBER }

// ─────── API keys ───────

model ApiKey {
  id          String    @id @default(cuid())
  userId      String?
  user        User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orgId       String?
  org         Org?      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  name        String                      // user-chosen name e.g. "laptop"
  prefix      String                      // first 8 chars after sk-cm-... for display
  hash        String    @unique           // argon2id hash of the full key
  scopes      String[]                    // ["v1.messages", "v1.skills", ...]
  isLive      Boolean   @default(true)    // sk-cm-live vs sk-cm-test
  rateLimit   Int       @default(60)      // requests per minute override (0 = plan default)
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  usageEvents UsageEvent[]

  @@index([userId])
  @@index([orgId])
  @@index([prefix])
}

// ─────── Models registry ───────

model Model {
  id              String   @id          // e.g. "minimax-m2.5-free"
  displayName     String
  provider        String                // "minimax" | "anthropic" | "openai" | "gemini" | ...
  contextWindow   Int
  supportsTools   Boolean  @default(false)
  supportsVision  Boolean  @default(false)
  inputPricePer1M  Decimal? @db.Decimal(10,4)
  outputPricePer1M Decimal? @db.Decimal(10,4)
  isHosted        Boolean  @default(false)   // true for our own models
  isFree          Boolean  @default(false)   // free tier
  isPublic        Boolean  @default(true)
  capabilities    Json                       // arbitrary extra flags
  createdAt       DateTime @default(now())

  @@index([provider])
}

// ─────── Usage / billing ───────

model UsageEvent {
  id            String   @id @default(cuid())
  apiKeyId      String
  apiKey        ApiKey   @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  userId        String?
  orgId         String?
  modelId       String
  endpoint      String                       // "/v1/messages" etc.
  inputTokens   Int
  outputTokens  Int
  inputCostUsd  Decimal  @db.Decimal(10,6)
  outputCostUsd Decimal  @db.Decimal(10,6)
  totalCostUsd  Decimal  @db.Decimal(10,6)
  latencyMs     Int
  status        Int                          // HTTP status
  requestId     String   @unique
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
  @@index([orgId, createdAt])
  @@index([apiKeyId, createdAt])
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String?  @unique
  orgId             String?  @unique
  org               Org?     @relation(fields: [orgId], references: [id])
  stripeCustomerId  String   @unique
  stripeSubId       String?  @unique
  plan              String                   // "free" | "pro" | "team" | "enterprise"
  status            String                   // "active" | "trialing" | "past_due" | "canceled"
  currentPeriodEnd  DateTime?
  hardLimitUsd      Decimal? @db.Decimal(10,2)
  softLimitUsd      Decimal? @db.Decimal(10,2)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

// ─────── Skills marketplace ───────

model Skill {
  id          String   @id @default(cuid())
  owner       String                    // gh org/user, e.g. "anthropics"
  repo        String                    // gh repo, e.g. "skills"
  name        String                    // skill folder name, e.g. "frontend-design"
  publisherId String?
  publisher   User?    @relation(fields: [publisherId], references: [id])
  orgId       String?                   // null = public, set = org-private
  org         Org?     @relation(fields: [orgId], references: [id])
  description String   @db.Text
  license     String?
  category    String?                   // free-form tag
  isOfficial  Boolean  @default(false)  // curated/seeded skills
  isPublic    Boolean  @default(true)
  installCount Int     @default(0)
  starCount   Int      @default(0)
  searchVector Unsupported("tsvector")?
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  versions    SkillVersion[]
  installs    SkillInstall[]

  @@unique([owner, repo, name])
  @@index([category])
  @@index([isOfficial, installCount])
}

model SkillVersion {
  id        String   @id @default(cuid())
  skillId   String
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  version   String                   // semver, e.g. "1.2.0"
  body      String   @db.Text        // raw SKILL.md content
  frontmatter Json                   // parsed YAML frontmatter
  artifactR2Key String?              // optional zip in R2 for assets
  signature String?                  // ed25519 signature
  publishedAt DateTime @default(now())

  @@unique([skillId, version])
}

model SkillInstall {
  id        String   @id @default(cuid())
  skillId   String
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  userId    String?
  orgId     String?
  version   String
  installedAt DateTime @default(now())

  @@index([userId])
  @@index([orgId])
}

// ─────── Cloud sync ───────

model SyncBlob {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  scope     String                   // "settings" | "trust" | "history" | "skills-list"
  r2Key     String                   // ciphertext blob in R2
  iv        Bytes                    // GCM IV
  tag       Bytes                    // GCM auth tag
  size      Int
  updatedAt DateTime @updatedAt

  @@unique([userId, scope])
}

// ─────── Telemetry + audit ───────

model TelemetryEvent {
  id        String   @id @default(cuid())
  userId    String?
  kind      String                   // "error", "feature_used", "command"
  payload   Json
  appVersion String?
  os        String?
  createdAt DateTime @default(now())

  @@index([kind, createdAt])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String                   // "key.create", "skill.publish", "billing.upgrade"
  target    String?
  ip        String?
  userAgent String?
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

---

## 4. Auth (Anthropic-Console-style)

### 4.1 Email/password

- **Sign up** (`POST /api/auth/signup`): accept `{email, password, displayName?}`. Validate password ≥ 12 chars with at least 1 letter + 1 digit. Hash with **argon2id**, `memoryCost: 19456, timeCost: 2, parallelism: 1` (OWASP recommendation).
- Send verification email via Resend; store a one-time token in Redis with 24h TTL.
- **Verify** (`GET /api/auth/verify?token=…`): set `emailVerifiedAt`, redirect to dashboard.
- **Login** (`POST /api/auth/login`): rate-limit at 10/min/IP (Upstash). On success issue JWT access (15min, signed with `JWT_SECRET`) + refresh token stored in `Session` table.
- **Reset**: `POST /api/auth/forgot` → email magic link. `POST /api/auth/reset` with token + new password.

### 4.2 OAuth

- Use Auth.js (NextAuth) with Google + GitHub providers. Persist linked accounts in `OAuthAccount`.
- The CLI's `cybermind login` opens `https://cybermindcli.info/cli/login?port=<local>&state=<csrf>`. After the user authenticates in the browser, the page POSTs a short-lived "CLI session code" to `http://127.0.0.1:<port>/exchange`. The CLI exchanges the code for a long-lived API key via `POST /api/v1/keys/exchange-cli-session`. (Implement that endpoint.)

### 4.3 API keys (`sk-cm-…`)

- **Format**: `sk-cm-{env}-{32 chars base62}` where `env ∈ {live, test}`. Example: `sk-cm-live-x9k7H2…`.
- On creation, return the full key **once**, store `argon2id(key)` in `ApiKey.hash`, and the first 8 chars after the env in `prefix` for UI display ("sk-cm-live-x9k7H2…").
- Verify on every request: extract the prefix from the bearer token, look up rows with that prefix, argon2-verify the supplied key against each (usually 1 row).
- **Scopes**: store as string array; check `scopes.includes(neededScope)` per endpoint. Default scope set for a fresh key: `['v1.messages', 'v1.chat.completions', 'v1.models', 'v1.usage', 'v1.skills.read', 'v1.skills.install', 'v1.sync']`.
- **Test keys** never charge billing — they hit the same providers but route to free/cheap models only and never write `UsageEvent.totalCostUsd > 0`.

### 4.4 Middleware

`middleware.ts` must:
1. Add CORS headers for `*` on `/api/v1/**` (CLI runs from arbitrary hosts).
2. Set CSP: `default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; …`.
3. Parse `Authorization: Bearer sk-cm-…` and attach the resolved `apiKey` + `user` + `org` to the request via `headers.set('x-cybermind-actor', JSON.stringify(...))`. Reject `/api/v1/**` requests without a valid key (401 with `{type: "authentication_error", message: "..."}`).
4. Enforce rate limits via Upstash sliding window (key: `rl:apikey:{id}`, window: 60s, default 60 req/min).
5. Inject a request id (`x-request-id`) — propagate to providers.

---

## 5. LLM proxy endpoints

Make both surfaces Anthropic-compatible AND OpenAI-compatible so the CyberMind CLI (which uses the Anthropic SDK) and any third-party tool can call us.

### 5.1 `POST /api/v1/messages` (Anthropic-compatible)

- Accept the exact Anthropic Messages API shape: `{ model, messages, max_tokens, temperature, system, tools, stream }`.
- Support **SSE streaming** (`stream: true`) emitting the standard event types: `message_start`, `content_block_start`, `content_block_delta` (`text_delta`, `input_json_delta`), `content_block_stop`, `message_delta`, `message_stop`.
- Resolve the requested model via `Model` table → call the appropriate provider in `lib/providers/`.
- Hook the streaming response through a token-counting transformer that updates `UsageEvent` in real time (and Stripe metered usage event at the end).
- If the user has hit their `hardLimitUsd` for the period, return `429 quota_exceeded` immediately.

### 5.2 `POST /api/v1/chat/completions` (OpenAI-compatible)

- Same as above but in OpenAI's `messages: [{role, content}]` format with `delta.content` streaming.

### 5.3 Routing rules

`lib/providers/router.ts` decides:

1. Read `Model.provider` for the requested model.
2. Call `lib/providers/{provider}.ts` with the user's request, our server-side API key for that provider (loaded from `process.env.{PROVIDER}_API_KEY` in production, or per-user if they brought their own — see §5.4).
3. On 5xx/timeout, retry once with exponential backoff. If still failing, return `503 model_unavailable` with `{retry_after}`.

### 5.4 Bring-your-own-key passthrough (optional)

If the user stores their own Anthropic/OpenAI/Gemini key in `dashboard/keys`, the proxy uses **their** key (and skips billing). Persist in `User.byokKeys` (Json, encrypted at rest with AES-GCM via `lib/crypto.ts`).

### 5.5 Models endpoint

`GET /api/v1/models` returns the user's available models (intersect `Model.isPublic` with the user's plan tier — free users only see free+hosted models, paid users see paid frontier models too).

---

## 6. Billing (Stripe)

### 6.1 Plans

| Plan | Price | Free credits | Hard cap | Soft cap | Features |
|---|---|---|---|---|---|
| Free | $0 | $5/mo on hosted models | $0 (hosted only) | — | 1 API key, public skills only |
| Pro | $20/mo | $20/mo included | $100/mo | $80 | 5 keys, private skills, BYOK |
| Team | $50/user/mo | $40/user/mo included | $500/user/mo | $400 | Org workspace, shared keys, audit log |
| Enterprise | Contact | Custom | Custom | Custom | SSO, on-prem proxy, dedicated support |

### 6.2 Implementation

- `lib/billing/plans.ts` exports plan definitions; `lib/billing/stripe.ts` wraps the Stripe SDK.
- On signup, create a Stripe customer immediately (with `metadata.userId`).
- **Metered billing**: send a `usage_record` to Stripe for each `UsageEvent` aggregated per hour (use a QStash cron). Map model usage to Stripe price IDs configured in env.
- `POST /api/webhooks/stripe` handles `customer.subscription.updated`, `invoice.paid`, `invoice.payment_failed` events — update `Subscription` rows accordingly. Verify the webhook signature with `STRIPE_WEBHOOK_SECRET`.
- Send invoice + receipt emails via Resend.
- Dashboard pages: `dashboard/billing` shows current period usage, projected cost, plan management, payment methods (Stripe Customer Portal link).

### 6.3 Quota enforcement

Middleware fetches `Subscription.softLimitUsd` and `hardLimitUsd` (cached 30s in Upstash). At soft limit, append a warning header `x-cybermind-warning: 80% of monthly budget used`. At hard limit, return 429 with `quota_exceeded`.

---

## 7. Skills marketplace

### 7.1 Public pages

- **Index** `/skills` — searchable grid. Server component performs Postgres full-text + pgvector similarity query when the user types. Sidebar facets: category, official-only, sort (installs, recent, alphabetical).
- **Detail** `/skills/[owner]/[repo]/[skill]` — render the SKILL.md (use `react-markdown` + `rehype-highlight`), show frontmatter table (name, description, inputs/outputs, requires, triggers, license, author), version history with diff viewer (`diff2html`), install copy-button (`cm skills install {owner}/{repo}/{skill}`), related skills via pgvector cosine similarity (top 6), examples tab (screenshots/GIFs from `frontmatter.examples` URLs).
- **Publish** `/dashboard/skills/new` — logged-in form: paste a GitHub URL or upload a SKILL.md. Server parses the YAML frontmatter, validates the schema, stores the row. Optional artifact upload (zip of `scripts/`) to R2.
- **My skills** `/dashboard/skills` — manage your own published skills.

### 7.2 API

- `GET /api/v1/skills?q=&category=&sort=&page=` → paginated list. Public skills always returned; org-private only if the caller is in the org.
- `GET /api/v1/skills/:id` → full detail with latest `SkillVersion`.
- `POST /api/v1/skills` → publish (body: `{owner, repo, name, body, frontmatter, version, visibility}`). On 201 returns the canonical URL.
- `POST /api/v1/skills/:id/install` → records a `SkillInstall` row and increments `installCount`. Returns the latest version body so the CLI can write `~/.cybermind/skills/{owner}__{repo}__{name}/SKILL.md`.
- `GET /api/v1/skills/:id/versions` → version list.

### 7.3 SKILL.md format (must match CLI loader)

```yaml
---
name: research
description: Fast read-only codebase exploration sub-agent.
version: 1.0.0
inputs:
  - { name: query, type: string, required: true }
  - { name: paths, type: string[], required: false }
outputs:
  - { name: findings, type: string }
requires:
  tools: [read_file, grep, list_dir]
triggers:
  - "explore the codebase for ..."
license: MIT
author: cybermind
---

# Research skill

Detailed markdown body here. Becomes the system prompt prefix when the skill is invoked.
```

### 7.4 Embedding sync job

Background job (QStash cron, hourly) computes OpenAI `text-embedding-3-small` (1536-d) embeddings for every new `SkillVersion.body` and writes to `Skill.embedding`. Used for related-skill suggestions.

### 7.5 Nightly GitHub re-sync

Cron: for every `Skill` with `isOfficial = true` (or marked `autoSync`), fetch the latest SKILL.md from GitHub. If the SHA changed, create a new `SkillVersion`. Sentry-log failures.

---

## 8. Cloud sync (encrypted blobs)

CLI sends `PUT /api/v1/sync/blob/{scope}` with body = ciphertext + `x-cybermind-iv` + `x-cybermind-tag` headers. The blob is encrypted client-side with a key derived from the user's password (PBKDF2-SHA256, 600k iter, salt = user id). The server **never** sees plaintext.

Storage: write the ciphertext to R2 at key `sync/{userId}/{scope}.bin`. Update `SyncBlob` row.

`GET /api/v1/sync/blob/{scope}` returns the ciphertext + headers; CLI decrypts locally.

Scopes: `settings`, `trust`, `history`, `skills-list`, `secrets` (the encrypted secrets vault from CLI M3 is bundled here).

---

## 9. Telemetry (opt-in, off by default)

- `POST /api/v1/telemetry` accepts `{kind, payload, appVersion, os}`. Strip PII (no file paths, no message content). Use it only for crash counts, command-usage counts, model-usage counts.
- Provide `POST /api/v1/telemetry/delete` so users can purge all their telemetry per GDPR.
- Forward errors (`kind == "error"`) to Sentry with a hashed user id; everything else goes to Axiom.

---

## 10. Web dashboard

Pages (all gated behind NextAuth session):

- `/dashboard` — overview (current period usage chart, recent activity, quick links)
- `/dashboard/keys` — list, create, revoke API keys. Show the prefix + last 4 only after the initial creation reveal.
- `/dashboard/usage` — usage breakdown by model, by day, by key (Recharts)
- `/dashboard/billing` — plan, payment methods, invoices, hard/soft limit sliders
- `/dashboard/team` — org members, roles, invites (only visible to OWNER/ADMIN)
- `/dashboard/skills` — my published skills + their analytics
- `/dashboard/settings` — profile, email, password, BYOK keys, sessions list, telemetry toggle, delete account

Use **shadcn/ui** components + **TailwindCSS**. Theme: dark by default, CyberMind cyan accent (`#00e5ff`).

---

## 11. Seed: 75 curated skills

The CLI's `cybermind-curated-skills-marketplace` plan lists 75 skills sourced from `skills.sh`. Implement a Prisma seed (`prisma/seed.ts`) that:

1. Defines them in a `CURATED_SKILLS` array (the list below).
2. For each, fetches the canonical SKILL.md from GitHub using the `owner/repo/name` triple (the source URL pattern: `https://raw.githubusercontent.com/{owner}/{repo}/main/{name}/SKILL.md`).
3. Inserts a `Skill` row with `isOfficial = true, isPublic = true`, plus a `SkillVersion` with the fetched body.
4. Computes the embedding via OpenAI `text-embedding-3-small` and stores in `Skill.embedding`.

Run with `pnpm prisma db seed`. Re-running should be idempotent (use `upsert`).

```ts
// prisma/seed.ts
export const CURATED_SKILLS: Array<{
  owner: string; repo: string; name: string;
  category: string; description: string;
}> = [
  // obra/superpowers — 10
  { owner: 'obra', repo: 'superpowers', name: 'brainstorming',                 category: 'superpowers', description: 'Generates ideas, alternatives, what-ifs before coding.' },
  { owner: 'obra', repo: 'superpowers', name: 'systematic-debugging',          category: 'superpowers', description: 'Step-by-step root-cause diagnosis methodology.' },
  { owner: 'obra', repo: 'superpowers', name: 'writing-plans',                 category: 'superpowers', description: 'Authors implementation plans before writing code.' },
  { owner: 'obra', repo: 'superpowers', name: 'executing-plans',               category: 'superpowers', description: 'Executes a plan with checkpoints and verification.' },
  { owner: 'obra', repo: 'superpowers', name: 'test-driven-development',       category: 'superpowers', description: 'Strict TDD loop driver.' },
  { owner: 'obra', repo: 'superpowers', name: 'subagent-driven-development',   category: 'superpowers', description: 'Decomposes tasks into parallel subagent runs.' },
  { owner: 'obra', repo: 'superpowers', name: 'using-superpowers',             category: 'superpowers', description: 'Meta-skill: when/how to invoke other superpowers.' },
  { owner: 'obra', repo: 'superpowers', name: 'requesting-code-review',        category: 'superpowers', description: 'Prepares a clean review request from a diff.' },
  { owner: 'obra', repo: 'superpowers', name: 'receiving-code-review',         category: 'superpowers', description: 'Processes review feedback into edits.' },
  { owner: 'obra', repo: 'superpowers', name: 'verification-before-completion',category: 'superpowers', description: 'Pre-commit checklist (lints, tests, types, manual smoke).' },

  // anthropics/skills — 5
  { owner: 'anthropics', repo: 'skills', name: 'frontend-design', category: 'anthropic', description: 'Design and build distinctive UI pages.' },
  { owner: 'anthropics', repo: 'skills', name: 'docx',            category: 'anthropic', description: 'Generate/edit Word documents.' },
  { owner: 'anthropics', repo: 'skills', name: 'pdf',             category: 'anthropic', description: 'Generate/parse PDFs.' },
  { owner: 'anthropics', repo: 'skills', name: 'pptx',            category: 'anthropic', description: 'Generate PowerPoint decks.' },
  { owner: 'anthropics', repo: 'skills', name: 'xlsx',            category: 'anthropic', description: 'Generate/parse Excel spreadsheets.' },

  // vercel-labs/agent-skills + adjacent — 6
  { owner: 'vercel-labs', repo: 'agent-skills', name: 'vercel-react-best-practices', category: 'vercel', description: 'Idiomatic React patterns for Vercel/Next.' },
  { owner: 'vercel-labs', repo: 'agent-skills', name: 'web-design-guidelines',       category: 'vercel', description: 'High-bar web design heuristics.' },
  { owner: 'vercel-labs', repo: 'agent-skills', name: 'vercel-composition-patterns', category: 'vercel', description: 'Component composition patterns.' },
  { owner: 'vercel-labs', repo: 'next-skills',  name: 'next-best-practices',         category: 'vercel', description: 'Next.js App Router best practices.' },
  { owner: 'vercel-labs', repo: 'next-skills',  name: 'deploy-to-vercel',            category: 'vercel', description: 'Zero-config deploy flow.' },
  { owner: 'vercel-labs', repo: 'agent-skills', name: 'vercel-react-native-skills',  category: 'vercel', description: 'React Native patterns.' },

  // shadcn — 1
  { owner: 'shadcn', repo: 'ui', name: 'shadcn', category: 'ui', description: 'Official shadcn/ui component scaffolding + theming.' },

  // supabase — 2
  { owner: 'supabase', repo: 'agent-skills', name: 'supabase-postgres-best-practices', category: 'database', description: 'RLS, indexes, migrations, performance.' },
  { owner: 'supabase', repo: 'agent-skills', name: 'supabase',                          category: 'database', description: 'Auth, storage, edge functions setup.' },

  // firebase / genkit — 7
  { owner: 'google', repo: 'firebase-skills', name: 'firebase-basics',              category: 'firebase', description: 'Project setup, SDK init.' },
  { owner: 'google', repo: 'firebase-skills', name: 'firebase-auth-basics',         category: 'firebase', description: 'Auth flows.' },
  { owner: 'google', repo: 'firebase-skills', name: 'firebase-hosting-basics',      category: 'firebase', description: 'Hosting setup.' },
  { owner: 'google', repo: 'firebase-skills', name: 'firebase-app-hosting-basics',  category: 'firebase', description: 'App Hosting (SSR).' },
  { owner: 'google', repo: 'firebase-skills', name: 'firebase-data-connect',        category: 'firebase', description: 'Data Connect (SQL backend).' },
  { owner: 'google', repo: 'firebase-skills', name: 'developing-genkit-js',         category: 'firebase', description: 'Genkit JS agent framework.' },
  { owner: 'google', repo: 'firebase-skills', name: 'developing-genkit-dart',       category: 'firebase', description: 'Genkit Dart for Flutter.' },

  // microsoft/azure — 9
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-ai',                       category: 'azure', description: 'Azure OpenAI + AI services.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-storage',                  category: 'azure', description: 'Blob/Queue/Table/Files.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-deploy',                   category: 'azure', description: 'App deployment workflows.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-diagnostics',              category: 'azure', description: 'Logs, metrics, troubleshooting.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-compute',                  category: 'azure', description: 'VMs, App Service, Container Apps.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-kubernetes',               category: 'azure', description: 'AKS cluster mgmt.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-cost-optimization',        category: 'azure', description: 'Cost analysis + savings.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-enterprise-infra-planner', category: 'azure', description: 'Landing zones, governance.' },
  { owner: 'microsoft', repo: 'azure-skills', name: 'azure-observability',            category: 'azure', description: 'Monitor + Application Insights.' },

  // mattpocock/skills — 5
  { owner: 'mattpocock', repo: 'skills', name: 'grill-me', category: 'typescript', description: 'Adversarial TS code grilling.' },
  { owner: 'mattpocock', repo: 'skills', name: 'diagnose', category: 'typescript', description: 'TS error diagnosis.' },
  { owner: 'mattpocock', repo: 'skills', name: 'triage',   category: 'typescript', description: 'Issue triage workflow.' },
  { owner: 'mattpocock', repo: 'skills', name: 'caveman',  category: 'typescript', description: 'Minimal-token caveman-style edits.' },
  { owner: 'mattpocock', repo: 'skills', name: 'zoom-out', category: 'typescript', description: 'Step back, re-think architecture.' },

  // juliusbrussee/caveman — 5
  { owner: 'juliusbrussee', repo: 'caveman', name: 'caveman',          category: 'caveman', description: 'Core caveman doctrine.' },
  { owner: 'juliusbrussee', repo: 'caveman', name: 'caveman-commit',   category: 'caveman', description: 'Minimal-noise commit authoring.' },
  { owner: 'juliusbrussee', repo: 'caveman', name: 'caveman-review',   category: 'caveman', description: 'Brutally concise reviews.' },
  { owner: 'juliusbrussee', repo: 'caveman', name: 'caveman-compress', category: 'caveman', description: 'Compress verbose context.' },
  { owner: 'juliusbrussee', repo: 'caveman', name: 'caveman-help',     category: 'caveman', description: 'Caveman meta-help.' },

  // pbakaus/impeccable — 9
  { owner: 'pbakaus', repo: 'impeccable', name: 'impeccable',       category: 'polish', description: 'Master polish orchestrator.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'polish',           category: 'polish', description: 'Final visual/code polish pass.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'audit',            category: 'polish', description: 'Quality audit.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'animate',          category: 'polish', description: 'Add tasteful animations.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'adapt',            category: 'polish', description: 'Adapt UI to new contexts.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'clarify',          category: 'polish', description: 'Improve copy/IA clarity.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'bolder',           category: 'polish', description: 'Make UI more confident.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'quieter',          category: 'polish', description: 'Tone down over-designed UI.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'teach-impeccable', category: 'polish', description: 'Onboards user to impeccable style.' },

  // Design / UX premium — 8
  { owner: 'nextlevelbuilder', repo: 'ui-ux-pro-max-skill', name: 'ui-ux-pro-max', category: 'design', description: 'Pro-grade UX heuristics + critique.' },
  { owner: 'emil',  repo: 'design-eng',             name: 'high-end-visual-design',  category: 'design', description: 'Award-quality visual design rules.' },
  { owner: 'arvindrk', repo: 'extract-design-system', name: 'extract-design-system', category: 'design', description: 'Reverse-engineer a design system from screenshots.' },
  { owner: 'arvindrk', repo: 'canvas-design',         name: 'canvas-design',         category: 'design', description: 'Canvas/whiteboard ideation.' },
  { owner: 'arvindrk', repo: 'minimalist-ui',         name: 'minimalist-ui',         category: 'design', description: 'Minimal style system.' },
  { owner: 'arvindrk', repo: 'industrial-brutalist-ui', name: 'industrial-brutalist-ui', category: 'design', description: 'Brutalist aesthetic.' },
  { owner: 'arvindrk', repo: 'design-taste-frontend', name: 'design-taste-frontend', category: 'design', description: 'Taste-calibrated FE generator.' },
  { owner: 'arvindrk', repo: 'redesign-existing-projects', name: 'redesign-existing-projects', category: 'design', description: 'Modernize legacy UIs.' },

  // Productivity / repo hygiene — 8
  { owner: 'pbakaus', repo: 'impeccable', name: 'to-prd',                       category: 'productivity', description: 'Turn idea/notes into PRD.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'to-issues',                    category: 'productivity', description: 'Turn PRD/scope into GitHub issues.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'prototype',                    category: 'productivity', description: 'Rapid prototype scaffolder.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'repo-intake-and-plan',         category: 'productivity', description: 'Onboard to unknown repo + plan.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'improve-codebase-architecture',category: 'productivity', description: 'Architecture diagnostic + refactor plan.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'env-and-assets-bootstrap',     category: 'productivity', description: 'Bootstrap .env, secrets, assets.' },
  { owner: 'pbakaus', repo: 'impeccable', name: 'seo-audit',                    category: 'productivity', description: 'Technical SEO audit.' },
  { owner: 'github',  repo: 'agent-docs', name: 'github-actions-docs',          category: 'productivity', description: 'GHA workflow docs/authoring.' },

  // Web / scraping / testing — 4
  { owner: 'firecrawl-dev', repo: 'skills', name: 'firecrawl',         category: 'web', description: 'Firecrawl web scraping.' },
  { owner: 'browser-use',   repo: 'skills', name: 'browser-use',       category: 'web', description: 'General browser automation playbook.' },
  { owner: 'webapp-testing',repo: 'skills', name: 'webapp-testing',    category: 'web', description: 'Web app QA harness.' },
  { owner: 'xixu-me',       repo: 'skills', name: 'develop-userscripts', category: 'web', description: 'Tampermonkey/Greasemonkey scripts.' },

  // MCP / agent infra — 2
  { owner: 'modelcontextprotocol', repo: 'skills', name: 'mcp-builder', category: 'mcp', description: 'Build Model Context Protocol servers.' },
  { owner: 'agentspace-so',        repo: 'skills', name: 'agentspace',  category: 'mcp', description: 'AgentSpace patterns.' },

  // Meta / skill-authoring — 3
  { owner: 'anthropics', repo: 'skills', name: 'skill-creator',  category: 'meta', description: 'Author new skills.' },
  { owner: 'vercel-labs',repo: 'skills', name: 'find-skills',    category: 'meta', description: 'Find existing skills for a task.' },
  { owner: 'obra',       repo: 'superpowers', name: 'writing-skills', category: 'meta', description: 'Best practices for skill writing.' },
];
```

Implement `scripts/seed-skills.ts` to fetch SKILL.md for each entry from GitHub raw (with a fallback to a bundled fixture if 404), then upsert.

---

## 12. Environment variables

```bash
# .env (and Vercel project env)
DATABASE_URL=postgres://...?pgbouncer=true
DIRECT_URL=postgres://...
JWT_SECRET=64-char-random
JWT_REFRESH_SECRET=64-char-random
API_KEY_PEPPER=64-char-random

NEXTAUTH_URL=https://cybermindcli.info
NEXTAUTH_SECRET=64-char-random
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

ANTHROPIC_API_KEY=...     # server-side, for users without BYOK
OPENAI_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
MINIMAX_API_KEY=...       # your hosted model provider

UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
UPSTASH_QSTASH_TOKEN=...

R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=cybermind

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_TEAM=price_...

RESEND_API_KEY=...
SENTRY_DSN=...
AXIOM_TOKEN=...
```

---

## 13. Security checklist (must satisfy before launch)

- [ ] All `sk-cm-…` keys stored only as argon2id hashes. Never log a full key.
- [ ] CSP set per §4.4, no `unsafe-eval`, no wildcards.
- [ ] CSRF tokens on all non-`/api/v1` POSTs (NextAuth provides).
- [ ] HSTS, X-Frame-Options=DENY, X-Content-Type-Options=nosniff (in middleware).
- [ ] Stripe webhook signature verified.
- [ ] R2 buckets private; signed URLs only.
- [ ] Sync blob ciphertext never decrypted on the server.
- [ ] Audit log writes for every API key creation/revocation, every plan change, every org member add/remove.
- [ ] Rate-limited password reset and signup endpoints.
- [ ] PII scrubbed from telemetry payloads.
- [ ] Secrets rotation runbook in `docs/runbooks/rotate-keys.md`.
- [ ] All env vars validated at boot via `lib/env.ts` (Zod schema). Fail fast if any missing.
- [ ] Use `crypto.timingSafeEqual` for token comparison.

---

## 14. CLI ↔ backend contract test

After implementation, the following must succeed end-to-end:

```bash
# 1. From the CLI's monorepo (d:\claudealternative\):
$env:CYBERMIND_API_KEY = "sk-cm-test-…"
$env:CYBERMIND_CLOUD_URL = "https://cybermindcli.info/v1"

# 2. Run a print-mode chat
node packages/cli/bin/cybermind.mjs --print "list files in the current directory"

# Expected: streamed text + a list_dir tool call. The tool call goes back
#          through the proxy (which logs UsageEvent), and the final
#          assistant message references the listed files. The exit code
#          is 0 and `usage` shows the tokens consumed.
```

Backend agent: write a Vitest integration test (`tests/integration/cli-contract.test.ts`) that spawns the CLI as a subprocess and asserts the above.

---

## 15. Open extension points (post-MVP)

These are stubs reserved in the schema/endpoints so future milestones don't require breaking changes:

- **`/api/v1/mcp/*`** — MCP server registry endpoints (returns 501 with `{message: "MCP marketplace ships in CLI M13"}`).
- **`/api/v1/cyber/*`** — reserved namespace for the future autonomous bug-bounty mode. Block in middleware with `{message: "/cyber endpoints are reserved for Phase 2"}`.
- **`Subscription.plan == "enterprise"`** — gate SSO, on-prem proxy.

---

## 16. Deliverables checklist

When done, commit + deploy and confirm:

- [ ] `prisma migrate deploy` runs cleanly on Neon production.
- [ ] `pnpm prisma db seed` inserts all 75 skills (verify `select count(*) from "Skill"` = 75).
- [ ] `/api/v1/messages` passes the integration test in §14.
- [ ] `/skills` index page loads in < 1s, search returns relevant results.
- [ ] `cybermind login` from the CLI completes a full OAuth round-trip and stores `sk-cm-live-…` in the OS keychain.
- [ ] Stripe test-mode subscription upgrade flows end-to-end.
- [ ] Sentry receives a synthetic error from each endpoint.
- [ ] Axiom shows structured logs with request IDs propagated.
- [ ] Dashboard charts render real usage data after running the integration test.
- [ ] `cybermindcli.info` resolves to the new build; old `cybercli-chat.vercel.app` 301-redirects to it.
- [ ] All CI checks green: `pnpm typecheck && pnpm lint && pnpm test`.

---

## Appendix A — File templates

### `lib/auth/api-keys.ts`

```ts
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // base62 minus confusables

export async function mintApiKey(opts: {
  userId?: string;
  orgId?: string;
  name: string;
  isLive?: boolean;
  scopes?: string[];
}) {
  const env = opts.isLive === false ? 'test' : 'live';
  const secret = Array.from(randomBytes(24))
    .map((b) => ALPHA[b % ALPHA.length])
    .join('');
  const full = `sk-cm-${env}-${secret}`;
  const prefix = `${env}-${secret.slice(0, 8)}`;
  const hash = await argon2.hash(full, { type: argon2.argon2id });

  const row = await prisma.apiKey.create({
    data: {
      userId: opts.userId ?? null,
      orgId: opts.orgId ?? null,
      name: opts.name,
      prefix,
      hash,
      isLive: env === 'live',
      scopes: opts.scopes ?? ['v1.messages', 'v1.chat.completions', 'v1.models', 'v1.usage', 'v1.skills.read', 'v1.skills.install', 'v1.sync'],
    },
  });
  return { full, row };
}

export async function verifyApiKey(bearer: string) {
  if (!bearer.startsWith('sk-cm-')) return null;
  const parts = bearer.split('-'); // ['sk', 'cm', env, secret]
  if (parts.length < 4) return null;
  const env = parts[2];
  const secret = parts.slice(3).join('-');
  const prefix = `${env}-${secret.slice(0, 8)}`;

  const candidates = await prisma.apiKey.findMany({
    where: { prefix, revokedAt: null },
    include: { user: true, org: true },
  });
  for (const row of candidates) {
    if (await argon2.verify(row.hash, bearer)) {
      // Update lastUsedAt async; do not await to keep the hot path fast.
      void prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
      return row;
    }
  }
  return null;
}
```

### `lib/providers/router.ts`

```ts
import { anthropic } from './anthropic';
import { openai } from './openai';
import { gemini } from './gemini';
import { minimax } from './minimax';

export interface ProxyRequest {
  apiKeyId: string;
  userId?: string;
  orgId?: string;
  modelId: string;
  body: unknown;
  stream: boolean;
  byok?: { provider: string; key: string };
}

export async function proxy(req: ProxyRequest) {
  const model = await prisma.model.findUniqueOrThrow({ where: { id: req.modelId } });
  switch (model.provider) {
    case 'anthropic': return anthropic.proxy(req);
    case 'openai':    return openai.proxy(req);
    case 'gemini':    return gemini.proxy(req);
    case 'minimax':   return minimax.proxy(req);
    default:
      throw new Error(`unknown provider ${model.provider}`);
  }
}
```

### `lib/ratelimit.ts`

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const apiKeyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '60 s'),
  analytics: true,
  prefix: 'rl:apikey',
});
```

### Example route — `app/api/v1/messages/route.ts`

```ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { verifyApiKey } from '@/lib/auth/api-keys';
import { apiKeyLimiter } from '@/lib/ratelimit';
import { proxy } from '@/lib/providers/router';
import { recordUsage } from '@/lib/billing/usage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const apiKey = await verifyApiKey(auth.replace(/^Bearer /, ''));
  if (!apiKey) return new Response(JSON.stringify({ type: 'authentication_error' }), { status: 401 });

  const rl = await apiKeyLimiter.limit(apiKey.id);
  if (!rl.success) return new Response(JSON.stringify({ type: 'rate_limit_error' }), { status: 429 });

  const body = await req.json();
  const stream = body.stream === true;
  const response = await proxy({
    apiKeyId: apiKey.id,
    userId: apiKey.userId ?? undefined,
    orgId: apiKey.orgId ?? undefined,
    modelId: body.model,
    body,
    stream,
  });

  // recordUsage hooks the stream and writes a UsageEvent on close.
  return new Response(response.body, {
    status: 200,
    headers: stream
      ? { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
      : { 'content-type': 'application/json' },
  });
}
```

---

**That's the full spec. Implement every section. If anything is ambiguous, default to "match the Anthropic Console exactly." When complete, deploy to Vercel + Neon and verify §16.**
