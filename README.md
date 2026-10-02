# SkillBridge AI

**Find where your skills belong.**

An AI-powered career intelligence platform for students, fresh graduates,
internship seekers and entry-level job seekers.

> Upload a resume → extract your skills → see how they align with real openings →
> find your gaps → follow a prerequisite-ordered learning roadmap → prove progress
> with assessments → ask an assistant that answers from *your* data.

This is a working full-stack application, not a prototype of static screens:
every button performs a real action, every figure comes from PostgreSQL or the
NLP layer, and the critical journey below has been run end to end.

---

## Table of contents

- [What it does](#what-it-does)
- [The critical journey](#the-critical-journey)
- [Terminology (important)](#terminology-important)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Folder structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Database, migrations and seed data](#database-migrations-and-seed-data)
- [Running the application](#running-the-application)
- [Demo credentials](#demo-credentials)
- [How the scoring works](#how-the-scoring-works)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)
- [Documentation](#documentation)

---

## What it does

| Area | What is implemented |
| ---- | ------------------- |
| **Authentication** | Register, login, logout, current session, password change, account deletion. JWT in an httpOnly cookie. Protected routes and ownership checks on every personal resource. |
| **Profile** | Name, college, degree, branch, graduation year, preferred roles, preferred locations, work type, bio. Skill set with per-skill proficiency, editable and removable. |
| **Resume intelligence** | Drag-and-drop or picker upload of PDF and DOCX. Real text extraction (PyMuPDF / python-docx), section detection (education, experience, projects, skills, certifications, achievements), and contact detection. |
| **Skill extraction** | A controlled taxonomy of **118 skills / 380 aliases / 13 categories**, matched by phrase, alias and lemmatised token. Confidence is recorded per skill, and only high-confidence hits are written to the profile. |
| **Opportunities** | **20 companies / 52 roles** of clearly-labelled sample data. Search, filter (role, location, employment type, work type, experience, required skill, minimum compatibility), sort and paginate server-side. |
| **Matching** | Transparent exact-overlap score plus an optional semantic layer. Full breakdown: matched skills, missing skills, related-skill credit, importance weighting and a written explanation. |
| **Recommendations** | Ranked by skill alignment (0.70), your stated preferences (0.20) and recency (0.10), with a human-readable "why this matches you". |
| **Skill gap** | Available / developing / to-learn across your best-fit roles, with how many roles need each skill and why it matters. |
| **Roadmap** | Prerequisite-ordered learning path with priority, reason, estimated hours, resources and status tracking that feeds real progress. |
| **Assessments** | 7 assessments, 10 questions each, with explanations. The answer key is never sent to the browser. Submitting grades the attempt, stores the score and advances progress. |
| **Progress** | Mastered / developing / not-started counts, roadmap completion, assessment score history, per-category breakdown and hour tracking, with charts. |
| **AI assistant** | Answers grounded in the student's stored skills, gaps, roadmap, saved jobs and assessment results. Uses an LLM when a key is configured, and a deterministic local reasoner when not — the app never depends on an external provider. |
| **Settings** | Account details, password change, resume management, and irreversible account deletion with password confirmation. |

## The critical journey

This flow was run and verified end to end, and each step persists to PostgreSQL:

```text
Register → Login → Onboarding → Profile → Upload a real PDF
  → parse and extract skills → see extracted skills → browse opportunities
  → open an opportunity → SkillBridge Compatibility + matched/missing skills
  → skill gap → roadmap → assessment → score → progress → AI assistant
```

Everything below is a real request against the API:

- **Register** creates the account and signs the student in immediately.
- **Onboarding** writes the profile and returns `has_profile: true`.
- **Upload** stores the file outside any public path, extracts text, detects
  sections, extracts skills, writes the high-confidence ones to the profile and
  re-scores opportunities — all in one request.
- **Matching** returns both the headline compatibility figure and every
  component behind it.
- **Assessments** grade server-side; a passed assessment marks the skill mastered.
- **Roadmap** completion promotes the skill onto the profile, so progress is
  always backed by an action the student actually took.

## Terminology (important)

The match score is called **SkillBridge Compatibility** or **Skill Alignment**
everywhere: API fields, TypeScript types, UI copy, assistant replies and these
docs.

It measures how closely a student's identified skills line up with a role's
required skills. It is **not** a hiring probability, a chance of selection, or
any guarantee of an interview or a job — and the product never presents it as
one. The disclaimer is repeated in the API response itself, on the landing page,
and beside every score in the UI.

---

## Architecture

```text
                    ┌─────────────────────────────────────────┐
   Browser  ──────► │  React SPA (Vite, TS, Tailwind v4)      │
                    │  axios · withCredentials · route-split  │
                    └───────────────────┬─────────────────────┘
                                        │  JSON over /api (httpOnly cookie)
                    ┌───────────────────▼─────────────────────┐
                    │  FastAPI                                │
                    │   api/       thin routers, validation   │
                    │   services/  business logic             │
                    │   ai/        parsing, extraction, NLP   │
                    └───────────────────┬─────────────────────┘
                            SQLAlchemy  │
                    ┌───────────────────▼─────────────────────┐
                    │  PostgreSQL 17  (16 tables)             │
                    └─────────────────────────────────────────┘
```

**Separation of concerns.** Routers validate input, enforce ownership and
delegate — they contain no business logic. Services own the rules. `ai/` owns
NLP and is the only place that knows about the taxonomy, spaCy or TF-IDF.
Models own persistence. The frontend mirrors this: pages compose, components
render, `services/` is the only place that talks HTTP.

**Why the layers matter here.** The matching engine, the roadmap generator and
the assistant all read the same service functions, which is what keeps the
numbers on different screens consistent — a problem this project actually hit
(see ADR-017).

## Tech stack

| Layer | Choice |
| ----- | ------ |
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind CSS v4, React Router 7, Axios, Recharts, Framer Motion, Lucide |
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, PyJWT, bcrypt |
| Database | PostgreSQL 17 |
| AI / NLP | spaCy (`en_core_web_sm`) for lemmatised matching, scikit-learn TF-IDF for semantic relatedness, a controlled skill taxonomy |
| Resume parsing | PyMuPDF (PDF), python-docx (DOCX) |
| DevOps | Docker, Docker Compose, `.env` configuration |

## Folder structure

```text
skillbridge-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               GlassPanel, Button, Badge, SkillChip,
│   │   │   │                     CompatibilityRing, MetricCard, ChartCard,
│   │   │   │                     Modal, SearchBar, ProgressBar, Field,
│   │   │   │                     LoadingSkeleton, EmptyState, ErrorState, AiOrb
│   │   │   ├── layout/           SiteHeader, AppLayout, Sidebar, PublicShell,
│   │   │   │                     AdaptiveLayout, ProtectedRoute, PageLoader
│   │   │   ├── opportunities/    OpportunityCard, FilterPanel
│   │   │   ├── skills/           SkillNetwork
│   │   │   └── roadmap/          RoadmapTimeline
│   │   ├── pages/                Landing, Login, Register, Onboarding, Dashboard,
│   │   │                         Profile, ResumeAnalysis, Opportunities,
│   │   │                         OpportunityDetails, SkillGap, Roadmap,
│   │   │                         Assessments, AssessmentTake, Progress,
│   │   │                         CareerAssistant, Settings, NotFound
│   │   ├── hooks/                useAsync, useBackendHealth
│   │   ├── services/             api, auth, profile, resume, jobs, matching,
│   │   │                         roadmap, assessments, progress, assistant, health
│   │   ├── store/                authContext (context + hook), auth (provider)
│   │   ├── types/                API type mirror
│   │   ├── App.tsx               router, lazy routes
│   │   └── index.css             design tokens, glass + orb styling
│   ├── .env.example
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py               app factory, CORS, error handling
│   │   ├── core/                 config, security (JWT + bcrypt), dependencies
│   │   ├── database/             engine, session, declarative base
│   │   ├── models/               16 SQLAlchemy models
│   │   ├── schemas/              Pydantic request/response models
│   │   ├── api/                  9 routers, 49 operations
│   │   ├── services/             13 services (business logic)
│   │   ├── ai/                   taxonomy, extractor, parser, semantic, roadmap
│   │   └── seed/                 idempotent seeding + `--reset-demo`
│   ├── alembic/versions/         migrations
│   ├── tests/                    144 tests
│   └── requirements.txt
│
├── data/
│   ├── skills/skill_taxonomy.json      118 skills, 380 aliases
│   ├── seed_jobs/seed_jobs.json        20 companies, 52 roles
│   └── assessments/assessments.json    7 assessments, 70 questions
│
├── docs/architecture-decisions.md      22 decision records
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

- **Node.js** 20.19+ (developed on 24.14) and npm
- **Docker Desktop** with the engine running (`docker info` must succeed)
- No local Python or PostgreSQL install is required — both run in containers

## Installation

### 1. Clone and configure

```bash
git clone <repository-url> skillbridge-ai
cd skillbridge-ai
cp .env.example .env
```

Generate a real JWT secret and put it in `.env`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

There is exactly **one** `.env`, at the repository root. Compose and the API both
read it, so they cannot disagree. The app starts with the file as shipped; the
only value you *must* change for a real deployment is `JWT_SECRET`.

### 2. Start the database and API

```bash
docker compose up -d --build
```

First build takes a few minutes (it installs the spaCy model). Then:

```bash
docker compose ps                       # both services should be healthy
curl http://localhost:8000/api/health        # liveness
curl http://localhost:8000/api/health/ready  # readiness, checks PostgreSQL
```

Expected:

```json
{"status":"ok","service":"SkillBridge AI","version":"0.1.0","environment":"development"}
{"status":"ok","database":"connected"}
```

### 3. Create the schema and seed the data

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed
```

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The header badge performs a real request and reports
`Backend connected`, `API up · database unavailable`, or `Backend offline`, so a
misconfigured database is visible immediately rather than as a mystery empty page.

## Environment variables

All backend variables live in the root `.env`. Real environment variables always
take precedence, so production can inject secrets without any file.

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `APP_NAME` | Service display name | `SkillBridge AI` |
| `APP_ENV` | `development` / `test` / `production` | `development` |
| `DEBUG` | Verbose mode | `true` |
| `API_PREFIX` | Mount point of all API routes | `/api` |
| `JWT_SECRET` | JWT signing key — **replace in production** | placeholder |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `60` |
| `COOKIE_SECURE` | Send the auth cookie over HTTPS only (set `true` in production) | `false` |
| `SEED_DEMO_USER` | Create the demo account when seeding | `true` |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | Demo credentials (development only) | see below |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials | `skillbridge` |
| `POSTGRES_PORT` | Host port for PostgreSQL (5433 avoids clashing with a local install; the container always listens on 5432) | `5433` |
| `DATABASE_URL` | SQLAlchemy DSN | localhost DSN; Compose overrides the host to `db` |
| `CORS_ORIGINS` | Comma-separated allowed browser origins (no wildcard — credentials are enabled) | `http://localhost:5173` |
| `BACKEND_PORT` / `FRONTEND_PORT` | Host ports | `8000` / `5173` |
| `MAX_UPLOAD_SIZE_MB` | Resume size limit | `5` |
| `DATA_DIR` / `UPLOAD_DIR` | Seed data and upload locations | `/data`, `/data/uploads` |
| `ENABLE_SEMANTIC_MATCHING` | Semantic relatedness layer (local TF-IDF, cheap) | `true` |
| `SEMANTIC_THRESHOLD` | Cosine similarity above which two skills count as related | `0.25` |
| `AI_PROVIDER` | `none` / `openai` / `openai-compatible` | `none` |
| `AI_API_KEY` | Provider key — **optional** | empty |
| `AI_MODEL` / `AI_BASE_URL` | Model name, custom endpoint | `gpt-4o-mini`, empty |

Frontend variables live in `frontend/.env` (see `frontend/.env.example`):

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `VITE_API_BASE_URL` | API base URL **without** the `/api` suffix | `http://localhost:8000` |
| `VITE_MAX_UPLOAD_MB` | Client-side mirror of the upload limit | `5` |

**The application is fully functional with `AI_API_KEY` empty.** Without a key the
assistant answers from stored data using deterministic logic and says so in the
UI (`Local reasoning mode`).

## Database, migrations and seed data

```bash
docker compose exec backend alembic upgrade head            # apply migrations
docker compose exec backend alembic current                 # verify
docker compose exec backend alembic revision --autogenerate -m "your change"
```

16 tables: `users`, `student_profiles`, `resumes`, `skills`, `student_skills`,
`companies`, `jobs`, `job_skills`, `job_matches`, `saved_jobs`, `roadmaps`,
`roadmap_items`, `assessments`, `assessment_questions`, `assessment_results`,
`progress`.

Seeding is **idempotent** — every step upserts on a natural key, so re-running it
is safe:

```bash
docker compose exec backend python -m app.seed
```

It loads the 118-skill taxonomy, 20 companies, 52 opportunities, 7 assessments
(70 questions) and the demo account. Every seeded opportunity is written with
`source="sample-data"`, and the UI labels it as sample data so nothing implies a
live vacancy.

### Restoring the demo account

Exploring the product as the demo user changes it permanently. To return it to its
documented state (7 baseline skills, no resumes, roadmaps, progress, results or
saved jobs):

```bash
docker compose exec backend python -m app.seed --reset-demo
```

This only ever touches the configured demo account, and plain seeding never
overwrites an existing demo profile.

## Running the application

| Task | Command |
| ---- | ------- |
| Start everything | `docker compose up -d --build` |
| Rebuild after a dependency change | `docker compose up -d --build` |
| Apply migrations | `docker compose exec backend alembic upgrade head` |
| Seed | `docker compose exec backend python -m app.seed` |
| Reset the demo account | `docker compose exec backend python -m app.seed --reset-demo` |
| Run backend tests | `docker compose exec backend pytest` |
| Backend logs | `docker compose logs -f backend` |
| Frontend dev server | `cd frontend && npm run dev` |
| Frontend production build | `cd frontend && npm run build` |
| Stop everything | `docker compose down` |
| Wipe the database too | `docker compose down -v` |

> **Note.** Editing `.env` requires `docker compose up -d` (not `restart`) so the
> container is recreated and re-reads the file.

## Demo credentials

```
email:    demo@skillbridge.dev
password: DemoPassword123!
```

**Development and demonstration only.** The account exists so a reviewer does not
have to register, and it is created by the seeder only when `SEED_DEMO_USER=true`.
Never ship these credentials.

The demo profile deliberately starts with only 7 skills (Python, JavaScript,
React, SQL, Git, HTML, CSS) so the gap, roadmap and recommendation features have
something real to show. After a reset it sits at roughly 50% average alignment
across its recommended roles — a spread, not a wall of 100%.

The email uses a real TLD on purpose: `email-validator` rejects reserved names
such as `.local`, so the brief's example address could never actually sign in
(see ADR-015).

## How the scoring works

```text
SkillBridge Compatibility = matched required skills ÷ total required skills × 100
```

Exact, normalised skill overlap only — unweighted, and reproducible by hand. Two
workbook examples are pinned as tests:

| Student | Role requires | Matched | Missing | Compatibility |
| ------- | ------------- | ------- | ------- | ------------- |
| Python, React, SQL | Python, React, Docker | Python, React | Docker | **66.67%** |
| Python, React, SQL, Git | Python, React, Node.js, MongoDB, Docker | Python, React | Node.js, MongoDB, Docker | **40.0%** |

Two additional figures exist, and are never presented as the headline:

- **Weighted score** — credits high-importance requirements more (100/50/25).
- **Semantic score** — related-skill credit from local TF-IDF cosine similarity,
  discounted to half weight and used for ranking only. Related matches are always
  shown as *related*, never as exact, so the score stays auditable.

The knowledge that a related skill is only partly relevant is never hidden: the
response includes the exact matched list, the semantic list with similarities, the
missing list, and a per-skill breakdown with the importance of each requirement.

## Testing

```bash
docker compose exec backend pytest
```

**144 tests, all passing.** They run against a dedicated `skillbridge_test`
database that is created and dropped around the session, so development data is
never touched.

| File | Covers |
| ---- | ------ |
| `test_api_journey.py` | The full journey through HTTP: register → profile → resume upload → matching → gap → roadmap → assessment → progress → assistant, plus ownership isolation. |
| `test_matching.py` | The scoring contract, including the two workbook examples, monotonicity, weighting and the semantic rules. |
| `test_auth.py` | Registration, login, logout, password policy, token expiry, account deletion. |
| `test_skills.py` | Taxonomy integrity, alias normalisation, extraction confidence, slug uniqueness (`C`, `C++`, `C#`). |
| `test_health.py` | Liveness vs readiness, including the degraded path. |
| `test_regressions.py` | Defects found while verifying the UI in a browser, pinned so they cannot return — see below. |

`test_regressions.py` exists because real bugs were found by driving the actual
application rather than only the API:

1. The dashboard's opportunity cards used a different JSON shape from
   `GET /api/jobs`, which **crashed** the card component at runtime.
2. The Skill Gap page reported 19 gaps while the roadmap generated from it
   claimed 73 — two screens contradicting each other.
3. A student with no skills at all was told they "already cover every required
   skill".
4. Anonymous visitors logged a console `401` on every public page.

Frontend checks:

```bash
cd frontend
npx tsc -b      # type check
npm run build   # production build
```

## Deployment

The stack separates cleanly: a static SPA, a stateless API and a managed
PostgreSQL database.

### Database

Any PostgreSQL 13+ provider works (Neon, Supabase, Railway, RDS). Copy its
connection string into `DATABASE_URL` as a SQLAlchemy DSN:

```text
postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require
```

### Backend (Render / Railway / Fly.io)

Build from `backend/`, using the included `Dockerfile`.

- **Health check path:** `/api/health/ready`
- **Start command:** `alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required environment variables:

```text
APP_ENV=production
DEBUG=false
JWT_SECRET=<64-char hex from secrets.token_hex(32)>
COOKIE_SECURE=true
CORS_ORIGINS=https://your-frontend-domain
DATABASE_URL=postgresql+psycopg://...
SEED_DEMO_USER=false
```

Notes:

- `SEED_DEMO_USER=false` in production — the demo credentials must not exist there.
- `COOKIE_SECURE=true` requires HTTPS on both ends. `SameSite=Lax` is correct when
  the API and the SPA share a registrable domain (e.g. `api.example.com` and
  `www.example.com`). If they are on entirely different sites, the cookie must
  become `SameSite=None; Secure`, which is a change in `core/security.py`.
- `UPLOAD_DIR` must point at a volume with persistent storage, or uploaded files
  disappear on redeploy (database rows survive).
- `ENABLE_SEMANTIC_MATCHING=true` needs no extra service: it is local scikit-learn.

### Frontend (Vercel / Netlify / Cloudflare Pages)

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment:** `VITE_API_BASE_URL=https://your-api-domain` (no `/api` suffix),
  `VITE_MAX_UPLOAD_MB` matching the backend, then set the same value in
  `CORS_ORIGINS`.

Route splitting means the landing page ships ~153 kB gzipped; the charting library
loads only when a chart page is opened.

### Optional LLM

Set `AI_PROVIDER=openai` and `AI_API_KEY=...` to upgrade the assistant to
conversational answers. Nothing else changes, and unsetting them returns the app
to local reasoning mode — the assistant degrades, it never breaks.

## Known limitations

1. **Opportunity data is sample data.** 52 fictional listings, labelled
   `sample-data` in the API and in the UI. Nothing is scraped and no live job
   board is contacted. `services/job_service.py` is structured so an authorised
   provider can be added behind the same interface.
2. **No email verification or password reset.** There is no transactional email
   provider, so registration sends nothing. Adding it is a new column and a new
   endpoint, not a rewrite (ADR-014).
3. **Semantic matching is TF-IDF, not embeddings.** Chosen so the app runs with no
   ~2 GB model download and so related-skill judgements stay explainable. The
   threshold (0.25) was calibrated against the shipped taxonomy: only the top ~3%
   of 6,745 skill pairs exceed it.
4. **Progress is a learning signal, not a competency certificate.** It rises from
   completing roadmap steps and passing assessments. The product never claims
   proficiency it has no evidence for.
5. **Assessments are 10 questions per skill** across 7 skills — enough to
   demonstrate the flow, not a psychometrically validated instrument.
6. **Uploads are stored on local disk.** Correct for development; production needs
   a persistent volume or object storage.
7. **No refresh-token rotation.** A single short-lived access token in an httpOnly
   cookie. Expiry returns the student to the sign-in page with their original
   destination preserved.
8. **Uploaded files are not virus-scanned.** Format and size are validated and
   storage is outside any public path.
9. **One known console warning** from Starlette about `httpx` in `TestClient`
   (`install httpx2 instead`). It affects the test runner only, not the app.

## Future improvements

- Swap TF-IDF for `sentence-transformers` behind the existing
  `semantic_matcher` interface, keeping the local path as the fallback.
- Add an authorised job provider (Adzuna, Jooble, Greenhouse) behind the job
  service, with the seeded dataset as an offline fallback.
- Email verification and password reset.
- Object storage for resumes with a signed, time-limited download route.
- Refresh-token rotation and per-device session revocation.
- Recruiter-facing view of anonymised aggregate skill demand.
- Importable roadmap templates per target role, shared across students.
- WebSocket progress so a long resume analysis reports live, not in stages.

## Documentation

- [`docs/architecture-decisions.md`](docs/architecture-decisions.md) — 22 records
  covering the stack, the structure, the security model and every deliberate
  deviation from the original brief, each with its reason and consequence.
- [`docs/progress-report.md`](docs/progress-report.md) — what was built, what was
  verified by running it, and what is knowingly incomplete.

Interactive API documentation: <http://localhost:8000/docs> (49 operations,
61 schemas).

---

## Development rules followed

1. Nothing is claimed as working unless it has been run.
2. Never rewrite working code without a reason.
3. Find the root cause before changing files.
4. No invented dependencies.
5. Keep responsibilities in their own layers.
6. Never fake a figure the system does not actually know — a missing score is
   reported as missing, not as a plausible number.
