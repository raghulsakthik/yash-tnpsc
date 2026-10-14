# API

Phase 1 audit. Every route under `src/app/api/**` (confirmed by both static reading and live exercise through the browser — see `existing-functionality.md`). All routes `export const dynamic = 'force-dynamic'` and return `NextResponse.json(...)`; error responses are always `{code, message}` JSON, never a raw throw.

| Method & Path | File | Purpose | Key domain/lib calls | Request body/query | Success response shape | Error codes |
|---|---|---|---|---|---|---|
| `POST /api/ai/hint` | `src/app/api/ai/hint/route.js` | Cached on-demand AI explanation | `buildHintContext`/`buildHintPrompt` (`domain/ai/context.mjs`), `generateHint` (`lib/ai/provider.mjs`) | `{questionId, selectedIndex?, mistakeType?}` | `{available:true, text, cached}` or `{available:false}` | never non-200 |
| `POST /api/attempts` | `src/app/api/attempts/route.js` | Grade one answer, update learner model | `recordAttempt` (`lib/attempts.mjs`), `recordEvent` | `{attemptId, questionId, selectedIndex, timeTakenMs, confidence?, mode?}` | `{correct, correctIndex, explanation, trap, mistakeType, intervention, performance, state{...}, nextAction, reason}` | 400 `BAD_JSON`/`MISSING_FIELDS`; 404 `QUESTION_NOT_FOUND`; 500 `ATTEMPT_FAILED` |
| `GET /api/mistakes/next` | `src/app/api/mistakes/next/route.js` | Most recent still-open wrong attempt | `difficultyBand` | — | `{questionId, topicId, topicName, prompt, options, estimatedSeconds, difficulty}` | 404 `NO_MISTAKES` |
| `GET /api/plan/today` | `src/app/api/plan/today/route.js` | "Next Best Action" daily plan | `examWeight`, `selectTopic`, `weakestPrerequisite` (`domain/selection.mjs`), `buildDailyPlan` (`domain/planner.mjs`) | — | `{primaryAction, topicId, reason, estimatedMinutes, revisionDue, items[]}` | 500 `PLAN_FAILED` |
| `GET /api/questions/next` | `src/app/api/questions/next/route.js` | Next practice question for a topic | `selectQuestion`, `difficultyBand` | `?topic=<topicId>` (default `aptitude.fractions`) | `{questionId, topicId, prompt, options, estimatedSeconds, difficulty, targetDifficulty, attemptCount}` (answer index withheld) | 404 `NO_QUESTIONS` |
| `GET /api/revision/next` | `src/app/api/revision/next/route.js` | Next due spaced-repetition question | `selectQuestion`, `difficultyBand` | — | `{questionId, topicId, topicName, prompt, options, estimatedSeconds, difficulty, targetDifficulty}` | 404 `NOTHING_DUE`/`NO_QUESTIONS` |
| `POST /api/tests` | `src/app/api/tests/route.js` | Generate 25-question weekly test | `allocateSlots`, `pickTopicQuestions` (`domain/testGen.mjs`) | — | `{testId, questions:[{questionId, topicId, topicName, prompt, options, difficulty, estimatedSeconds}]}` | 404 `NO_CONTENT` |
| `GET /api/tests/:id` | `src/app/api/tests/[id]/route.js` | Full test state for resume | `difficultyBand` | path `id` | `{testId, status, questionCount, score, questions:[...]}`; answer keys only if `status==='COMPLETED'` | 404 `TEST_NOT_FOUND` |
| `POST /api/tests/:id/answers` | `src/app/api/tests/[id]/answers/route.js` | Upsert one in-progress answer | — (raw SQL upsert) | `{questionId, selectedIndex?, timeTakenMs?, markedForReview?}` | `{saved:true}` | 400, 404, 409 `TEST_COMPLETED` |
| `POST /api/tests/:id/submit` | `src/app/api/tests/[id]/submit/route.js` | Finalize test, grade all answers | `recordAttempt` (mode `'TEST'`), `recordEvent` | path `id` | `{testId, score, correctCount, questionCount, perTopic:[...], review:[...]}` | 404, 409, 500 |

## Live verification (this audit)

Exercised via the Browser pane against the dev server (`npm run dev`) with a fully migrated/seeded local database:

- `GET /api/plan/today` → 200, real payload (`{"primaryAction":"PRACTICE","topicId":"aptitude.simplification","reason":"Simplification has not been started yet","estimatedMinutes":15,"revisionDue":0,...}`).
- `GET /api/questions/next?topic=aptitude.simplification` (via `/practice`) → rendered a real question with 4 options.
- `POST /api/attempts` → 200, graded correctly, advanced to question 2 of 10 with explanation shown.
- `POST /api/tests` (via `/test`) → 200, generated a real 25-question palette.

No runtime errors observed in server logs or browser console during any of the above (see `existing-functionality.md` for full test-run log).

## Identity resolution

Every route that touches per-learner data imports the same hard-coded `LEARNER_ID` constant from `src/lib/db.mjs` — none resolve identity from a request header, cookie, or token. See `architecture.md` §Authentication.
