# Phase 1 — Frontend/backend inventory

> **Historical record.** Written against an exploratory branch that is no
> longer merged — see `docs/full-system-documentation.md`'s note for why.
> `main` has since independently superseded everything described below.

Verified by reading the actual code on both branches and the design PDF, not
by trusting any README. Two things this branch does not have on its own:

- The **frontend design** — 26 screens under `src/app/proto/`, built from
  `NOVA — Adaptive TNPSC Learning.pdf`, mock data only, zero API calls — lives
  on `claude/frontend-startup-c3cb19`, not here or on `main`.
- A **native Android start** (5 screens, same mock data) on the same branch,
  under `android/`.

Everything in the "UI exists" column below is read from that branch. Everything
in "API exists" / "Data model exists" is read from this branch's
`src/app/api/`, `src/domain/`, and `db/migrations/`. The README's "what's
deliberately absent" section is stale on two points — PYQ content and PYQ
schema both exist now — corrected below.

## The matrix

| Frontend feature | UI exists | API exists | Data model exists | Action |
|---|---|---|---|---|
| Home / Next Best Action | ✓ `proto/home` | ✓ `/api/plan/today` | ✓ `learner_topic_state`, `chapter.question_count` | Connect |
| Learn (subject list) | ✓ `proto/learn` | partial — no subject-rollup endpoint | partial — only 3 of 10 design subjects seeded | Extend backend |
| Topic detail | ✓ `proto/learn/[subject]/[topic]` | partial — mastery dims exist, no single "topic detail" endpoint | ✓ `learner_topic_state` has all 6 dimensions | Extend backend |
| Lesson | ✓ `proto/lesson/[topic]` | missing | missing — no lesson-content table, only questions | Add backend |
| Practice | ✓ `proto/practice/[topic]` | ✓ `/api/questions/next`, `/api/attempts` | ✓ `question`, `question_attempt` | Connect |
| Question submission / adaptive difficulty | ✓ (in practice flow) | ✓ `/api/attempts` → `recordAttempt` | ✓ `learner_topic_state.current_difficulty` | Connect |
| Mastery (6 dimensions) | ✓ (shown on topic detail) | ✓ computed in `src/domain/mastery.mjs`, written by attempts route | ✓ `concept/accuracy/speed/retention/consistency/confidence_score` | Connect — not yet returned by any GET endpoint |
| Revision ("Memory Echo") | ✓ `proto/revision` | ✓ `/api/revision/next` | ✓ `revision_schedule` | Connect |
| Mistakes | ✓ `proto/mistakes` | ✓ `/api/mistakes/next` | ✓ query over `question_attempt`, no new schema | Connect |
| AI Tutor | ✓ full chat UI in design; real app has only an inline hint button | ✓ `/api/ai/hint` | ✓ `ai_interaction` (hint/explanation cache) | Connect — the proto's full-chat-panel UI is a bigger surface than the one-shot hint API serves today |
| Quick Lab (timed arcade games) | ✓ `proto/quick-lab/[mode]` + result | missing | missing — no game-session table, no combo/best-score tracking | Add backend |
| PYQs | ✓ `proto/pyqs` + `[topic]` + `analysis` | missing — no `/api/pyqs/*` route at all | **richer than it looks**: `question.source`/`source_year`/`status` columns exist, and **139 of 324 questions are already real TNPSC PYQs tagged `tnpsc-2011`…`tnpsc-2024`** across 8 exam years (aptitude + reasoning only — no GS/Polity/History PYQs). `source` is even selected in `/api/questions/next`'s SQL today and then silently dropped before the JSON response. | Add backend (surface existing data, not author new content) |
| Journey (orbit viz, knowledge garden, personal records) | ✓ `proto/journey` | missing | partial — `learning_event` (append-only log) could feed it, nothing aggregates it | Add backend |
| Weekly review | ✓ `proto/weekly-review` | missing | partial — same `learning_event`/`question_attempt` rows, no weekly rollup | Add backend |
| Tests | ✓ `proto/tests` + instructions/weekly/result/review | ✓ `/api/tests`, `/api/tests/[id]`, `/answers`, `/submit` | ✓ `test`, `test_question`, `test_answer` | Connect |
| Streaks | ✓ shown on home/journey/profile (`12 day streak`) | missing | missing — no streak table; `learning_event.created_at` could derive one but nothing does | Add backend |
| Milestones | ✓ `proto/milestones` | missing | missing — no milestones/achievements table | Add backend |
| Notifications | ✓ `proto/notifications` + toggles on profile | missing | missing — no notification log, no preferences table, no push infra | Add backend |
| Onboarding (landing/register/login/exam/rhythm) | ✓ `proto/onboarding/*`, `landing`, `login`, `register` | missing | missing — single hardcoded `LEARNER_ID`, no `auth` of any kind, `learner_profile` exists but nothing writes to it from onboarding | Add backend |
| Settings / Profile | ✓ `proto/profile` (goal, preferred time, rest day, language, difficulty, notification toggles, offline download, theme, export) | missing (except language/daily_goal) | partial — `learner_profile.language` and `.daily_goal_minutes` already exist and are unused by any UI; everything else on the Settings screen (preferred time, rest day, notification prefs, offline cache, theme, data export) has no column anywhere | Extend backend for the 2 existing fields, add backend for the rest |

