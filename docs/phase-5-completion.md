# Phase 5 Completion Report — Adaptive Foundation Lesson Engine

## What was implemented

A pure function that turns Phase 4's per-topic classification into one concrete, ordered learning path — the same syllabus producing a different journey depending only on where the learner actually is.

**New domain module** (`src/domain/learningPath.mjs`): `buildLearningPath(syllabusTopicIds, classifications)`. Walks topics in real curriculum order and, per topic:

- `STRONG` → a single `ADVANCE` step, keep going.
- `UNKNOWN` (no evidence) → a `GATHER_EVIDENCE` step, keep going — missing evidence isn't treated as weakness, same stance `selectTopic()` already takes toward an untouched topic.
- `WEAK` (self-contained — no weaker prerequisite) → `FOUNDATION` then `PRACTICE` for this topic, then keep going.
- `CRITICAL` / `PREREQUISITE_BLOCKED` → a single `FOUNDATION` step for this topic, then the path **stops**, with `blocked: true` and a `blockedReason` naming the actual weak prerequisite. Practicing a topic whose own foundation is shaky just builds on sand; Phase 4's recommendation (`REINFORCE_PREREQUISITE`) already names the real fix, so the path doesn't pretend to continue past it.

No classification logic was duplicated here — `classifyTopics()` (Phase 4) is the only source of the five states and their reasons; this module only decides what each one means for the forward path.

**Real curriculum ordering, not assessment order**: `src/repository/defaultAssessmentRepository.mjs` gained `findTopicsInSyllabusOrder()`, ordering by `chapter.sort_order` then `topic.sort_order` — both columns have existed since V1 but nothing read them until now. Assessment presentation order is shuffled (non-scoring, by design, same as the weekly test), so the path needed its own query rather than reusing it.

**Wiring**: `submitDefaultAssessment()` now also computes `learningPath` and attaches it to the stored diagnostic alongside `classifications`/`recommendations`. No new migration, no new route — `metadata` is JSONB, so the richer diagnostic object serializes automatically; the existing `GET`/`POST .../submit` routes return it with no code change.

## Verification performed

**Unit tests** (4 new in `tests/default-assessment.test.mjs`): reproduce both worked examples directly —

- Learner A (Fractions 45%, Percentage 52%, Numbers 95%) → `numbers:ADVANCE, fractions:FOUNDATION, fractions:PRACTICE, percentage:FOUNDATION`, blocked, reason naming fractions.
- Learner B (all strong) → four straight `ADVANCE` steps, not blocked.
- A same-syllabus/different-classification comparison, asserting the two paths differ and that Ratio is only reached in the strong learner's path.
- A topic missing from the classification set is treated as `UNKNOWN`, not silently dropped, and doesn't block the path.

80/80 total unit tests pass (76 existing + 4 new).

**DB-backed exit test** (extended `tests/default-assessment.smoke.mjs`): against the real seeded syllabus, with fractions and percentage both deliberately failed (same arrangement Phase 3/4 already use) — all 23 checks pass, including the new path assertions.

## A wrong assumption caught by running it, not by re-reading the code

My first draft of the smoke test assumed the path would walk straight to `percentage` and block there, since that's the topic the Phase 3/4 tests already deliberately fail. Running it against the real seeded prerequisite graph showed the path actually blocks one step earlier, at `decimals` — because `decimals` *also* requires `fractions` (`strength: 0.75`, real seeded syllabus data), and `decimals` sits immediately after `fractions` in `apt.foundation`'s own chapter order, before the path ever reaches `apt.aptitude`'s `percentage`. This is correct, more interesting behavior, not a bug — it's the cascading-prerequisite effect Phase 5 is explicitly about, just appearing one topic earlier than I'd guessed. Fixed the test's expectations to match the real graph rather than loosening the assertion to paper over the mismatch.

**Regression**: `npm test` (80/80) → `npm run db:migrate` (no-op, no new schema this phase) → `npm run test:assessment` (23/23) → `npm run test:domain` (Phase 2, unaffected) → `npm run test:loop` (existing weekly-test/practice/revision loop, unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean, no route changes).

## Known limitations

- **The path is a snapshot of one assessment's result**, not a living plan — it isn't recomputed as the learner practices and (presumably) improves fractions afterward. Re-deriving it on demand from current `learner_topic_state` (rather than only at assessment submission) is natural follow-up work, not done here since nothing asked for it yet.
- **No API route exposes the path on its own** — it rides inside the existing assessment diagnostic, same as Phase 4's classifications/recommendations. No dedicated `GET /learning/path` endpoint exists.
- **Nothing acts on the path yet.** It describes what *should* happen next (foundation lesson on fractions, then practice, then stop) but no scheduler or recommendation surface (like `/api/plan/today`) reads it yet — that integration is implied by later phases (the Lesson→Practice Pipeline, the Weekly Plan Engine), not this one.
- **`FOUNDATION`/`PRACTICE` steps reference a topic, not a specific lesson or question set** — there is still no lesson content model to point them at (same limitation noted in Phase 2/3's reports); a `FOUNDATION` step is a label for "what kind of activity," not yet a concrete content pointer.

## Algorithm/version changes

No existing function was modified. `classifyTopics()` and `buildTopicRecommendations()` (Phase 4) are unchanged and fully reused. One new pure module added (`learningPath.mjs`), one new repository query added (`findTopicsInSyllabusOrder`), both additive.

## Stop

Per the agent procedure, this is where Phase 5 stops. Waiting for approval before the next phase.
