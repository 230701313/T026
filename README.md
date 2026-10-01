# AI-Powered Intelligent Lost and Found System

A centralized platform where users report lost and found items using images
and descriptions. The system uses AI-based image similarity (computer
vision) and NLP-based text similarity to rank potential matches between lost
and found reports.

This is a college Computer Science & Engineering Phase-I project, built in
phases. **Phase 1 (Foundation) is complete.** See [Project Status](#project-status)
below for what's implemented vs. planned.

## Features

- Email/password authentication via Supabase Auth
- Protected dashboard with real (not fake) stats pulled from the database
- Responsive React + Tailwind UI, works down to mobile
- FastAPI backend with JWT verification on protected routes
- Architecture already in place for: lost/found reporting, AI image
  matching (CLIP/OpenCLIP), NLP text matching (sentence-transformers),
  hybrid match scoring, notifications, and ownership claims — implemented
  incrementally in later phases, never faked in the meantime

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system
design, data flow, and matching pipeline explanation.

## Technology Stack

| Layer     | Stack |
|-----------|-------|
| Frontend  | React, Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide React |
| Backend   | Python, FastAPI, Pydantic, Uvicorn |
| Database  | PostgreSQL via Supabase (+ pgvector for embeddings, from Phase 3) |
| Auth      | Supabase Auth (JWT), verified server-side with PyJWT |
| Storage   | Supabase Storage (`item-images` bucket) |
| AI (later phases) | OpenCLIP (image embeddings), sentence-transformers (text embeddings) |

## Project Folder Structure

```text
lost-and-found-ai/
├── frontend/               React + Vite + TypeScript app
│   ├── src/
│   │   ├── components/     Reusable UI (ProtectedRoute, ComingSoon, ...)
│   │   ├── pages/           Route-level pages
│   │   ├── layouts/         AppLayout (authenticated shell)
│   │   ├── services/        supabaseClient.ts, api.ts (axios)
│   │   ├── hooks/           useAuth.tsx (auth context)
│   │   └── types/           Shared TypeScript types
│   └── .env.example
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── api/              auth, dashboard, items, matching, notifications, claims
│   │   ├── models/           Pydantic schemas
│   │   ├── services/         Business logic (image/text/hybrid matching — Phase 3-5)
│   │   ├── core/              config.py, security.py
│   │   ├── database/          Supabase client connection
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── database/
│   ├── schema.sql            Full Postgres schema + RLS policies
│   └── seed.sql               Demo lost/found items
├── docs/
│   └── ARCHITECTURE.md
└── README.md
```

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A free [Supabase](https://supabase.com) project

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `database/schema.sql` to create all tables,
   row-level security policies, and the `item-images` storage bucket.
3. (Optional, once you have registered a user) run `database/seed.sql` after
   replacing `YOUR-USER-UUID-HERE` with a real user id, to load demo items.
4. From **Project Settings → API**, collect:
   - Project URL
   - `anon` public key
   - `service_role` key (keep this secret — backend only)
   - JWT Secret (**Project Settings → API → JWT Settings**)

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env and fill in your Supabase URL, keys, and JWT secret
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

## How to Run

**Backend** (from `backend/`, with the virtualenv activated):

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be at `http://localhost:8000`, interactive docs at
`http://localhost:8000/docs`.

**Frontend** (from `frontend/`, in a separate terminal):

```bash
npm run dev
```

The app will be at `http://localhost:5173`.

### Try it out

1. Open `http://localhost:5173`, click **Get started**, and register.
2. Log in — you'll land on the dashboard, which pulls real (currently zero)
   stats from the backend.
3. Sidebar links to Report Lost/Found, My Reports, etc. currently show a
   "coming soon" panel — those features arrive in later phases (see below).

## Environment Variables

**`backend/.env`**

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `SUPABASE_JWT_SECRET` | Used to verify Supabase-issued access tokens |
| `CORS_ORIGINS` | Comma-separated allowed origins (default: `http://localhost:5173`) |
| `MATCH_WEIGHT_*` | Hybrid matching weights (Phase 5), must sum to 1.0 |
| `MATCH_THRESHOLD_*` | Match category thresholds (Phase 5) |

**`frontend/.env`**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:8000/api`) |

## API Overview

| Method | Path | Description | Status |
|---|---|---|---|
| GET | `/health` | Health check | ✅ Implemented |
| GET | `/api/auth/me` | Get the authenticated user's profile | ✅ Implemented |
| GET | `/api/dashboard/stats` | Real counts of the user's lost/found/matched/recovered items | ✅ Implemented |
| * | `/api/items/*` | Create/list/view lost & found reports | 🚧 Phase 2 |
| * | `/api/matching/*` | Generate/retrieve/recalculate AI matches | 🚧 Phase 3–5 |
| * | `/api/notifications/*` | In-app match notifications | 🚧 Phase 6 |
| * | `/api/claims/*` | Ownership verification claims | 🚧 Phase 7 |

Full interactive documentation is auto-generated by FastAPI at `/docs` once
the backend is running.

## Testing

```bash
cd backend
source venv/bin/activate
pytest
```

Phase 1 includes a smoke test verifying the app boots and public/health
endpoints respond correctly, and that protected endpoints correctly reject
unauthenticated requests. Additional tests (registration, item creation,
embedding generation, similarity math, ranking) will be added as each phase
lands — see `backend/tests/`.

## Project Status

### ✅ Phase 1 — Foundation (this delivery)

- Project scaffolding for frontend and backend
- Supabase project connection (auth, database, storage client)
- Full database schema with row-level security, including tables for
  future phases (matches, notifications, claims) so no migrations are
  needed later
- Email/password registration, login, logout via Supabase Auth
- Protected routes and a real (not mocked) dashboard stats endpoint
- Base navigation/layout, landing page

### 🚧 Not implemented yet

Every one of these is intentionally stubbed with a "coming soon" screen (frontend)
or a `NOT IMPLEMENTED YET` docstring (backend) rather than faked:

- **Phase 2** — Lost/found reporting forms, image upload, item listing/details
- **Phase 3** — AI image similarity (OpenCLIP embeddings + cosine similarity)
- **Phase 4** — NLP text similarity (sentence-transformers)
- **Phase 5** — Hybrid match scoring, ranking, and match storage
- **Phase 6** — In-app notifications
- **Phase 7** — Ownership verification / claims
- **Phase 8** — Admin dashboard

## Known Limitations (Phase 1)

- No lost/found reporting yet — dashboard stats will legitimately read 0
  until Phase 2 lands.
- No AI matching yet — `matches` table exists in the schema but is not
  populated until Phase 5.
- Backend was verified to boot and serve requests with placeholder Supabase
  credentials in this delivery's sandbox (no live Supabase project was
  reachable); you'll need to point it at your own Supabase project to test
  real authentication end-to-end.

## What's Next

Phase 2 (Lost/Found Reporting): report forms, image upload to Supabase
Storage, item listing, item details page, "My Reports" with real data.