## What this corrects versus the original draft

1. **"UI exists" was being guessed, not verified.** All 26 rows checked out —
   every screen named in the draft is real, on `claude/frontend-startup-c3cb19`,
   not on this branch or `main`. If work starts from `main`, step one is
   merging or cherry-picking that branch (and deciding whether the `android/`
   scaffold on the same branch is in scope for this phase).
2. **PYQs is not "missing/partial schema."** It's the opposite shape of what
   the draft assumed: content and schema are both substantially there (139
   real past-paper questions, 8 years, with `source`/`source_year`/`status`
   columns since migration V1) and it's the **API and UI wiring** that's
   fully absent. This is a smaller lift than "Add backend" implies — it's
   "expose data that's already being queried."
3. **"Learn subjects" and "Topic detail" are not "partial" so much as
   10-vs-3.** The design has 10 subjects (Mathematics, Aptitude, General
   Tamil, Science, Polity, History, Geography, Economics, General Studies,
   Current Affairs). The syllabus tree has entries for most of these
   (`content/syllabus/prelims-495.yaml`), but only Aptitude + Reasoning have
   any authored questions (185 non-PYQ + 139 PYQ = 324 total, all in two
   chapters). Polity has its 20 topics fully named in the tree with zero
   questions; General Science, Geography, History, Economics, English, and
   Tamil chapters are marked `transcribed: false` with empty topic arrays.
   Treat "Extend backend" here as "author most of the content," not a small
   schema patch.
4. **Mastery has no dedicated endpoint.** The six dimensions are computed and
   stored correctly, but nothing returns them as JSON today — practice and
   revision write them, nothing reads them back out for a topic-detail or
   journey view. Worth being explicit that "Connect" here still needs one new
   read endpoint, even though zero new computation or schema is needed.
5. **AI Tutor is two different sizes of thing.** The real backend has a
   single-shot hint endpoint, additive and silent-on-failure by design (see
   README). The design has a persistent two-way chat panel with suggested
   follow-ups, pattern detection across sessions, and live score/mastery
   context docked beside it. Wiring the existing hint button is "Connect";
   building the chat panel is closer to "Add backend" (conversation state,
   multi-turn context, a reason to classify the 5 quick-reply buttons as
   distinct prompts).
6. **Streaks, Milestones, Notifications, Onboarding, Settings are uniformly
   "Add backend," not "missing/partial."** None of these have so much as a
   placeholder table, except the two `learner_profile` columns. There is also
   zero authentication of any kind — single hardcoded `learner_id`
   throughout — so Onboarding's login/register screens imply the largest
   single piece of net-new backend work in this list.

## Suggested phase ordering (not asked for, offered for Phase 2 planning)

Cheapest-to-value first: **Connect** rows (Home, Practice, Revision, Mistakes,
Tests, AI hint) are a frontend data-fetching pass against APIs that already
work — no backend changes. **PYQs** is next: the content and schema already
exist, so it's one read endpoint plus the three PYQ screens, not new
authoring. Everything else (Quick Lab, Journey, Streaks, Milestones,
Notifications, Onboarding/auth, Settings) is genuinely new backend surface,
roughly in that order of size.
