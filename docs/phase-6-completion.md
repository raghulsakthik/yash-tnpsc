# Phase 6 Completion Report — Learner Digital Twin

## What was implemented

A read-only layer that assembles both pieces of the brief's "digital twin" — historical evidence and current derived state — without touching the pipeline that already produces most of it.

**What already existed and was reused unchanged**: `learner_topic_state` already persists six of the nine named topic_state dimensions (mastery, accuracy, concept, speed, retention, confidence, consistency — "accuracy" and the others map onto the brief's list directly), computed by `recordAttempt()` every time an attempt happens. `learner`/`learner_profile` already exist. Phase 4's `classifyTopics()`/`buildTopicRecommendations()` were reused as-is, not reimplemented. None of this was touched.

**What was missing and got added** — three new pure calculators plus a formalized fourth, in `src/domain/learnerState.mjs`:

- `learningVelocity(recentAttempts)` — splits the recent window in half (newer vs older) and compares accuracy between them; positive means improving, negative means sliding backward. Returns `0` with an explicit "not enough attempts" reason below 4 attempts, rather than a misleading number.
- `misconceptionRisk(recentAttempts)` — proportion of recent attempts whose `mistakeType` (already classified by `recordAttempt()`, never reclassified here) is `CONCEPTUAL` or `UNKNOWN` — specifically isolating "a real gap" from guesses, slips, and time pressure.
- `fatigueRisk(recentAttempts)` — compares the most recent 3 attempts against the ones before them on both accuracy and pace; flags a visible slowdown-and-decline pattern. Needs ≥6 attempts or returns `0` with a reason.
- `prerequisiteRisk(topicId, graph, accuracyByTopic)` — a thin wrapper around `weakestPrerequisite()` (`selection.mjs`, unchanged) turning its result into a `[0,1]` risk number with the same evidence.
- `computeTopicState(...)` — the TopicStateCalculator: assembles the six persisted dimensions (read as-is) with the four derived signals above, and — per the brief's "critical rule" — an `evidence` object naming exactly what produced every derived number. Nothing is ever a bare score.

**`LearnerStateService`** (`src/services/learnerStateService.mjs`):
- `getTopicState(learnerId, topicId)` — the full twin for one topic. Throws `NotFoundError` for a topic with no evidence yet (not a crash).
- `getLearnerSummary(learnerId)` — the learner-level "current state": every topic she's touched at all, classified **live** against today's `learner_topic_state` by reusing Phase 4's classifier unchanged (not a replay of one past assessment), plus `averageMastery` and counts per classification.

**New repository** (`src/repository/learnerStateRepository.mjs`) — read-only queries over existing tables; no migration, no new columns. The three new risk signals are computed at read time, not persisted (see Known limitations).

**Two new API routes**: `GET /api/learner/summary`, `GET /api/learner/topics/:topicId/state` — thin wrappers, same conventions as every other route.

## Verification performed

**Unit tests** (10 new, `tests/learner-state.test.mjs`): each calculator's "not enough evidence" floor, a clear improving/declining trend, a clean misconception split, a real tiring-out pattern vs a steady one, prerequisite risk matching `1 - accuracy`, and `computeTopicState` passing persisted values through untouched while attaching evidence for every derived one. 90/90 total unit tests pass (80 existing + 10 new).

**DB-backed exit test** (`tests/learner-state.smoke.mjs`, `npm run test:learner-state`, 12 checks): a fresh learner on an untouched topic gets a clean `NotFoundError`; a learner answering 5 questions well and briskly then 3 slower and wrong on a real seeded topic (`aptitude.percentage`) reads back with `fatigueRisk > 0.3` and negative `learningVelocity` — a genuinely tired, declining pattern, not an assumption; every derived signal carries non-empty evidence text; the learner summary counts her one touched topic and reuses Phase 4 to classify and recommend on it live; an untouched learner gets an empty-but-not-broken summary.

**Live verification through the browser**: answered a real practice question on `aptitude.percentage` through the actual `/practice` UI, then read both new routes live. `GET /api/learner/topics/aptitude.percentage/state` returned a real, internally consistent object (`mastery: 0.293`, `fatigueRisk: 0.171`, `prerequisiteRisk: 1` with `weakestPrerequisite: {topicId: "aptitude.fractions", accuracy: 0}`), and `GET /api/learner/summary` independently derived the same `PREREQUISITE_BLOCKED` classification and `REINFORCE_PREREQUISITE → aptitude.fractions` recommendation for it — Phase 4's logic, reused live, agreeing with itself. While investigating the live numbers I also noticed (and then fully cleaned up) stray `question_attempt` rows left on the shared dev learner from earlier phases' manual browser testing — a leftover from my own test hygiene in prior sessions, not a Phase 6 defect; the seeded learner's state is fully reset now.

**Regression**: `npm test` (90/90) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:learner-state` (12/12) → `npm run test:assessment` (23/23) → `npm run test:domain` (20/20) → `npm run test:loop` (unaffected, re-confirmed after the state reset) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes compiled).

## Known limitations

- **The three derived risk signals are not persisted.** They're computed fresh on every read from recent `question_attempt` history, rather than stored as new `learner_topic_state` columns. This keeps the hot grading path (`recordAttempt()`) completely untouched and avoids a migration for values nothing yet depends on querying in bulk; if a future phase needs to query "every learner with high fatigue risk" efficiently across many rows, persisting them then is the natural next step.
- **Fatigue is read from the most recent attempts chronologically, not a true session boundary.** `question_attempt.session_id` exists (Phase 2) but nothing in the practice flow populates it yet, so there's no reliable way to scope "this session" precisely. Documented as an approximation, not silently assumed.
- **No `recommendation` history table.** The brief lists `recommendation` as one of the historical-evidence sources alongside `learning_event`/`learning_attempt`/`test_answer`/`mistake`. Phase 4's recommendations are real but currently transient (computed on demand, or stored once inside a specific assessment's `metadata`) — there's no standalone log of every recommendation ever issued to a learner, with whether it was followed. That's squarely Phase 14 ("Intervention Tracking") territory and wasn't built here to avoid reaching ahead of what this phase asked for.
- **`getLearnerSummary` only classifies topics with at least one attempt.** A topic she's never touched doesn't appear in her summary at all (consistent with `classifyTopics`'s existing `UNKNOWN` handling, which only fires for topics that *were* in the candidate set but had zero evidence within one assessment — here, untouched topics are simply absent rather than explicitly listed as `UNKNOWN`). Worth revisiting if a future phase wants "every syllabus topic, including the ones never attempted" in one view.

## Algorithm/version changes

No existing function was modified. `weakestPrerequisite()` (`selection.mjs`), `classifyTopics()`/`buildTopicRecommendations()` (`diagnostic.mjs`), and `recordAttempt()` (`attempts.mjs`) are all byte-for-byte unchanged and directly reused. One new pure domain module (`learnerState.mjs`), one new repository, one new service, two new routes — all additive, no schema change.

## Stop

Per the agent procedure, this is where Phase 6 stops. Waiting for approval before the next phase.
