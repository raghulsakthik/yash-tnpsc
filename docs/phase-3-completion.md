# Phase 3 Completion Report — Default Foundation Test

## What was implemented

The Default Foundation Test: a one-time diagnostic, distinct from the recurring weekly test, that establishes the learner's initial model across foundation and foundation-adjacent topics.

**Database** — `db/migrations/V7__default_assessment.sql`:
- `assessment` (from Phase 2/V6) gains `question_count`, `score`, `completed_at` — additive columns, so the generic Assessment entity carries them for every type going forward, not just DEFAULT_TEST.
- New `assessment_question` (assessment's question set + order) and `assessment_answer` (selected index, time taken, **confidence** — unlike `test_answer`, which doesn't track confidence, because this phase explicitly asked for confidence calibration). Both deliberately separate from `test`/`test_question`/`test_answer` (V5): the weekly test is untouched.

**Domain layer** (pure):
- `src/domain/defaultAssessment.mjs` — `evaluateEligibility()` (needs evidence on ≥60% of candidate topics, not all — a learner who's clearly moved past one or two shouldn't be blocked by a single untouched one) and `buildDefaultAssessmentBlueprint()` (reuses `pickTopicQuestions` from `testGen.mjs` rather than a second selection algorithm — 5 questions per candidate topic, spread by difficulty, unseen-first).
- `src/domain/diagnostic.mjs` — `summarizeByTopic()` (per-topic accuracy/avg time/avg confidence/mistake-type counts/guessing-rate/careless-rate/difficulty breakdown, reusing `difficultyBand()` from `difficulty.mjs`) and `diagnosePrerequisiteGaps()` (weak/strong split at 60%/80% accuracy, then reuses `weakestPrerequisite()` from `selection.mjs` — unmodified — to trace each weak topic back to its weakest foundation).

**Candidate topic discovery is data-driven, not hardcoded**: the candidate set is the `apt.foundation` chapter's topics, plus every topic that directly lists one of them as a prerequisite in the already-seeded `topic_prerequisite` table (`src/repository/defaultAssessmentRepository.mjs`). Against the real seeded syllabus this resolves to 11 topics (whole-numbers, division, fractions, decimals, percentage, ratio-and-proportion, simplification, lcm, hcf, time-and-work, area) — close to, and more principled than, the worked example given, since it comes from the graph rather than a name list.

**Service** (`src/services/defaultAssessmentService.mjs`): eligibility check, start/resume, answer capture, and submission. Every graded question still runs through `src/lib/attempts.mjs`'s `recordAttempt()` with `mode: 'ASSESSMENT'` — exactly the pattern the weekly test's submit route already uses with `mode: 'TEST'`. `recordAttempt()` itself was not touched; `mode` was already a pass-through control-flow argument, not a stored column, so a new mode value needed no schema or logic change there.

**API routes** (new, under `src/app/api/assessments/`): `GET default/eligibility`, `POST default` (start/resume), `GET [id]`, `POST [id]/answers`, `POST [id]/submit` — same conventions as the existing `tests/*` routes (force-dynamic, `{code, message}` errors, answer keys withheld until completion).

**Tests**: 9 new pure unit tests (`tests/default-assessment.test.mjs`) — 70/70 total unit tests pass. A new DB-backed exit test (`tests/default-assessment.smoke.mjs`, `npm run test:assessment`) — 21 checks, all passing — proves: an unexposed learner is refused, an exposed one is accepted, the assessment resumes rather than duplicating, answering writes real `question_attempt` rows (this is evidence into the one learner model, not a side system), and submitting produces exactly the report shape asked for — a per-topic accuracy percentage, confidence/time/mistake data, and a weak topic (`fractions`) whose dependent (`percentage`, deliberately also failed in the test) correctly traces its prerequisite gap back to it.

## A bug found and fixed during live verification

