# Phase 2 Completion Report — Establish the Backend Domain

## What was implemented

A generic domain layer, additive on top of the existing working system — no existing table, route, or domain module was changed in behavior.

**Database** — `db/migrations/V6__domain_model.sql`:
- New tables: `content` (generic content envelope: type/topic/difficulty/status/version/metadata), `lesson` (1:1 extension of `content` for `type='LESSON'`), `assessment` (generic, learner-nullable blueprint/instance shell), `learning_session` (a bounded span of learner activity).
- Two new nullable, additive columns: `question_attempt.session_id` (FK → `learning_session`) and `question.content_id` (FK → `content`). Both default to `NULL` and nothing existing writes them, so no existing insert/update changes shape.
- Reused rather than duplicated: `learner`, `subject`, `chapter`, `topic`, `topic_prerequisite`, `question`, `question_attempt` are all the same V1 tables, untouched.

**Domain layer** (pure, framework-free, same style as `src/domain/accuracy.mjs` etc.):
- `src/domain/enums.mjs` — `ContentType`, `ContentStatus` (+ the DRAFT→VALIDATING→REVIEWED→PUBLISHED→ARCHIVED order), `AssessmentType`, `AssessmentStatus`, `SessionType`, `SessionStatus`.
- `src/domain/validation.mjs` — one validator per entity (`validateLearner`, `validateSubject`, `validateTopic`, `validatePrerequisite`, `validateContent`, `validateLesson`, `validateQuestion`, `validateAssessment`, `validateLearningSession`, `validateLearningAttempt`), plus `canTransitionContentStatus` enforcing forward-only lifecycle moves.

**Repository layer** (new — the architecture audit noted none existed before):
- `src/repository/learnerRepository.mjs`, `curriculumRepository.mjs` (subject/chapter/topic/prerequisite), `contentRepository.mjs` (content/lesson), `questionRepository.mjs` (existing `question` table, new creation/read surface), `assessmentRepository.mjs`, `sessionRepository.mjs`, `attemptRepository.mjs` (read-only over `question_attempt`, under the domain name LearningAttempt).

**Service layer** (validation + repository orchestration, throws `ValidationError`/`NotFoundError` from `src/services/errors.mjs`):
- `learnerService.mjs`, `curriculumService.mjs`, `contentService.mjs` (enforces the DRAFT→...→ARCHIVED lifecycle on transition), `questionService.mjs`, `assessmentService.mjs` (minimal, see Known limitations), `sessionService.mjs`, `attemptService.mjs`.

**DTOs/mappers**: `src/dto/mappers.mjs` — one explicit row→camelCase mapper per entity, so a column rename can't silently change API shape later.

**Tests**:
- `tests/domain-model.test.mjs` — 11 new pure unit tests (validation rules, lifecycle transitions). Added to the existing `tests/*.test.mjs` glob; `npm test` now runs 61 tests total (50 existing + 11 new), all passing.
- `tests/domain-model.smoke.mjs` (`npm run test:domain`) — the Phase 2 exit test against a real database: creates Learner → Subject → Chapter → Topic → Prerequisite → Lesson (through the full DRAFT→PUBLISHED transition) → Question, all exclusively through the new service layer, plus Assessment and LearningSession/LearningAttempt linkage. Also asserts a previously-seeded `aptitude.fractions` question is still readable, confirming existing content wasn't disturbed. All 20 checks pass.

## Verification performed

Run against a real Postgres instance (local, not Docker — see note below), in order: `npm test` (61/61 pass) → `npm run db:migrate` (V6 applied cleanly) → `npm run db:seed` (unaffected: 3 subjects/16 chapters/40 topics/15 prerequisites/322 questions, same as before V6) → `npm run test:domain` (20/20 checks pass) → `npm run test:loop` (existing DB-backed smoke test, still 100% green — **zero regressions**) → `npm run validate:content` (unaffected) → `npm run build` (clean, same route manifest as before).

Environment note: this sandbox has no Docker; a standalone local Postgres 18 instance was initialized and used instead, with the same connection shape as `docker-compose.yml`/`.env.example`. Stopped and torn down after verification; no `.env.local` left behind.

## Exit condition

> "The backend can create: Learner → Subject → Topic → Lesson → Question through backend services."

Met. `tests/domain-model.smoke.mjs` does exactly this chain (plus Chapter and Prerequisite, which the entity list also named) using only `src/services/*`, never hand-written SQL in the test itself.

## Known limitations (deliberately out of scope for Phase 2)

- **Assessment is minimal** — create/read only, learner-nullable, no blueprint engine (topic coverage, difficulty mix, timing, question selection). That is explicitly Phase 9/10 scope.
- **Content type is narrow** (`LESSON`, `QUESTION` only) — Example, Explanation, Option-as-entity, PYQ, Formula, CommonMistake are Phase 3 ("Content as Data"). The `type` CHECK constraint will need a migration to widen it then; this is a known, intentional follow-up, not an oversight.
- **`question.content_id` is not backfilled** — all 322 existing seeded questions have `content_id = NULL`. Linking them to `content` rows (if desired) is a Phase 3 decision, not assumed here.
- **LearningAttempt is read-only at the service layer** — grading still exclusively goes through `src/lib/attempts.mjs`'s `recordAttempt()`. `attemptService.linkAttemptToSession()` lets a caller associate an attempt with a session after the fact, but nothing wires `POST /api/attempts` to create/pass a session automatically yet — that's Phase 8 (lesson→practice pipeline) territory.
- **No API routes were added.** Phase 2 asked for entities/repositories/services/DTOs, not endpoints — the existing 10 routes are completely unchanged, and no new route was added for any new entity. New HTTP surface is implied by later phases (8, 9, 31).
- **Repositories accept an optional `client` parameter** (defaulting to the shared `query` from `lib/db.mjs`) so a future transactional caller can pass a connected `pg.Client`/`PoolClient`, matching the pattern `src/lib/attempts.mjs` already uses — but Phase 2's own smoke test and services don't yet wrap multi-step writes (e.g. `createDraftLesson`'s content+lesson insert) in an explicit transaction. Worth revisiting once a Phase 3+ caller needs atomicity across those two inserts.

## Algorithm/version changes

None. No existing domain algorithm (`accuracy.mjs`, `difficulty.mjs`, `mastery.mjs`, `mistakes.mjs`, `planner.mjs`, `revision.mjs`, `selection.mjs`, `testGen.mjs`) was modified. Schema version advanced from V5 to V6 (additive only, see above).

## Stop

Per the agent procedure given for this phase, this is where Phase 2 stops. Waiting for approval before starting Phase 3 (Content as Data).
