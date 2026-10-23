# Adaptive System

Phase 1 audit. Scope: every existing algorithm in `src/domain/*.mjs`, and how the current engine maps against the continuous learning-decision loop this project is meant to run:

```
CONTENT → LEARNER INTERACTION → EVENT → LEARNER STATE UPDATE → ANALYSIS
  → CANDIDATE ACTIONS → ADAPTIVE DECISION → RECOMMENDATION → LEARNING ACTIVITY
  → ASSESSMENT → OUTCOME → INTERVENTION EFFECTIVENESS → LEARNER STATE UPDATE ↺
```

Core principle this doc checks against: **the backend is not a content delivery system, it is a continuously updating learning decision system.**

## Algorithm inventory (`src/domain/*.mjs`) — all pure, framework-free, unit-tested

- **`accuracy.mjs`** — `weightedAccuracy` (recency-weighted, `λ=0.15`: an attempt ~5 back counts ~half as much as the latest), `speedScore` (only correct attempts count, ratio of expected/actual time capped at 2), `clamp01`.
- **`difficulty.mjs`** — constants `STEP_UP=0.05`, `STEP_DOWN=0.1`, `FLOOR=0.1`, `CEILING=0.95`, `STRUGGLE_STREAK=3`. `adaptDifficulty()` priority chain: 3-in-a-row wrong → drop by 1.5×step + `REVIEW_PREREQUISITE`; <5 attempts → hold (thin evidence); accuracy<0.5 → step down; accuracy>0.85 & fast → step up; accuracy>0.85 & slow → hold; else hold. `difficultyBand()` is display-only (EASY/MEDIUM/HARD/EXPERT), never used in adaptation math.
- **`mastery.mjs`** — `MASTERY_WEIGHTS = {concept:.30, accuracy:.25, speed:.15, retention:.15, consistency:.10, confidence:.05}`. Per-dimension scorers: `conceptScore` (lifetime accuracy), `consistencyScore` (1 − variance/0.25 of the 0/1 correctness sequence), `confidenceCalibration` (rewards confident-and-right, punishes confident-and-wrong).
- **`mistakes.mjs`** — `GUESS_SECONDS=5`. `classifyMistake()` priority chain: correct→null; <5s→GUESS; confidence≥4→OVERCONFIDENT; time>2.5×expected→TIME_PRESSURE; topicAccuracy≥0.75→CARELESS; topicAccuracy<0.5→CONCEPTUAL; else UNKNOWN. `interventionFor()` maps each to `{action, message}`.
- **`planner.mjs`** — `buildDailyPlan()`: revision is always primary when due>0 (forgetting costs more than deferring new content); else a selected practice topic; else `NONE`.
- **`revision.mjs`** — bounds `[1,90]` days; `MULTIPLIER={GOOD:2, MEDIUM:1.3, POOR:0.5}`. `recallPerformance()`, `nextInterval()`, `isDue()`, `retentionValue()`.
- **`selection.mjs`** — `QUESTION_WEIGHTS={difficultyFit:.45, novelty:.35, examRelevance:.2}`; `TOPIC_WEIGHTS={weakness:.35, examWeight:.35, prerequisiteUrgency:.2, momentum:.1}`. `examWeight()` derives weight from real syllabus question counts, not a constant (confirmed by the loop smoke test: "exam weight comes from the seeded syllabus, not a constant"). `weakestPrerequisite()` BFS-walks the prerequisite graph for root-cause remediation, not nearest-parent.
- **`testGen.mjs`** — `allocateSlots()` (largest-remainder apportionment to hit an exact total — the 25-question weekly test), `pickTopicQuestions()` (unseen-first, spread across difficulty).
- **`ai/context.mjs`** — pure prompt-building, no network; excludes raw attempt history from ever reaching a prompt.

All of the above is covered by 50 passing unit tests (`tests/engine.test.mjs`) plus a real-database smoke test (`tests/loop.smoke.mjs`) — both confirmed green in this audit (see `existing-functionality.md`).

## Stage-by-stage mapping against the target decision loop

| Loop stage | Current implementation | Status |
|---|---|---|
| **CONTENT** | `question`/`topic`/`chapter`/`subject`/`topic_prerequisite`, seeded from YAML. | Present, but only 25/200 marks have content (see `content.md`). |
| **LEARNER INTERACTION** | `QuestionSession.js`/`TestSession.js` capture `selectedIndex`, `confidence`, elapsed time. | Present. |
| **EVENT** | `POST /api/attempts`/`POST /api/tests/:id/submit` receive it; `recordEvent()` logs `QUESTION_VIEWED`/`QUESTION_ANSWERED`/`TEST_COMPLETED` into `learning_event`. | Present, but `learning_event` is write-only — no stage reads it back. |
| **LEARNER STATE UPDATE** (first pass) | `recordAttempt()` — idempotent insert, recomputed accuracy/speed/mastery/difficulty/revision. | Present, strongest-built part of the system. |
| **ANALYSIS** | `classifyMistake()` per-attempt; `weakestPrerequisite()` BFS on demand (from `/api/plan/today`, not the attempt pipeline). | Partial — shallow and per-topic only; no cross-topic/learner-level diagnosis step exists. |
| **CANDIDATE ACTIONS** | Not materialized as a scored set at the "what next" level. `adaptDifficulty()` returns one action; `selectQuestion()`/`selectTopic()` *do* generate and score multiple candidates before picking one — the closest existing analog. | Partial. |
| **ADAPTIVE DECISION** | `adaptDifficulty()` (difficulty step), `selectTopic()`+`buildDailyPlan()` (today's single primary action) — independent decisions, not one unified step. | Partial. |
| **RECOMMENDATION** | `GET /api/plan/today` → `{primaryAction, topicId, reason, estimatedMinutes, items[]}`. | Present, single-horizon (today only). |
| **LEARNING ACTIVITY** | `/practice`, `/revision`, `/mistakes`, `/test`. | Present for practice/revision/mistake-review/weekly-test. No "lesson" concept exists (see `architecture.md` §Incomplete functionality). |
| **ASSESSMENT** | Every answered question graded through `recordAttempt()` regardless of mode. | Present (continuous); no discrete mastery-check instrument distinct from ordinary practice. |
| **OUTCOME** | `correct`/`score`/`perTopic` returned by `/api/attempts` and `/api/tests/:id/submit`. | Present. |
| **INTERVENTION EFFECTIVENESS** | `interventionFor()` fires a message; nothing measures whether it changed subsequent performance. | **Absent.** This is the one explicit feedback arc the target loop names that has zero implementation. |
| **LEARNER STATE UPDATE** (loop-closing) | Only the first-pass update exists, synchronous with the triggering attempt. No downstream update driven by measured intervention effectiveness. | Partial — the loop as built is `EVENT → STATE UPDATE → (immediate) DECISION`, collapsed into one transaction, with no feedback arc from effectiveness back into the model. |

## Summary

A **tight, well-tested, single-pass adaptive loop at the question level** — solid, should not be rebuilt. What it is not yet: a decision system with a materialized, scored set of candidate next-actions beyond "next question/next topic," a notion of learner *phase*, or any measurement of whether a recommendation actually worked. Full phase-model gap mapping is in `gap-analysis.md`.
