# Phase 18 Completion Report — Intermediate Progression Engine

## What was already there vs. what this phase adds

Phase 13 already built a genuine, assessment-confirmed per-topic mastery gate. Phase 7/11/12 already built gated, scored topic selection — but every one of them was scoped to the same fixed set: `findDefaultAssessmentCandidateTopics()` (Phase 3's foundation + its direct dependents). Nothing decided, at the *learner* level, when that fixed set should stop being the whole world. This phase adds exactly that one decision — a progression **state**, derived from real evidence, not a calendar date — and expands the pool the existing selection logic already knows how to operate over.

Checked the real content first rather than assuming: the topics outside Phase 3's candidate set that actually have published questions are `aptitude.simple-interest`, `aptitude.compound-interest`, `aptitude.volume`, and all six `reasoning.*` topics — nine real, content-backed "intermediate" candidates, derived from the live prerequisite graph and content, not a hardcoded list.

## What was implemented

**New pure domain module** (`src/domain/intermediateProgression.mjs`): `evaluateProgressionTier(foundationGateResults)` — `FOUNDATION` unless *every* real foundation topic's Phase 13 gate reads `ready: true` (i.e., `MASTERED` or `RETAINED` — assessment-confirmed, not just high practice accuracy), in which case `INTERMEDIATE`. `buildCandidatePool()` — foundation candidates always; intermediate candidates only once the tier allows it.

**New repository** (`src/repository/intermediateProgressionRepository.mjs`): `findFoundationTopics()` and `findIntermediateCandidateTopics()` — the latter mirrors the exact foundation-candidate CTE already established in `defaultAssessmentRepository.mjs` (Phase 3), just inverted to find what's *outside* that set with real published content.

**New service** (`src/services/intermediateProgressionService.mjs`):
- `getProgressionTier()` — calls `getMasteryGate()` (Phase 13, unchanged) once per real foundation topic and reports each one's status alongside the overall tier.
- `getCandidatePool()` — the tier plus the actual topic-ID pool.
- `getExpandedNextAction()` — composes the *same* pure functions Phase 7 already uses (`gateTopic()`/`selectInitialAction()` from `learningPlan.mjs`, and the already topic-agnostic `findCandidateTopicStates()`/`findPrerequisiteGraphForTopics()`) over the expanded pool. This isn't a copy of Phase 7's logic — Phase 7's domain layer was already generic over whatever candidate list it's given; only the *orchestration* (which topics to fetch) differs, and Phase 7's own service/route are completely untouched.

**Two new routes**: `GET /api/learning/progression-tier`, `GET /api/learning/expanded-next-action`.

## Verification performed

**Unit tests** (5 new, `tests/intermediate-progression.test.mjs`): any single foundation topic not yet ready keeps the tier at `FOUNDATION`; every one ready flips it to `INTERMEDIATE`; zero foundation topics defined stays `FOUNDATION` rather than vacuously unlocking; the pool is foundation-only until the tier allows more, then includes both. 174/174 total unit tests pass (169 existing + 5 new).

**DB-backed exit test** (`tests/intermediate-progression.smoke.mjs`, `npm run test:intermediate-progression`, 10 checks, all passing on the first run) — the demanding case, proven against real data: a fresh learner is `FOUNDATION` tier with all four real foundation topics unready, and her candidate pool genuinely excludes `aptitude.volume`. After heavy real practice (8 correct answers each, across all four foundation topics), every one reads `NEAR_MASTERY` — practice alone, as Phase 13 designed, is not enough, and the tier correctly stays `FOUNDATION`. Only after a real, completed Phase 3 Default Foundation Test confirms all four do they flip to `MASTERED`/`RETAINED` together, the tier flips to `INTERMEDIATE`, and the candidate pool measurably grows to include `aptitude.volume` and the rest.

**Live verification through the browser**: `GET /api/learning/progression-tier` against the real, currently-fresh seeded learner returned `FOUNDATION` tier with all four real foundation topics at `FOUNDATION_REQUIRED` — matching the fresh-learner prediction exactly.

**Full regression + build**: `npm test` (174/174) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:intermediate-progression` (10/10) → `test:milestone`, `test:weekly-plan`, `test:test-comparison`, `test:intervention`, `test:mastery-gate`, `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes).

## Known limitations

- **Requiring *every* foundation topic to be ready is a strict bar** — one lagging topic (even `RETAINED` on the other three) keeps the whole tier at `FOUNDATION`. This is a deliberate, defensible reading of "foundation mastery gates are satisfied" (plural, all of them), not assumed to be the only reasonable threshold — a fractional bar (e.g. 3 of 4) is an easy, named-config change if a future phase wants it.
- **Intermediate topics still pass through the same `gateTopic()` prerequisite check as everything else** — a topic like `aptitude.volume` (which itself requires `aptitude.area`, outside the foundation set) can still be gated closed even after reaching `INTERMEDIATE` tier, if *its own* prerequisite is weak. This is correct, not a bug: tier unlocking access to a topic is different from that topic itself being safe to start.
- **No General Studies, language, or current-affairs content exists**, so "intermediate" here means the next layer of aptitude/reasoning only — the same content gap named in every prior content-related report (Phase 0's audit through Phase 16).
- **Nothing currently reads `getExpandedNextAction()` instead of Phase 7's `getInitialLearningAction()`.** Both exist side by side; no existing route or UI switches between them based on tier. That integration (e.g. `/api/learning/next-action` itself becoming tier-aware) is a reasonable next step, not assumed here without being asked.

## Algorithm/version changes

No existing function was modified. `getMasteryGate()` (Phase 13), `gateTopic()`/`selectInitialAction()` (Phase 7's `learningPlan.mjs`), `findCandidateTopicStates()`/`findPrerequisiteGraphForTopics()` (Phase 7/3) are all reused unchanged. One new domain module, one new repository, one new service, two new routes — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 18 stops.
