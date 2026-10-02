# Architecture decisions

Short records of the decisions that shaped the project, and the deviations from
the original brief. Each entry states the decision, the reason, and the
consequence.

---

## ADR-001 - Backend runs on Python 3.12 inside Docker

**Decision.** The API is containerised on `python:3.12-slim` rather than using
the interpreter installed on the developer machine (Python 3.14.3).

**Reason.** Phase 4 (spaCy) and Phase 7 (sentence-transformers / PyTorch) depend
on compiled native wheels. Those ecosystems lag new CPython releases, so pinning
to 3.12 avoids discovering an uninstallable dependency after a lot of code has
been written on top of it. Docker also removes "works on my machine" drift.

**Consequence.** Docker Desktop must be running for backend development. The
frontend stays on the host Node toolchain for fast HMR.

---

## ADR-002 - PostgreSQL in Docker, not locally

**Decision.** PostgreSQL 17 runs as a Compose service with a named volume.

**Reason.** No `psql` client (and no local server) is installed on the
development machine. Containerising the database is the only option that does
not require a system-level install, and it keeps the database reproducible for
whoever evaluates the project.

**Consequence.** Data lives in the Docker volume `skillbridge_db_data`.
`docker compose down -v` destroys it.

---

## ADR-003 - One `.env` at the repository root

**Decision.** A single `.env.example` at the repo root is the source of truth.
Both Compose and the API read it. `SettingsConfigDict(env_file=("../.env", ".env"))`
lets the API find it whether it runs from `backend/` or from `/app` in a container.

**Deviation from brief.** The brief listed `backend/.env.example`. Duplicating
the same 25 variables in two files invites them drifting apart, so a root-level
file is used instead. Real environment variables always take precedence, so
production can inject secrets without any file at all.

**Consequence.** `cp .env.example .env` from the repo root is the whole setup
step. `backend/.env` still works if someone wants to override a value locally.

---

## ADR-004 - `DATABASE_URL` is overridden by Compose

**Decision.** `.env` contains a `localhost` DSN for host-side runs, and
`docker-compose.yml` overrides it with the in-network hostname `db`.

**Reason.** The same database has two different addresses depending on where the
code runs. Baking one address into `.env` guarantees the other case breaks.

**Consequence.** Running `uvicorn` directly on the host works without editing
anything, as long as the `db` container is publishing port 5432.

---

## ADR-005 - Two health endpoints, not one

**Decision.** `GET /api/health` (liveness, no database access) and
`GET /api/health/ready` (readiness, runs `SELECT 1` and returns 503 when the
database is unreachable).

**Reason.** Conflating the two makes orchestration unreliable and makes the
frontend status indicator ambiguous - "the API is down" and "the API is up but
the database is down" need different fixes.

**Consequence.** The frontend distinguishes three states: online, degraded and
offline, which makes local debugging much faster.

---

## ADR-006 - Tailwind CSS v4 with the first-party Vite plugin

**Decision.** Tailwind v4 (`@tailwindcss/vite`) with CSS-first configuration and
design tokens declared in `@theme`.

**Reason.** The brief specified Tailwind but not a version. v4 is current,
removes `tailwind.config.js` and PostCSS setup, and supports custom utilities
directly in CSS, which suits the custom glass/orb styling.

**Consequence.** Theme tokens live in `frontend/src/index.css`. There is no
`tailwind.config.js`.

---

## ADR-007 - Signature visuals are pure CSS

**Decision.** The AI Orb, glass panels, ambient glows and the career-pathway
component are implemented in CSS; Framer Motion is used only for entrance
transitions.

**Reason.** The brief reserves the animation budget for microinteractions while
demanding 70% usability. Continuously animating a gradient with a JS animation
library costs main-thread work on every frame for pure decoration.

**Consequence.** All animations respect `prefers-reduced-motion`.

---

## ADR-008 - Exact skill matching is the baseline; semantics are an enhancement

**Decision.** The matching engine scores on normalised exact skill overlap
first. Semantic similarity (Phase 7) is additive, feature-flagged behind
`ENABLE_SEMANTIC_MATCHING`, and every related-skill judgement must be
explainable.

**Reason.** The brief requires an explainable score. A deterministic overlap
ratio can be defended in a viva; an opaque embedding distance cannot.

**Consequence.** The app is fully functional and testable with the embeddings
stack switched off, and clones stay small.

---

## ADR-009 - Seed job data instead of scraping

**Decision.** Phase 5 ships a curated `data/seed_jobs/seed_jobs.json` dataset,
with every listing explicitly attributed to sample data, and a job service
layered so an authorised API can be added later.

**Reason.** Scraping job boards without permission is both a legal and an
ethical problem, and a live API key would make the project un-runnable offline.

**Consequence.** Matching is demonstrated on labelled sample data, and the UI
must never present a seeded listing as live.

---

## ADR-010 - Compatibility is never described as a hiring prediction

