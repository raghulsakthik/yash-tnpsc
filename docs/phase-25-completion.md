# Phase 25 Completion Report — Advanced Subject Adaptation, Gamification & Weekly Learning Engine (consolidating 25-29)

## Audit first: most of this brief is already built

Per the instruction that phases 25-29 consolidate into one phase "without losing any functionality," the first step was mapping every section of the brief against the 13 phases already shipped (12-24), the same audit discipline Phase 1 established. Six of the brief's seven sections are already fully satisfied, unchanged:

| Brief section | Already satisfied by |
|---|---|
| 1. Intermediate Learning (progression gated by mastery/retention/prerequisites/assessment, not lesson completion) | Phase 18 — `evaluateProgressionTier()`, `getExpandedNextAction()` |
| 2. Aptitude Assessment (numerical/logical/speed/accuracy/pattern/confidence) | Phase 19 — `analyzeAptitudeAssessment()` |
| 3. TNPSC Subject Engine (Subject→Chapter→Topic→Concept→Prerequisite→Lesson→Practice→Revision→Assessment, adaptive sequence) | Phase 20 (proved the pipeline is subject-agnostic with real Polity content) + Phase 23 (`selectSubject()` — the adaptive, not fixed, subject ordering) |
| 4. Weekly Assignment Engine (weakness+mastery+retention+revision-due+exam-importance+prerequisites+recent-tests+PYQ+velocity+consistency) | Phase 16 — `buildWeeklyPlan()`, reading Phase 3/4/6/7's evidence; PYQ performance and velocity are Phase 15/21/6 signals Phase 16's underlying evidence already carries |
| 5. Subject-Specific Games (engine, not XP) | Phase 22 — one generic `game_definition`/`game_session` engine, config-driven, every result graded through `recordAttempt()` |
| 6. Adaptive Subject Progression (continue/strengthen/revise/switch subject/assessment) | Phase 11 (`decideNextActionForTopic()`) + Phase 23 (`selectSubject()`) together |

**Section 7, Completion Criteria** (`CONTINUE`/`STRENGTHEN`/`REVISE`/`REASSESS`/`MASTERED`/`RETAINED`) is the one genuinely new decision the brief asks for — an explicit, literal-vocabulary verdict nothing earlier produces in this exact shape. And one concrete, previously self-documented gap became closeable now that Phase 22 exists: Phase 16's own completion report named "Friday (GAME) is always marked unavailable — no game engine exists yet" as a known limitation. Phase 25's actual new work is exactly these two things, plus the content needed to demonstrate the second one on a non-aptitude subject.

## What was implemented

**New pure domain module** (`src/domain/completionCriteria.mjs`): `evaluateCompletionVerdict()` — composes `evaluateMasteryGate()`'s own status (Phase 13, unchanged — `MASTERED`/`RETAINED` pass straight through, since they're already the brief's literal vocabulary), prerequisite risk (Phase 6), the hard revision-due trigger (Phase 11) and effective, time-decayed retention (Phase 24) into the remaining four verdicts. New `CompletionVerdict` enum (`enums.mjs`, additive).

**New service** (`src/services/completionCriteriaService.mjs`): `getCompletionVerdict()`, reading `getMasteryGate()` (Phase 13), `getTopicState()` (Phase 6), `isRevisionDue()` (Phase 11) and `getEffectiveRetention()` (Phase 24) — nothing recomputed, every input already persisted or already derived elsewhere.

**New route**: `GET /api/learning/completion-status/:topicId`.

**New domain module** (`src/domain/weeklyAssignment.mjs`): `attachGameToWeeklyPlan()` — a pure overlay that takes the plan `getWeeklyPlan()` (Phase 16) already produces and, only if a real match exists, replaces Friday's day with one naming a real, active game. Returns the identical object when there's no match — Phase 16's own output, untouched.

**New repository** (`src/repository/weeklyAssignmentRepository.mjs`): `findActiveGameDefinitionForTopic()` — the one new read, checking whether Phase 22's `game_definition.target_topic_ids` genuinely contains Friday's already-chosen topic.

**New service** (`src/services/weeklyAssignmentService.mjs`): `getWeeklyAssignment()`, composing the two above. `getWeeklyPlan()`/`buildWeeklyPlan()` themselves are never called with new arguments, never edited.

**New route**: `GET /api/learning/weekly-assignment`.

**New content, zero new code** (`db/migrations/V12__polity_game.sql`): "Constitution Match" — one more `game_definition` row, reusing Phase 22's existing engine exactly as Phase 20 proved the content pipeline is subject-agnostic. `target_topic_ids` resolved from the real `gs.indian-polity` chapter; its 11 real, authored questions (Phase 20) are what the 5 transcribed topics inside it actually serve.

## Verification performed

**Unit tests** (15 new: 11 `tests/completion-criteria.test.mjs`, 4 `tests/weekly-assignment.test.mjs`): every `MasteryGateStatus` maps to a verdict with a real, non-empty reason; `RETAINED`/`MASTERED` pass straight through; a shaky prerequisite outranks a due revision; a formally due revision, or retention that has genuinely decayed (only once it has actually been through a revision cycle — see course-correction below), calls for `REVISE`; `NEAR_MASTERY` only reads `REASSESS` once mastery has actually crossed the real `nearMasteryFloor`, not merely "close"; the Friday overlay returns the exact same object when no real game matches, and touches no other day when one does. 215/215 total unit tests pass (200 existing + 15 new).

