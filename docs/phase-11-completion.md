# Phase 11 Completion Report — Adaptive Decision Engine

## What was implemented

A genuine scoring engine over eight named candidate actions, built exactly against the brief's explicit instruction: **never** `if accuracy < 60 then lesson X` as scattered code — build an actual engine with configurable rules and scoring.

**New domain module** (`src/domain/adaptiveDecision.mjs`): `scoreCandidateActions(context)` scores all eight actions — `REPEAT_LESSON`, `PREREQUISITE_LESSON`, `PRACTICE`, `TIMED_PRACTICE`, `REVISION`, `MEMORY_ECHO`, `ADVANCE_TOPIC`, `MINI_ASSESSMENT` — in parallel from the same evidence; nothing short-circuits, so every candidate's score is always visible, not just the winner's. `decideAdaptiveAction(context)` ranks them and returns the winner with its reasoning and every runner-up's score attached. All thresholds live in one named, documented config object (`ADAPTIVE_DECISION_CONFIG`) rather than buried in conditionals — the literal "configurable rules" the brief asked for.

**Reuses, not recomputes**: the `classification` input comes from `classifyTopics()` (Phase 4, unchanged); `mastery`/`accuracy`/`speed`/`retention`/`misconceptionRisk`/`prerequisiteRisk` come from `getTopicState()` (Phase 6's digital twin, unchanged). This is the first phase to combine Phase 4's diagnosis and Phase 6's richer risk signals into one decision — each phase built its own piece in isolation; Phase 11 is where they meet.

**New service** (`src/services/adaptiveDecisionService.mjs`): `decideNextActionForTopic(learnerId, topicId)` gathers the context (handling an entirely untouched topic as a zeroed context, not an error) and the one genuinely new fact needed — whether revision is due (`isRevisionDue()`, a one-line read of the existing, unchanged `revision_schedule` table).

**New route**: `GET /api/learning/adaptive-decision/:topicId`.

## Two real design gaps caught by writing the tests, not after shipping

Both of these were caught *before* anything was declared done — the unit tests failed for the right reason, and the fix was to the design, not the test:

1. **A tie between `MINI_ASSESSMENT` and `ADVANCE_TOPIC`.** Both can legitimately score identically — both are driven by the same `mastery` value when their trigger conditions coincide (a strong topic at the mini-assessment attempt checkpoint). The first version resolved this tie arbitrarily, by array order, in favor of blindly advancing. That's backward: this whole project's design philosophy is "verify before you advance, don't assume." Fixed by deliberately reordering the two candidates and documenting the stable-sort tie-break as an intentional contract, then adding a test that confirms the tie is real (both scores equal) *and* that verification wins it.

2. **`retention === 0` is the database's default for "never been through a revision cycle," not evidence of fading retention.** `recordAttempt()` only ever updates `retention_score` on a `REVISION`-mode attempt — a topic that's been practiced ten times in plain `PRACTICE` mode still shows `retention_score = 0`, and the first version of the `REVISION` scorer read that literal `0` as "retention has completely collapsed," which would have wrongly nudged every untouched or practice-only topic toward a revision reminder it had never earned. Fixed by excluding `retention === 0` from the soft-revision trigger specifically — and noted why that's a *reliable* distinction, not a heuristic: `retentionValue()`'s floor (`POOR = 0.15`, smoothed) means a topic that has genuinely been through even one revision cycle can never land exactly on `0`.

## Verification performed

**Unit tests** (13 new, `tests/adaptive-decision.test.mjs`): every action is always scored, never short-circuited; an untouched topic defaults to `PRACTICE` at the baseline score; `CRITICAL` with real prerequisite risk recommends fixing the prerequisite; `PREREQUISITE_BLOCKED` never scores plain `PRACTICE` above zero; a real misconception signal on a `WEAK` topic recommends a reteach, not more questions; decent accuracy with slow pace recommends timed practice; a due revision always wins regardless of how strong everything else looks; fading-but-measured retention nudges toward a soft revision, while exactly-zero (never measured) retention does not; a solid topic with nothing pulling it back advances; hitting the mini-assessment interval recommends a recheck; the `MINI_ASSESSMENT`/`ADVANCE_TOPIC` tie resolves toward verification; every decision carries every candidate's score, ranked. 121/121 total unit tests pass (108 existing + 13 new).

**DB-backed exit test** (`tests/adaptive-decision.smoke.mjs`, `npm run test:adaptive-decision`, 7 checks, all passing on the first run after the two fixes above): a never-touched topic on the real seeded syllabus defaults to `PRACTICE`; a learner who did well and quickly on `whole-numbers` gets `ADVANCE_TOPIC`/`MINI_ASSESSMENT`/`PRACTICE`, never a lesson-reinforcement action; a learner who answered `division` correctly but never touched `whole-numbers` (its real seeded prerequisite) gets `PREREQUISITE_LESSON` regardless of her own good `division` performance, with `PRACTICE` explicitly scored `0` — the gate genuinely closed, not just deprioritized; a learner answering `simplification` wrong, consistently, at a normal pace gets a lesson-reinforcement action, not blind `PRACTICE`; across four different learners, the engine produced genuinely different decisions from genuinely different evidence.

**Live verification through the browser**: `GET /api/learning/adaptive-decision/aptitude.whole-numbers` against the real, currently-untouched seeded learner returned `PRACTICE` at the documented baseline score with the full eight-candidate ranking attached, matching the unit-test prediction exactly.

**Full regression + build**: `npm test` (121/121) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:adaptive-decision` (7/7) → `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route).

## Known limitations

- **`MINI_ASSESSMENT`'s trigger is an approximation.** It fires every `miniAssessmentAttemptInterval` (15) attempts on a topic, as a proxy for "enough new practice since the last formal check." It isn't actually tracking attempts since the last assessment that covered this topic (which would need correlating `assessment_question` coverage with timestamps per topic) — a reasonable simplification for this phase, not assumed to be the final word.
- **The decision is per-topic, not yet orchestrated across topics.** This phase decides "what should happen on *this* topic" with full scoring; it doesn't yet decide *which* topic among several candidates deserves the session (that's Phase 7's `PrerequisiteGate`/`LessonSelector` territory, reused separately, not merged with this engine here).
- **Nothing calls this engine automatically yet.** It's a real, tested, callable decision — but no existing flow (the daily plan, the practice session, the assessment submit) invokes it to actually change what a learner sees next. Wiring an existing surface to call it is natural follow-up work, not assumed here without being asked.
- **`TIMED_PRACTICE` doesn't yet change anything about how practice is served** — no timer, no distinct question-selection mode. The decision correctly identifies when it's warranted; acting on it (serving practice under an actual time constraint) is unbuilt.

## Algorithm/version changes

No existing function was modified. `classifyTopics()` (Phase 4) and `getTopicState()` (Phase 6) are both reused unchanged as pure inputs to the new engine. One new domain module, one new repository (one query), one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 11 stops. Waiting for approval before the next phase.