**Decision.** The score is called **SkillBridge Compatibility** /
**Skill Alignment** everywhere: API fields, types, UI copy and documentation.
Prohibited phrasings: hiring probability, chance of selection, guaranteed
interview, guaranteed job.

**Reason.** The score is a cosine-style skill overlap. Presenting it as a
prediction of outcomes would be a false claim about what the software knows.

**Consequence.** `compatibility_score` is the field name; the landing page and
footers state the limitation explicitly.

---

## ADR-011 - Phase 1 ships the repository skeleton only

**Decision.** Phase 1 delivers infrastructure - structure, config, database
connection, migrations, health endpoints and a verified frontend/backend link -
plus a single public landing route. No models, no auth, no business logic.

**Reason.** The brief requires each phase to be verifiable in isolation. A
green health check that exercises PostgreSQL end to end is a meaningful,
testable milestone.

**Consequence.** Most directories (`models`, `schemas`, `services`, `ai`) are
present but intentionally empty, so later phases add files rather than
restructure the project.

**Status.** Historical. Every later phase landed, so those directories are now
full; the structural decision (predictable layout first) is what still stands.

---

## ADR-012 - PostgreSQL is published on host port 5433, not 5432

**Decision.** `POSTGRES_PORT` defaults to `5433`. Inside the Compose network the
database still listens on the standard 5432.

**Reason.** Host port 5432 was already allocated by an unrelated project's
container on this machine. Reusing or stopping that container would have broken
someone else's running system; changing only our host-side port keeps both
projects running side by side.

**Consequence.** Any host-side tool (a local `uvicorn`, a GUI database client)
must connect to `localhost:5433`. Container-to-container traffic is unaffected.

---

## ADR-013 - JWT is delivered in an httpOnly cookie

**Decision.** From Phase 2 the access token is issued as an `httpOnly`,
`SameSite=Lax` cookie rather than being returned in the response body and kept
in `localStorage`.

**Reason.** A token in `localStorage` is readable by any script running on the
page, so a single XSS bug leaks a valid session. An httpOnly cookie is not
reachable from JavaScript at all. Since the brief explicitly requires secure
authentication and resume data is personal information, the safer default is
worth the extra setup.

**Consequences.**

1. The API must set the cookie on login/register and clear it on logout, so
   logout becomes a real server-side endpoint rather than a client-side delete.
2. Cookie-based auth is CSRF-relevant. `SameSite=Lax` blocks cross-site POSTs;
   the API also restricts `CORS_ORIGINS` to known frontend origins.
3. The axios client needs `withCredentials: true`, and CORS needs
   `allow_credentials` (already enabled in `app/main.py`) with an explicit
   origin list - a wildcard `*` is not permitted alongside credentials.
4. The frontend cannot read the token, so it must learn whether it is signed in
   by calling `GET /api/auth/me` on startup. Auth state is therefore
   server-derived rather than decoded from a local token.
5. This must work over HTTPS in any real deployment; `SameSite=None; Secure`
   would be required if the API and frontend were ever on different sites.
   In local development both are on `localhost`, so `SameSite=Lax` is correct.

---

## ADR-014 - Auth policy: open registration, 8-character minimum password

**Decision.**

1. **Open registration.** Accounts are validated by email format and uniqueness
   only, and are immediately usable. There is no email-verification step.
2. **Password policy.** Minimum 8 characters, maximum 72 bytes.

**Reason.** The project has no transactional email provider, and adding one
would introduce a dependency and a configuration burden that the MVP does not
need. On length: 72 bytes is not an arbitrary number - bcrypt ignores every
input byte beyond 72, so without an explicit maximum two different long
passwords can authenticate the same account. Rejecting over-length input is
more honest than silently truncating it. A complexity rule (mixed case, digits,
symbols) was considered and rejected: it adds demo friction and measurably
encourages password reuse without adding real strength at this length.

**Consequence.** Registration is deliberately permissive, so the API must treat
`email` as a case-insensitively unique key. If email verification is ever added,
it becomes a new column and a new endpoint, not a rewrite of the register flow.

---

## ADR-015 - The demo account uses a real TLD (`demo@skillbridge.dev`)

**Decision.** The seeded demo address is `demo@skillbridge.dev`. The brief's
example, `demo@skillbridge.local`, is not used.

**Reason.** `email-validator` classifies `.local` (and `.test`, `.invalid`,
`.example`) as special-use or reserved names and rejects them at the schema
layer. The seeder bypasses Pydantic and writes the row directly, so the seeded
account *looked* fine in the database while every login attempt returned a 422
before authentication was even reached - a bug that only surfaces when someone
tries to sign in as the demo user.

**Consequence.** `.env.example` documents both the address and the reason. Any
future seeded credential must use a public TLD.

---

## ADR-016 - One opportunity-card shape across every API surface

