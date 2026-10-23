# Architecture Audit

Scope: `src/app/api/**`, `src/lib/**`, `src/domain/**`. Factual inventory only — no proposed changes.

## Pattern in practice

README specifies controller → service → domain → repository (originally written for a Java/Spring doc, implemented here in JS/Next.js). What actually exists:

- **Controller** = `src/app/api/**/route.js` (Next.js Route Handlers). Parses request, calls domain/lib, shapes `NextResponse.json`. All routes set `export const dynamic = 'force-dynamic'`.
- **Service** = mostly fused into the route itself, except `src/lib/attempts.mjs`, which is the one real shared service/use-case: `recordAttempt()`, used by both `POST /api/attempts` and `POST /api/tests/:id/submit`.
- **Domain** = `src/domain/*.mjs` — pure, framework-free functions. Confirmed no imports of Next.js or `pg` in any domain file.
- **Repository** = does not exist as a layer. Raw parameterized SQL (`pg`) is written directly inside route handlers and inside `attempts.mjs`. No ORM, no query builder, no `src/repository/`.

Net: the domain layer is genuinely isolated and testable; the controller and repository layers are collapsed into the same files.

## Endpoint inventory

| Method & Path | File | Purpose | Key domain/lib calls | Error codes |
|---|---|---|---|---|
| `POST /api/ai/hint` | `src/app/api/ai/hint/route.js` | Cached on-demand AI explanation | `buildHintContext`/`buildHintPrompt` (`domain/ai/context.mjs`), `generateHint` (`lib/ai/provider.mjs`) | never non-200; degrades to `{available:false}` |
| `POST /api/attempts` | `src/app/api/attempts/route.js` | Grade one answer, update learner model | `recordAttempt` (`lib/attempts.mjs`), `recordEvent` | 400, 404 `QUESTION_NOT_FOUND`, 500 |
| `GET /api/mistakes/next` | `src/app/api/mistakes/next/route.js` | Most recent open wrong attempt | `difficultyBand` | 404 `NO_MISTAKES` |
| `GET /api/plan/today` | `src/app/api/plan/today/route.js` | "Next Best Action" daily plan | `examWeight`, `selectTopic`, `weakestPrerequisite` (`domain/selection.mjs`), `buildDailyPlan` (`domain/planner.mjs`) | 500 |
| `GET /api/questions/next` | `src/app/api/questions/next/route.js` | Next practice question for a topic | `selectQuestion`, `difficultyBand` | 404 `NO_QUESTIONS` |
| `GET /api/revision/next` | `src/app/api/revision/next/route.js` | Next due spaced-repetition question | `selectQuestion`, `difficultyBand` | 404 `NOTHING_DUE`/`NO_QUESTIONS` |
| `POST /api/tests` | `src/app/api/tests/route.js` | Generate 25-question weekly test | `allocateSlots`, `pickTopicQuestions` (`domain/testGen.mjs`) | 404 `NO_CONTENT` |
| `GET /api/tests/:id` | `src/app/api/tests/[id]/route.js` | Full test state for resume | `difficultyBand` | 404 `TEST_NOT_FOUND` |
| `POST /api/tests/:id/answers` | `src/app/api/tests/[id]/answers/route.js` | Upsert one in-progress answer | — (raw SQL) | 404, 409 `TEST_COMPLETED` |
| `POST /api/tests/:id/submit` | `src/app/api/tests/[id]/submit/route.js` | Finalize test, grade all answers | `recordAttempt` (mode `'TEST'`) | 404, 409, 500 |

Every route (except the pure test read/write endpoints) uses a single hard-coded `LEARNER_ID` from `src/lib/db.mjs` — see `database-audit.md` / `implementation-gap.md` for the auth implication.

## `src/lib/db.mjs`

- Single `pg.Pool` (`max: 5`), stashed on `globalThis.__novaPool` outside production to survive Next dev hot-reload.
- Exports `pool`, `query()`, `LEARNER_ID` (hard-coded UUID, overridable via `NOVA_LEARNER_ID`), `recordEvent()` (inserts into `learning_event`, swallows all errors — analytics must never break learning).

## `src/lib/attempts.mjs` — `recordAttempt()`

Shared grading pipeline for practice, revision, mistakes, and test submission. Caller owns the transaction. Order of operations:

