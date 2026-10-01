# Architecture

## Overview

The system is a three-tier application: a React SPA frontend, a FastAPI
backend, and Supabase (Postgres + Auth + Storage) as the data layer. The
frontend talks to Supabase directly for authentication and to the FastAPI
backend for everything else — reporting, matching, and stats — so that
match scoring and business rules always run server-side and can never be
influenced by the client.

```text
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────────┐
│   React (Vite)   │──────▶│   FastAPI backend  │──────▶│  Supabase (Postgres) │
│  frontend/src    │  REST  │   backend/app      │ admin  │  + Auth + Storage    │
└─────────────────┘  JSON  └──────────────────┘  client └─────────────────────┘
        │                                                          ▲
        │                     Supabase Auth (sign up / in / out)    │
        └──────────────────────────────────────────────────────────┘
```

## Authentication flow

1. The frontend calls Supabase Auth directly (`supabase.auth.signUp` /
   `signInWithPassword`) — Supabase handles password hashing, email
   verification, and session/refresh-token management.
2. Every request the frontend makes to the FastAPI backend attaches the
   current Supabase access token as `Authorization: Bearer <jwt>`
   (`frontend/src/services/api.ts`).
3. The backend verifies that JWT against `SUPABASE_JWT_SECRET`
   (`backend/app/core/security.py`) using PyJWT — it never re-implements
   password checking, it only trusts a token Supabase already issued.
4. Protected FastAPI routes depend on `get_current_user`, which raises 401
   if the token is missing or invalid, and otherwise returns the caller's
   Supabase user id for use in queries.

This split means Supabase owns identity, and the backend owns business
logic and data access rules that need to run consistently no matter which
client (web, future mobile app, etc.) is calling.

## Data access & the service-role key

The backend has two Supabase clients (`backend/app/database/connection.py`):

- **Anon client** — respects row-level security (RLS) as configured in
  `database/schema.sql`. Used where the caller's own permissions should
  apply.
- **Admin (service-role) client** — bypasses RLS. Used only for
  trusted, server-computed writes — most importantly, **writing match
  scores**. The spec requires the final match score to be a backend
  calculation, never something the frontend can set; giving `matches`
  table no direct insert/update policy for regular users, and only writing
  to it from the backend's admin client, enforces that at the database
  level, not just the API level.

## Matching pipeline (Phase 3–5)

Once implemented, a new item submission will trigger this pipeline
(`backend/app/services/hybrid_matching.py` orchestrating
`image_matching.py`, `text_matching.py`):

```text
New LOST or FOUND item submitted
        │
        ▼
Generate image embedding (OpenCLIP) ── cached on the item row (image_embedding)
        │
        ▼
Generate text embedding (sentence-transformers) ── cached (text_embedding)
        │
        ▼
Fetch candidate items of the opposite report_type with status = ACTIVE
        │
        ▼
For each candidate:
   image_similarity    = cosine_similarity(embedding_a, embedding_b)  → 0-100
   text_similarity     = cosine_similarity(embedding_a, embedding_b)  → 0-100
   location_similarity = string/category-based proximity              → 0-100
   date_similarity     = decay function over days-apart                → 0-100

   final_score = 0.45 * image_similarity
               + 0.35 * text_similarity
               + 0.10 * location_similarity
               + 0.10 * date_similarity
        │
        ▼
Sort candidates by final_score descending
        │
        ▼
Persist top matches to the `matches` table (admin client)
        │
        ▼
Any match ≥ notification threshold → create a row in `notifications` (Phase 6)
```

Weights and thresholds are read from `Settings` (`backend/app/core/config.py`,
backed by environment variables), not hardcoded in the matching logic, so
they can be tuned without a code change.

### Why embeddings are cached

Recomputing a CLIP or sentence-transformer embedding on every match
comparison would be wasteful — an item's photo and description don't
change after it's reported. Embeddings are generated once, at report time,
and stored on the `items` row (`image_embedding vector(512)`,
`text_embedding vector(384)` in `database/schema.sql`, using the `pgvector`
extension). Matching runs then reuse the stored vectors.

## Frontend structure

- `pages/` — one component per route, thin: fetch data, render, delegate
  presentation to shared components.
- `layouts/AppLayout.tsx` — the authenticated shell (top nav, mobile menu);
  wraps every protected page so navigation stays consistent.
- `components/ProtectedRoute.tsx` — redirects to `/login` if there's no
  active Supabase session; shown while the session is still loading to
  avoid a flash of the login page for already-authenticated users.
- `hooks/useAuth.tsx` — a React context wrapping Supabase Auth so any
  component can read `user` or call `signIn` / `signUp` / `signOut` without
  prop-drilling.
- `services/api.ts` — a single Axios instance with an interceptor that
  attaches the current session token to every request, so individual pages
  never handle auth headers manually.

## Backend structure

Routes stay thin; business logic lives in `services/`, matching the
recommended structure in the project brief:

- `api/` — FastAPI routers, one per resource. Each route validates input,
  calls a service function, and returns a Pydantic model.
- `models/` — Pydantic schemas shared across routes (request/response
  shapes), separate from the database schema in `database/schema.sql`.
- `services/` — business logic: matching algorithms, notification
  creation, claim verification. Kept out of route handlers so they can be
  unit-tested independently of HTTP.
- `core/config.py` — all environment-driven configuration in one place,
  including the hybrid-matching weights, so nothing is hardcoded.
- `core/security.py` — JWT verification, isolated from route logic.
- `database/connection.py` — the only place Supabase clients are
  constructed.

## Why FastAPI computes the match score, not the frontend

This is a deliberate boundary, called out directly in the spec: "Do not
allow the frontend to decide the final match score." A malicious or buggy
client could otherwise submit an arbitrary score. By requiring the score to
be computed in `services/hybrid_matching.py` and written with the
service-role client — which is never exposed to the browser — the score is
always a genuine function of the two items' actual embeddings and metadata.