**A real course-correction, caught by testing against real data**: the first version of `evaluateCompletionVerdict()` treated any `attemptCount > 0` plus a low `effectiveRetention` as "fading, needs REVISE." Running it against real seeded data showed every never-revised topic (`retention_score` sitting at its honest zero default — `recordAttempt()` only ever moves it on a `REVISION`-mode attempt, documented since Phase 24) misread as fading retention, incorrectly pre-empting both `CONTINUE` and `REASSESS`. Fixed by gating that trigger on `storedRetention > 0` — "never measured" and "faded" are different facts, and conflating them was wrong, not a simplification.

**DB-backed exit tests** (`npm run test:completion-criteria`, 11 checks; `npm run test:weekly-assignment`, 10 checks; all passing, real `recordAttempt()`/assessment pipelines throughout): an untouched topic reads `CONTINUE`; ordinary mixed practice reads `CONTINUE`; practicing `aptitude.division` without ever touching its real prerequisite `aptitude.whole-numbers` (a real seeded `topic_prerequisite` row, strength 0.8) reads `STRENGTHEN`; a real, directly-aged-due `revision_schedule` row reads `REVISE`; strong practice-only mastery on `aptitude.whole-numbers`, unconfirmed by any assessment, reads `REASSESS` — then, after a real, completed Default Foundation Test confirms it (same flow as Phase 13's own smoke test), reads `MASTERED`/`RETAINED`. For the weekly assignment: a fresh learner stays honestly unavailable on Friday; real weakness on `aptitude.percentage` (in `apt.aptitude`, the same chapter `speed-round-aptitude`'s topics were resolved from) resolves Friday to that real game; real weakness on `polity.fundamental-rights` resolves Friday to the new Constitution Match game; real weakness on `aptitude.whole-numbers` (a topic no game covers) stays honestly unavailable, never a fabricated match; `getWeeklyPlan()` itself, called directly for the same learner, is proven byte-identical to the new engine's output apart from Friday — direct proof Phase 16 was never modified.

**Full regression**: `npm test` (215/215) → `npm run db:migrate` (applied `V12__polity_game`) → `test:completion-criteria` (11/11) → `test:weekly-assignment` (10/10) → all 20 prior DB-backed smoke suites (unaffected, all passing) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes).

**Live verification through the browser**: with the real seeded learner starting fresh, `GET /api/learning/completion-status/aptitude.whole-numbers` correctly returned `CONTINUE` (`FOUNDATION_REQUIRED`, 0 attempts). `GET /api/learning/weekly-assignment` matched `GET /api/learning/weekly-plan` exactly, Friday unavailable on both. Two real wrong answers submitted through the actual `/practice` UI on `aptitude.percentage` made it genuinely weak; `weekly-assignment` then live-resolved Friday to `{available: true, gameDefinitionId: "speed-round-aptitude", gameName: "Aptitude Speed Round"}` while `weekly-plan` (called again, same learner) still reported `available: false` — direct, live proof of the additive overlay. `completion-status/aptitude.percentage` live-returned `STRENGTHEN`, correctly naming the real unmastered prerequisite (`aptitude.fractions`, 0% accuracy). All test data on the real learner (`00000000-0000-0000-0000-000000000001`) was deleted afterward, restoring it to its original, pristine, untouched state.

## Known limitations

- **Sections 1-6 of the brief are satisfied by composition across 13 earlier phases, not re-verified end-to-end as one flow in this phase.** Each piece has its own phase's completion report and regression coverage; this phase did not re-run a single "foundation through assessment" integration test spanning all of them, since no code in those phases changed.
- **Only Aptitude and Polity have real game content.** History, Geography, Science, Tamil and English are named in the brief's games list but have no transcribed question content yet (the same, repeatedly-documented content gap since Phase 1's audit) — per the project's standing "never invent a weight" rule, no games were created for subjects without real authored questions. The engine (Phase 22) is already fully generic; adding more subjects is pure content work, not code.
- **The weekly assignment's game match is exact-topic only** — it does not fall back to "a game somewhere in the same subject" when no game covers the specific weakest topic. A deliberate choice: an inexact match would be a fabricated recommendation, not a real one; Friday staying honestly unavailable is the correct behavior until real content closes that gap too.
- **`REASSESS` and `NEAR_MASTERY` share the same underlying mastery-gate state** — the verdict only distinguishes them by re-checking the raw mastery score against `MASTERY_GATE_CONFIG.nearMasteryFloor`, reused rather than duplicated, but this means any future change to that floor's meaning in `masteryGate.mjs` has to be considered here too.
- **The completion-status and weekly-assignment endpoints are new, standalone reads** — nothing currently calls them from another service (the same "additive, not wired into existing routes without being asked" choice every phase since 14 has made).

## Algorithm/version changes

No existing function was modified. `evaluateMasteryGate()` (Phase 13), `getTopicState()`/`prerequisiteRisk()` (Phase 6), `isRevisionDue()` (Phase 11), `getEffectiveRetention()` (Phase 24), `buildWeeklyPlan()`/`getWeeklyPlan()` (Phase 16), and the game engine (Phase 22) are all reused unchanged — proven directly for the weekly plan by comparing its own route's live output before and after. Two new domain modules, two new services, one new repository, two new routes, one new enum, one new content migration — all additive.

## Stop

Per the agent procedure, this is where Phase 25 stops.
