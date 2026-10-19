# Phase 15 Completion Report — Test-to-Test Intelligence

## How this differs from Phase 14 — distinguished before writing anything

Phase 14 ("Intervention Tracking") already compares a before/after pair of numbers — but it's a *continuous* snapshot (`learner_topic_state.mastery_score` at two points in time), with one dimension (mastery) and one derived one (retention). Phase 15 explicitly asks for something richer and discrete: comparing two **assessments** — stored, independently-computed diagnostic snapshots (Phase 3/10's `summarizeByTopic()` output) — across seven named dimensions (topic score, accuracy, speed, confidence, retention, mistakes, difficulty), with its own continue/change/stop/escalate verdict. The worked example (Fractions 55% → 77%, +22) is explicitly test-to-test, not a rolling mastery number. So this phase builds a second, complementary comparison — it doesn't duplicate Phase 14's, and nothing in Phase 14 was touched.

## What was implemented

**New domain module** (`src/domain/testComparison.mjs`) — the **LearningGainCalculator**: `compareTopicAcrossTests(test1Topic, test2Topic)` diffs two already-computed diagnostic snapshots for the same topic across accuracy, speed (real avg time, not estimated), confidence, every mistake-type count, and every shared difficulty band — all read from data Phase 3/10 already stores, nothing reclassified. `decideInterventionNextStep({accuracyGain, test2Accuracy})` is the literal "continue / change / stop / escalate" decision from a named, configurable threshold ladder (`TEST_COMPARISON_CONFIG`) — same discipline as every scoring module since Phase 11.

**New repository** (`src/repository/testComparisonRepository.mjs`): two read-only queries finding the most recent completed assessments (globally, or filtered to ones mentioning a specific topic) — reading the `diagnostic` JSON Phase 3 already writes to `assessment.metadata`, no new schema.

**`TestComparisonService`** (`src/services/testComparisonService.mjs`): `compareLatestAssessments(learnerId)` finds the two most recent completed assessments and compares every topic they share; `compareTopicAcrossLatestTests(learnerId, topicId)` does the same for one topic specifically (needed because not every assessment covers every topic). Both return an honest `{comparable: false, reason}` rather than fabricating a comparison when fewer than two assessments exist.

**`InterventionEffectivenessService`** (`src/services/interventionEffectivenessService.mjs`): the brief's third named module — ties the real test-to-test comparison to the real, actually-tracked intervention for that topic (`findInterventionsForLearner()`, Phase 14, unchanged), giving the fuller picture neither alone provides: not just "did the numbers move" but "what was actually tried, and did two real assessments confirm it moved."

**Two new routes**: `GET /api/learning/test-comparison` (latest two, every shared topic), `GET /api/learning/test-comparison/:topicId` (one topic plus its tracked intervention).

## Verification performed

**Unit tests** (6 new, `tests/test-comparison.test.mjs`): the worked example reproduced exactly — Fractions 55%→77%, gain +22, plus the speed/confidence/mistake/difficulty deltas it implies all computed correctly in the same test; a +22 gain below the mastery floor correctly recommends `CONTINUE`, not `STOP`; a gain that clears the mastery floor recommends `STOP`; a real regression recommends `ESCALATE` regardless of current accuracy; small, inconclusive movement (either direction) recommends `CHANGE`; missing speed/confidence data on either test degrades to `null`, never a fabricated number. 148/148 total unit tests pass (142 existing + 6 new).

**DB-backed exit test** (`tests/test-comparison.smoke.mjs`, `npm run test:test-comparison`, 11 checks, all passing after fixing a real bug in my own test logic — see below): with zero and then one completed assessment, the comparison honestly reports it isn't possible yet rather than fabricating one; a real Phase 3 Default Foundation Test is taken twice for the same learner (fractions deliberately weak on test 1, strong on test 2) using the actual `startDefaultAssessment`/`submitDefaultAssessment` flow, not synthetic diagnostic objects; the real stored comparison shows a large accuracy gain and a `CONTINUE`/`STOP` verdict; the intervention-effectiveness view correctly ties a real Phase 14 intervention to the same real gain.

**A bug in my own test, caught before running it**: my first draft of `takeDefaultAssessment`'s correct/wrong selection used `i % 100 >= threshold`, which only behaves as intended when a topic has close to 100 questions in the assessment — with the real, much smaller per-topic question count (Phase 9's weighted allocation gives `fractions` around a dozen or so), the modulo math silently made every answer "correct" regardless of the requested rate. Fixed by counting the real number of fractions questions first and selecting a threshold index against that actual count, not an assumed scale.

**Live verification through the browser**: `GET /api/learning/test-comparison` against the real, currently-assessment-free seeded learner correctly reported `comparable: false` with zero completed assessments — matching the honest-degradation design exactly.

**Full regression + build**: `npm test` (148/148) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:test-comparison` (11/11) → `test:intervention`, `test:mastery-gate`, `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes).

## Known limitations

- **Only the generic `assessment` table is consulted**, same gap named in Phase 9/13's reports — the separate weekly `test` table doesn't store a per-topic diagnostic the way `assessment.metadata` does, so weekly-test performance isn't part of this comparison.
- **"Retention" is the one named dimension not independently compared.** Diagnostic snapshots don't carry a per-assessment retention value (retention lives only on current `learner_topic_state`, a single rolling number, not a point-in-time snapshot per past test) — there's no "retention at test 1" to diff against "retention at test 2." Comparing accuracy/speed/confidence/mistakes/difficulty, as implemented, is honest about this rather than fabricating a retention delta from data that doesn't exist.
- **Nothing acts on the continue/change/stop/escalate decision automatically.** It's computed correctly and returned; no flow yet changes what's recommended next (the adaptive lesson plan, the next assessment's blueprint) based on it.
- **The "latest two" comparison is purely chronological**, not scoped to assessments of the same type — a Default Foundation Test could in principle be compared against a future different assessment type. Given only one assessment type is actually exercised in this codebase so far, this hasn't mattered in practice, but is worth a decision once a second type exists.

## Algorithm/version changes

No existing function was modified. `summarizeByTopic()` (Phase 3/10) and `findInterventionsForLearner()` (Phase 14) are both reused unchanged as read-only data sources. One new domain module, one new repository, two new services, two new routes — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 15 stops. Waiting for approval before the next phase.