1. Look up question; `QUESTION_NOT_FOUND` if missing.
2. Read prior `learner_topic_state` (pre-mutation) so the mistake classifier sees pre-attempt state.
3. `classifyMistake()`.
4. Insert `question_attempt` with `ON CONFLICT (id) DO NOTHING` — idempotent via client-supplied `attemptId`; no-op short-circuits with `duplicate: true`.
5. Recompute `accuracy`/`speed` from the last `RECENT_WINDOW = 20` attempts (recompute, never nudge a running total).
6. Compute `concept`, `consistency`, `confidenceCalibration`.
7. `adaptDifficulty()` → new difficulty + `nextAction`.
8. Spaced repetition: first row on first attempt (+1 day); on `mode === 'REVISION'`, recompute interval/retention; practice/test attempts never advance an existing schedule.
9. `masteryScore()` — weighted blend of the 6 dimensions.
10. Upsert `learner_topic_state`.
11. Return `{correct, correctIndex, explanation, trap, mistakeType, intervention, performance, state, nextAction, reason}`.

## Domain modules (`src/domain/*.mjs`) — pure, no framework imports

- **`accuracy.mjs`** — `weightedAccuracy` (recency-weighted, `λ=0.15`), `speedScore` (only correct attempts count, ratio capped at 2), `clamp01`.
- **`difficulty.mjs`** — `STEP_UP=0.05`, `STEP_DOWN=0.1`, `FLOOR=0.1`, `CEILING=0.95`, `STRUGGLE_STREAK=3`. `adaptDifficulty()` priority chain: 3-in-a-row wrong → drop + `REVIEW_PREREQUISITE`; thin evidence (<5 attempts) → hold; accuracy<0.5 → step down; accuracy>0.85 & fast → step up; accuracy>0.85 & slow → hold; else hold. `difficultyBand()` is display-only (EASY/MEDIUM/HARD/EXPERT), never used in adaptation.
- **`mastery.mjs`** — `MASTERY_WEIGHTS = {concept:.30, accuracy:.25, speed:.15, retention:.15, consistency:.10, confidence:.05}`. Per-dimension scorers for concept, consistency, confidence-calibration.
- **`mistakes.mjs`** — `GUESS_SECONDS=5`. `classifyMistake()` priority chain: correct→null; <5s→GUESS; confidence≥4→OVERCONFIDENT; time>2.5×expected→TIME_PRESSURE; topicAccuracy≥0.75→CARELESS; topicAccuracy<0.5→CONCEPTUAL; else UNKNOWN. `interventionFor()` maps each to an action/message.
- **`planner.mjs`** — `buildDailyPlan()`: revision is always primary when due>0 (forgetting costs more than deferring new content); else a selected practice topic; else `NONE`.
- **`revision.mjs`** — `MIN=1`, `MAX=90` days; `MULTIPLIER={GOOD:2, MEDIUM:1.3, POOR:0.5}`. `recallPerformance()`, `nextInterval()`, `isDue()`, `retentionValue()`.
- **`selection.mjs`** — `QUESTION_WEIGHTS={difficultyFit:.45, novelty:.35, examRelevance:.2}`; `TOPIC_WEIGHTS={weakness:.35, examWeight:.35, prerequisiteUrgency:.2, momentum:.1}`. `examWeight()` derives weight from real syllabus question counts. `weakestPrerequisite()` BFS-walks the prerequisite graph for root-cause remediation.
- **`testGen.mjs`** — `allocateSlots()` (largest-remainder apportionment to hit an exact total), `pickTopicQuestions()` (unseen-first, spread across difficulty).

## AI integration

- **`src/domain/ai/context.mjs`** — pure. `buildHintContext()` builds a minimal object (no raw attempt history ever reaches a prompt). `buildHintPrompt()` returns `{system, user}` — patient-tutor persona, <60 words, ends with a check-in question, told not to repeat the explanation already shown.
- **`src/lib/ai/provider.mjs`** — the only network call in the codebase. Plain `fetch` to Anthropic's Messages API, no SDK. `MODEL='claude-haiku-4-5-20251001'`, `MAX_TOKENS=200`, `TIMEOUT_MS=8000`. Returns `null` on missing key, non-OK response, or any thrown error — all swallowed. Single provider, no fallback chain.
- Route wiring: cache-first against `ai_interaction (question_id, type)` unique index — one generated explanation is shared across all learners who miss the same question the same way. `ON CONFLICT DO NOTHING` on write (race-safe).

## Authentication

**None exists.** No login/session/JWT/cookie/password/NextAuth code anywhere; no `middleware.js`; no auth dependency in `package.json`. Every route uses the single hard-coded `LEARNER_ID` constant, never a request-derived identity. The `learner`/`learner_profile` tables exist in the schema (future-proofing FKs) but carry no credential or identity-provider columns, and nothing enforces multi-learner isolation. This is a documented, deliberate decision ("Built for one learner", "no auth" — README), not an oversight. See `database-audit.md` §E and `implementation-gap.md` for what adding real auth would require.
