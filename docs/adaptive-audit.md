# Adaptive Logic Audit

Scope: how the existing engine (`src/domain/*.mjs`, `src/lib/attempts.mjs`, the API routes) implements adaptivity, mapped against the continuous learning-decision loop the system is meant to run:

```
CONTENT → LEARNER INTERACTION → EVENT → LEARNER STATE UPDATE → ANALYSIS
  → CANDIDATE ACTIONS → ADAPTIVE DECISION → RECOMMENDATION → LEARNING ACTIVITY
  → ASSESSMENT → OUTCOME → INTERVENTION EFFECTIVENESS → LEARNER STATE UPDATE ↺
```

Core principle this audit checks against: **the backend is not a content delivery system, it is a continuously updating learning decision system.** Every stage below is graded present / partial / absent against the current codebase, factually, with the exact code that implements (or would need to implement) it.

## Stage-by-stage mapping

| Loop stage | Current implementation | Status |
|---|---|---|
| **CONTENT** | `question` table, seeded from `content/questions/**/*.yaml`; `topic`/`chapter`/`subject`/`topic_prerequisite` tree from `content/syllabus/prelims-495.yaml`. | Present, but only for 25/200 marks (aptitude+reasoning) — see `content-audit.md`. |
| **LEARNER INTERACTION** | `QuestionSession.js`/`TestSession.js` render a question, capture `selectedIndex`, `confidence` (1–5), elapsed time (`Date.now() - shownAt`). | Present. |
| **EVENT** | `POST /api/attempts` and `POST /api/tests/:id/submit` receive the interaction; `recordEvent()` (`lib/db.mjs`) logs `QUESTION_VIEWED`/`QUESTION_ANSWERED`/`TEST_COMPLETED` into the append-only `learning_event` table. | Present, but `learning_event` is explicitly **write-only** — "analytics-only, never read by the learning engine." No stage currently reads it back for analysis. |
| **LEARNER STATE UPDATE** (first pass) | `recordAttempt()` (`lib/attempts.mjs`) inserts `question_attempt` idempotently, then recomputes `learner_topic_state` (accuracy, speed, mastery dims, difficulty, consecutive_wrong) and `revision_schedule`. | Present and is the strongest-built part of the system. |
| **ANALYSIS** | `classifyMistake()` (`mistakes.mjs`) runs per-attempt, using prior topic accuracy as the only contextual signal. `weakestPrerequisite()` (`selection.mjs`) BFS-walks the prerequisite graph on demand (called from `/api/plan/today`, not from the attempt pipeline itself). | Partial. Analysis is per-attempt and shallow — there is no aggregate "diagnosis" step that looks across many attempts/topics at once (e.g. no equivalent of a full diagnostic test result, no cross-topic weakness report). It is also topic-scoped only: nothing aggregates toward a learner-level readiness signal. |
| **CANDIDATE ACTIONS** | Implicit, not materialized as a list. `adaptDifficulty()` returns a single `nextAction` enum (`PRACTICE`/`EASIER_QUESTION`/`HARDER_QUESTION`/`REVIEW_PREREQUISITE`) — one decision, not a scored set of alternatives. `selectQuestion()`/`selectTopic()` do generate and score multiple candidates (questions, topics) before picking one, which is the closest existing analog. | Partial — scored-candidate selection exists at the question/topic level, but not at the "what should happen next for this learner" level (e.g. there's no candidate set like {practice this topic, revise that topic, take a diagnostic, advance a lesson, rebuild a lesson}). |
| **ADAPTIVE DECISION** | `adaptDifficulty()` (difficulty step), `selectTopic()`+`buildDailyPlan()` (today's single primary action). Decisions are made independently per concern (difficulty, topic, revision) rather than through one unified decision step that also considers mastery-gate state (ready/not-ready) or lesson phase. | Partial. |
| **RECOMMENDATION** | `GET /api/plan/today` → `{primaryAction, topicId, reason, estimatedMinutes, items[]}`, surfaced on `/` as the "Next Best Action" card. | Present, but single-horizon (today only) and does not yet express the richer phase model (foundation vs. intermediate vs. subject-module progression) described in the target learning model. |
| **LEARNING ACTIVITY** | `/practice`, `/revision`, `/mistakes`, `/test` — all backed by `QuestionSession`/`TestSession`. | Present for practice/revision/mistake-review/weekly-test. Not present: a distinct "lesson" concept (rebuild lesson / advance lesson) — there is no lesson content model at all, only question practice. See `implementation-gap.md`. |
| **ASSESSMENT** | Every answered question is graded through the same `recordAttempt()` pipeline regardless of mode (PRACTICE/REVISION/TEST) — "test performance updates mastery and the revision schedule too." The weekly test (`/api/tests`) is the only standalone, multi-question assessment instrument; there is no single-topic "mastery check" assessment distinct from ordinary practice. | Partial — continuous assessment exists (every attempt is itself an assessment event), but there is no discrete "diagnostic test" or "mastery gate test" artifact separate from practice/weekly-test. |
| **OUTCOME** | `correct`/`score`/`perTopic` breakdown returned by `/api/attempts` and `/api/tests/:id/submit`. | Present at the attempt/test level. |
| **INTERVENTION EFFECTIVENESS** | Not implemented. `interventionFor(mistakeType)` (`mistakes.mjs`) returns a message/action to show immediately, but nothing measures whether that intervention changed subsequent performance (e.g. no before/after comparison, no A/B of intervention strategies, no feedback signal from "did showing this intervention actually help" back into the decision logic). | Absent. |
| **LEARNER STATE UPDATE** (loop-closing) | The only state update that exists is the one described above (accuracy/speed/mastery/difficulty/revision), which happens synchronously inside the same attempt that triggered ANALYSIS. There is no separate downstream update driven by INTERVENTION EFFECTIVENESS, because that stage doesn't exist yet. | Partial — the loop as built is really `EVENT → STATE UPDATE → (immediate) DECISION`, collapsed into one transaction, with no feedback arc from measured intervention effectiveness back into the model. |

## What the current engine actually is

A **tight, well-tested, single-pass adaptive loop at the question level**: one attempt in → graded, classified, scored, state updated, next difficulty/question chosen, all inside one DB transaction (`recordAttempt`). This is solid and should not be rebuilt (see "do not delete existing working functionality" in the task rules).

What it is **not yet**: a decision system with (a) a materialized, scored set of candidate next-actions beyond "next question/next topic," (b) a notion of learner *phase* (foundation vs. intermediate vs. subject-module vs. full adaptive) that the recommendation engine reasons about, or (c) any measurement of whether a given intervention/recommendation actually worked, which is the one loop-closing feedback arc the target architecture explicitly calls for ("Intervention Effectiveness → Learner State Update ↺").

## Mapping to the CORE LEARNING MODEL diagram (phase perspective)

| Target phase | Current equivalent | Gap |
|---|---|---|
| LEARNER | `learner`/`learner_profile` (single hard-coded learner) | No multi-learner identity; see `architecture-audit.md` §Authentication |
| BASIC FOUNDATION | `apt.foundation` chapter (whole-numbers, division, fractions, decimals) — content exists, 0 marks weight, prerequisite-only by design | Present as content; not wired to a distinct "foundation phase" gate |
| DEFAULT TEST | No diagnostic/placement test exists. The weekly test (`/api/tests`) is a recurring 25-Q test proportional to real exam weight, not a one-time placement/diagnostic instrument | Absent |
| TEST DIAGNOSIS | `classifyMistake()` + per-topic accuracy exist; no consolidated diagnosis report across a full test | Partial |
| WEAK AREAS / STRONG AREAS split | `selectTopic()`'s `weakness` term (1-accuracy) exists per-topic; no explicit weak/strong bucketing or routing step | Partial |
| REBUILD LESSON / ADVANCE LESSON | No lesson content model exists at all — only question banks with explanations/traps, no instructional "lesson" unit | Absent |
| PRACTICE | `/practice`, `QuestionSession` | Present |
| ASSESSMENT | Attempt-level grading via `recordAttempt` | Present (continuous), no discrete mastery-check instrument |
| MASTERY DECISION (ready/not ready) | `mastery_score` is computed and stored per topic, but nothing reads it to produce a binary ready/not-ready gate or routes the learner based on it | Partial (data exists, decision logic doesn't) |
| INTERMEDIATE | No phase concept exists | Absent |
| APTITUDE/TEST (entry to subject modules) | The existing aptitude+reasoning content *is* this phase, already fully built | Present, just not framed as a "gateway" phase |
| TNPSC SUBJECT MODULES (Polity, Current Affairs, Social Science, Language) | Only `gs.indian-polity` has topics defined (19, no questions). No Current Affairs chapter exists in the syllabus at all. Social Science is not a syllabus subject name used here — closest is the untranscribed GS chapters. Language (Tamil/English) chapters exist but are untranscribed, zero questions | Mostly absent — this is the single largest content/schema gap |
| CONTINUOUS TESTING | Weekly test + mistake bank already implement a form of this for aptitude/reasoning | Present for existing content, needs to extend to new modules |
| FULL ADAPTIVE ENGINE | The per-question adaptive loop (difficulty/selection/mastery/revision) is this engine's current ceiling | Present but scoped to single-topic granularity, not yet a cross-subject orchestration layer |

Full gap enumeration and sequencing recommendations are in `implementation-gap.md`.
