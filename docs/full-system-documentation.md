# NOVA — Complete system documentation

A single reference for the whole system as it stands after Phases 1–8:
what the backend is, what the frontend is, the full API/database surface,
and the implementation history that got it here. The two companion docs —
[frontend-backend-inventory.md](frontend-backend-inventory.md) (the original
Phase 1 audit) and [data-contracts.md](data-contracts.md) (the Phase 7
response-shape reference) — go deeper on their specific topics; this one
ties everything together.

---

## 1. What NOVA is

A private, single-learner adaptive practice system for the TNPSC Combined
Civil Services (Preliminary) Examination, Code 495. One learner, one
Next.js app, one Postgres database. The backend decides everything that
matters (mastery, difficulty, revision timing, question selection, topic
recommendation); the frontend renders what it's given and posts answers.

Two frontends exist in this codebase side by side:

| | Path | Status |
|---|---|---|
| **The plain app** | `src/app/page.js`, `practice/`, `revision/`, `mistakes/`, `test/` | The original slice-1 UI. Frozen as a reference since Phase 2 — not touched by any later phase. |
| **The real design** (proto) | `src/app/proto/**` | Built from the NOVA design brief (26 screens, originally mock-data-only), now connected to the real backend across Phases 2–8. This is the one described below. |

---

## 2. Backend architecture

```
src/
  domain/     pure functions — no I/O, no framework, no database calls
  lib/        the few things that do I/O: db.mjs, attempts.mjs, auth.mjs, session.mjs, ai/provider.mjs
  app/api/    Next.js route handlers — thin, call domain + lib, talk to Postgres directly
```

### 2.1 `src/domain/` — the rules, all pure and unit-tested

