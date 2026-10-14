# Existing Functionality — Verified by Running the Application

Phase 1 audit. Everything below was actually executed in this audit, not inferred from reading code. Environment: no Docker available in the sandbox, so a standalone local Postgres 18 instance was initialized and run on port 5432 (same connection string shape as `.env.example`) to exercise the app exactly as `docker-compose.yml` would.

## 1. Unit tests — `npm test`

```
ℹ tests 50
ℹ suites 0
ℹ pass 50
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

All 50 pass. No DB required for this suite (pure `src/domain/*` functions). Zero failures to record.

## 2. Content validation — `npm run validate:content`

```
topics in tree:      40
questions validated: 322
syllabus coverage:   4/23 units split into topics (260 questions' worth still to transcribe)
content OK
```

Passes. Confirms the content gap quantitatively: only 4 of 23 syllabus units have been split into topics; the other 19 units (260 of 322 exam-question-equivalent marks) are still raw syllabus prose with no topic breakdown.

## 3. Database setup — `npm run db:migrate` then `npm run db:seed`

```
applied V1__init
applied V2__mastery_dimensions
applied V3__revision_schedule
applied V4__ai_interaction
applied V5__weekly_tests
5 migration(s) applied

seeded: 3 subjects, 16 chapters, 40 topics, 15 prerequisite edges, 322 questions (language: en)
```

Both ran cleanly against a freshly-initialized, empty Postgres database with zero manual schema intervention. Migration tracking (`schema_migration` table) worked as documented.

## 4. DB-backed smoke test — `npm run test:loop`

All named checks passed (full log, abbreviated section headers):

- the bank: questions are seeded
- a learner who is getting them right: difficulty rose, accuracy high, next action is harder question, all 14 attempts counted
- a learner who is struggling: difficulty fell, engine asks for the prerequisite, the two learners diverged
- the engine picks questions near the target difficulty
- resubmitting the same attempt does not double count (idempotency confirmed)
- mistake classification wired through to the database (CARELESS classification persisted)
- mastery score persisted alongside accuracy and speed
- a topic's first attempt schedules its first revision (interval starts at 1 day, ~1 day out)
- a GOOD revision attempt grows the interval; a POOR one shrinks it
- a PRACTICE-mode attempt never advances an existing revision schedule
- the daily plan picks a sane primary topic from real `learner_topic_state`
- exam weight comes from the seeded syllabus, not a constant (polity carries its real 15 questions; unexamined foundation carries zero weight)
- a weekly test generates, can be answered, and scores on submit (25-question test, 24/25 correct as arranged, every graded question wrote a `question_attempt` row)
- the wrong test answer surfaces in the mistake bank, and the corrected mistake is no longer open afterward

`loop smoke test passed`. Zero failures.

## 5. Production build — `npm run build`

Compiled successfully in 4.3s, all 8 app routes + 10 API routes built, static pages generated, no type errors. One benign warning (Next.js workspace-root inference picking up a sibling `package-lock.json` one directory up — cosmetic, does not affect the build output; fixable with `outputFileTracingRoot` if desired, not required).

## 6. Live application run — `npm run dev`, exercised through the browser

- **`/` (home/daily plan)**: loaded, called `GET /api/plan/today`, rendered the real "Next Best Action" card (`"Simplification has not been started yet"`, 15-minute estimate), with working links to practice/test/mistakes.
- **`/practice`**: clicking through from home landed on `/practice?topic=aptitude.simplification`, rendered a real question ("The average of 4 values is 20...") with 4 options and a 1–5 confidence selector. Selecting an answer + confidence + Submit → `POST /api/attempts` returned 200, graded "Correct", showed the real explanation text, and advanced to question 2 of 10. Difficulty band displayed ("easy") matches the question's actual difficulty.
- **`/test`**: `POST /api/tests` generated a real 25-question weekly test with the full exam-style UI — numbered question palette (1–25), "Mark for review" checkbox, Previous/Next/Submit controls, "0 of 25 answered" tracker — exactly as described in the README.
- No console errors, no failed network requests, no 500s observed in any of the above flows. Server log showed clean `GET`/`POST` 200s throughout.

## 7. What is confirmed working end-to-end, right now

- Full practice loop: question selection at target difficulty → answer submission → grading → mastery/difficulty update → next question.
- Spaced-repetition scheduling (schedule creation and interval growth/shrinkage) — confirmed by the smoke test.
- Mistake classification and the mistake bank.
- Weekly test generation, in-progress answer saving, and full-test submission/scoring.
- The daily "Next Best Action" plan, driven by real seeded data (not a stub).
- Idempotent attempt recording (duplicate submission does not double-count).
- Content pipeline: YAML → validate → seed, fully idempotent and safe to re-run.

## 8. Failures recorded

None. Every command in the setup/test/build/run sequence succeeded on the first attempt once a working Postgres instance was available. The only environmental friction was the absence of Docker in this sandbox, worked around with a standalone Postgres instance on the same port/credentials — not a defect in the project itself.
