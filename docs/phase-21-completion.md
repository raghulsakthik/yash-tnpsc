# Phase 21 Completion Report — PYQ Engine

## The architecture was already satisfied by construction

The brief's instruction — "PYQs must use the same attempt infrastructure, do not create an isolated PYQ scoring system" — has been true of this codebase since before this session began. A PYQ question is not a separate entity; it's a row in the same `question` table with `source LIKE 'tnpsc-%'`, seeded through the same content pipeline, served by the same selection functions, graded by the same `recordAttempt()`, logged to the same `learning_event`, folded into the same `learner_topic_state`, and already reachable by the same Phase 11 Adaptive Decision Engine. `examRelevance()` (`selection.mjs`, unchanged since before this session) has always scored a `tnpsc-*` source at `1.0` — the system already preferred PYQ evidence over authored content, it just never let a learner ask for *only* that.

## What was genuinely missing, and what was implemented

Two real gaps, both closed additively:

1. **No way to practice *only* real past-paper questions.** `GET /api/questions/next` (unchanged) scores PYQ questions higher but can still serve an authored one. `getNextPyqQuestion()` (`src/services/pyqService.mjs`) mirrors that exact route's logic — same `selectQuestion()`, same `difficultyBand()`, same target-difficulty read from `learner_topic_state` — with one added filter in a new, dedicated repository query (`findPyqCandidatesForTopic()`): only `source LIKE 'tnpsc-%'` rows. New route: `GET /api/pyq/next?topic=...`. Answers are still submitted through the existing, completely untouched `POST /api/attempts`.
2. **No visibility into "PYQs as another evidence source."** Nothing showed whether her real-past-paper performance differs from her authored-question performance. `getPyqPerformanceSummary()` reads `question_attempt` joined to `question`, split by source, via one new pure function (`summarizePyqPerformance()`, `src/domain/pyq.mjs`). New route: `GET /api/pyq/performance`.

No migration. No existing function touched.

## Verification performed

**Unit tests** (4 new, `tests/pyq.test.mjs`): PYQ and authored attempts are correctly split into separate buckets with independent accuracy; per-topic breakdown aggregates correctly alongside the overall totals; a bucket with zero attempts reports `null` accuracy, not `NaN` or a misleading zero; no attempts at all produces an honest empty summary, not a crash. 178/178 total unit tests pass (174 existing + 4 new).

**DB-backed exit test** (`tests/pyq.smoke.mjs`, `npm run test:pyq`, 8 checks, all passing on the first run) — the real proof that no isolated system exists: a topic with only authored content (Phase 20's new Polity questions) correctly raises `NotFoundError` rather than silently falling back to a non-PYQ question; a real PYQ question is served from the seeded bank; it's graded through `recordAttempt()` with `mode: 'PRACTICE'` — the exact same mode and pipeline any ordinary practice attempt uses; a real `question_attempt` row and a real `learner_topic_state` update result, indistinguishable in storage from a non-PYQ attempt except for the `question.source` it joins back to; the performance summary reads that same evidence back correctly split.

**Live verification through the browser**: `GET /api/pyq/performance` against the real, currently-fresh seeded learner correctly returned an honest empty summary; `GET /api/pyq/next?topic=aptitude.lcm` served a genuine `tnpsc-2018`-tagged question from the real seeded bank on the first live call.

**Full regression + build**: `npm test` (178/178) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:pyq` (8/8) → all 16 prior DB-backed smoke suites (unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes).

## Known limitations

- **The performance comparison is overall + per-topic, not broken down by difficulty or time** — a reasonable first cut; Phase 10's richer per-topic diagnostic (difficulty breakdown, speed/confidence issues) could be applied to a PYQ-only slice of results the same way Phase 19 applied it to the weekly test, if a future phase wants that depth.
- **PYQ coverage is still only 137 of 322 questions, across the aptitude/reasoning topics that already had content before this session** — Phase 20's new Polity content carries no PYQ tag (openly, since no real past-paper provenance could be verified for it). The PYQ engine works on whatever is tagged; it doesn't change how much is tagged.
- **Nothing automatically routes a learner into PYQ practice.** Phase 16's weekly plan already recommends a PYQ topic for Thursday (reusing the same `source LIKE 'tnpsc-%'` tagging independently), but nothing calls this phase's new `/api/pyq/next` specifically from that recommendation — they're two separate, both-real capabilities that happen to read the same tag.

## Algorithm/version changes

No existing function was modified. `selectQuestion()`/`difficultyBand()` (Phase 1, unchanged) and `recordAttempt()` (unchanged) are reused exactly as every other selection/grading path already uses them. One new domain module, one new repository, one new service, two new routes — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 21 stops.