| File | Responsibility |
|---|---|
| `accuracy.mjs` | Recency-weighted accuracy, speed score, `clamp01` |
| `difficulty.mjs` | `adaptDifficulty()` (the adaptation rules), `difficultyBand()` (display only), `applyDifficultyBias()` (Profile's gentle/normal/hard preference) |
| `selection.mjs` | `selectQuestion()`, `selectTopic()`, `weakestPrerequisite()`, `examWeight()` — question and topic ranking |
| `mastery.mjs` | The six mastery dimensions, `masteryScore()`, `masteryState()` (the display-tier enum: NO_CONTENT/NOT_STARTED/LEARNING/PRACTISING/NEAR_MASTERY/MASTERED) |
| `mistakes.mjs` | `classifyMistake()` (CARELESS/CONCEPTUAL/GUESS/TIME_PRESSURE/OVERCONFIDENT/UNKNOWN), `interventionFor()` |
| `revision.mjs` | Spaced-repetition: `recallPerformance()`, `nextInterval()`, `isDue()`, `retentionValue()` |
| `planner.mjs` | `buildDailyPlan()` — Home's "Next Best Action" |
| `testGen.mjs` | `allocateSlots()`, `pickTopicQuestions()` — weekly test generation |
| `quickLab.mjs` | `QUICK_LAB_MODES`, `nextCombo()` |
| `streak.mjs` | `computeStreak()` — current/longest learning streak from attempt dates |
| `milestones.mjs` | `MILESTONE_DEFINITIONS` — each with a pure `isEarned()`/`progress()` over aggregates |
| `recommendedAction.mjs` | `recommendedAction()` — topic-card action label, derived from the stored `next_action` column |
| `ai/context.mjs` | Prompt context + hint prompt construction for the AI tutor |

### 2.2 `src/lib/` — the I/O boundary

- `db.mjs` — the one `pg.Pool`, `query()`, `LEARNER_ID` (the single hardcoded learner constant every route imports), `recordEvent()`.
- `attempts.mjs` — `recordAttempt()`, the **shared grading pipeline**. Every answer — Practice, Revision, a weekly test question, a PYQ, a Quick Lab round — goes through this one function. It updates accuracy/speed, all six mastery dimensions, difficulty (`adaptDifficulty`), and the revision schedule (only when `mode === 'REVISION'`).
- `auth.mjs` / `session.mjs` — password hashing (Node-only, `scrypt`) and session token sign/verify (Edge-safe, Web Crypto `crypto.subtle`), split across two files specifically so `src/middleware.js` (which runs in the Edge runtime) never pulls in `node:crypto`.
- `ai/provider.mjs` — the one file that would change for a different AI provider.

### 2.3 Database schema (10 migrations, `db/migrations/V1`–`V10`)

| Table | Added in | Purpose |
|---|---|---|
| `learner` | V1 | The one learner row. `password_hash` added in V7. |
| `learner_profile` | V1 | `exam`, `language`, `daily_goal_minutes`; `preferred_time`, `rest_day`, `difficulty_bias` added in V10. |
| `subject`, `chapter`, `topic`, `topic_prerequisite` | V1 | The syllabus tree, seeded from `content/syllabus/*.yaml`. |
| `question` | V1 | Authored + real PYQ content. `source`/`source_year` distinguish past-paper questions (`source LIKE 'tnpsc-%'`). |
| `question_attempt` | V1 | Append-only grading ledger — every answer, from any mode. |
| `learner_topic_state` | V1, extended V2 | The one row per topic that matters: `accuracy_score`, `speed_score`, `current_difficulty`, `next_action`, plus (V2) `concept_score`, `consistency_score`, `confidence_score`, `retention_score`, `mastery_score`. |
| `learning_event` | V1 | Append-only analytics log, never read by the learning engine. |
| `revision_schedule` | V3 | Spaced-repetition due dates. |
| `ai_interaction` | V4 | AI hint cache (one response per question+type, reused). |
| `test`, `test_question`, `test_answer` | V5 | Weekly test state. |
| `quick_lab_session` | V6 | Round-level aggregates (combo, totals) for Quick Lab — each question within a round still writes its own `question_attempt` row. |
| *(V7 adds `learner.password_hash` only — no new table)* | V7 | |
| `learner_milestone` | V8 | `(learner_id, milestone_id, earned_at)` — compute-on-read, persist-on-first-true. |
| `learner_notification_pref` | V9 | Five boolean toggles. |
| *(V10 extends `learner_profile` only)* | V10 | |

### 2.4 Complete API reference

**Core loop** (Phase 2, pre-existing shape untouched since):
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/plan/today` | GET | Next Best Action (+ `avgMasteryPct` since Phase 3) |
| `/api/questions/next?topic=` | GET | Next practice question (+ `topicName` since Phase 2) |
| `/api/attempts` | POST | Grade an answer — the shared pipeline |
| `/api/revision/next` | GET | Next due revision question |
| `/api/revision/due` | GET | *(Phase 2)* Full due list, each with `state`/`recommendedAction` since Phase 7 |
| `/api/mistakes/next` | GET | Next open mistake |
| `/api/mistakes/open` | GET | *(Phase 2)* Full open-mistake list, with `nextReview`/`weakestPrerequisite` since Phase 7 |
| `/api/tests` | GET / POST | List past tests *(Phase 2)* / generate a new weekly test |
| `/api/tests/:id` | GET | Full test state (+ `timeTakenMs` since Phase 2) |
| `/api/tests/:id/answers` | POST | Save one answer/mark-for-review |
| `/api/tests/:id/submit` | POST | Grade the whole test |
| `/api/ai/hint` | POST | On-demand AI hint, cached, silent-fail by design |

**Read-model aggregations** (Phase 6):
| Endpoint | Purpose |
|---|---|
| `/api/home/overview` | Home's whole view-model in one call — plan + due list + streak + avg mastery |
| `/api/learn/overview` | Full syllabus tree × mastery × revision × recommendation (no frontend consumer yet — Learn stays mock) |

**Quick Lab** (Phase 4, bank-backed modes only):
`/api/quick-lab/modes` (GET), `/session` (POST, start), `/attempt` (POST), `/session/:id/complete` (POST, timeout), `/result/:id` (GET).

**PYQs** (Phase 8):
`/api/pyqs/next?mode=topic|weak-areas|previously-wrong` (GET), `/api/pyqs/overview` (GET — by-year, by-topic, mistake types, content frequency).

**Journey** (Phase 8):
`/api/journey/overview` (GET — per-topic state, streak, personal records).

**Milestones** (Phase 8):
`/api/milestones` (GET — compute-on-read, persist-on-first-true).

**Notifications** (Phase 8):
`/api/notifications` (GET — live computed feed, never a stored queue), `/api/notifications/preferences` (GET/PUT).

**Profile** (Phase 8):
`/api/profile` (GET/PUT), `/api/profile/export` (GET — full JSON data export).

**Auth** (Phase 8, opt-in via `SESSION_SECRET`):
`/api/auth` (GET status / POST login-or-set-password / DELETE logout).

---

## 3. Frontend architecture

```
src/app/proto/**        screens — JSX only, no fetch(), no business logic
src/hooks/**             all component state + data fetching
src/api/**               one file per backend area, the only thing that calls fetch()
```

### 3.1 The layering rule (Phase 5)

No component calls `fetch()` directly. The chain is always:

```
Screen (proto/**/page.js)
   │
   └── a hook from src/hooks/
          │
          └── a function from src/api/*.api.js
                 │
                 └── src/api/client.js's get()/post()/put()/del()
                        │
                        └── the actual API route
```

`src/api/client.js` is the single `fetch` wrapper (JSON headers, error
handling via `ApiError{message, code, status}`). Every other `src/api/*.js`
file is a handful of named functions and nothing else — no React, no state.

Stateful, multi-step screens get a dedicated hook: `useQuestionSession`
(the engine behind Practice/Revision-session/PYQ-session, all sharing one
`<QuestionSession>` component), `useTest`, `useQuickLab`, `useMistakes`,
`useNotifications`, `useProfile`, `useAuth`. Simple one-shot reads
(`useTodayPlan`, `useRevision`, `usePyqsOverview`, `useJourney`,
`useMilestones`, `useTestDetail`) are thin `useEffect` + `useState` wrappers.

### 3.2 Shared components

- `src/app/proto/_components/QuestionSession.js` — the one question/
  answer/feedback loop, reused by Practice, the Revision session, and PYQ
  practice. Takes a `session` prop (a `useQuestionSession()` result) and a
  `mode` label; renders real mastery dimensions and the real
  explanation/trap on every answer.
- `src/app/proto/_components/AppShell.js` — the nav shell on every screen;
  its streak chip is now real (`useJourney()`), not mock.
- `src/app/proto/_components/ui.js` — `ProgressBar`, `ProgressRing`,
  `Stat`, badge helpers.

### 3.3 Screen-by-screen status

| Screen | Status |
|---|---|
| Home | **Real** — `/api/home/overview` |
| Practice | **Real** — `usePractice` → `/api/questions/next` + `/api/attempts` |
| Revision (list + session) | **Real** — `/api/revision/due`, `/api/revision/next` |
| Mistakes | **Real** — `/api/mistakes/open`, AI hint wired |
| Tests (list/instructions/exam/result/review) | **Real** — full `/api/tests/*` round trip |
| Quick Lab — Percentage Rush, Fraction Lab | **Real** — `/api/quick-lab/*` |
| Quick Lab — the other 6 modes | **Mock**, inert — need a procedural content-generation engine, explicitly out of scope (see inventory doc) |
| PYQs (list/session/analysis) | **Real** — `/api/pyqs/*` |
| Journey | **Real** — `/api/journey/overview` |
| Milestones | **Real** — `/api/milestones` |
| Notifications | **Real** — `/api/notifications*` |
| Profile | **Real** — `/api/profile*`; theme/offline-download stay client-only by design |
| Onboarding (welcome/exam/rhythm) | Welcome + exam steps still mock copy; **Rhythm step is real** (writes to `/api/profile`) |
| Login/Register | **Real** — unified into one password screen (`/api/auth`), since this is single-learner, not multi-tenant |
| Learn, Topic detail, Lesson | **Mock** — the design shows 10 subjects; only Aptitude & Mental Ability has real content today (`/api/learn/overview` exists and is correct, just has no consumer yet) |
| Weekly review | **Mock** |

---

## 4. Implementation history, phase by phase

1. **Inventory** — audited the real design (found on a separate branch,
   `src/app/proto/**`, 26 screens, zero API calls) against the working
   backend. Found the backend already had a full adaptive loop; the design
   just wasn't wired to it.
2. **Connect what exists** — wired Home/Practice/Revision/Mistakes/Tests to
   their real APIs with zero feature invention. Added three list-returning
   siblings of existing single-item endpoints (`/api/revision/due`,
   `/api/mistakes/open`, `GET /api/tests`).
3. **Backend→frontend gaps** — surfaced data the backend already computed
   but no screen showed: mastery dimensions after an attempt, revision
   progress bars, mistake prerequisites/next-review dates.
4. **Quick Lab** — built the bank-backed modes (Percentage Rush, Fraction
   Lab) as a real vertical slice: new `quick_lab_session` table for
   round-level aggregates, every question still through the shared
   `recordAttempt` pipeline.
5. **API adapter layer** — introduced `src/api/` and `src/hooks/`,
   eliminating all direct `fetch()` calls from components.
6. **BFF aggregation** — `/api/home/overview` (consolidating two calls into
   one) and `/api/learn/overview` (built ahead of its frontend, honestly
   covering the real 2-of-10 subjects with content).
7. **Explicit data contract** — found and fixed two places the frontend
   invented a state the backend never asserted (a badge keyed off array
   position, two CSS classes reused regardless of real value); added the
   `state`/`recommendedAction` fields that made the honest version
   possible; wrote `data-contracts.md`.
8. **Backward compatibility + the last six namespaces** — confirmed nothing
   in Phases 2–7 ever broke an existing shape, then built PYQs, Journey
   (+ the streak domain function), Milestones, Notifications, Profile, and
   single-learner auth (opt-in, Edge/Node runtime split to keep it from
   breaking the build).

---

## 5. Verification posture

Every phase was verified against a real seeded Postgres instance (324
questions, 139 real PYQ-tagged), through both direct `curl`/`psql` checks
and actual browser walkthroughs — not just reasoning about the code. The
full unit suite (`npm test`, 56 tests across all of `src/domain/`) and the
DB-backed loop smoke test (`npm run test:loop`) both pass as of the last
change in Phase 8.
