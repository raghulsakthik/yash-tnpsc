# Phase 17 Completion Report — Streak + Milestone Engine

## This is the first phase to actually read `learning_event`

Every audit of this project since Phase 1 flagged the same thing: `learning_event` is written on every view/answer/test-completion, but nothing ever reads it back — it's "analytics-only," confirmed as still true through Phase 6's and Phase 8's completion reports. This phase is the one the brief itself points at it for: "use the existing event stream."

Checked what's actually recorded before designing anything: `QUESTION_VIEWED`, `QUESTION_ANSWERED`, `REVISION_QUESTION_VIEWED`, `MISTAKE_REVIEWED`, `TEST_COMPLETED`, `DEFAULT_ASSESSMENT_STARTED`, `DEFAULT_ASSESSMENT_COMPLETED` — and nothing else. No `LESSON_STARTED`/`LESSON_COMPLETED` event exists anywhere (consistent with the lesson-content gap repeated since Phase 2), so `FIRST_LESSON` can never unlock yet. That's reported honestly as `unlocked: false` with a stated reason, not silently dropped from the list.

For milestones that need a precise timestamp, `question_attempt` (the authoritative record of what actually happened, idempotent and deduplicated by design since Phase 1) is used directly rather than parsing `learning_event`'s JSON metadata — the same precision distinction Phase 15's test-comparison report already drew between "an event exists" and "the exact, authoritative number."

## What was implemented

**Migration** (`db/migrations/V10__achievement.sql`): one new table, `achievement` — `UNIQUE (learner_id, milestone_type)` so once something is unlocked, it stays unlocked forever, even if (for streak-based badges) the underlying streak later breaks. This is deliberate: a real achievement system doesn't un-award a badge.

**New domain module** (`src/domain/milestone.mjs`):
- `computeCurrentStreak(activityDates, today)` — the **StreakCalculator**. Consecutive days of real activity, with a one-day grace period (no activity yet *today* doesn't break a streak solid through yesterday) — injectable `today` for deterministic testing.
- `evaluateMilestones(facts)` — the **MilestoneEvaluator**. Judges seven named milestones from already-gathered facts; always returns all seven, including `FIRST_LESSON` (always locked, with its reason stated) rather than silently omitting what can't yet be earned.

**New repositories**: `milestoneRepository.mjs` (first-test-completion event, attempt count, the Nth attempt's timestamp, distinct activity dates, first PYQ-tagged attempt — all reading existing tables, no new instrumentation) and `achievementRepository.mjs` (idempotent insert via `ON CONFLICT DO NOTHING`, and a read).

**New service** (`src/services/milestoneService.mjs`): `evaluateAndRecordMilestones()` gathers facts from Phase 6 (touched topics), Phase 13 (`getMasteryGate`, unchanged — drives `FIRST_MASTERED_TOPIC`), and Phase 15 (`compareLatestAssessments`, unchanged — drives `TOPIC_RECOVERY`, using the exact `WEAK_ACCURACY_THRESHOLD`/`STRONG_ACCURACY_THRESHOLD` from Phase 4, not new numbers), then persists anything newly unlocked. `getAchievements()` is a pure read — current streak plus whatever's already persisted, no evaluation, no writes, matching "do not manually update streaks from frontend."

**Two new routes**: `GET /api/milestones` (read), `POST /api/milestones/evaluate` (re-derive and persist).

## A real bug caught and fixed before it ran

While wiring the service, a leftover import — `HUNDRED_QUESTIONS_THRESHOLD_UNUSED` from a module that never exported it — was left in the file. In Node ESM, importing a named export that doesn't exist throws a `SyntaxError` at module load, which would have failed every single route that touches this service, not just the milestone ones. Caught and removed before running anything, by rereading the file rather than assuming it was correct.

## Verification performed

**Unit tests** (12 new, `tests/milestone.test.mjs`): the streak calculator across five scenarios (a clean run, the grace period, a broken gap, zero activity, a gap mid-history that truncates the count correctly); every milestone evaluated individually at and around its threshold (`FIRST_TEST`, `100_QUESTIONS` exactly at 100 not 99, `7_DAY_STREAK` exactly at 7, `TOPIC_RECOVERY` carrying the precise real timestamp, `FIRST_MASTERED_TOPIC` honestly carrying no historical timestamp); `FIRST_LESSON` always present, always locked, with its reason; every known milestone type always evaluated, never silently skipped. 169/169 total unit tests pass (157 existing + 12 new).

**DB-backed exit test** (`tests/milestone.smoke.mjs`, `npm run test:milestone`, 12 checks, all passing on the first run): a brand-new learner starts at zero; 99 ordinary real attempts plus one real PYQ-tagged attempt unlock `100_QUESTIONS` and `FIRST_PYQ` together; six directly-inserted historical `question_attempt` rows spanning the six days before today (real dates, not a mocked clock) combine with today's own activity to cross `7_DAY_STREAK`; `FIRST_TEST` correctly stays locked since no test or assessment was actually completed; evaluating a second time is provably idempotent — no new unlocks, the achievement count unchanged, and the achievement's timestamp doesn't move; the read-only endpoint matches without re-triggering evaluation.

**Live verification through the browser**: `GET /api/milestones` against the real, currently-reset seeded learner returned `{currentStreak: 0, achievements: []}` — correct for a learner with no recent activity.

**Full regression + build**: `npm test` (169/169) → `npm run db:migrate` (V10 applied) → `npm run test:milestone` (12/12) → `test:weekly-plan`, `test:test-comparison`, `test:intervention`, `test:mastery-gate`, `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 2 new routes).

## Known limitations

- **Nothing evaluates milestones automatically.** `POST /api/milestones/evaluate` has to be called explicitly — there's no hook into the attempt/assessment/test-submission routes that triggers it after the fact. Wiring it into an existing flow (or a scheduled job) is natural follow-up, not assumed here, consistent with the same honest gap Phase 14 and Phase 15 both flagged for their own trigger points.
- **`FIRST_MASTERED_TOPIC` and `7_DAY_STREAK` can't carry a precise historical `achievedAt`** — both are judged from current state re-evaluated fresh each time, not from a logged transition event, so the recorded timestamp is "when this was first noticed," not necessarily the exact day it became true. `TOPIC_RECOVERY` and the other event/attempt-backed milestones don't have this limitation — they carry a genuinely precise timestamp from real stored data.
- **`FIRST_LESSON` can never unlock** until lesson content and a corresponding event exist — the same structural gap named repeatedly since Phase 2, now visible concretely in a feature that depends on it.
- **The weekly `test` table isn't consulted for `FIRST_TEST`'s precision beyond its own `TEST_COMPLETED` event** — this is fine (that event is recorded reliably), but it's worth noting alongside the same weekly-test/generic-assessment reconciliation gap flagged in Phases 9, 13, and 15.

## Algorithm/version changes

No existing function was modified. `getMasteryGate()` (Phase 13), `compareLatestAssessments()` (Phase 15), `findAllTouchedTopicStates()` (Phase 6), and `WEAK_ACCURACY_THRESHOLD`/`STRONG_ACCURACY_THRESHOLD` (Phase 4) are all reused unchanged. One new migration, one new enum, one new domain module, two new repositories, one new service, two new routes — all additive.

## Stop

Per the agent procedure, this is where Phase 17 stops. Waiting for approval before the next phase.
