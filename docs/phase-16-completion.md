# Phase 16 Completion Report — Weekly Plan Engine

## This phase is almost entirely orchestration, by design

Checked against the brief's architecture list before writing anything: Learner State (Phase 6), Recent Tests (Phase 15), Revision Queue (existing `revision_schedule`), Weak Areas (Phase 4, via Phase 6's live summary), Mastery (Phase 13), Intervention History (Phase 14), Exam Importance (`examWeight()`, Phase 1, unchanged) — six of the seven named inputs already exist as real, callable services. The brief's own instruction — "only after the adaptive engine works" — matches exactly what's true here: this phase is deliberately the last to be built *because* it's pure assembly over everything prior. The only genuinely new pieces were a PYQ-day topic selector (reusing the existing, content-audited `source LIKE 'tnpsc-%'` tagging) and the day-by-day assembly logic itself.

## What was implemented

**New pure domain module** (`src/domain/weeklyPlan.mjs`): `buildWeeklyPlan(evidence)` — the Weekly Plan Generator. Maps gathered evidence onto the seven named days (`LESSON`/`PRACTICE`/`REVISION`/`PYQ`/`GAME`/`ASSESSMENT`/`WEEKLY_TEST`). Every day degrades **honestly** when its evidence is missing, rather than fabricating a target: no due revision → `dueCount: 0`, not an invented topic; no PYQ-tagged content for her current topics → `topicId: null`, not a guess; not yet eligible for the Default Foundation Test → the real eligibility reason is surfaced, not papered over. Friday (`GAME`) is always marked `available: false` with an explicit note that no game engine exists yet (Phase 22 of the original spec) — this is not a bug, it's the same honest-degradation pattern this codebase has used since the very first lesson-content gap in Phase 2.

**New repository** (`src/repository/weeklyPlanRepository.mjs`): four small, read-only queries — the due revision topic (mirroring the count `/api/plan/today`'s route already runs inline, not duplicating its full logic), a PYQ-candidate topic (reading the existing, already-tagged `question.source` column, no new schema), a topic-name lookup, and a completed-Default-Assessment count.

**New service** (`src/services/weeklyPlanService.mjs`): `getWeeklyPlan(learnerId)` gathers everything in parallel — Phase 7's `getInitialLearningAction()` for Monday, Phase 6's `getLearnerSummary()` (live classification) for Tuesday's weakest topic, Phase 3's `checkDefaultAssessmentEligibility()` for Saturday — and hands it to the pure generator. Every one of these is reused completely unchanged; nothing here re-walks a prerequisite graph or reclassifies a topic.

**New route**: `GET /api/learning/weekly-plan`. Recomputed fresh on every call (not a stored, scheduled artifact) — "generated dynamically," per the brief's closing line.

## Verification performed

**Unit tests** (9 new, `tests/weekly-plan.test.mjs`): with full evidence, every day gets a specific, real target and all seven appear exactly once; each degradation path is checked individually (no gated lesson, no due revision, no PYQ content, not yet assessment-eligible); Friday is always `available: false`; a learner who's already completed a Default Foundation Test gets `MINI_ASSESSMENT` on Saturday instead of another `DEFAULT_TEST`; Sunday always points at the weekly test regardless of any other evidence. 157/157 total unit tests pass (148 existing + 9 new).

**DB-backed exit test** (`tests/weekly-plan.smoke.mjs`, `npm run test:weekly-plan`, 9 checks, all passing on the first run): a brand-new real learner gets a plan where Monday correctly targets `aptitude.whole-numbers` (the same single prerequisite-free topic Phase 7 identifies), Wednesday/Saturday are honestly empty/ineligible, and Thursday still finds real PYQ content (topic-level, not learner-specific, so available even to a fresh learner). After she answers 8 real `fractions` questions wrong, a second call to the same service shows Tuesday's practice day now targeting `fractions` specifically — the plan provably changed because the underlying evidence changed, not because anything was hardcoded.

**Live verification through the browser**: `GET /api/learning/weekly-plan` against the real, currently fresh seeded learner returned the full seven-day plan live, matching the fresh-learner unit/smoke-test predictions exactly — including the honest `null`/`not yet eligible` entries where there's genuinely no evidence yet.

**Full regression + build**: `npm test` (157/157) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:weekly-plan` (9/9) → `test:test-comparison`, `test:intervention`, `test:mastery-gate`, `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route).

## Known limitations

- **Saturday's `MINI_ASSESSMENT` and Friday's `GAME` are placeholders by design, not built features.** Neither the mini-assessment blueprint (Phase 9/19 territory) nor any game engine (Phase 22) exists yet — the weekly plan names them honestly as the right *kind* of activity without being able to hand back real content for either, same limitation already carried by `LESSON`/`PREREQUISITE_LESSON` steps since Phase 2.
- **The plan has no persistence or memory of itself.** It's recomputed fresh from current evidence on every call, which is exactly what "generated dynamically" asks for — but there's no record of what the plan *said* last Monday to compare against what actually happened (that comparison is closer to Phase 15's territory, applied to a whole week rather than one topic).
- **PYQ topic selection doesn't yet weigh exam importance or the Phase 4 weak-topic priority together** — it orders candidates by her current accuracy on that topic and how much PYQ content exists, not by how much that topic is worth on the real exam (`examWeight()`, unused in this one selector, though used elsewhere in the codebase). A reasonable refinement, not assumed here without being asked.
- **One intervention-history dimension named in the brief's architecture list (Phase 14) isn't yet factored into which topic gets Tuesday's practice day** — the weak-topic selection reuses Phase 6's live classification only. Tying it to "has an intervention already been tried and failed here" (Phase 14/15) would sharpen the choice further; not built in this pass.

## Algorithm/version changes

No existing function was modified. `getInitialLearningAction()` (Phase 7), `getLearnerSummary()` (Phase 6), `checkDefaultAssessmentEligibility()` (Phase 3) are all reused unchanged. One new domain module, one new repository, one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 16 stops. Waiting for approval before the next phase.
