# Phase 4 Completion Report — Foundation Test Diagnostic Engine

## What was implemented

A sharper, five-state read of the Default Foundation Test's results, additive on top of Phase 3's binary weak/strong split — nothing in Phase 3 was rewritten.

**New enums** (`src/domain/enums.mjs`): `TopicClassification` (`STRONG`, `WEAK`, `CRITICAL`, `PREREQUISITE_BLOCKED`, `UNKNOWN`) and `RecommendationAction` (`ADVANCE`, `REINFORCE_TOPIC`, `REINFORCE_PREREQUISITE`, `GATHER_EVIDENCE`).

**New domain logic**, appended to `src/domain/diagnostic.mjs` (its Phase 3 exports — `summarizeByTopic`, `diagnosePrerequisiteGaps` — are untouched):

- `classifyTopics(topics, prerequisiteGraph)` — walks the prerequisite graph for **every** topic, not just the ones already scored weak, so a topic that happened to score well is still flagged if its foundation is badly broken. Decision order, each one overriding the next:
  1. No evidence (`questionCount === 0`) → `UNKNOWN`.
  2. Weakest prerequisite's accuracy below `PREREQUISITE_BROKEN_THRESHOLD` (40%) → `PREREQUISITE_BLOCKED`, **regardless of the topic's own score** — the idea being her own result can't be trusted yet if the thing it rests on is this broken.
  3. Own accuracy below the Phase 3 `WEAK_ACCURACY_THRESHOLD` (60%) and a weaker (but not yet "broken") prerequisite was found → `CRITICAL`.
  4. Own accuracy below 60% with no weaker prerequisite → `WEAK`.
  5. Own accuracy at/above `STRONG_ACCURACY_THRESHOLD` (80%) → `STRONG`.
  6. Everything between 60–80% with no prerequisite issue → `WEAK` ("still developing" — the brief named five states, not six, so this doesn't invent a middle label).
- `buildTopicRecommendations(classifications)` — turns each classification into one concrete action: `CRITICAL`/`PREREQUISITE_BLOCKED` → `REINFORCE_PREREQUISITE` targeting the weakest prerequisite (this is "do NOT immediately teach advanced Ratio — teach/reinforce Fractions first," made machine-readable); `WEAK` → `REINFORCE_TOPIC`; `STRONG` → `ADVANCE`; `UNKNOWN` → `GATHER_EVIDENCE`.

**Wiring**: `src/services/defaultAssessmentService.mjs`'s `submitDefaultAssessment()` now also computes `classifications` and `recommendations` and attaches them to the stored diagnostic, alongside (not instead of) Phase 3's `weakTopics`/`strongTopics`/`prerequisiteGaps`. No new migration, no new API route — the existing `POST /api/assessments/:id/submit` and `GET /api/assessments/:id` routes return the richer diagnostic automatically, since they just forward whatever the service returns.

## Verification performed

**Unit tests** (`tests/default-assessment.test.mjs`, 6 new): reproduces the worked example exactly — `Fractions=WEAK`, `Ratio=CRITICAL` (traces to `Fractions`), `Basic Operations=STRONG` — plus: a topic with no evidence is `UNKNOWN` not `WEAK`; a badly broken prerequisite blocks a topic that scored fine on its own (`PREREQUISITE_BLOCKED` overriding a good score); a weak topic with a healthy prerequisite stays `WEAK`, not `CRITICAL`; every classification maps to exactly one recommendation action. 76/76 total unit tests pass (70 existing + 6 new).

**DB-backed exit test**: extended the Phase 3 smoke test (`tests/default-assessment.smoke.mjs`) rather than writing a separate one, since Phase 4 only adds fields to the same submission result. Against the real seeded syllabus (fractions and percentage both deliberately failed, exactly as Phase 3 already arranged): fractions itself classifies `WEAK` (its own prerequisite, division, wasn't touched and scored fine); percentage — which requires fractions at 0.85 in the real seeded data — classifies `PREREQUISITE_BLOCKED` (not merely `CRITICAL`, because fractions came back at a genuinely broken 0%, below the 40% floor) with a recommendation to reinforce fractions, not percentage. All 20 checks (17 from Phase 3 + 3 new) pass.

**Regression**: `npm test` (76/76) → `npm run db:migrate` (no-op — this phase added no schema) → `npm run test:assessment` (20/20) → `npm run test:domain` (Phase 2, still green) → `npm run test:loop` (existing weekly-test/practice/revision loop, still green) → `npm run validate:content` (unaffected) → `npm run build` (clean, no route changes).

## A deliberate correction mid-implementation

My first draft of the smoke test assertion expected percentage to classify as `CRITICAL`. Running it against the real data showed `PREREQUISITE_BLOCKED` instead — and on inspection that's the *correct* behavior, not a bug: the test deliberately fails every fractions question (0%), which is below the 40% "broken" floor, so the stricter override correctly fires instead of the softer `CRITICAL` read. Fixed the test's expectation rather than loosening the threshold to fit a wrong assumption.

## Known limitations

- **Thresholds are initial values** (`PREREQUISITE_BROKEN_THRESHOLD = 40`), same caveat as Phase 3's `WEAK_ACCURACY_THRESHOLD`/`STRONG_ACCURACY_THRESHOLD` — reasonable starting points, not tuned against real learner data, which doesn't exist yet.
- **Only the Default Foundation Test produces this diagnosis.** `classifyTopics`/`buildTopicRecommendations` are generic (they take plain topic/graph data, nothing assessment-specific), so they could be reused for the weekly test or any future assessment type — but that wiring wasn't added here, since nothing asked for it yet.
- **Recommendations are not yet actioned.** `buildTopicRecommendations()` produces a decision (e.g. "reinforce fractions before advancing to percentage"), but nothing yet *routes* the learner's next practice/lesson session based on it — that's the Adaptive Decision Engine and Adaptive Lesson Modification territory from later phases, not this one.
- **No new API surface.** Classification/recommendations ride along in the existing `diagnostic` object; there's no dedicated endpoint to fetch just the classifications, since nothing asked for one.

## Algorithm/version changes

No existing function was modified — `summarizeByTopic()` and `diagnosePrerequisiteGaps()` (Phase 3) are byte-for-byte unchanged; `weakestPrerequisite()` (pre-existing, from `selection.mjs`) is reused, not altered. Two new pure functions added to `diagnostic.mjs`, two new enums added to `enums.mjs`. No schema change.

## Stop

Per the agent procedure, this is where Phase 4 stops. Waiting for approval before the next phase.
