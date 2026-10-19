# Phase 13 Completion Report — Mastery Gate

## What was already there vs. what this phase actually added

`concept`/`accuracy`/`speed`/`retention`/`confidence`/`consistency` — six of the seven dimensions the brief names — are exactly `learner_topic_state`'s six mastery columns, already computed and persisted by `recordAttempt()` since Phase 1/2, blended into `mastery_score` by `mastery.mjs` (also unchanged). None of that was rebuilt.

What didn't exist: the readiness *ladder* (`FOUNDATION_REQUIRED`/`DEVELOPING`/`PRACTICING`/`NEAR_MASTERY`/`MASTERED`/`RETAINED`) on top of those six numbers, and — the part that actually makes this a **gate** rather than a relabeling of Phase 4's classifier — "assessment performance," the seventh dimension the brief names. Phase 4's `classifyTopics()` reads current accuracy only; nothing anywhere checked whether high *practice* mastery had ever been independently confirmed by a real assessment before treating a topic as done.

## What was implemented

**New enum** (`src/domain/enums.mjs`): `MasteryGateStatus`, the six-rung ladder.

**New pure domain module** (`src/domain/masteryGate.mjs`): `evaluateMasteryGate({concept, mastery, retention, attemptCount, assessmentPerformance})` — a configured threshold ladder (`MASTERY_GATE_CONFIG`, one named object, not scattered conditionals, same discipline Phase 11 established):

1. Too few attempts, or lifetime concept too low → `FOUNDATION_REQUIRED` regardless of how good any other number looks.
2. Mastery climbs through `DEVELOPING` → `PRACTICING` → `NEAR_MASTERY` as it crosses configured floors.
3. At `NEAR_MASTERY`'s ceiling (mastery ≥ 0.8), the gate asks the one question practice numbers alone can't answer: **has an independent assessment confirmed this?** No assessment yet, or the most recent one actually classified this topic `WEAK`/`CRITICAL`/`PREREQUISITE_BLOCKED` (Phase 4's classification, read not recomputed) → stays `NEAR_MASTERY`. Only a confirming assessment unlocks `MASTERED`; `MASTERED` + retention also holding up over time promotes to `RETAINED`.
4. Only `MASTERED` and `RETAINED` gate `ready: true` — every earlier rung means "continue intervention," per the brief's binary gate.

This is the same "verify before you trust it" principle Phase 11's `MINI_ASSESSMENT`/`ADVANCE_TOPIC` tie-break already committed to, now applied to the final progression decision rather than just one session's recommendation.

**New repository** (`src/repository/masteryGateRepository.mjs`): `findLatestAssessmentPerformanceForTopic()` — reads the most recent completed assessment's already-stored `diagnostic.classifications` (Phase 3/4, unchanged) for this topic. No new schema: this is a read of data Phase 3 already computes and stores in `assessment.metadata` on every submission.

**New service** (`src/services/masteryGateService.mjs`): `getMasteryGate(learnerId, topicId)` — gathers the persisted dimensions (Phase 6's `findTopicStateRow`, unchanged) and the assessment verdict, and returns the gate's verdict plus every raw input as `evidence` — never a bare status.

**New route**: `GET /api/learning/mastery-gate/:topicId`.

## Verification performed

**Unit tests** (10 new, `tests/mastery-gate.test.mjs`): every rung of the ladder in isolation; the two assessment-gating cases specifically (no assessment at all vs. a real contradicting one, both correctly held at `NEAR_MASTERY`); a confirming assessment unlocking `MASTERED`; retention additionally holding up promoting to `RETAINED`; the ready/not-ready binary split matching exactly `{MASTERED, RETAINED}`; a boundary check confirming the threshold is read from the config object, not duplicated. 137/137 total unit tests pass (127 existing + 10 new).

**DB-backed exit test** (`tests/mastery-gate.smoke.mjs`, `npm run test:mastery-gate`, 9 checks, all passing on the first run): an untouched topic reads `FOUNDATION_REQUIRED`, not an error; a learner who answers 8 real `whole-numbers` questions correctly in plain practice reads `NEAR_MASTERY` — strong practice alone, as designed, does not unlock the gate; that same learner then takes a real, complete Phase 3 Default Foundation Test, answers correctly throughout, and the gate — reading that assessment's genuinely stored, independently-computed `STRONG` classification — opens to `MASTERED` (retention stays unproven since nothing in this test runs a revision cycle, which is itself the expected, correct distinction between `MASTERED` and `RETAINED`). My hand-derived prediction of the exact mastery-score arithmetic (roughly 0.85, clearing the 0.8 `NEAR_MASTERY` floor from six practice attempts) matched the real computed value exactly.

**Live verification through the browser**: `GET /api/learning/mastery-gate/aptitude.whole-numbers` against the real, currently-untouched seeded learner returned `FOUNDATION_REQUIRED`/`ready: false` with the full evidence object, matching the untouched-topic unit test exactly.

**Full regression + build**: `npm test` (137/137) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:mastery-gate` (9/9) → `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route).

## Known limitations

- **Only the generic `assessment` table (Default Foundation Test, mini-assessments, future diagnostic types) is consulted for "assessment performance."** The separate weekly `test` table (Phase 1-era, unchanged) doesn't store a per-topic classification the way `assessment.metadata.diagnostic` does, so a strong weekly-test performance alone doesn't currently unlock the gate. This is a real, stated gap, not an oversight: reconciling the two assessment concepts was flagged back in `docs/phase-9-completion.md` and isn't resolved here either.
- **Thresholds are initial values**, same caveat as every prior phase's config object: `MASTERY_GATE_CONFIG`'s floors are reasonable starting points, not tuned against real learner outcomes.
- **Nothing acts on the gate yet.** It answers "is she ready," correctly and verifiably — no existing flow (the adaptive lesson plan, the daily plan, the practice session) currently checks it before deciding what to serve next. Wiring it into an existing decision surface is natural follow-up, not assumed here.
- **An assessment's confirmation never expires.** A `STRONG` classification from months ago still counts as "confirmed" today, even if her practice performance has since declined (which the gate would catch separately via the mastery/retention floors, but the assessment-recency question itself isn't weighed).

## Algorithm/version changes

No existing function was modified. `mastery.mjs`'s six scorers and `masteryScore()`, `classifyTopics()` (Phase 4), and `findTopicStateRow()` (Phase 6) are all reused unchanged. One new domain module, one new enum, one new repository, one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 13 stops. Waiting for approval before the next phase.
