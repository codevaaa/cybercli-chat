# Codeva — Auth Setup (IMPORTANT, 2-minute Supabase config)

The "Google login ke baad website khul jaati hai" bug has **two parts**:

1. **App code** — fixed. We now use the secure PKCE flow, redirect to our own
   `/callback` route, exchange the code there, and route **into the app** (never
   to the website). A banned account is refused at this step.

2. **Supabase dashboard** — you must whitelist our redirect URLs, otherwise
   Supabase falls back to the project **Site URL** (your marketing website),
   which is exactly what was happening.

## What to set in Supabase (one time)

Go to **Supabase Dashboard → Authentication → URL Configuration**:

### Site URL
Set it to the app, not the marketing site. For local web testing:
```
http://localhost:8082
```
(For production web build, set it to wherever the app is hosted.)

### Redirect URLs (Add URL — add ALL of these)
```
http://localhost:8082/callback
http://localhost:8081/callback
https://localhost/callback
codeva://callback
exp://callback
```
- `codeva://callback` — the installed Android/iOS app deep link.
- `http://localhost:8082/callback` — Expo web dev (port from `--port 8082`).
- Add your production web origin + `/callback` when you deploy.

### Google provider
**Authentication → Providers → Google** must be **enabled**, with the OAuth
Client ID + Secret from Google Cloud Console. In Google Cloud Console, under the
OAuth client's **Authorized redirect URIs**, add:
```
https://bqaaxqibrarewctxvlix.supabase.co/auth/v1/callback
```

## Why this works
- On **web**, after Google, Supabase redirects to `…/callback?code=…` on the
  same origin. Our `callback.tsx` exchanges the code and goes to `/(tabs)`.
- On **native**, the in-app browser returns `codeva://callback?code=…`, which
  we exchange manually for a session.
- Because both targets are whitelisted, Supabase never falls back to the Site
  URL (the website).

## Backend ban / moderation system (already wired)
- Every login/signup calls `POST /api/v1/auth/sync` which upserts the user in
  the `User` registry (Mongo) and returns ban status. Banned → app refuses entry.
- `requireAuth` middleware blocks banned users from the whole API (chat included),
  even with a valid token or API key.
- Admin endpoints (set `ADMIN_USER_IDS` in backend `.env` to your Supabase id):
  - `GET  /api/v1/auth/admin/users?status=&q=&page=`
  - `POST /api/v1/auth/admin/users/:id/ban`   `{ reason, status? }`
  - `POST /api/v1/auth/admin/users/:id/unban`
  - `POST /api/v1/auth/admin/users/:id/flag`  `{ reason, severity }` (5 weighted
    strikes → auto-ban)
- Banning also force-signs-out the user's Supabase sessions.
