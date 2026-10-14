# Gap Analysis

Synthesizes `architecture.md`, `database.md`, `api.md`, `content.md`, `adaptive-system.md`, and `existing-functionality.md` against two target shapes:

1. The **CORE LEARNING MODEL** phase diagram (Learner → Basic Foundation → Default Test → Test Diagnosis → Weak/Strong Areas → Rebuild/Advance Lesson → Practice → Assessment → Mastery Decision → Not Ready/Ready → Intermediate → Aptitude/Test → TNPSC Subject Modules → Continuous Testing → Full Adaptive Engine).
2. The **continuous learning-decision loop** (Content → Learner Interaction → Event → Learner State Update → Analysis → Candidate Actions → Adaptive Decision → Recommendation → Learning Activity → Assessment → Outcome → Intervention Effectiveness → Learner State Update ↺).

**Rule observed throughout: nothing existing is proposed for deletion or rewrite.** Every gap below is additive on top of the current, verified-working slice (see `existing-functionality.md`: 50/50 unit tests, full DB-backed smoke test, clean build, live UI all pass).

## This is what currently exists

A working, tested, single-learner TNPSC prep app: Next.js App Router backend/frontend, Postgres schema covering learner state/attempts/mastery/revision/tests/AI-hint-cache, a pure-function adaptive engine (difficulty stepping, mastery scoring, mistake classification, spaced repetition, question/topic selection, test generation), 322 questions (137 real PYQ-tagged, 2013–2024) across 20 aptitude+reasoning topics, and four client pages (practice/revision/mistakes/test) that are thin renderers over a fully server-side decision pipeline. No auth, by design. Confirmed running end-to-end in this audit.

## This is what is reusable

- `src/domain/*.mjs` in its entirety — pure, tested, framework-free. The template for any new decision logic (candidate-set generation, phase gating) should extend this pattern, not replace it.
- `src/lib/attempts.mjs`'s `recordAttempt()` as the single grading entry point — any new learning activity (a lesson check, a diagnostic test) should call into this, not duplicate it.
- The content pipeline (`content/` → validate → seed) — already generalized across subjects/chapters/topics; adding GS/Language content requires no pipeline changes, only authoring.
- `selection.mjs`'s `examWeight()`/`selectTopic()` — already subject-agnostic; will drive cross-subject orchestration the moment more than one subject has content.
- The entire DB schema's per-learner keying (`learner_id` FK everywhere) — multi-tenant-ready at the schema level already.

## This is what must be added

### Against the CORE LEARNING MODEL phases

| Phase | Gap | Severity |
|---|---|---|
| **DEFAULT TEST** (one-time placement/diagnostic) | Does not exist. Only the recurring weekly test exists, generated proportional to exam weight — not a one-time foundation/placement diagnostic. | New capability |
| **TEST DIAGNOSIS** (consolidated weak/strong read-out) | No consolidated cross-topic diagnosis step exists; only per-topic accuracy and per-attempt mistake classification. | New capability |
| **REBUILD LESSON / ADVANCE LESSON** | No lesson content model exists anywhere — only question banks. Largest structural gap: the model assumes a routable "lesson" unit distinct from a question, and nothing like it exists. | New content type + schema |
| **MASTERY DECISION → READY/NOT READY gate** | `mastery_score` is computed and persisted per topic but nothing reads it to produce a binary gate. Data exists; decision logic does not. | New decision logic only |
| **INTERMEDIATE phase** | No phase/level concept exists anywhere in schema or domain code. | New concept |
| **APTITUDE/TEST as gateway phase** | Functionally already built (the current system *is* this phase); just not framed/gated as a prerequisite to subject modules. | Reframing only |
| **TNPSC SUBJECT MODULES (Polity, Current Affairs, Social Science, Language)** | Largest content gap. `gs.indian-polity` has 19 topics defined, zero questions. No "Current Affairs" chapter exists in the syllabus at all. "Social Science" isn't a named subject — closest match is the untranscribed GS chapters. Tamil/English exist (100 marks each) but fully untranscribed, zero questions. 175/200 syllabus marks have no question content; most have no topic breakdown either. | Content authoring + syllabus transcription — largest effort item |
| **CONTINUOUS TESTING** | Already implemented (weekly test + mistake bank); extends to new modules with no new architecture once they have content. | Extend existing |
| **FULL ADAPTIVE ENGINE** | Current engine is complete per-topic but has no cross-subject orchestration. `selectTopic()`/`examWeight()` already generalize — mostly content-gated, not logic-gated. | Mostly content-gated |

### Against the continuous decision-loop principle

(Full stage mapping in `adaptive-system.md`.)

- **ANALYSIS** is per-attempt and topic-scoped only — no learner-level or cross-topic analysis exists. Needed for TEST DIAGNOSIS and cross-subject orchestration.
- **CANDIDATE ACTIONS** are not materialized as a scored set at the "what next" level. The pattern to generalize (`selectQuestion()`/`selectTopic()`) already exists at a lower granularity — it needs lifting to the plan/phase level.
- **INTERVENTION EFFECTIVENESS is entirely absent.** `interventionFor(mistakeType)` fires a message but nothing measures whether it changed subsequent performance. This is the one explicit feedback arc named in the target loop with zero implementation today. Closing it needs: (a) recording which intervention was shown on a given attempt (not currently stored — `question_attempt.mistake_type` records the diagnosis, not which intervention text was shown), (b) a later read comparing pre/post performance for that learner+topic+mistake-type.
- **`learning_event` is write-only.** If EVENT is meant to feed ANALYSIS, this needs to become a read source too — or ANALYSIS can keep deriving entirely from `question_attempt`/`learner_topic_state`, which is also defensible. Needs a decision, not an assumption.

## Smaller structural notes

- **`question.source_year`** column is unused; 137 questions carry `source: tnpsc-<year>` with the year embedded in the string only. Low severity, worth a one-line backfill on seed for queryability.
- **No lesson/instructional-content schema.** Any REBUILD/ADVANCE LESSON phase needs a new content type (e.g. `lesson`, keyed by topic, with its own authoring/validation pipeline mirroring `content/questions/`) — the one piece of new schema the phase diagram implies that nothing currently approximates.
- **Single hard-coded `LEARNER_ID`.** Deliberate and fine for "one learner." If phase-routing work ever implies testing with a second profile, this constant is the one seam every route shares.

## Exit-condition statement

*This is what currently exists*: a tested, working, single-learner adaptive practice loop covering 25 of 200 exam marks (aptitude + reasoning), with a solid pure-function domain layer, idempotent grading, spaced repetition, mastery scoring, and a weekly test — all verified running end-to-end in this audit, zero failures.

*This is what is reusable*: all of `src/domain/*`, `recordAttempt()`, the content pipeline, and the schema's per-learner keying — none of it needs to be rewritten to build the target phase model on top.

*This is what must be added*: a lesson content model, a mastery-gate decision layer on top of already-computed mastery scores, a one-time diagnostic/placement test distinct from the weekly test, a materialized candidate-actions/recommendation layer above the existing question/topic selectors, an intervention-effectiveness feedback loop, and — by far the largest item — authored content and syllabus transcription for General Studies (Polity fully, Current Affairs not yet modeled at all, other GS chapters), Social Science, and both language papers, which together make up 175 of the exam's 200 marks.
