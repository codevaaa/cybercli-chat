---
name: api-design-patterns
description: REST API design patterns and standards for consistent, scalable API development. Use when designing endpoints, creating routes, or building API contracts.
agents: [coder, backend-architect, api-specialist]
tags: [api, rest, openapi, design, endpoints]
version: 1.0.0
author: CodeVaa Team
---

# API Design Patterns

## Goal
Ensure all API endpoints follow consistent patterns for naming, request/response shape, error handling, pagination, and versioning.

## URL Naming Convention
```
GET    /api/v1/resources          → List (with pagination)
GET    /api/v1/resources/:id      → Get single
POST   /api/v1/resources          → Create
PUT    /api/v1/resources/:id      → Full update
PATCH  /api/v1/resources/:id      → Partial update
DELETE /api/v1/resources/:id      → Delete
```

Rules:
- Plural nouns for collections (`/users` not `/user`)
- Lowercase with hyphens (`/user-settings` not `/userSettings`)
- No verbs in URLs (the HTTP method IS the verb)
- Nest max 2 levels: `/users/:id/posts` (not deeper)

## Standard Response Shape
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasNext": true
  }
}
```

## Error Response Shape
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

## HTTP Status Codes
| Code | When |
|------|------|
| 200  | Success (GET, PUT, PATCH, DELETE) |
| 201  | Created (POST) |
| 204  | No Content (DELETE with no body) |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized (no/invalid token) |
| 403  | Forbidden (valid token, no permission) |
| 404  | Not Found |
| 409  | Conflict (duplicate resource) |
| 422  | Unprocessable Entity (business logic error) |
| 429  | Too Many Requests (rate limited) |
| 500  | Internal Server Error |

## Pagination (cursor-based preferred)
```
GET /api/v1/posts?cursor=abc123&limit=20
GET /api/v1/posts?page=2&limit=20  (offset-based alternative)
```

Always return: `{ meta: { total, page/cursor, limit, hasNext } }`

## Authentication
- Bearer token in Authorization header: `Authorization: Bearer <jwt>`
- API keys via `X-API-Key` header
- Never in query params (visible in logs)

## Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
Retry-After: 60  (on 429 responses)
```

## Filtering & Sorting
```
GET /api/v1/posts?status=published&author=john&sort=-createdAt&fields=id,title
```
- Filter: `?field=value`
- Sort: `?sort=field` (prefix `-` for descending)
- Fields: `?fields=field1,field2` (sparse fieldsets)

## Constraints
- Never return 200 for errors
- Never put sensitive data in URLs
- Always validate Content-Type header
- Always set appropriate CORS headers
- Always version your API (`/v1/`, `/v2/`)
