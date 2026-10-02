# SkillBridge AI — Final Report

**As of:** 1 October 2026
**Milestone:** all 10 phases implemented; the critical journey verified end to end
**Method:** every claim below was verified by **running the system** — in a real
browser and against the real API — not estimated from reading the code.

---

## 1. Headline

| Metric | Value |
| ------ | ----- |
| Phases complete | **10 of 10** |
| Database tables | **16** domain tables (+ `alembic_version`) |
| Alembic migrations | **1** (initial schema, applied) |
| API operations | **49** across 9 routers |
| Pydantic schemas | **61** |
| Backend modules | 74 Python files, ~10,600 lines |
| Frontend | 67 TS/TSX files, ~8,000 lines, 17 pages |
| Skill taxonomy | **118 skills, 380 aliases, 13 categories** |
| Opportunity data | **20 companies, 52 roles** (all labelled `sample-data`) |
| Assessments | **7 skills × 10 questions = 70**, with explanations |
| Tests | **144, all passing** |
| Data + documentation | ~1,500 lines of JSON, 22 architecture decision records |

Two containers run healthy: PostgreSQL 17 and the FastAPI service. The frontend
builds clean with zero TypeScript errors.

---

## 2. Phase-by-phase status

| # | Phase | Status | Evidence |
| -: | ----- | ------ | -------- |
| 1 | Foundation | **Done** | 2 containers healthy, migrations applied, build + lint clean |
| 2 | Authentication | **Done** | Register/login/logout/session/password/delete; httpOnly cookie; ownership enforced on every personal resource |
| 3 | Profile & onboarding | **Done** | Full profile CRUD, editable skill set with proficiency, onboarding checklist on the dashboard |
| 4 | Resume + skill extraction | **Done** | Real PDF and DOCX parsed in-browser; 11–36 skills extracted; sections and contact details detected |
| 5 | Opportunity database | **Done** | 20 companies / 52 roles seeded; search, 6 filters, 3 sorts, pagination |
| 6 | Matching engine | **Done** | Workbook examples reproduced exactly (66.67%, 40.0%); full explainable breakdown |
| 7 | Semantic matching | **Done** | Local TF-IDF, threshold calibrated against the taxonomy; related credit discounted and labelled |
| 8 | Skill gap + roadmap | **Done** | Three-state gap view; prerequisite-ordered roadmap; status updates feed real progress |
| 9 | Assessments | **Done** | 7 assessments, server-side grading, answer key never sent to the client |
| 10 | Dashboard, assistant, polish | **Done** | Aggregated dashboard, charts, grounded assistant, settings, docs, code splitting |

---

## 3. Verified by running it

Everything in this table was observed, not assumed.

### Infrastructure

| Check | Result |
| ----- | ------ |
| `docker compose ps` | backend + db both **healthy** |
| `GET /api/health` | 200 |
| `GET /api/health/ready` | 200 `{"database":"connected"}` |
| Degraded path | stopped the database → `/ready` returned **503**, liveness still 200, restart recovered |
| `alembic upgrade head` | applied; 17 tables present |
| `python -m app.seed` | 118 skills, 20 companies, 52 jobs, 7 assessments, 70 questions, demo user |
| Frontend production build | 0 TypeScript errors |

### The critical journey, in a real browser

Run as a signed-in student against the live API and PostgreSQL:

| Step | Observed |
| ---- | -------- |
| Register | Account created, signed in immediately, routed to onboarding |
| Onboarding | Profile saved and read back (name, college, degree, branch, year, preferred role) |
| Upload a real PDF | Synthesised a valid PDF, dropped it on the dropzone → `Resume analysed. 11 skills identified` |
| Skill extraction | 11 skills across 5 categories at 95% confidence; sections SUMMARY/EDUCATION/EXPERIENCE/PROJECTS/SKILLS detected; name and email detected |
| Opportunities re-scored | Backend Engineer moved to 85.7% because the upload added Docker/FastAPI/PostgreSQL |
| Dashboard | 7 skills, 6 matched, 50.4% average alignment, 62.5% top match, 40-node constellation |
| Save an opportunity | `aria-pressed` flipped, and the role appeared under Saved opportunities with a real `activity` entry |
| Search + filter | `?q=backend` → 4 roles (all matching), then employment-type filter → 2 |
| Skill gap | "Across your 12 best-fit roles", 11 available / 19 to learn |
| Roadmap generation | 19 steps, 497h, prerequisite order preserved (`Data Structures` before `Algorithms`) |
| Step completion | Marked complete → progress 1 of 19, 45h → skill promoted to the profile at 100% |
| Assessment | Walked all 10 Git questions, submitted, **100%**, passed, review with explanations |
| Progress | 2 skills mastered, 100% average score, charts populated, score history charted |
| Assistant | Grounded answers naming real companies and percentages, with sources, and a disclaimer line |
| Settings | Modal opens, scroll locks, delete disabled until a password is typed, wrong password rejected with a clear message and nothing deleted |
| Logout | Session genuinely cleared server-side (`/auth/me` → 401) |
| Deleted-session recovery | Stale cookie → clean redirect to sign-in, original destination preserved |
| Console | **Clean** on a fresh load — no errors, no warnings |

---

## 4. Defects found and fixed

This is the part that only surfaced by driving the actual application.

### 1. The dashboard crashed on first render

`job_card_payload` returned a homemade dict — a flattened `company` string, no
`experience_level`, no `source`, no `required_skills` — while every other surface
used the canonical `JobListItem`. One card component rendered both, so the
dashboard threw `Cannot read properties of undefined (reading 'slice')` and the
whole page went blank.

**Fix:** one serialiser for every surface (ADR-016), plus a test asserting the key
sets of the dashboard card and the job-list card are identical.

### 2. Two screens contradicted each other about the same student

The Skill Gap page said **19 gaps**; the roadmap generated from that page said
**73**. Different call sites passed different `limit` values, and `limit` turned
out to bound *roles considered*, not *skills returned* — so the number that looked
like a list length was something else entirely.

**Fix:** one shared constant (`DEFAULT_GAP_ROLE_LIMIT`) for all four gap surfaces,
an explicit `scope` field in the response so the UI always states what the figures
cover, and a test asserting a generated roadmap covers exactly the gaps reported
(ADR-017).

### 3. New users were told they already had everything

A student with zero skills got *"You already cover every required skill for this
target, so there is nothing to add to a roadmap."* The empty state and the error
shared one code path that could not tell "fully covered" from "no data at all".

**Fix:** three distinct states (gaps exist / genuinely covered / no data yet),
each with its own message on both the gap page and the roadmap error.

### 4. Registration skipped onboarding

A new account landed on the dashboard instead of onboarding: the page's
"already signed in → go to dashboard" guard fired on the very render that
followed a successful sign-up. The same race silently discarded a deep link when
signing in from a protected page.

**Fix:** a ref that marks the in-flight sign-up/sign-in so the guard stays out of
the way, and resets on failure. Verified: registration now lands on onboarding,
and an expired session returns the student to the page they were on.

### 5. A 401 on every public page load

Auth state was discovered by calling `GET /api/auth/me`, which correctly returns
401 for anonymous visitors — so every public page view logged a red console error
that looks like a broken app.

**Fix:** an additive `GET /api/auth/session` that always returns 200 with an
`authenticated` flag. `/auth/me` keeps its strict 401 for programmatic callers,
and a test pins both behaviours (ADR-018).

### 6. Saving one file crashed the running app

`store/auth.tsx` exported both the `AuthProvider` component and the `useAuth`
hook, so React Fast Refresh could not hot-reload it. Editing it tore the provider
down and every consumer threw `useAuth must be used inside an <AuthProvider>`.

