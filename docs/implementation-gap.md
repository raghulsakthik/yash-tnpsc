# Implementation Gap Analysis

Synthesizes `architecture-audit.md`, `database-audit.md`, `content-audit.md`, and `adaptive-audit.md` against two target shapes given for this work:

1. The **CORE LEARNING MODEL** phase diagram (Learner → Basic Foundation → Default Test → Test Diagnosis → Weak/Strong Areas → Rebuild/Advance Lesson → Practice → Assessment → Mastery Decision → Not Ready/Ready → Intermediate → Aptitude/Test → TNPSC Subject Modules → Continuous Testing → Full Adaptive Engine).
2. The **continuous learning-decision loop** (Content → Learner Interaction → Event → Learner State Update → Analysis → Candidate Actions → Adaptive Decision → Recommendation → Learning Activity → Assessment → Outcome → Intervention Effectiveness → Learner State Update ↺) — the architectural principle that the backend is a decision system, not a content delivery system.

**Rule observed throughout: nothing existing is proposed for deletion.** Every gap below is additive on top of the current slice.

## 1. What already exists and is solid (keep, extend, don't rebuild)

- The per-question adaptive loop: `recordAttempt()` (`src/lib/attempts.mjs`) — idempotent grading, recency-weighted accuracy/speed, 6-dimension mastery, difficulty stepping, mistake classification, spaced repetition. 50 unit tests + a real-DB smoke test cover it (`tests/engine.test.mjs`, `tests/loop.smoke.mjs`).
- Scored candidate selection for questions and topics (`selection.mjs`) — this is the one place a genuine "candidate actions, scored" pattern already exists and can be the template for a higher-level recommendation engine.
- Content pipeline: versioned YAML → validated → seeded, idempotent, DB disposable. 322 questions, 137 of them real PYQ-tagged (2013–2024), across all 10 aptitude + 6 reasoning topics.
- Weekly test + mistake bank, both running through the same grading pipeline as practice.
- AI hint integration that is strictly additive/non-blocking.

## 2. Gaps against the CORE LEARNING MODEL phase diagram

