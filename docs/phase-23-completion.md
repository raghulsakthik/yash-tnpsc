# Phase 23 Completion Report — Cross-Subject Adaptive Engine

## The missing layer, precisely identified

Every phase through 22 decided "which topic" within one fixed pool — Phase 7's foundation candidates, Phase 18's expanded pool, Phase 20's proof that the same engines work on any one subject at a time. Nothing decided *which subject* at all. Phase 23 adds exactly that one layer, on top of everything else unchanged: `Learner State → Subject Priority (new) → Topic Priority → Action Priority → Content/Question Selection`.

## What was implemented

**New pure domain module** (`src/domain/crossSubjectDecision.mjs`): `selectSubject()` — the same weighted-sum pattern `selectTopic()` (`selection.mjs`, unchanged) already uses, lifted one level up: `weakness` (0.3), `examWeight` (0.35), `neglect` (0.2, the one genuinely new signal — a subject has no topic-level analogue for "days since I touched anything in this subject at all"), `momentum` (0.15). `subjectExamWeight()` sums real `chapter.question_count` values per subject — the same authentic data `examWeight()` already draws from for topics, never invented.

**New repository** (`src/repository/crossSubjectRepository.mjs`): `findSubjectAggregates()` computes each subject's real exam weight, weighted accuracy, attempt count, and most recent study date, reading `learner_topic_state` exactly as every other phase does. (One subtlety caught before it became a bug: the subject-question-count sum has to be computed in its own subquery *before* the chapter→topic join, since joining topic directly and summing `chapter.question_count` would multiply each chapter's count by how many topics it has.) `findContentTopicIdsForSubject()` finds which subjects actually have anything to serve.

**New service** (`src/services/crossSubjectDecisionService.mjs`): `getCrossSubjectDecision()` scores every subject with real content, picks the best one, then hands off to the *exact same* reusable primitives Phase 18 already composes for its expanded pool — `gateTopic()`/`examWeight()`/`selectTopic()` (`learningPlan.mjs`/`selection.mjs`, unchanged), `findCandidateTopicStates()`/`findPrerequisiteGraphForTopics()` (Phase 7/3, already generic over an arbitrary `topicIds` array) — scoped to the chosen subject's topics, then `decideNextActionForTopic()` (Phase 11, unchanged) for the final action.

**New route**: `GET /api/learning/cross-subject-decision`.

## Verification performed

**Unit tests** (8 new, `tests/cross-subject-decision.test.mjs`): exam weight is 0 for no real question count, never `NaN`; it scales correctly relative to the paper's largest subject; `daysSince()` is honestly `null` when never studied, not a fake number; a never-touched subject reads as maximally neglected even without a date; a higher real exam weight pulls selection toward that subject when other signals are tied; the neglect signal *saturates* at the configured floor rather than unboundedly rewarding abandonment (a subject neglected 14 days scores identically to one neglected 140); no subjects at all returns `null`, not a crash. 192/192 total unit tests pass (184 existing + 8 new).

**DB-backed exit test, with a real course-correction** (`tests/cross-subject-decision.smoke.mjs`, `npm run test:cross-subject`, 8 checks, all passing): my first draft assumed "neglect" would dominate the story — heavy aptitude practice "shifting" the pick toward a neglected General Studies. Running it against real seeded data showed General Studies *already* wins for a completely fresh learner, correctly, because its real exam weight (75 marks) structurally outweighs Aptitude's (25 marks) once both start equally untouched. That's not a bug — it's the engine being exam-rational — so I rewrote the test to assert what's actually true (exam weight correctly dominates when nothing else differs), then found, by directly experimenting against the database rather than guessing, that strong, complete, recent real performance across every Indian Polity question (seeded by Phase 20) genuinely flips the decision back to Aptitude once its exam-weight advantage is finally outweighed. A second assertion bug followed from the same honesty: `aptitude-mental-ability` spans both the `apt.aptitude` and `apt.reasoning` chapters, so an `assert topicId.startsWith('aptitude.')` was too narrow — the engine correctly chose a reasoning topic, which is a completely valid member of that subject. Fixed to accept either prefix.

**Live verification through the browser**: `GET /api/learning/cross-subject-decision` against the real, currently-fresh seeded learner returned exactly the predicted fresh-learner result — General Studies selected on real exam weight, routed to a real Polity topic, with a real Phase 11 action attached.

**Full regression + build**: `npm test` (192/192) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:cross-subject` (8/8) → all 18 prior DB-backed smoke suites (unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route).

## Known limitations

- **Only the two subjects with real published content (Aptitude and General Studies) are ever selectable** — Tamil/English remain fully untranscribed (the same gap named since the first audit), so they never enter the decision even though they carry 100 real marks each; the engine correctly excludes a subject with nothing to serve rather than selecting it and failing downstream.
- **The weights are initial values**, same caveat as every scoring module since Phase 11 — reasonable starting points, not tuned against real learner outcomes, since none exist yet.
- **Nothing automatically routes a learner based on this decision.** `/api/plan/today` (Phase 1) and Phase 16's weekly plan both still compute their own, separately-scoped recommendations; this new endpoint exists alongside them, not wired into either — a deliberate choice to avoid touching two more working, tested routes without being asked.
- **The subject-level "neglect" signal and the topic-level "prerequisite urgency" signal don't interact** — a subject could win on neglect while its best topic inside is prerequisite-gated; the topic-selection stage (reused, unchanged) already handles that correctly at its own level, but there's no cross-level feedback (e.g. "this subject's neglect doesn't matter if every topic in it is currently blocked").

## Algorithm/version changes

No existing function was modified. `selectTopic()`/`examWeight()` (`selection.mjs`), `gateTopic()` (`learningPlan.mjs`), `findCandidateTopicStates()`/`findPrerequisiteGraphForTopics()` (Phase 7/3), and `decideNextActionForTopic()` (Phase 11) are all reused unchanged. One new domain module, one new repository, one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 23 stops.
