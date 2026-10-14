# Phase 7 Completion Report — Foundation Learning Engine

## What was implemented

The one valid initial action for any learner — including one with zero evidence anywhere — built as: Foundation Candidate Topics → Check prerequisites (**PrerequisiteGate**, new) → Check learner state → Calculate learning need (**LessonSelector**, reusing `selectTopic()` unchanged) → Select appropriate lesson (**DifficultySelector**, new).

**New domain module** (`src/domain/learningPlan.mjs`):

- `gateTopic(topicId, prerequisiteGraph, accuracyByTopic)` — the **PrerequisiteGate**. Reuses `weakestPrerequisite()` (`selection.mjs`, unchanged) and `PREREQUISITE_BROKEN_THRESHOLD` (`diagnostic.mjs`, Phase 4, unchanged — the same 40% floor, not a new magic number). A topic with no prerequisite is always open. This closes a real gap: `/api/plan/today` already computes `prerequisiteGap` as a *soft* scoring term but never refuses a topic outright — a learner on day one, with every dependent topic's only prerequisite sitting at an unattempted 0%, needs a hard "not yet," not just a lower score. `/api/plan/today` itself was not touched.
- `selectInitialAction(candidates)` — the **LessonSelector**. Filters to gate-open topics, then reuses `selectTopic()` (`selection.mjs`, unchanged) to pick the neediest one among them. Decides `FOUNDATION` vs `PRACTICE` (reusing `PathStepType` from Phase 5's `learningPath.mjs`) based on whether she's ever touched the topic at all. Returns `null`, not a wrong guess, if every candidate happens to be gated.
- `selectStartingDifficulty(currentDifficulty)` — the **DifficultySelector**. Trivial by design: returns the persisted difficulty if one exists, else `0.3` — `learner_topic_state.current_difficulty`'s own DB default (V1), not an invented number.

**New repository** (`src/repository/learningPlanRepository.mjs`): one query, `findCandidateTopicStates()` — a `LEFT JOIN` so an untouched topic still appears with zero evidence rather than being silently absent, which matters specifically for a brand-new learner.

**`LearningPlanService`** (`src/services/learningPlanService.mjs`): `getInitialLearningAction(learnerId)` — gathers the same foundation-candidate-topic set the Default Foundation Test (Phase 3) already defines (deliberately the same set, not a second notion of "foundation"), builds the prerequisite graph, gates every candidate, and returns the LessonSelector's choice — or an honest `NONE`/`BLOCKED` with every gated reason listed, never a silent fallback.

**New route**: `GET /api/learning/next-action` — named to match the endpoint the original 31-phase spec's Phase 8 also expects, since Phase 8 (Lesson→Practice pipeline) is expected to extend this same endpoint rather than replace it.

## Verification performed

**Unit tests** (7 new, `tests/learning-plan.test.mjs`): a prerequisite-free topic is always open; an untouched (0%) prerequisite gates its dependent closed; a solid prerequisite leaves it open; the difficulty selector only falls back to the default when there's truly no state; a two-candidate scenario (one open, one gated) picks exactly the open one as `FOUNDATION`; an already-attempted topic gets `PRACTICE` with its real persisted difficulty, not the default; and a fully-gated candidate set correctly returns `null` rather than picking a blocked topic anyway. 97/97 total unit tests pass (90 existing + 7 new).

**DB-backed exit test** (`tests/learning-plan.smoke.mjs`, `npm run test:learning-plan`, 8 checks) — proves the exit condition directly, against the real seeded syllabus: a brand new learner with zero state anywhere is steered to `aptitude.whole-numbers` specifically (the one candidate topic with no prerequisite at all, out of 11), as a `FOUNDATION` step at difficulty `0.3`; all 10 other candidates are gated out, each with a stated reason (`division` because `whole-numbers` is unattempted, which cascades through `fractions`, `decimals`, `percentage`, etc.); after she answers 6 real `whole-numbers` questions correctly, the engine now recommends something else and `division` is no longer gated. Every assertion passed on the first run — the cascading-gate prediction (one open topic, ten gated, each explaining itself) matched reality exactly.

**Live verification through the browser**: `GET /api/learning/next-action` against the real, currently-fresh seeded learner returned the identical cascade live — `whole-numbers` recommended, 10 topics gated, each reason naming the real broken link (e.g. `aptitude.percentage` → `its prerequisite aptitude.fractions is at 0%`).

**Regression**: `npm test` (97/97) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:learning-plan` (8/8) → `npm run test:learner-state` (12/12) → `npm run test:assessment` (23/23) → `npm run test:domain` (20/20) → `npm run test:loop` (unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route compiled, `/api/plan/today` unchanged).

## Known limitations

- **`/api/plan/today` still has no hard gate.** It continues to use `prerequisiteGap` as a soft score only, as it always has — Phase 7 deliberately added a parallel, gated engine (`/api/learning/next-action`) rather than changing the existing daily-plan route's behavior for returning learners who already have content history. Whether the daily plan should eventually adopt the same hard gate is a product decision, not assumed here.
- **The recommended action still points at a topic, not a lesson.** `FOUNDATION`/`PRACTICE` are step *types*, same as Phase 5's path steps — there is still no lesson content to serve underneath a `FOUNDATION` step (same limitation noted in Phases 2/3/5). `GET /api/learning/next-action` tells you what topic and what kind of activity; it doesn't yet hand back lesson content, because none exists to hand back.
- **The gate only looks one hop deep per candidate**, same precedent as Phase 3/4/5: `findPrerequisiteGraphForTopics` fetches edges only for the candidate set itself. This has been sufficient for the real seeded syllabus (foundation topics have no prerequisites of their own), but a deeper, multi-hop chain outside this candidate set wouldn't be walked further than one level if it existed.
- **Only reads `learner_topic_state` evidence**, not the richer Phase 6 digital twin (fatigue/misconception/velocity). This phase asked specifically for prerequisite-gated topic selection, not a richer-signal selection; wiring `learnerStateService`'s risk signals into the choice (e.g. don't recommend more practice on a topic with high fatigue risk) is natural future work, not done here.

## Algorithm/version changes

No existing function was modified. `weakestPrerequisite()`/`selectTopic()`/`examWeight()` (`selection.mjs`), `PREREQUISITE_BROKEN_THRESHOLD` (`diagnostic.mjs`), and `PathStepType` (`learningPath.mjs`) are all reused unchanged. `/api/plan/today` is untouched. One new pure module, one new repository, one new service, one new route — all additive, no schema change.

## Stop

Per the agent procedure, this is where Phase 7 stops. Waiting for approval before the next phase.
