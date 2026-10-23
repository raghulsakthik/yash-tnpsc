# Architecture

Phase 1 audit. Scope: backend entry point, overall pattern, duplicated/incomplete functionality, frontend↔backend coupling. (Endpoint-by-endpoint detail lives in `api.md`; schema in `database.md`.)

## Backend entry point

There is no single `main.js`/`server.js`. This is a Next.js 15 App Router project (`next.config.mjs`, `reactStrictMode: true`, no other overrides) — the "entry point" is file-based routing:

- `src/app/layout.js` — root server layout (fonts, metadata, viewport). No data fetching.
- `src/app/page.js` and the other `src/app/<route>/page.js` files — client-rendered pages.
- `src/app/api/**/route.js` — Route Handlers, one file per endpoint, each exporting `GET`/`POST` and `export const dynamic = 'force-dynamic'` (always runtime-executed, never cached).
- `npm run dev` / `npm run build` / `npm run start` (`package.json`) are the only process entry points; confirmed working (see `existing-functionality.md`).

## Pattern in practice

README specifies controller → service → domain → repository (written for a Java/Spring doc, implemented here in JS). What actually exists:

- **Controller** = `src/app/api/**/route.js`. Parses request, calls domain/lib, shapes `NextResponse.json`.
- **Service** = mostly fused into the route itself, except `src/lib/attempts.mjs`, the one real shared use-case: `recordAttempt()`, used by both `POST /api/attempts` and `POST /api/tests/:id/submit`.
- **Domain** = `src/domain/*.mjs` — pure, framework-free functions. No `next`/`pg` imports anywhere in this directory (confirmed by inspection).
- **Repository** = does not exist as a separate layer. Raw parameterized SQL (`pg`) is written directly inside route handlers and inside `attempts.mjs`. No ORM, no query builder.

Net: the domain layer is genuinely isolated and unit-testable (and is tested — 50 passing tests); the controller and repository layers are collapsed into the same files.

## `src/lib/db.mjs` — connection layer

- Single `pg.Pool` (`max: 5`), connection string from `DATABASE_URL`.
- Stashed on `globalThis.__novaPool` outside production to survive Next dev hot-reload.
- Exports `pool`, `query()`, `LEARNER_ID` (hard-coded UUID, overridable via `NOVA_LEARNER_ID`), `recordEvent()` (inserts into `learning_event`, swallows all errors by design — "analytics must never break learning").

## `src/lib/attempts.mjs` — `recordAttempt()`

The one shared grading pipeline, called from two different routes. Caller owns the transaction. In order: look up question → read prior `learner_topic_state` → `classifyMistake()` → idempotent insert into `question_attempt` (`ON CONFLICT (id) DO NOTHING`, short-circuits on duplicate) → recompute accuracy/speed from last 20 attempts → compute mastery dimensions → `adaptDifficulty()` → advance/create `revision_schedule` row → `masteryScore()` → upsert `learner_topic_state` → return a rich result object.

## Domain modules (`src/domain/*.mjs`)

All pure, framework-free. See `adaptive-system.md` for the full algorithm breakdown. Inventory: `accuracy.mjs`, `difficulty.mjs`, `mastery.mjs`, `mistakes.mjs`, `planner.mjs`, `revision.mjs`, `selection.mjs`, `testGen.mjs`, `ai/context.mjs`.

## AI integration

`src/lib/ai/provider.mjs` — the only network call in the codebase. Plain `fetch` to Anthropic's Messages API, no SDK, `MODEL='claude-haiku-4-5-20251001'`. Returns `null` on missing key / non-OK response / any thrown error — never throws. `src/domain/ai/context.mjs` builds the prompt context/text, kept pure. Wired through `POST /api/ai/hint`, cache-first against `ai_interaction(question_id, type)`. Entirely additive: no learning-loop code depends on it being available.

## Authentication

**None exists.** No login/session/JWT/cookie/password/NextAuth code anywhere; no `middleware.js`; no auth dependency in `package.json`. Every route uses a single hard-coded `LEARNER_ID` constant (`src/lib/db.mjs`), never a request-derived identity. `learner`/`learner_profile` tables exist in the schema but carry no credential columns. This is a documented, deliberate decision ("Built for one learner" — README), not an oversight.

## Frontend dependency on backend

Every page under `src/app/*/page.js` is a client component (`'use client'`) that does nothing but `fetch()` a Next.js Route Handler and render the JSON it gets back. There are no server components that fetch data (the root layout is the only server component, and it fetches nothing). Concretely:

| Page | Backend dependency |
|---|---|
| `/` | `GET /api/plan/today` |
| `/practice` | `<QuestionSession nextQuestionUrl="/api/questions/next?topic=…" submitUrl="/api/attempts">` |
| `/revision` | `<QuestionSession nextQuestionUrl="/api/revision/next" submitUrl="/api/attempts">` |
| `/mistakes` | `<QuestionSession nextQuestionUrl="/api/mistakes/next" submitUrl="/api/attempts">` |
| `/test` | `POST /api/tests` on mount, then `POST /api/tests/:id/answers` per answer, `POST /api/tests/:id/submit` on finish |
| `/test/[id]/results` | `GET /api/tests/:id` |

No scoring, difficulty, mistake-classification, or scheduling logic is ever shipped to the browser — all of it lives server-side in `src/domain/*` and is invoked only from route handlers. The frontend is a thin renderer by design (README: "the frontend decides nothing").

## Duplicated functionality

None found at the code level. The one apparent duplication — grading logic appearing in both the practice/revision/mistakes path and the test-submission path — is in fact a single shared function (`recordAttempt()` in `src/lib/attempts.mjs`) called from both `POST /api/attempts` and `POST /api/tests/:id/submit`, not two copies of the same logic. `difficultyBand()` is computed independently in four route handlers (`questions/next`, `revision/next`, `mistakes/next`, `tests/[id]`) — same pure function imported each time, not reimplemented, so this is repetition of a call site, not duplicated logic.

## Incomplete functionality

- **`question.source_year`** column (`V1__init.sql`) is declared but never populated — PYQ year is currently embedded only in the `source` string (`tnpsc-2018`, etc.); see `content.md`.
- **No lesson/instructional-content model** — only question banks exist, no distinct "lesson" unit a learner can be routed into (relevant to the target learning-model phases; see `gap-analysis.md`).
- **`mastery_score` is computed and stored but nothing reads it** to produce a ready/not-ready gate or routing decision — the data pipeline is complete, the decision layer on top of it is not.
- **`learning_event` is write-only** — logged on every view/answer/test-completion but documented as "analytics-only, never read by the learning engine." No code currently reads it back.
- **No measurement of intervention effectiveness** — `interventionFor(mistakeType)` (`mistakes.mjs`) returns a message to show, but nothing records which intervention was shown or checks whether it changed subsequent performance.
