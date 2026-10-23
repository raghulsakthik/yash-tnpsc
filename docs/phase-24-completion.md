# Phase 24 Completion Report — Retention Engine

## The gap, precisely identified

The brief's "basic version" checklist — successful recall + time since recall + difficulty + confidence + mistakes — is substantially already satisfied by the existing, unchanged spaced-repetition pipeline: `revision.mjs`'s `recallPerformance()`/`nextInterval()`/`retentionValue()`, folded into `learner_topic_state.retention_score` by `recordAttempt()` on every `REVISION`-mode attempt, already accounts for successful recall, difficulty (via `expectedSeconds`), and confidence. Two dimensions from the checklist are genuinely missing from that stored number:

- **Time since recall.** The stored score only moves on a `REVISION`-mode attempt — a topic untouched for 60 days still reads at whatever it scored at its last revision, understating how much has likely been forgotten since.
- **Mistakes.** Not directly in the stored formula, but substantially already covered by Phase 6's unchanged `misconceptionRisk()` signal — a real, recent conceptual-gap pattern on the topic.

Phase 24 adds exactly a minimal, additive, read-time-only layer closing these two gaps, without touching how the stored value itself is computed or written.

## What was implemented

**New pure domain module** (`src/domain/retentionEngine.mjs`): `timeDecayFactor()` — simple exponential decay (`0.5 ^ (daysSinceLastStudied / halfLifeDays)`, `halfLifeDays = 21`), returning 1 (no penalty) when there's no elapsed-time evidence at all. `estimateEffectiveRetention()` — the stored score, decayed by elapsed time, then further discounted by `misconceptionRisk * 0.3` on top of that.

**New service** (`src/services/retentionEngineService.mjs`): `getEffectiveRetention(learnerId, topicId)`, deliberately querying both `findTopicStateRow()` (Phase 6's repository, for `last_studied_at`, which `getTopicState()`'s return shape doesn't currently expose) and `getTopicState()` (Phase 6's service, unchanged, for `retention` and `misconceptionRisk`) — a second small, redundant read rather than modifying a working service's return shape.

**New route**: `GET /api/learning/retention/:topicId`.

## Verification performed

**Unit tests** (8 new, `tests/retention-engine.test.mjs`): no elapsed-time evidence doesn't penalize; zero days is no decay; exactly one half-life halves the factor, two half-lives quarters it; zero elapsed time and zero risk reports the stored value back unchanged; a half-life gap meaningfully lowers the estimate; real misconception risk further discounts on top of time decay; no combination of extreme inputs ever produces a value outside `[0, 1]`. 200/200 total unit tests pass (192 existing + 8 new).

**DB-backed exit test** (`tests/retention-engine.smoke.mjs`, `npm run test:retention`, 13 checks, all passing, real `recordAttempt()` pipeline throughout): a topic touched moments ago (one `PRACTICE` + one `REVISION` attempt, establishing a real nonzero stored retention) reads at essentially its stored value; the same topic, artificially aged 21 real days via a direct `UPDATE learner_topic_state SET last_studied_at = ...` (the same historical-row technique Phase 17's streak test used), reads meaningfully lower — decay factor lands at almost exactly 0.5, the stored score itself never moves; a learner whose first-ever attempt on a topic genuinely classifies as `CONCEPTUAL` (real `classifyMistake()` logic — prior accuracy defaults to 0 on a first attempt, triggering the real rule, not a forced value) shows a real nonzero `misconceptionRisk` that further discounts the estimate below time-decay alone; an untouched topic raises `NotFoundError`, not a fabricated value.

**Full regression**: `npm test` (200/200) → `npm run test:retention` (13/13) → all 19 prior DB-backed smoke suites (test:loop, domain, assessment, learner-state, learning-plan, session-pipeline, adaptive-decision, adaptive-lesson-plan, mastery-gate, intervention, test-comparison, weekly-plan, milestone, intermediate-progression, aptitude-assessment, multi-subject, pyq, game-engine, cross-subject — all unaffected, all passing) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route, `/api/learning/retention/[topicId]`).

**Live verification through the browser**: with the real seeded learner starting from genuinely no topic state, `GET /api/learning/retention/aptitude.whole-numbers` correctly returned `404 TOPIC_STATE_NOT_FOUND`. A real answer submitted through the actual `/practice` UI (5/6 − 1/3 = 1/2, answered correctly) created real `learner_topic_state`/`question_attempt`/`revision_schedule` rows; the endpoint then correctly returned `effective: 0, storedRetention: 0` (honest — no `REVISION`-mode attempt had occurred yet to establish a nonzero stored score) with real evidence attached. Directly aging that real row to 21 days and setting a real stored retention of 0.8 reproduced the exact unit-tested decay live: `effective: 0.4, decayFactor: 0.5`. All test data on the real learner (`00000000-0000-0000-0000-000000000001`) was deleted afterward, restoring it to its original, pristine, untouched state.

## Known limitations

- **The stored `retention_score` only ever updates on a `REVISION`-mode attempt**, a pre-existing behavior of the unchanged pipeline, not something this phase changes — a learner who only ever does `PRACTICE` attempts has a permanently-zero stored retention to decay from. This read-time layer makes that honest (the live-verification run above shows exactly this), it does not paper over it.
- **The 21-day half-life and 0.3 misconception-penalty weight are initial values**, the same caveat as every scoring module since Phase 11 — reasonable starting points, not tuned against real learner outcomes, since none exist yet.
- **Nothing currently reads this endpoint downstream.** `/api/plan/today`, the weekly plan, and the adaptive decision engine all still reason from the raw stored `retention_score` via `getTopicState()`, unchanged; this is a new, standalone read, not wired into any existing decision — a deliberate choice to avoid touching working, tested routes without being asked.

## Algorithm/version changes

No existing function was modified. `getTopicState()`/`findTopicStateRow()` (Phase 6) and `misconceptionRisk()` (`learnerState.mjs`, Phase 6) are reused unchanged. One new domain module, one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 24 stops.
