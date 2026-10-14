# Phase 10 Completion Report — Assessment Diagnostic Engine

## What was already there vs. what was genuinely missing

Checked against the brief's exact checklist before writing anything:

| Asked for | Already existed (Phase 3/4) | Status |
|---|---|---|
| overall performance | `summarizeByTopic().overall` | reused, unchanged |
| topic performance | `summarizeByTopic().topics` | reused, unchanged |
| difficulty performance | `topics[].difficultyBreakdown` | reused, unchanged |
| mistake patterns | `topics[].mistakeCounts` | reused, unchanged |
| prerequisite failures | `diagnosePrerequisiteGaps()`, `classifyTopics()`/`PREREQUISITE_BLOCKED` | reused, unchanged |
| confidence performance | `topics[].avgConfidence` (a number) | **no issue-level analysis existed** |
| time performance | `topics[].avgTimeTakenMs` (a number) | **no issue-level analysis existed** |
| retention failures | nothing — Phase 3's diagnostic never looked at `retention_score` at all | **entirely missing** |

So three of eight items were real gaps: confidence and time had raw numbers but no judgment about whether they were a *problem*, and retention wasn't considered at all. The requested output contract (`{strengths, weaknesses, prerequisiteGaps, speedIssues, confidenceIssues, retentionIssues}`) also didn't exist verbatim — Phase 3 has `weakTopics`/`strongTopics` (plain id arrays) and `prerequisiteGaps`, which cover two of the six keys in spirit but not in shape.

**`AssessmentAnalyzer`/`TopicAnalyzer`/`MistakeAnalyzer`/`PrerequisiteAnalyzer`** from the brief's module list are `summarizeByTopic()`, `summarizeByTopic()`'s `mistakeCounts`, and `diagnosePrerequisiteGaps()`/`classifyTopics()` respectively — already built, reused verbatim. `TimeAnalyzer` and `ConfidenceAnalyzer` are the genuinely new modules.

## What was implemented

**Four new pure functions**, appended to `src/domain/diagnostic.mjs` (its Phase 3/4 exports untouched):

- `analyzeSpeedIssues(results)` — **TimeAnalyzer**. Groups by topic, computes the average ratio of actual time taken to each question's own `estimatedSeconds`, flags a topic averaging ≥1.8× expected. Skipped questions (no time recorded) are excluded, not treated as instant.
- `analyzeConfidenceIssues(results)` — **ConfidenceAnalyzer**. Per topic, the rate of confident-and-wrong (`OVERCONFIDENT`, the dangerous one — she won't go back to check it) vs unsure-but-right (`UNDERCONFIDENT` — she knows more than she thinks), flagging whichever pattern clears 40% of that topic's attempts.
- `analyzeRetentionIssues(topics, retentionByTopic)` — reads `learner_topic_state.retention_score`, computed entirely by the existing, unchanged spaced-repetition pipeline (`revision.mjs` via `recordAttempt()`) — never recomputed here. Flags a topic whose tracked retention has fallen below 50%; a topic never scheduled for revision is skipped, not treated as a failure.
- `deriveStrengthsAndWeaknesses(topics)` — reshapes `summarizeByTopic()`'s existing weak/strong split (same thresholds, unchanged) into the richer objects the output contract names.

**Wiring** (`src/services/defaultAssessmentService.mjs`): `submitDefaultAssessment()` now also carries `estimatedSeconds` through each per-question result (one added field, needed for the time analysis), fetches retention scores for the assessed topics (`findRetentionForTopics()`, new, read-only), and assembles a `report` object on the stored diagnostic containing exactly the six requested keys — built from the same evidence as the existing `weakTopics`/`strongTopics`/`prerequisiteGaps`, not a second, divergent analysis pass. Nothing existing (`weakTopics`, `strongTopics`, `classifications`, `recommendations`, `learningPath`) was removed or changed shape.

## Verification performed

**Unit tests** (7 new, `tests/default-assessment.test.mjs`): speed issues fire for a topic averaging well over expected time and stay quiet for one on pace; skipped questions don't skew the speed read; confidence issues correctly distinguish `OVERCONFIDENT` from `UNDERCONFIDENT` and stay quiet when confidence and correctness mostly agree; retention issues fire only for a topic with a real tracked score below the floor, skipping one never scheduled; strengths/weaknesses match the documented thresholds. 108/108 total unit tests pass (101 existing + 7 new).

**DB-backed regression + new assertions** (extended `tests/default-assessment.smoke.mjs`, now 29 checks, all passing): the full prior Phase 3–9 scenario is unchanged and still green. Four new checks added against the real seeded, deliberately-wrong-fractions-and-percentage scenario already in place: the `report` object carries exactly the six requested keys as arrays; `fractions` appears in `report.weaknesses`; `fractions` is flagged `OVERCONFIDENT` in `report.confidenceIssues` (every forced-wrong answer there was submitted at confidence 5 — exactly the scenario the existing test already arranges, now also caught by the new analyzer); and `report.prerequisiteGaps` matches the top-level `prerequisiteGaps` exactly after a real round trip through the database (caught and fixed a test-writing mistake of my own here: a reference-equality check (`===`) would have silently passed before storage but failed after — JSON serialization through `jsonb` never preserves object identity between two arrays that originated as the same reference. Fixed to a value comparison before running it, not after watching it fail).

**Full regression**: `npm test` (108/108) → `npm run db:migrate` (no-op, no schema this phase) → `npm run test:assessment` (29/29) → `npm run test:session-pipeline`, `test:learning-plan`, `test:learner-state`, `test:domain`, `test:loop` (all unaffected) → `npm run validate:content` (unaffected) → `npm run build` (clean, no new routes — `report` rides inside the existing assessment response, same as Phase 9's `estimatedMinutes`).

## Known limitations

- **Thresholds are initial values**, same caveat as every prior phase's: `SPEED_ISSUE_RATIO = 1.8`, `CONFIDENCE_ISSUE_RATE = 0.4`, `LOW_RETENTION_THRESHOLD = 0.5` are reasonable starting points, not tuned against real learner data.
- **Retention issues can only ever be empty on someone's very first assessment.** `retention_score` only exists once a topic has an entry in `revision_schedule`, which `recordAttempt()` only creates on a topic's first-ever attempt — on a brand-new learner's first Default Assessment, every topic she's answering *right now* was likely untouched before, so nothing has a tracked retention score yet. This is correct behavior (there's genuinely no retention signal yet), not a bug, but worth noting so an empty `retentionIssues` array on a first assessment isn't mistaken for the analyzer not working.
- **`report` duplicates data already present at the top level** (`prerequisiteGaps`, and `strengths`/`weaknesses` vs. `weakTopics`/`strongTopics` in a different shape). This was a deliberate choice to satisfy the literal requested output contract without removing or reshaping the existing, tested fields other code (and the Phase 3/4/5 smoke tests) already reads. A future phase could consolidate these into one shape if nothing needs the older one anymore.

## Algorithm/version changes

No existing function was modified. `summarizeByTopic()`, `diagnosePrerequisiteGaps()`, `classifyTopics()`, `buildTopicRecommendations()`, `buildLearningPath()` (Phases 3–5) are all byte-for-byte unchanged and directly reused. Four new pure functions added to `diagnostic.mjs`; one new read-only repository query. No schema change, no new routes.

## Stop

Per the agent procedure, this is where Phase 10 stops. Waiting for approval before the next phase.
