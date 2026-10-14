# Phase 9 Completion Report — Default Foundation Assessment

## This phase substantially overlaps with Phase 3 — identified before writing anything

The original 31-phase spec's Phase 9 ("Default Foundation Assessment") and Phase 3 ("Default Foundation Test," which the user asked for by that name earlier in this session) describe the same mechanism: `Learner → Foundation exposure → Assessment eligibility → Assessment blueprint → Question selection → Assessment session → Answers → Submission`, with `Assessment`/`AssessmentQuestion`/`AssessmentAnswer` entities. Phase 3 already built essentially all of it — eligibility (`evaluateEligibility`), the `assessment`/`assessment_question`/`assessment_answer` tables, question selection (unseen-first, difficulty-spread), topic coverage, and the full session/answer/submit flow. Re-implementing that would have been exactly the duplicated functionality Phase 1's own audit procedure asks to catch.

Before writing any code, I diffed Phase 9's checklist ("Blueprint engine considers: topic coverage, difficulty, question count, time, prerequisites, learner exposure") against what Phase 3 actually does. Four of six were already there. Two were genuinely missing: **time** (nothing estimated how long the assessment would take) and **prerequisites** (every candidate topic got a flat, equal share of the question budget regardless of how central it is to the syllabus). This phase's real work was closing exactly those two gaps, additively, on top of Phase 3's existing, tested blueprint function — not rebuilding it.

**`AssessmentAttempt`**, which Phase 9's entity list names explicitly, was deliberately not created as a separate table. Every graded question in an assessment already becomes a `question_attempt` row via `recordAttempt()` (reused, unchanged, with `mode: 'ASSESSMENT'`) — the same shared attempt infrastructure the weekly test uses. A dedicated `assessment_attempt` table would duplicate that for no reason; later phases in the same spec (Phase 21, "PYQ Engine") explicitly state this exact principle ("do not create an isolated attempt infrastructure"), so Phase 9 is held to the standard a later phase states outright.

## What was implemented

**`src/domain/defaultAssessment.mjs`** — two new functions added alongside (not replacing) Phase 3's `buildDefaultAssessmentBlueprint()`, which remains exported, unchanged, and still covered by its own original unit tests:

- `computePrerequisiteFanOut(topicIds, prerequisiteGraph)` — for each candidate topic, how many *other* candidate topics list it as a prerequisite. In the real seeded syllabus, `fractions` has a fan-out of 5 (decimals, percentage, ratio-and-proportion, simplification, time-and-work all depend on it); a leaf topic like `hcf` has 0.
- `buildWeightedDefaultAssessmentBlueprint(topicPools, seenIds, prerequisiteGraph, perTopicBaseline)` — the same total question budget as the flat version (`topicCount × 5`), reallocated by fan-out via `allocateSlots()` (`testGen.mjs`, unchanged — the exact largest-remainder apportionment the weekly test already uses, reused rather than reinvented). A topic many others depend on gets more of the fixed budget; a leaf topic gets less, never zero.
- `estimateAssessmentMinutes(picked)` — sums each selected question's real `estimatedSeconds` rather than a flat per-question guess.

**`src/services/defaultAssessmentService.mjs`** — `startDefaultAssessment()` now fetches the prerequisite graph (one more query, same pattern already used at submission time) and calls the weighted blueprint instead of the flat one; `getDefaultAssessment()` now returns `estimatedMinutes`, computed fresh from the already-fetched question rows rather than stored — no schema change needed for it.

## Verification performed

**Unit tests** (4 new, `tests/default-assessment.test.mjs`): fan-out counting matches a graph shaped like the real syllabus; a high-fan-out topic gets more of the same fixed budget than a leaf topic; with no dependencies at all, the weighted version degrades to an even split (not a crash or a skew); the time estimate sums real per-question seconds correctly. 101/101 total unit tests pass (97 existing + 4 new).

**DB-backed regression + new assertions** (extended `tests/default-assessment.smoke.mjs`, now 25 checks, all passing): the full Phase 3/4/5 scenario — eligibility, resume, diagnosis, classification, prerequisite gaps, the learning path — still passes unchanged against the real seeded data with the new weighted allocation in place (nothing there assumed a fixed 5-per-topic count, so nothing broke). Two new checks added: the assessment reports a real, positive `estimatedMinutes`, and `fractions` (the real syllabus's highest-fan-out candidate) gets strictly more questions than `hcf` (a real leaf topic), out of the same total budget.

**Live verification through the browser**, against the real seeded learner and syllabus: `POST /api/assessments/default` returned `estimatedMinutes: 43` and a per-topic count of `fractions: 14` vs `hcf: 2` (and `whole-numbers: 7`, `division: 8` — both high-fan-out foundation topics also favored) — the exact pattern designed, observed on the first live try.

**Full regression**: `npm test` (101/101) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:assessment` (25/25) → `npm run test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean, no new routes — `estimatedMinutes` rides inside the existing response shape).

## Known limitations

- **Still only one hop of fan-out.** `computePrerequisiteFanOut` counts direct dependents within the candidate set, not the full transitive weight (e.g. `fractions` indirectly matters to anything that depends on something that depends on it, which isn't counted further). This mirrors the same one-hop precedent already accepted in Phases 3–7's prerequisite-graph handling, and has been sufficient for the real seeded syllabus (which is shallow).
- **The total question budget is still a fixed count** (`topicCount × 5`), not derived from a time ceiling (e.g. "cap this at 45 minutes"). Phase 9 names both "question count" and "time" as considerations; this implementation keeps question count as the primary constraint and reports the resulting time, rather than inverting that relationship. Flipping it (time as the hard constraint, question count as the derived output) is a reasonable alternative design, not assumed here without being asked.
- **`perTopicBaseline` is still the same `FOUNDATION_QUESTIONS_PER_TOPIC = 5`** introduced in Phase 3 — not retuned. The weighted redistribution changes *where* the 55-question budget goes, not the total.

## Algorithm/version changes

`buildDefaultAssessmentBlueprint()` (Phase 3) is untouched and still exported and tested. Two new pure functions added to the same module. `startDefaultAssessment()`/`getDefaultAssessment()` (Phase 3) gained a few additional lines each (fetch the graph, call the new function, compute the extra field) — no existing behavior for eligibility, resuming, answering, or submitting changed. No schema change, no new routes.

## Stop

Per the agent procedure, this is where Phase 9 stops. Waiting for approval before the next phase.
