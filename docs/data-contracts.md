# Data contracts

The principle, stated plainly: **the frontend never computes mastery,
difficulty, revision dates, the next topic, or question selection.** Every
number and every state it renders came from a backend response. What the
frontend is allowed to do with a response is format it (round a fraction to
a percentage, turn an enum into a label, pick a CSS class for an enum) —
never decide it. Phase 7 audited every connected screen against this and
fixed the two places it had drifted (documented below, under "Known
violations, fixed").

This file documents the shapes as they're actually implemented — it is not
a new validation layer (no TypeScript, no zod, nothing enforces this at
runtime beyond the route handlers themselves being the source of truth).
Treat it as the reference to update alongside the route when a shape
changes, not as a separate spec that can drift from the code.

## Topic state — the recurring shape

Any endpoint describing a topic's standing (`/api/learn/overview`,
`/api/revision/due`, `/api/home/overview`'s `dueItems`) uses the same core
fields, computed as follows:

```jsonc
{
  "topicId": "aptitude.hcf",
  "name": "Highest Common Factor",          // from topic.name
  "masteryScore": 0.718,                     // learner_topic_state.mastery_score — src/domain/mastery.mjs masteryScore()
  "state": "NEAR_MASTERY",                   // src/domain/mastery.mjs masteryState(masteryScore, attemptCount, bankQuestionCount)
  "revisionDue": false,                      // topic_id present in revision_schedule where scheduled_at <= now()
  "recommendedAction": { "type": "PRACTICE", "label": "Continue" }
  // src/domain/recommendedAction.mjs — derived from learner_topic_state.next_action
  // (itself written by adaptDifficulty(), src/domain/difficulty.mjs), overridden to
  // {type: "REVISION", label: "Review"} whenever revisionDue is true.
}
```

`state` enum (`src/domain/mastery.mjs`, `TopicState`), in priority order:
| state | condition |
|---|---|
| `NO_CONTENT` | zero `PUBLISHED` questions exist for the topic |
| `NOT_STARTED` | content exists, `attemptCount === 0` |
| `LEARNING` | `masteryScore < 0.35` |
| `PRACTISING` | `0.35 <= masteryScore < 0.65` |
| `NEAR_MASTERY` | `0.65 <= masteryScore < 0.85` |
| `MASTERED` | `masteryScore >= 0.85` |

No `RETAINED`/`IMPROVING` tier exists — both would need a mastery delta over
time, which nothing stores (see Home's mastery stat tile, which shows a
plain average rather than a fabricated "+9%", for the same reason).

`recommendedAction.type` is one of `PRACTICE` | `REVISION` |
`REVIEW_PREREQUISITE`. This is a *different* concept from the attempt
pipeline's own `nextAction` below — this one answers "what should a topic
card's button say," that one answers "what difficulty should the next
question be." They are never the same field and are never conflated in a
response.

## `POST /api/attempts` (and the weekly test's submit, same pipeline)

`src/lib/attempts.mjs: recordAttempt()`:

```jsonc
{
  "correct": true,
  "correctIndex": 2,
  "explanation": "...",
  "trap": null,                              // only set when correct === false
  "mistakeType": null,                       // CARELESS | CONCEPTUAL | GUESS | TIME_PRESSURE | OVERCONFIDENT | UNKNOWN | null
  "intervention": null,                      // {action, message} from src/domain/mistakes.mjs interventionFor()
  "state": {                                 // the six raw mastery dimensions, 0..1, plus the blend
    "accuracy": 0.54, "speed": 1.0, "difficulty": 0.1, "attemptCount": 10,
    "mastery": 0.467, "concept": 0.57, "consistency": 0.02,
    "confidence": 0, "retention": 0
  },
  "nextAction": "PRACTICE",                  // PRACTICE | EASIER_QUESTION | HARDER_QUESTION | REVIEW_PREREQUISITE — adaptDifficulty()'s own field, about the *next question's* difficulty
  "reason": "accuracy 54% is in the working range"
}
```

The frontend's only arithmetic on this object is `Math.round(x * 100)` for
display (`QuestionSession.js`'s mastery breakdown) — never a threshold
decision.

## `GET /api/mistakes/open`

```jsonc
{
  "items": [{
    "questionId": "...", "topicId": "...", "topicName": "...", "prompt": "...",
    "mistakeType": "CARELESS",                // same enum as above, from question_attempt.mistake_type
    "createdAt": "2026-10-15T...",
    "nextReview": "2026-10-16T...",           // revision_schedule.scheduled_at for that topic, or null
    "weakestPrerequisite": { "topicId": "aptitude.fractions", "topicName": "Fractions" } // or null
  }]
}
```

`mistakeType` is relabeled for display by a static map
(`MISTAKE_LABEL` in `mistakes/page.js`) — a label lookup, not a
classification decision; the classification itself happens once, server
side, in `classifyMistake()` (`src/domain/mistakes.mjs`).

## `GET /api/quick-lab/result/:id`

```jsonc
{
  "sessionId": "...", "mode": "percentage-rush", "modeName": "Percentage Rush",
  "status": "COMPLETED", "questionCount": 10, "correctCount": 6,
  "accuracyPct": 60, "bestCombo": 3, "avgSeconds": 11.6, "xp": 60
}
```

All six numeric fields are computed once in `quick_lab_session` by
`POST /api/quick-lab/attempt` (same `recordAttempt()` pipeline as Practice,
mode `QUICK_LAB`) — the result page only formats them.

## Known violations, fixed in Phase 7

Two places on the frontend invented a state the backend never asserted,
found by grepping every `badge-*` class assignment outside `_data/mock.js`:

1. `revision/page.js` picked each due item's badge by `i === 0` (array
   position) — items after the first were labeled `badge-mastered`
   regardless of their real mastery. Replaced with the real `state` field
   above, via a static `STATE_BADGE_CLASS` label map (same pattern as
   `MISTAKE_LABEL` — an enum→class lookup, not a decision).
2. `QuestionSession.js`'s difficulty tag and `tests/page.js`'s score chip
   both reused `badge-mastered` unconditionally (a Hard question or an 8%
   test score rendered with the "you've mastered this" green). Given their
   own neutral `badge-difficulty` class instead — difficulty and a raw test
   score are not mastery claims and shouldn't borrow its styling.