**Decision.** The dashboard's recommendations, the resume analysis preview, the
assistant's grounding context and `GET /api/jobs` all serialise an opportunity
through the same function (`services/serializers.job_list_item`).

**Reason.** These surfaces previously used an ad-hoc dict with a flattened
`company` string and no `experience_level`, `source` or `required_skills`. The
frontend renders all of them with one card component, so the drift was an
immediate runtime crash (`Cannot read properties of undefined`) on the
dashboard, not a cosmetic difference. A test now asserts that the key sets of
the dashboard card and the job-list card are identical.

**Consequence.** Adding a field to the card means adding it in one serialiser.
The compact `saved_jobs` strip on the dashboard is deliberately a *different*,
smaller shape and is named as such in the tests so the difference stays
intentional.

---

## ADR-017 - "Skill gaps" always means gaps against the best-fit roles

**Decision.** Every gap-driven surface - the dashboard's gap metric, the Skill
Gap page and roadmap generation - uses one shared constant,
`recommendation_service.DEFAULT_GAP_ROLE_LIMIT = 12`, and each response states
its scope in words.

**Reason.** Two bugs hid here. Aggregating all 52 seeded roles reports ~80 gaps
for every student: technically true, useless as a plan. And once different
surfaces used different limits, the Skill Gap page reported 19 gaps while the
roadmap generated from it claimed 73 - the two screens contradicted each other
in the same session.

**Consequence.** The constant is the single place to widen or narrow the
definition of "your gaps". Tests assert that a generated roadmap covers exactly
the gaps the page reported. `limit` bounds how many *roles* are considered, not
how many skills are returned, so the returned list may be longer than `limit`.

---

## ADR-018 - Auth state is bootstrapped by an always-200 session probe

**Decision.** `GET /api/auth/session` always returns 200 with
`{authenticated, user, has_profile}`. The SPA calls it on startup.
`GET /api/auth/me` keeps its strict 401 for programmatic callers.

**Reason.** The frontend must discover its auth state on every page load,
including for anonymous visitors. Using `/auth/me` meant every public page view
logged a red `401 (Unauthorized)` in the browser console - correct HTTP, but it
reads as a broken app to anyone with devtools open.

**Consequence.** Two endpoints describe the same session with different error
semantics, which is deliberate and pinned by a test asserting both behaviours.

---

## ADR-019 - Routes are code-split, with the fallback inside the layout

**Decision.** Every authenticated page is loaded with `React.lazy`. The
`Suspense` boundary lives inside `AppLayout` / `PublicShell`, not around the
router.

**Reason.** The single eager bundle was 975 kB (290 kB gzipped) because the
entry chunk pulled in Recharts for pages a visitor may never open. Splitting
halves the initial download. Putting the boundary inside the layout means the
sidebar and header stay mounted while a page chunk arrives, instead of the whole
shell flashing.

**Consequence.** The landing page, sign-in and sign-up stay eager - they are the
first paint and are tiny. Recharts now sits in its own shared chunk that only
chart pages request.

---

## ADR-020 - The auth context and its hook live in separate modules

**Decision.** `store/authContext.ts` holds the context, the `useAuth` hook and
the types. `store/auth.tsx` exports only the `AuthProvider` component.

**Reason.** React Fast Refresh cannot hot-reload a module that exports both a
component and a hook. Editing the auth store while the app was running tore the
provider down and every consumer threw `useAuth must be used inside an
<AuthProvider>` - a crash caused purely by saving a file.

**Consequence.** Saving `auth.tsx` now hot-updates in place with state
preserved. Consumers import the hook from `authContext`, not from `auth`.

---

## ADR-021 - Completing a roadmap step promotes the skill onto the profile

**Decision.** Marking a roadmap step `completed` sets that skill's progress to
100% and, if it was not already there, adds it to the student's skill set with
`source="roadmap"`.

**Reason.** Progress has to come from something real. Without an accompanying
promotion the roadmap would report completion while the skill still counted as a
gap, and the dashboard would contradict the roadmap.

**Consequence.** The promotion is an explicit, auditable event driven by a user
action - never inferred. Passing an assessment is the other route to mastery,
and it is labelled the same way.

---

## ADR-022 - The demo account is restorable, and reset is opt-in

**Decision.** `python -m app.seed --reset-demo` restores the demo account to its
documented state: the 7 baseline skills, and no resumes, roadmaps, progress,
assessment results or saved opportunities. Seeding without the flag never
touches an existing demo profile.

**Reason.** Exploring the product as the demo user permanently changes it. After
a resume upload and a few assessments the account had 40 skills and every
recommendation sat at 100%, which makes the demo look broken and hides the
gap-driven features it exists to show. Making plain seeding destructive would
have been worse, because it would silently discard a reviewer's work.

**Consequence.** The reset only ever touches the configured demo account and is
reported in the seed output. A test drives it against a throwaway account so the
real demo student is never mutated by the suite.
