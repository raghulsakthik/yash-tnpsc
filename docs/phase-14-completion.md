# Phase 14 Completion Report — Intervention Tracking

## This gap was flagged two phases ago, now closed

`docs/phase-6-completion.md`'s known limitations named this exact gap: *"no standalone log of every recommendation ever issued to a learner, with whether it was followed... squarely Phase 14 territory."* Nothing built since then touched it. This phase closes it.

## What was implemented

**Migration** (`db/migrations/V9__intervention.sql`): one new table, `intervention` — `baseline_score`/`baseline_retention` captured at the moment a recommendation is acted on, `post_score`/`post_retention`/`learning_gain`/`retention_gain`/`time_spent_ms` filled in at evaluation, `status` (`ACTIVE`/`EVALUATED`/`ABANDONED`). Fully additive — no existing table touched.

**New domain module** (`src/domain/intervention.mjs`): two pure functions. `computeInterventionGains()` is plain subtraction, rounded — post minus baseline, never clamped, so a real regression shows up as a real negative number rather than being hidden. `assessInterventionEffectiveness()` is the literal question the brief poses — "did this recommendation actually work?" — answered as `IMPROVED`/`NO_CHANGE`/`REGRESSED` against a small, named, configurable floor/ceiling (`INTERVENTION_EFFECTIVENESS_CONFIG`), same discipline as every scoring module since Phase 11.

**New service** (`src/services/interventionService.mjs`):
- `startIntervention(learnerId, topicId)` — calls `decideNextActionForTopic()` (Phase 11, unchanged) to both decide *what* the intervention is (`interventionType` = whatever action the engine actually recommends right now, not a label chosen after the fact) and to read the baseline mastery/retention it already computed internally — no duplicate query.
- `evaluateIntervention(interventionId)` — reads the post snapshot via `getTopicState()` (Phase 6, unchanged), computes the gains, and — the one genuinely new piece of evidence-gathering this phase needed — sums real `time_taken_ms` across every `question_attempt` row since the intervention started (`sumAttemptTimeSince()`), rather than inventing a separate time-tracking mechanism. Refuses to evaluate an intervention twice.
- `listInterventions()`/`getIntervention()` — the experiment log itself.

**Three new routes**: `POST /api/interventions` (start), `GET /api/interventions` (list), `GET /api/interventions/:id`, `POST /api/interventions/:id/evaluate`.

## Verification performed

**Unit tests** (5 new, `tests/intervention.test.mjs`): gains are exact subtraction, including a genuine negative (regression) case that isn't clamped away; `IMPROVED`/`REGRESSED`/`NO_CHANGE` each verified at and around the configured floor/ceiling, including the "tiny movement either direction stays `NO_CHANGE`" case specifically (guards against treating noise as signal). 142/142 total unit tests pass (137 existing + 5 new).

**DB-backed exit test** (`tests/intervention.smoke.mjs`, `npm run test:intervention`, 10 checks, all passing on the first run): starting an intervention on an untouched topic captures a real `0` baseline and tags it with whatever the Adaptive Decision Engine genuinely recommends (not a hardcoded label); real practice happens (8 real seeded questions, all correct); evaluating produces a real positive `postScore`, a `learningGain` that exactly equals `postScore` (since the baseline was 0), an `IMPROVED` verdict, and a `timeSpentMs` that matches the actual summed recorded time exactly, not an estimate; evaluating the same intervention twice is refused; the experiment log lists it and a direct `GET` matches.

**Live verification through the browser**: `POST /api/interventions` against the real, currently-untouched seeded learner created a real intervention tagged `PRACTICE` (the live Adaptive Decision Engine's actual current recommendation for that topic), with the full decision and candidate scores attached; `GET /api/interventions` listed it back.

**Full regression + build**: `npm test` (142/142) → `npm run db:migrate` (V9 applied) → `npm run test:intervention` (10/10) → `test:mastery-gate`, `test:adaptive-lesson-plan`, `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 3 new routes).

## Known limitations

- **Nothing starts an intervention automatically.** Every prior phase that produces a recommendation (the Adaptive Decision Engine, the adaptive lesson plan) still just returns one — none of them calls `POST /api/interventions` to actually begin tracking it. Wiring an existing recommendation surface to open a tracked intervention automatically is natural follow-up, not assumed here.
- **Nothing evaluates an intervention automatically either.** `evaluateIntervention()` has to be called explicitly; there's no scheduled or trigger-based re-check (e.g. "evaluate every active intervention nightly," or "evaluate when the next assessment on this topic completes"). Phase 15 ("Test-to-Test Intelligence") looks like the natural home for a trigger tied to assessment completion specifically.
- **One active intervention per topic isn't enforced.** Nothing currently stops `startIntervention()` from being called again on a topic that already has an `ACTIVE` one — a second, overlapping experiment would just sit alongside the first with its own baseline. Not a problem the brief asked this phase to solve, but worth a decision before this is driven automatically.
- **`ABANDONED` status is declared but nothing sets it.** There's no logic yet for "she moved on without the intervention ever being evaluated" — it's in the schema's `CHECK` constraint for a future phase to use, not wired up.

## Algorithm/version changes

No existing function was modified. `decideNextActionForTopic()` (Phase 11) and `getTopicState()` (Phase 6) are both reused unchanged as the only sources of baseline/post evidence. One new migration, one new enum pair, one new domain module, one new repository, one new service, three new routes — all additive.

## Stop

Per the agent procedure, this is where Phase 14 stops. Waiting for approval before the next phase.
