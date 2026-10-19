# Phase 12 Completion Report — Adaptive Lesson Modification

## How this relates to Phase 5 — overlap identified before writing anything

Phase 5 ("Adaptive Foundation Lesson Engine") already proved the headline exit condition's wording almost verbatim: "the same syllabus order produces a different journey depending only on the classification." So before writing code, I compared Phase 12's worked example against Phase 5's actual behavior to find the real, incremental difference rather than rebuilding it.

Two genuine gaps, both visible directly in the worked example:

1. **Phase 5's path stops.** The moment it hits a `CRITICAL`/`PREREQUISITE_BLOCKED` topic, `buildLearningPath()` emits one `FOUNDATION` step and sets `blocked: true` — correct for "what should she do *right now*," but Phase 12's example explicitly keeps going: `Percentage reassessment → Ratio`. The plan needed to splice remediation in and keep projecting forward, not truncate.
2. **Phase 5's vocabulary is coarser.** It only ever emits `FOUNDATION`/`PRACTICE`/`ADVANCE`/`GATHER_EVIDENCE` — four states derived straight from Phase 4's classification. Phase 12's second example names `Timed Percentage` explicitly, which maps to `TIMED_PRACTICE` — a decision only the Phase 11 Adaptive Decision Engine makes (accuracy fine, pace isn't), not Phase 4's five-state classifier. Phase 12 needed the richer, scored vocabulary, which didn't exist until last phase.

So Phase 12 is the first phase to actually *use* Phase 11's scoring engine as an input to a multi-topic plan, with new behavior (keep projecting past a detour) that neither Phase 5 nor Phase 11 had reason to build on its own. Phase 5's `buildLearningPath()` was not touched — it still answers its own question correctly and is still used where it was before (the completed-assessment diagnostic).

## What was implemented

**New domain module** (`src/domain/adaptiveLessonPlan.mjs`): `buildAdaptiveLessonPlan(syllabusTopicIds, decisionsByTopic)` — takes one Adaptive Decision Engine result per topic (Phase 11, unchanged) and projects the full route:

- `ADVANCE_TOPIC`/`PRACTICE`/`TIMED_PRACTICE`/`MEMORY_ECHO`/`REVISION`/`MINI_ASSESSMENT` each become one step, and the loop continues.
- `REPEAT_LESSON` (a self-contained gap) splices in reteach → practice → reassessment for the *same* topic, then continues.
- `PREREQUISITE_LESSON` splices in the worked example's exact sequence: the weakest prerequisite's own lesson → practice → reassessment, **then** the original topic's own lesson → practice → reassessment — fixing the foundation doesn't mean the topic itself needed no further attention, which is exactly what the brief's worked example shows.
- A topic with no decision available is skipped, not a crash — the rest of the plan isn't blocked by one gap in the data.

**New service** (`src/services/adaptiveLessonPlanService.mjs`): `getAdaptiveLessonPlan(learnerId)` gathers the same foundation-candidate topic set and real syllabus order Phase 3/5 already established (unchanged), calls Phase 11's `decideNextActionForTopic()` once per topic (in parallel), and projects the plan.

**New route**: `GET /api/learning/adaptive-plan`.

## Verification performed

**Unit tests** (6 new, `tests/adaptive-lesson-plan.test.mjs`): reproduce both worked examples exactly — Learner A's `numbers → [fractions prerequisite lesson/practice/reassessment] → [percentage lesson/practice/reassessment] → ratio`, and Learner B's `numbers → percentage (timed practice) → ratio` — plus: the two plans are provably different from the same syllabus order; a missing decision is skipped, not fatal; `REPEAT_LESSON` reteaches the same topic (no prerequisite splice) when no prerequisite is involved; `MEMORY_ECHO`/`REVISION`/`MINI_ASSESSMENT` pass through as single steps. 127/127 total unit tests pass (121 existing + 6 new).

**DB-backed exit test** (`tests/adaptive-lesson-plan.smoke.mjs`, `npm run test:adaptive-lesson-plan`, 6 checks, all passing on the first run): a learner confidently wrong on `fractions` (a real prerequisite in the actual seeded syllabus) gets a remediation step for it, and — the defining behavioral proof — the plan still includes topics *after* fractions (`percentage`/`decimals`), unlike Phase 5's path, which would stop there. A second learner, accurate everywhere, gets no prerequisite-lesson step at all. Both plans walk the identical `syllabusOrder` but produce provably different step sequences — the exit condition, proven against real data, not asserted.

**Live verification through the browser**: `GET /api/learning/adaptive-plan` against the real, currently-untouched seeded learner returned the full 11-topic plan, every topic defaulting to `PRACTICE` (no evidence anywhere yet) — matching the predicted shape for a zero-evidence learner exactly.

**Full regression + build**: `npm test` (127/127) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:adaptive-lesson-plan` (6/6) → `test:adaptive-decision`, `test:assessment`, `test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route).

## Known limitations

- **This is a projection, not a commitment.** It assumes every piece of remediation it proposes actually resolves the issue (a `REASSESSMENT` step that always "passes," conceptually) — it doesn't re-run the Adaptive Decision Engine *after* a hypothetical remediation to confirm the next topic would really be `ADVANCE_TOPIC`. A genuinely adaptive re-plan after each real reassessment is a reasonable next step, not built here.
- **Calling the Adaptive Decision Engine once per topic means one request fans out into roughly a dozen smaller queries** (one per candidate topic, each itself issuing a handful of reads). Acceptable for an on-demand "show me the plan" endpoint; would need batching if this were called on every page load.
- **Still no lesson content.** `LESSON`/`PREREQUISITE_LESSON` step types name what kind of activity comes next, same limitation carried since Phase 2 — there's still nothing to actually serve underneath them.
- **`REASSESSMENT` steps are generic**, not yet tied to Phase 3's `MINI_ASSESSMENT`/`DIAGNOSTIC` assessment types concretely (e.g. auto-creating one). They mark where a recheck belongs in the sequence; wiring them to an actual assessment-creation call is unbuilt.

## Algorithm/version changes

No existing function was modified. `decideNextActionForTopic()` (Phase 11), `findDefaultAssessmentCandidateTopics()`/`findTopicsInSyllabusOrder()` (Phase 3/5) are all reused unchanged. `buildLearningPath()` (Phase 5) is untouched and still serves its own purpose. One new domain module, one new service, one new route — all additive. No schema change.

## Stop

Per the agent procedure, this is where Phase 12 stops. Waiting for approval before the next phase.