While exercising the new routes through the browser (not just the smoke test), `score` came back `null` and `questionCount` came back missing on every response. Root cause: `src/repository/assessmentRepository.mjs`'s `findAssessmentById()` was written in Phase 2, before `question_count`/`score`/`completed_at` existed on the table, and still only selected the original five columns. Fixed by selecting every column the table now actually has (`assessmentRepository.mjs`), and extended `toAssessmentDto()` in `src/dto/mappers.mjs` to carry them too, so the generic Assessment entity is consistent for every assessment type, not just DEFAULT_TEST.

Notably, the existing smoke test's assertion (`typeof result.score === 'number'`) did not catch this — `NaN` is `typeof 'number'`. Strengthened it to `typeof result.score === 'number' && !Number.isNaN(result.score)` and added an explicit `questionCount` round-trip check, specifically so this class of bug fails loudly next time.

## Verification performed

`npm test` (70/70) → `npm run db:migrate` (V7 applied cleanly) → `npm run db:seed` (unaffected) → `npm run test:assessment` (21/21, after the fix above) → `npm run test:domain` (Phase 2 regression, still 20/20) → `npm run test:loop` (existing weekly-test/practice/revision smoke test, still green — zero regressions) → `npm run validate:content` (unaffected) → `npm run build` (clean; 5 new routes compiled correctly).

Live verification through the browser against the real dev server and the real seeded learner: `GET /api/assessments/default/eligibility` correctly reported 1/11 exposure; after granting exposure, it flipped to 11/11 eligible; `POST /api/assessments/default` created a real 55-question assessment through the actual HTTP route; answering and submitting all 55 produced a genuine example output in the shape the phase asked for — e.g. `aptitude.whole-numbers: 20%`, `aptitude.fractions: 0%`, `aptitude.decimals: 100%` — plus weak/strong topic lists and prerequisite gaps (`division → whole-numbers 20%`, `simplification → fractions 0%`, etc.), all traced through the real seeded prerequisite graph, not fabricated data.

## Exit condition

The Default Assessment measures accuracy, response time, confidence, mistakes (by type), topic-wise performance, difficulty performance, prerequisite weaknesses, guessing, and careless errors — all present in `diagnostic.topics[]`, verified against both synthetic (smoke test) and live (browser) data.

## Known limitations

- **Lesson-based exposure isn't real yet.** "Exposed" currently falls back to "has ≥1 practice attempt on the topic" because no lesson content has been authored at scale (Phase 3 of the original 31-phase spec, "Content as Data," hasn't been done). Once lessons exist, exposure should primarily mean a completed `LESSON`-type `learning_session`, with practice-attempt exposure as a secondary signal, not the only one.
- **Thresholds are initial values, not tuned.** `MIN_EXPOSURE_FRACTION = 0.6`, `FOUNDATION_QUESTIONS_PER_TOPIC = 5`, `WEAK_ACCURACY_THRESHOLD = 60`, `STRONG_ACCURACY_THRESHOLD = 80` are reasonable starting points, documented in the modules that define them, not derived from learner data (there isn't any real learner data yet).
- **No eligibility-gated UI.** No frontend page was added for the Default Foundation Test — only the API. The existing `/practice`/`/test` pages are unchanged. Per-phase procedure, frontend work is explicitly deferred to later.
- **The diagnostic is computed once, at submission, and stored in `assessment.metadata`.** It is not recomputed if `learner_topic_state` changes afterward — it's a snapshot of that specific test, which is the correct behavior for "what this assessment found," not a live view.

## Algorithm/version changes

No existing domain algorithm was modified (`accuracy.mjs`, `difficulty.mjs`, `mastery.mjs`, `mistakes.mjs`, `planner.mjs`, `revision.mjs`, `selection.mjs`, `testGen.mjs`, and `src/lib/attempts.mjs` are all untouched). Schema advanced V6 → V7 (additive only). Two new pure domain modules added (`defaultAssessment.mjs`, `diagnostic.mjs`).

## Stop

Per the agent procedure, this is where Phase 3 stops. Waiting for approval before the next phase.