**Fix:** the context and hook moved to their own module; `auth.tsx` exports only
the component. Verified by editing the file while the app was running: clean hot
update, state preserved (ADR-020).

### 7. The demo account degraded into a worthless demo

After one resume upload and a few assessments it had 40 skills and every
recommendation sat at 100%, which hides the exact features the demo exists to
show.

**Fix:** `python -m app.seed --reset-demo` restores the 7-skill baseline and
clears derived data, opt-in so normal seeding never discards anyone's work
(ADR-022).

### 8. Earlier phase fixes worth recording

| Defect | Why it mattered |
| ------ | --------------- |
| `cors_origins` was JSON-decoded by pydantic-settings before validators ran | A comma-separated list silently failed to parse |
| `slugify` collapsed `C`, `C++` and `C#` to the same slug | 118 skills, only 116 usable — three skills merged into one |
| The lemma pass matched bare "api"/"design" | "API Design" and "Presentation Skills" appeared from unrelated text |
| `by_name` was lowercase-keyed but prerequisites are authored capitalised | **Every prerequisite silently failed to resolve**, so roadmap ordering was never actually correct |
| DOCX tables landed at the end of the document | Section attribution drifted, mis-filing skills |
| `demo@skillbridge.local` was rejected by `email-validator` | The seeded demo account could never sign in (ADR-015) |
| `import app.models` rebound the name `app` in tests | Shadowed the FastAPI instance; `dependency_overrides` vanished |
| The dashboard reported "77 skill gaps" | Technically true, useless as a metric (ADR-017) |

---

## 5. Deliberate deviations from the brief

| Brief | What was built | Reason |
| ----- | -------------- | ------ |
| `backend/.env.example` | One root `.env.example` | Duplicating 25 variables in two files invites drift (ADR-003) |
| `demo@skillbridge.local` | `demo@skillbridge.dev` | The validator rejects reserved TLDs; the original could never log in (ADR-015) |
| 15 tables listed | 16 implemented | `roadmap_items` and `progress` needed a `roadmaps` parent row that the brief's list implied but did not enumerate |
| sentence-transformers | Local TF-IDF | No ~2 GB model download, and related-skill judgements stay explainable (ADR-008) |
| `MAX_UPLOAD_SIZE_MB=10` | 5 MB | A document cap that keeps parsing fast; raised via one variable in both halves |
| Phase-by-phase, skeleton first | Same, but each phase ended with tests | Caught the prerequisite bug that reading the code would not have |

---

## 6. Knowingly incomplete

1. **Opportunity data is fictional** — 52 seeded roles, labelled as sample data in
   the API and the UI. No live provider is contacted. The job service is layered
   so one can be added behind the same interface.
2. **No email verification or password reset** — no transactional email provider.
3. **Semantic matching is TF-IDF cosine similarity**, not embeddings. The 0.25
   threshold was calibrated against the shipped taxonomy (top ~3% of pairs), not
   guessed, but it is a smaller model than the brief's optional stack.
4. **Uploads live on local disk** — production needs a persistent volume or
   object storage.
5. **No refresh-token rotation** — one short-lived access token in an httpOnly
   cookie.
6. **Uploaded files are not virus-scanned** — type, size and location are
   constrained instead.
7. **7 assessments of 10 questions each** — enough to exercise the flow, not a
   validated psychometric instrument.
8. **One console warning in the test runner** — Starlette suggests `httpx2` over
   `httpx` for `TestClient`. Does not affect the application.

None of these are presented as working. Each is documented in the README and in
the relevant decision record.

---

## 7. Reproducing this verification

```bash
cp .env.example .env
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed
docker compose exec backend pytest          # 144 tests
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Then sign in with `demo@skillbridge.dev` / `DemoPassword123!` and walk the
journey. To return the demo account to its documented starting state afterwards:

```bash
docker compose exec backend python -m app.seed --reset-demo
```
