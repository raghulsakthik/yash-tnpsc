# Phase 19 Completion Report — Aptitude Assessment Layer

## Most of this phase already existed — the gap was precisely one thing

The brief's architecture (`Aptitude Blueprint → Question Selection → Timed Assessment → Diagnostic → Adaptive Intervention`) and its instruction ("uses the same underlying infrastructure but has aptitude-specific blueprint/timing/difficulty/scoring/question selection/analysis") describe almost exactly what the weekly test (`test`/`test_question`/`test_answer`, built in the project's first era) already is: an aptitude+reasoning-specific blueprint (`allocateSlots()` by real exam weight), real question selection (`pickTopicQuestions()`), a timing basis (`estimated_seconds` per question), and scoring, all unchanged. The one clear, missing piece: **analysis**. `POST /api/tests/:id/submit` returns a bare `{score, correctCount, perTopic, review}` — no classification, no speed/confidence/retention read, no adaptive intervention. That gap is this phase's entire scope.

## What was implemented

**No new domain functions, no new migration.** Every diagnostic/decision function this phase needed already existed and is reused byte-for-byte: `summarizeByTopic()`, `diagnosePrerequisiteGaps()`, `classifyTopics()`, `buildTopicRecommendations()`, `analyzeSpeedIssues()`, `analyzeConfidenceIssues()`, `analyzeRetentionIssues()`, `deriveStrengthsAndWeaknesses()` (Phase 3/4/10's `diagnostic.mjs`), `estimateAssessmentMinutes()` (Phase 9), `decideNextActionForTopic()` (Phase 11), and `classifyMistake()` (original, pre-session `mistakes.mjs`).

**New repository** (`src/repository/aptitudeAssessmentRepository.mjs`): reads the existing `test`/`test_question`/`test_answer` tables as they already are — `findCompletedTest()` and `findTestQuestionsWithAnswers()`. The weekly test's own create/answer/submit routes are completely untouched.

**New service** (`src/services/aptitudeAssessmentService.mjs`): `analyzeAptitudeAssessment(testId)` gathers a completed test's questions and answers, computes correctness directly (comparing `selected_index` to `answer_index`, the same comparison the submit route already does), and assembles the exact same diagnostic/report/recommendation shape the Default Foundation Test produces — plus a concrete **adaptive intervention** (Phase 11's decision) for every topic that came back weak.

**New route**: `GET /api/tests/:id/analysis`.

## The one real design problem this phase had to solve honestly

`mistakeType` (needed for the speed/confidence/mistake-pattern analysis) is only ever computed by `recordAttempt()` at the moment of grading — and `question_attempt` carries no link back to *which* weekly test produced a given row (no `test_id` column exists on it, unlike `session_id`/`hint_used`, which Phase 2/8 added for a different purpose). Reconstructing it after the fact by joining back to `question_attempt` would be fragile (timestamp-range heuristics, ambiguous if she practiced the same topic around the same time) or would require adding yet another column to an already-twice-extended critical table. Instead, `mistakeType` is **recomputed directly** by calling `classifyMistake()` (unchanged) with the test's own stored answers plus her **current** topic accuracy as the classifier's input — an honest, stated approximation of her accuracy at the moment she actually took the test, not a stored historical value. This keeps the entire phase read-only over existing data, touching nothing.

**Confidence** is handled the same honest way: the weekly test's `test_answer` table has no confidence column at all (it was never collected in that flow), so every result's `confidence` is `null`, and `analyzeConfidenceIssues()` — which already degrades gracefully to "nothing to report" when confidence is missing (Phase 10's own design) — correctly returns an empty list rather than fabricating a signal. This was verified directly, not assumed.

## Verification performed

No new unit tests this phase — there's no new pure domain logic to test (everything reused is already covered by its own phase's tests); the real verification value is in exercising this against actual data.

**DB-backed exit test** (`tests/aptitude-assessment.smoke.mjs`, `npm run test:aptitude-assessment`, 9 checks, all passing after fixing a real bug in my own test — see below): generates, answers, and submits a real 25-question weekly test using the exact pattern already established in `tests/loop.smoke.mjs` (no service layer exists for the weekly test to call directly, so this mirrors that precedent rather than inventing a new one) with one topic deliberately wrong and slow; analyzing an unknown test ID fails cleanly; the real score and question count round-trip; a sensible time estimate is reported; the deliberately weak topic shows up in `report.weaknesses` and `report.speedIssues`; a concrete adaptive intervention was produced for it; `confidenceIssues` is honestly empty.

**A bug in my own test, caught and fixed, not worked around**: the first draft hardcoded "40 seconds" as a stand-in for "slow," without checking that different topics have very different `estimated_seconds` baselines — for a topic whose questions are normally expected to take 60+ seconds, 40 seconds actually reads as *fast*, so the speed-issue assertion failed for the right reason. Fixed by scaling the simulated time relative to each question's own real `estimated_seconds` (2.5× for the deliberately slow topic, 0.8× for everything else) rather than a fixed guess.

**Live verification through the browser**: generated a real weekly test, answered all 25 questions, submitted it, and called the new analysis route through the actual HTTP endpoints (not the service layer directly) against the real seeded learner — the submitted score (36) and the analysis's reported score matched exactly, with a real `estimatedMinutes` and real adaptive interventions produced for all 11 weak topics the (deliberately uniform, low-effort) answers produced.

**Full regression + build**: `npm test` (174/174, unchanged — no new pure logic) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:aptitude-assessment` (9/9) → all 13 prior DB-backed smoke suites (unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean; 1 new route, every existing weekly-test route unchanged).

## Known limitations

- **`mistakeType` in this analysis is an approximation**, not the exact historical classification at grading time (which isn't retrievable after the fact without a schema change this phase deliberately avoided). Documented plainly above and in the code itself, not silently assumed to be exact.
- **The weekly test still collects no confidence rating.** `report.confidenceIssues` will always be empty for a weekly test's analysis until `test_answer` gains a confidence column and the test-taking UI collects it — a real, stated gap, not a bug.
- **"Timed Assessment" in the sense of an enforced countdown doesn't exist** — `estimatedMinutes` reports a real, computed time budget (reusing Phase 9's exact function), but nothing currently enforces it client-side. Consistent with this project's standing split between backend time-budgeting (built) and frontend timer enforcement (explicitly deferred to later, frontend-focused phases).
- **Adaptive interventions are produced, not automatically tracked.** `decideNextActionForTopic()` is called for each weak topic, but nothing here calls `startIntervention()` (Phase 14) to begin tracking it — that wiring, like the equivalent gaps named in Phases 14–17, is left for a later integration pass.

## Algorithm/version changes

No existing function was modified — not one. `summarizeByTopic()`, `diagnosePrerequisiteGaps()`, `classifyTopics()`, `buildTopicRecommendations()`, `analyzeSpeedIssues()`, `analyzeConfidenceIssues()`, `analyzeRetentionIssues()`, `deriveStrengthsAndWeaknesses()` (Phase 3/4/10), `estimateAssessmentMinutes()` (Phase 9), `decideNextActionForTopic()` (Phase 11), `classifyMistake()` (original codebase) are all reused byte-for-byte. One new repository, one new service, one new route — all additive, no schema change, and the weekly test's existing create/answer/submit routes are entirely untouched.

## Stop

Per the agent procedure, this is where Phase 19 stops.