| Phase | Gap | Severity |
|---|---|---|
| **DEFAULT TEST** (one-time placement/diagnostic before any lesson) | Does not exist. The only multi-question instrument is the recurring weekly test, generated proportional to exam weight — not a one-time foundation/placement diagnostic. | New capability needed |
| **TEST DIAGNOSIS** (consolidated weak/strong read-out from that test) | No consolidated cross-topic diagnosis step exists. Per-topic accuracy and `classifyMistake()` exist but nothing aggregates a test's results into a weak-areas/strong-areas verdict. | New capability needed |
| **REBUILD LESSON / ADVANCE LESSON** | No lesson content model exists anywhere in the schema or content tree — only question banks (prompt/options/explanation/trap), no instructional unit distinct from a question. This is the single largest structural gap: the target model assumes a "lesson" the learner can be routed into, and nothing like it currently exists to rebuild or advance. | New content type + schema needed |
| **MASTERY DECISION → NOT READY / READY gate** | `mastery_score` is computed and persisted per topic (`learner_topic_state.mastery_score`), but no code reads it to produce a binary gate or routing decision. The data exists; the decision logic on top of it does not. | New decision logic, no new schema |
| **INTERMEDIATE phase** | No phase/level concept exists anywhere — not in the schema, not in any domain module. The system currently treats all topics uniformly once content exists for them. | New concept |
| **APTITUDE/TEST as a gateway phase** | Functionally this already exists — the entire current build *is* the aptitude+reasoning phase — it's just not framed/gated as a phase a learner passes through before subject modules unlock. | Reframing, not new code |
| **TNPSC SUBJECT MODULES (Polity, Current Affairs, Social Science, Language)** | Largest content gap. `gs.indian-polity` has 19 topics defined in the syllabus but zero questions. No "Current Affairs" chapter exists in the syllabus at all (the actual TNPSC paper structure would need to be checked against this — the current syllabus file has no such subject). "Social Science" isn't a named subject either — closest match is the untranscribed GS chapters (general-science, geography-india, history-culture, economy, tn-history). Tamil and English language chapters exist (100 marks each) but are fully untranscribed with zero questions. In short: 175 of 200 syllabus marks (GS 75 + English 100, Tamil as the alternate) have no question content, and most have no topic breakdown yet either. | Content authoring + syllabus transcription, largest effort item |
| **CONTINUOUS TESTING** | Already implemented for existing content (weekly test, mistake bank); needs to extend to new subject modules once they have content, no new architecture needed. | Extend existing |
| **FULL ADAPTIVE ENGINE** | Current engine is a complete per-topic adaptive loop but has no cross-subject orchestration (e.g. balancing a learner's time across Polity vs. Aptitude vs. Language based on relative weakness and exam weight across all subjects, not just within aptitude). `selectTopic()`/`examWeight()` already generalize to any chapter/topic in the DB — the logic isn't aptitude-specific, it's just that only aptitude+reasoning have content to exercise it. | Mostly content-gated, not logic-gated |

## 3. Gaps against the continuous decision-loop principle

(Full stage-by-stage mapping is in `adaptive-audit.md`; summarized here as action items.)

- **ANALYSIS is per-attempt and topic-scoped only.** There is no learner-level or cross-topic analysis step. Needed for TEST DIAGNOSIS and for any cross-subject orchestration.
- **CANDIDATE ACTIONS are not materialized as a scored set at the "what next" level.** `adaptDifficulty()` returns one action; `buildDailyPlan()` returns one primary action. Neither builds and scores a set of alternatives like {practice topic X, revise topic Y, attempt diagnostic, advance lesson, rebuild lesson}. The pattern to generalize already exists in `selectQuestion()`/`selectTopic()` — it just isn't lifted to the plan/phase level yet.
- **INTERVENTION EFFECTIVENESS is entirely absent.** `interventionFor(mistakeType)` fires a message but nothing measures whether showing it changed the learner's subsequent accuracy/speed/retention on that mistake type. This is the one explicit feedback arc named in the target loop that has zero implementation today. Closing it needs: (a) tagging which intervention was shown on a given attempt (not currently stored — `question_attempt.mistake_type` records the diagnosis, not which intervention text was shown), (b) a later read that compares pre/post performance for that learner+topic+mistake-type.
- **`learning_event` is write-only.** It's explicitly documented as "analytics-only, never read by the learning engine." If EVENT is meant to feed ANALYSIS in the target loop, this needs to become a read source too (or ANALYSIS needs to keep deriving entirely from `question_attempt`/`learner_topic_state`, which is also a defensible reading of the current design — worth a decision, not an assumption).

## 4. Smaller structural notes worth resolving before building on top

- **No authentication / single hard-coded `LEARNER_ID`.** Deliberate, documented, fine for "built for one learner." If subject-module and phase-routing work introduces anything that implies multiple learners (e.g. testing with a second profile), this constant is the one seam every route shares — see `architecture-audit.md` §Authentication.
- **PYQ content already exists but `question.source_year` column is unused.** 137 questions carry `source: tnpsc-2018` etc. (year embedded in the string); the dedicated `source_year INT` column from `V1__init.sql` is never populated by `seed.mjs`. The README's "no PYQ-tagged content" line is stale and should be corrected, or `source_year` should be back-filled from the `source` string on seed for queryability. Low severity, but a real-but-minor inconsistency to flag.
- **No lesson/instructional-content schema.** Any REBUILD LESSON / ADVANCE LESSON phase needs a new content type and likely new tables (e.g. `lesson`, keyed by topic, with its own authoring/validation pipeline mirroring `content/questions/`). This is the one piece of new schema explicitly implied by the phase diagram that nothing in the current system approximates.

## 5. Suggested sequencing (informational — not a decision, awaiting direction)

Given the content gap is the largest blocker (175/200 marks with no questions, most without topic breakdown) and the decision-loop gaps are logic-only, a natural order would be: (1) decide and model the lesson concept + mastery-gate decision logic on existing aptitude content first, where question coverage is already complete — this lets REBUILD/ADVANCE LESSON, MASTERY DECISION, and INTERMEDIATE be built and tested against real data immediately; (2) transcribe GS/Language syllabus topics and author content in parallel; (3) extend the already-generalized `selectTopic()`/`examWeight()` orchestration across subjects once more than one subject has content. This is offered for awareness only — no code changes have been made as part of this audit.
